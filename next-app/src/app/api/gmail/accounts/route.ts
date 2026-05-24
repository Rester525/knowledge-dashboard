import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, email, created_at FROM gmail_accounts
    WHERE user_id = ${auth.userId}
    ORDER BY created_at DESC
  `;
  return Response.json(rows);
}

export async function DELETE(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await sql`
    DELETE FROM gmail_accounts WHERE id = ${id} AND user_id = ${auth.userId}
  `;
  return new Response(null, { status: 204 });
}
