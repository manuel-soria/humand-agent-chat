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

export const executeSqlTool = tool({
  description:
    'Execute a read-only SQL query against the Humand database via Redash. Use data_source_id=1 for Humand Prod, 25 for Cerberus. Only SELECT queries allowed.',
  inputSchema: z.object({
    description: z.string().describe('Brief description of what this query does, in Spanish. E.g. "Buscando timezone de la instancia", "Consultando DAU últimos 30 días"'),
    sql: z.string().describe('SQL SELECT query to execute'),
    dataSourceId: z
      .number()
      .default(1)
      .describe('Redash data source ID. 1=Humand Prod, 25=Cerberus, 12=Chats, 13=Insights'),
  }),
  execute: async ({ sql, dataSourceId }) => {
    try {
      const res = await fetch(`${REDASH_URL}/api/query_results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${REDASH_API_KEY}`,
        },
        body: JSON.stringify({
          query: sql,
          data_source_id: dataSourceId,
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
