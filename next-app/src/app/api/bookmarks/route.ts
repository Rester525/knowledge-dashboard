import { sql } from '@/lib/db';

export async function GET() {
  const rows = await sql`SELECT id, url, title, created_at FROM bookmarks ORDER BY created_at DESC`;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const { url, title }: { url: string; title: string } = await request.json();
  if (!url || !title) {
    return Response.json({ error: 'URL and title required' }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO bookmarks (url, title) VALUES (${url}, ${title})
    RETURNING id, url, title, created_at
  `;
  return Response.json(rows[0], { status: 201 });
}
