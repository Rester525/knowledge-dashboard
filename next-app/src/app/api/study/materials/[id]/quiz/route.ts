import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateQuiz } from "@/lib/ollama";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get material with notesheet
  const rows = await sql`
    SELECT id, notesheet FROM study_materials
    WHERE id = ${id} AND user_id = ${auth.userId}
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const notesheet = rows[0].notesheet as string | null;
  if (!notesheet) {
    return Response.json(
      { error: "Generate a notesheet first" },
      { status: 400 }
    );
  }

  const questions = await generateQuiz(notesheet);
  if (!questions || questions.length === 0) {
    return Response.json({ error: "Failed to generate quiz" }, { status: 500 });
  }

  const insertResult = await sql`
    INSERT INTO quizzes (user_id, material_id, questions)
    VALUES (${auth.userId}, ${id}, ${JSON.stringify(questions)})
    RETURNING id, questions, created_at
  `;

  return Response.json(insertResult[0], { status: 201 });
}
