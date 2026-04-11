/**
 * Gemini text-embedding-004 wrapper for the Research Reading System.
 * Uses 768-dimensional embeddings. No pgvector required — stored as Json.
 */

const GEMINI_EMBEDDING_MODEL = 'text-embedding-004'
const MAX_BATCH_SIZE = 100

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is required for embeddings')
  return key
}

/**
 * Embed a single piece of text using Gemini text-embedding-004.
 * Truncates to 8000 characters before embedding.
 */
export async function embedText(text: string): Promise<number[]> {
  const truncated = text.slice(0, 8000)
  const apiKey = getGeminiKey()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: truncated }] },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini embedding error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const values: number[] = data?.embedding?.values
  if (!values || values.length === 0) {
    throw new Error('Gemini returned empty embedding')
  }
  return values
}

/**
 * Embed a batch of texts. Internally calls batchEmbedContents.
 * Processes in chunks of MAX_BATCH_SIZE with a 1-second pause between chunks.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const chunk = texts.slice(i, i + MAX_BATCH_SIZE)
    const chunkEmbeddings = await embedBatchChunk(chunk)
    results.push(...chunkEmbeddings)

    if (i + MAX_BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return results
}

async function embedBatchChunk(texts: string[]): Promise<number[][]> {
  const apiKey = getGeminiKey()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`

  const requests = texts.map((t) => ({
    content: { parts: [{ text: t.slice(0, 8000) }] },
  }))

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini batch embedding error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const embeddings: Array<{ values: number[] }> = data?.embeddings ?? []

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch: expected ${texts.length}, got ${embeddings.length}`
    )
  }

  return embeddings.map((e) => e.values)
}

/**
 * Build the input text for a paper embedding: title + abstract concatenated.
 */
export function buildPaperEmbeddingText(title: string, abstract?: string | null): string {
  return abstract ? `${title}\n\n${abstract}` : title
}

/**
 * Cosine similarity between two equal-length vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Centroid of a list of embedding vectors (simple mean).
 */
export function computeCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return []
  const dim = embeddings[0].length
  const centroid = new Array<number>(dim).fill(0)
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i]
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length
  }
  return centroid
}
