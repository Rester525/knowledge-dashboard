import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: { 'Set-Cookie': clearSessionCookie() },
    }
  );
}
