import { sql } from '@/lib/db';
import { hashPassword, createToken, createSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password }: { email: string; password: string } =
    await request.json();

  if (!email || !password) {
    return Response.json({ error: 'Email and password required' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return Response.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, created_at
  `;
  const user = rows[0] as { id: number; email: string; created_at: string };

  const token = await createToken(user.id);
  return Response.json(
    { user: { id: user.id, email: user.email } },
    {
      status: 201,
      headers: { 'Set-Cookie': createSessionCookie(token) },
    }
  );
}
