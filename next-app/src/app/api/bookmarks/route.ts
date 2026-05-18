import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT id, url, title, created_at FROM bookmarks
    WHERE user_id = ${auth.userId}
    ORDER BY created_at DESC
  `;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { url, title }: { url: string; title: string } = await request.json();
  if (!url || !title) {
    return Response.json({ error: 'URL and title required' }, { status: 400 });
  }
  const rows = await sql`
    INSERT INTO bookmarks (user_id, url, title)
    VALUES (${auth.userId}, ${url}, ${title})
    RETURNING id, url, title, created_at
  `;
  return Response.json(rows[0], { status: 201 });
}
