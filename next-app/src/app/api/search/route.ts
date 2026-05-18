import { sql } from '@/lib/db';
import { getEmbedding } from '@/lib/embedding';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q || q.trim().length === 0) {
    return Response.json({ query: q, results: [] });
  }

  const hasApiKey = !!process.env.OPENAI_API_KEY;

  if (hasApiKey) {
    try {
      const embedding = await getEmbedding(q);
      const vector = JSON.stringify(embedding);
      const rows = await sql`
        SELECT id, content, created_at, 1 - (embedding <=> ${vector}::vector) AS score
        FROM notes
        WHERE embedding IS NOT NULL AND user_id = ${auth.userId}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT 10
      `;
      const results = rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        score: Math.round((r.score as number) * 10000) / 10000,
      }));
      return Response.json({ query: q, results });
    } catch {
      // Fall through to FTS
    }
  }

  // Full-text search fallback
  const terms = q.trim().split(/\s+/).join(' & ');
  const rows = await sql`
    SELECT id, content, created_at,
           ts_rank(to_tsvector('english', content), to_tsquery('english', ${terms})) AS score
    FROM notes
    WHERE to_tsvector('english', content) @@ to_tsquery('english', ${terms})
      AND user_id = ${auth.userId}
    ORDER BY score DESC
    LIMIT 10
  `;
  const results = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    score: Math.round((r.score as number) * 10000) / 10000,
  }));
  return Response.json({ query: q, results });
}
