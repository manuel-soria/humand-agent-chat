const REDASH_URL = process.env.REDASH_URL || 'https://redash.humand.co';
const REDASH_API_KEY = process.env.REDASH_API_KEY || '';

export async function GET() {
  try {
    const res = await fetch(`${REDASH_URL}/api/query_results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${REDASH_API_KEY}`,
      },
      body: JSON.stringify({
        query: `SELECT id, name FROM "Instances" WHERE "isTest" = false AND name IS NOT NULL AND LENGTH(TRIM(name)) > 2 ORDER BY name ASC`,
        data_source_id: 1,
        max_age: 300,
      }),
    });

    const data = await res.json();

    if (data.job) {
      // Poll for result
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const jobRes = await fetch(`${REDASH_URL}/api/jobs/${data.job.id}`, {
          headers: { Authorization: `Key ${REDASH_API_KEY}` },
        });
        const jobData = await jobRes.json();

        if (jobData.job.status === 3) {
          const resultRes = await fetch(
            `${REDASH_URL}/api/query_results/${jobData.job.query_result_id}`,
            { headers: { Authorization: `Key ${REDASH_API_KEY}` } },
          );
          const resultData = await resultRes.json();
          const instances = resultData.query_result.data.rows.map(
            (r: { id: number; name: string }) => ({ id: r.id, name: r.name }),
          );
          return Response.json(instances);
        }

        if (jobData.job.status === 4) {
          return Response.json({ error: jobData.job.error }, { status: 500 });
        }
      }
      return Response.json({ error: 'Timeout loading instances' }, { status: 504 });
    }

    if (data.query_result) {
      const instances = data.query_result.data.rows.map(
        (r: { id: number; name: string }) => ({ id: r.id, name: r.name }),
      );
      return Response.json(instances);
    }

    return Response.json({ error: 'Unexpected response' }, { status: 500 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to load instances' },
      { status: 500 },
    );
  }
}
