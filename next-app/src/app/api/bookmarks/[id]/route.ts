import { sql } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await sql`SELECT id FROM bookmarks WHERE id = ${id}`;
  if (rows.length === 0) {
    return Response.json({ error: 'Bookmark not found' }, { status: 404 });
  }
  await sql`DELETE FROM bookmarks WHERE id = ${id}`;
  return new Response(null, { status: 204 });
}
