import OpenAI from "openai";

const OLLAMA_BASE = "http://100.65.172.94:11434/v1";
const MODEL = process.env.OLLAMA_MODEL || "mistral-small3.2:latest";

let _ollama: OpenAI | null = null;
function getOllama(): OpenAI {
  if (!_ollama) {
    _ollama = new OpenAI({ baseURL: OLLAMA_BASE, apiKey: "ollama" });
  }
  return _ollama;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export async function generateNotesheet(rawText: string): Promise<string> {
  const truncated = rawText.slice(0, 12000);

  const ollama = getOllama();
  const resp = await ollama.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert study assistant. Create a comprehensive, well-organized notesheet from the provided text.

Format as clean Markdown with:
- A title as H1
- Section headings (H2) for major topics
- Bullet points for key facts and concepts
- **Bold** for important terms and definitions
- Tables where comparing data is useful
- A "Key Takeaways" section at the end with 3-5 bullet points

Be thorough but concise. Focus on clarity and understanding.`,
      },
      { role: "user", content: `Create a study notesheet from this content:\n\n${truncated}` },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  return resp.choices[0]?.message?.content?.trim() || "";
}

export async function generateQuiz(
  notesheet: string,
  count = 5
): Promise<QuizQuestion[]> {
  const truncated = notesheet.slice(0, 8000);

  const ollama = getOllama();
  const resp = await ollama.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert quiz generator. Create multiple-choice questions based on the provided notesheet.

Respond with ONLY a valid JSON array — no other text, no markdown fences:

[
  {
    "question": "What is ...?",
    "options": ["A) option one", "B) option two", "C) option three", "D) option four"],
    "correctIndex": 0
  }
]

Rules:
- Generate exactly ${count} questions
- Each question must have exactly 4 options
- Only one correct answer per question (correctIndex is 0-based)
- Cover the most important concepts from the notesheet
- Make distractors plausible but clearly wrong to someone who studied`,
      },
      { role: "user", content: `Generate ${count} multiple-choice quiz questions from this notesheet:\n\n${truncated}` },
    ],
    temperature: 0.4,
    max_tokens: 4096,
  });

  const content = resp.choices[0]?.message?.content?.trim() || "[]";

  // Parse JSON — strip markdown fences if present
  const json = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(json) as QuizQuestion[];
  } catch {
    // Try to extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as QuizQuestion[];
    }
    return [];
  }
}
