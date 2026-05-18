import { sql } from '@/lib/db';
import { verifyPassword, createToken, createSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password }: { email: string; password: string } =
    await request.json();

  if (!email || !password) {
    return Response.json({ error: 'Email and password required' }, { status: 400 });
  }

  const rows = await sql`
    SELECT id, email, password_hash FROM users WHERE email = ${email}
  `;
  const user = rows[0] as
    | { id: number; email: string; password_hash: string }
    | undefined;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await createToken(user.id);
  return Response.json(
    { user: { id: user.id, email: user.email } },
    {
      status: 200,
      headers: { 'Set-Cookie': createSessionCookie(token) },
    }
  );
}
