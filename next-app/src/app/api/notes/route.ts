import { sql } from '@/lib/db';
import { getEmbedding } from '@/lib/embedding';

export async function GET() {
  const rows = await sql`SELECT id, content, created_at FROM notes ORDER BY created_at DESC`;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const { content }: { content: string } = await request.json();
  if (!content || content.length > 10000) {
    return Response.json({ error: 'Content required (max 10000 chars)' }, { status: 400 });
  }

  try {
    const embedding = await getEmbedding(content);
    const vector = JSON.stringify(embedding);
    const rows = await sql`
      INSERT INTO notes (content, embedding)
      VALUES (${content}, ${vector}::vector)
      RETURNING id, content, created_at
    `;
    return Response.json(rows[0], { status: 201 });
  } catch {
    const rows = await sql`
      INSERT INTO notes (content) VALUES (${content})
      RETURNING id, content, created_at
    `;
    return Response.json(rows[0], { status: 201 });
  }
}
