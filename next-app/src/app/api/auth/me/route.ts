import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) {
    return Response.json({ user: null });
  }

  const rows = await sql`
    SELECT id, email, created_at FROM users WHERE id = ${auth.userId}
  `;
  if (rows.length === 0) {
    return Response.json({ user: null });
  }

  const user = rows[0] as { id: number; email: string; created_at: string };
  return Response.json({ user: { id: user.id, email: user.email } });
}
