import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await sql`
    SELECT id, title, source_type, source_url, raw_text, notesheet, created_at
    FROM study_materials
    WHERE id = ${id} AND user_id = ${auth.userId}
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Also fetch quizzes
  const quizzes = await sql`
    SELECT id, questions, created_at
    FROM quizzes
    WHERE material_id = ${id} AND user_id = ${auth.userId}
    ORDER BY created_at DESC
  `;

  return Response.json({ ...rows[0], quizzes });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await sql`
    DELETE FROM study_materials
    WHERE id = ${id} AND user_id = ${auth.userId}
    RETURNING id
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
