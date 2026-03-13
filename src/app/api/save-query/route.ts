const REDASH_URL = process.env.REDASH_URL || 'https://redash.humand.co';
const REDASH_API_KEY = process.env.REDASH_API_KEY || '';

export async function POST(request: Request) {
  try {
    const { name, sql, dataSourceId = 1, description } = await request.json();

    if (!name || !sql) {
      return Response.json({ error: 'name and sql are required' }, { status: 400 });
    }

    const res = await fetch(`${REDASH_URL}/api/queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${REDASH_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        query: sql,
        data_source_id: dataSourceId,
        description: description || '',
        is_draft: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `Redash error: ${res.status} - ${text}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return Response.json({
      success: true,
      queryId: data.id,
      url: `${REDASH_URL}/queries/${data.id}`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to save query' },
      { status: 500 },
    );
  }
}
