import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, title, source_type, source_url, notesheet, created_at
    FROM study_materials
    WHERE user_id = ${auth.userId}
    ORDER BY created_at DESC
  `;
  return Response.json(rows);
}
