import { sql } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await sql`SELECT id, completed FROM todos WHERE id = ${id}`;
  if (rows.length === 0) {
    return Response.json({ error: 'Todo not found' }, { status: 404 });
  }
  const updated = await sql`
    UPDATE todos SET completed = NOT completed WHERE id = ${id}
    RETURNING id, text, completed, created_at
  `;
  return Response.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await sql`SELECT id FROM todos WHERE id = ${id}`;
  if (rows.length === 0) {
    return Response.json({ error: 'Todo not found' }, { status: 404 });
  }
  await sql`DELETE FROM todos WHERE id = ${id}`;
  return new Response(null, { status: 204 });
}
