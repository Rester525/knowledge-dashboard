import { sql } from '@/lib/db';

export async function GET() {
  const rows = await sql`SELECT id, text, completed, created_at FROM todos ORDER BY created_at DESC`;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const { text }: { text: string } = await request.json();
  if (!text || text.length > 500) {
    return Response.json({ error: 'Text required (max 500 chars)' }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO todos (text) VALUES (${text})
    RETURNING id, text, completed, created_at
  `;
  return Response.json(rows[0], { status: 201 });
}
