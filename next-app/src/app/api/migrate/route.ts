import { initSchema } from '@/lib/db';

export async function POST() {
  try {
    await initSchema();
    return Response.json({ ok: true, message: 'Schema initialized' });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
