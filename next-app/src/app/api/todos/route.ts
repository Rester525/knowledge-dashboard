import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT id, text, completed, created_at FROM todos
    WHERE user_id = ${auth.userId}
    ORDER BY created_at DESC
  `;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { text }: { text: string } = await request.json();
  if (!text || text.length > 500) {
    return Response.json({ error: 'Text required (max 500 chars)' }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO todos (user_id, text) VALUES (${auth.userId}, ${text})
    RETURNING id, text, completed, created_at
  `;
  return Response.json(rows[0], { status: 201 });
}
