import OpenAI from 'openai';

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const cache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 50;

export async function getEmbedding(text: string): Promise<number[]> {
  const key = text.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  const embedding = response.data[0].embedding;

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, embedding);
  return embedding;
}
