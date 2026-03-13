import { tool } from 'ai';
import { z } from 'zod';

const REDASH_URL = process.env.REDASH_URL || 'https://redash.humand.co';
const REDASH_API_KEY = process.env.REDASH_API_KEY || '';

async function pollJob(jobId: string): Promise<{ columns: unknown[]; rows: unknown[] }> {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(`${REDASH_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Key ${REDASH_API_KEY}` },
    });
    const data = await res.json();

    if (data.job.status === 3) {
      const resultRes = await fetch(
        `${REDASH_URL}/api/query_results/${data.job.query_result_id}`,
        { headers: { Authorization: `Key ${REDASH_API_KEY}` } },
      );
      const resultData = await resultRes.json();
      return resultData.query_result.data;
    }

    if (data.job.status === 4) {
      throw new Error(data.job.error || 'Query failed');
    }
  }
  throw new Error('Query timeout after 60 seconds');
}

export const queryRedashTool = tool({
  description:
    'Execute a saved Redash query by its ID. Known queries: 14422 (NPS detail), 14423 (NPS score), 26794 (user permissions), 27829 (roles list), 27830 (role assignments), 27837 (user permissions via roles), 28164 (who can do X).',
  inputSchema: z.object({
    description: z.string().describe('Brief description of what this query does, in Spanish. E.g. "Consultando NPS score", "Obteniendo roles del cliente"'),
    queryId: z.number().describe('Redash saved query ID'),
    parameters: z
      .record(z.string(), z.string())
      .default({})
      .describe('Query parameters, e.g. { "instance_id": "2387" }'),
  }),
  execute: async ({ queryId, parameters }) => {
    try {
      const res = await fetch(`${REDASH_URL}/api/queries/${queryId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${REDASH_API_KEY}`,
        },
        body: JSON.stringify({
          parameters,
          max_age: 0,
        }),
      });

      const data = await res.json();

      if (data.job) {
        const result = await pollJob(data.job.id);
        return {
          success: true,
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rows.length,
        };
      }

      if (data.query_result) {
        return {
          success: true,
          columns: data.query_result.data.columns,
          rows: data.query_result.data.rows,
          rowCount: data.query_result.data.rows.length,
        };
      }

      return { success: false, error: JSON.stringify(data) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
