import { sql } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await sql`SELECT id, content, created_at FROM notes WHERE id = ${id}`;
  if (rows.length === 0) {
    return Response.json({ error: 'Note not found' }, { status: 404 });
  }
  return Response.json(rows[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await sql`SELECT id FROM notes WHERE id = ${id}`;
  if (rows.length === 0) {
    return Response.json({ error: 'Note not found' }, { status: 404 });
  }
  await sql`DELETE FROM notes WHERE id = ${id}`;
  return new Response(null, { status: 204 });
}
