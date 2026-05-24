import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateNotesheet } from "@/lib/ollama";
import { ocrPDF } from "@/lib/ocr";
import { PDFParse } from "pdf-parse";
import { YoutubeTranscript } from "youtube-transcript";

const OCR_MIN_CHARS = 100;

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") || "";

    let title = "";
    let sourceType: "pdf" | "youtube";
    let sourceUrl: string | null = null;
    let rawText = "";
    let usedOcr = false;

    if (contentType.includes("multipart/form-data")) {
      // PDF upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return Response.json({ error: "No file uploaded" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const pdf = new PDFParse({ data: buffer });
      const result = await pdf.getText();
      rawText = result.text.trim();
      title = file.name.replace(/\.pdf$/i, "");
      sourceType = "pdf";

      // If PDF has little/no text, it's likely a scanned document — fall back to OCR
      if (rawText.length < OCR_MIN_CHARS) {
        console.log(`pdf-parse yielded ${rawText.length} chars, falling back to OCR...`);
        try {
          rawText = await ocrPDF(buffer);
          usedOcr = true;
          console.log(`OCR extracted ${rawText.length} chars`);
        } catch (e) {
          console.error("OCR fallback failed:", e);
          // Keep whatever pdf-parse gave us
        }
      }
    } else {
      // YouTube URL
      const { url }: { url: string } = await request.json();
      if (!url) {
        return Response.json({ error: "YouTube URL required" }, { status: 400 });
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return Response.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      rawText = transcript.map((t) => t.text).join(" ");
      title = `YouTube - ${videoId}`;
      sourceType = "youtube";
      sourceUrl = url;
    }

    if (!rawText || rawText.length < 50) {
      return Response.json(
        { error: "Could not extract enough text from the source" },
        { status: 400 }
      );
    }

    // Insert material
    const rows = await sql`
      INSERT INTO study_materials (user_id, title, source_type, source_url, raw_text)
      VALUES (${auth.userId}, ${title.slice(0, 500)}, ${sourceType}, ${sourceUrl}, ${rawText})
      RETURNING id, title, source_type, source_url, created_at
    `;

    const material = rows[0];

    // Generate notesheet in background via Ollama
    let notesheet: string | null = null;
    try {
      notesheet = await generateNotesheet(rawText);
      if (notesheet) {
        await sql`
          UPDATE study_materials SET notesheet = ${notesheet}
          WHERE id = ${material.id} AND user_id = ${auth.userId}
        `;
      }
    } catch (e) {
      console.error("Notesheet generation failed:", e);
    }

    return Response.json(
      {
        ...material,
        notesheet,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("study/extract error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 }
    );
  }
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}
