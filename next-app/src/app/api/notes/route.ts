import { sql } from '@/lib/db';
import { getEmbedding } from '@/lib/embedding';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT id, content, created_at FROM notes
    WHERE user_id = ${auth.userId}
    ORDER BY created_at DESC
  `;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { content }: { content: string } = await request.json();
  if (!content || content.length > 10000) {
    return Response.json({ error: 'Content required (max 10000 chars)' }, { status: 400 });
  }

  try {
    const embedding = await getEmbedding(content);
    const vector = JSON.stringify(embedding);
    const rows = await sql`
      INSERT INTO notes (user_id, content, embedding)
      VALUES (${auth.userId}, ${content}, ${vector}::vector)
      RETURNING id, content, created_at
    `;
    return Response.json(rows[0], { status: 201 });
  } catch {
    const rows = await sql`
      INSERT INTO notes (user_id, content) VALUES (${auth.userId}, ${content})
      RETURNING id, content, created_at
    `;
    return Response.json(rows[0], { status: 201 });
  }
}
