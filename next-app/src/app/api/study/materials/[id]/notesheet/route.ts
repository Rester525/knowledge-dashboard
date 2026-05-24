import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateNotesheet } from "@/lib/ollama";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get material
  const rows = await sql`
    SELECT id, raw_text FROM study_materials
    WHERE id = ${id} AND user_id = ${auth.userId}
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const notesheet = await generateNotesheet(rows[0].raw_text as string);
  if (!notesheet) {
    return Response.json({ error: "Failed to generate notesheet" }, { status: 500 });
  }

  await sql`
    UPDATE study_materials SET notesheet = ${notesheet}
    WHERE id = ${id} AND user_id = ${auth.userId}
  `;

  return Response.json({ notesheet });
}
