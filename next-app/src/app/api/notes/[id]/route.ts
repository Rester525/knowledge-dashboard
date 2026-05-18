import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const rows = await sql`
    SELECT id, content, created_at FROM notes
    WHERE id = ${id} AND user_id = ${auth.userId}
  `;
  if (rows.length === 0) {
    return Response.json({ error: 'Note not found' }, { status: 404 });
  }
  return Response.json(rows[0]);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const rows = await sql`
    SELECT id FROM notes WHERE id = ${id} AND user_id = ${auth.userId}
  `;
  if (rows.length === 0) {
    return Response.json({ error: 'Note not found' }, { status: 404 });
  }
  await sql`DELETE FROM notes WHERE id = ${id}`;
  return new Response(null, { status: 204 });
}
