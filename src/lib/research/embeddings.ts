/**
 * Gemini embedding-001 wrapper for the Research Reading System.
 * Uses 768-dimensional embeddings. No pgvector required — stored as Json.
 */

import { callGeminiBatchEmbeddings, callGeminiEmbedding } from '@/lib/geminiClient'

const GEMINI_EMBEDDING_MODEL = 'embedding-001'
const EMBEDDING_MODEL_FALLBACKS = [
  GEMINI_EMBEDDING_MODEL,
  'gemini-embedding-001',
]
const MAX_BATCH_SIZE = 100

/**
 * Embed a single piece of text using Gemini embedding-001.
 * Truncates to 8000 characters before embedding.
 */
export async function embedText(text: string): Promise<number[]> {
  const truncated = text.slice(0, 8000)
  let lastError: Error | null = null

  for (const model of EMBEDDING_MODEL_FALLBACKS) {
    try {
      return await callGeminiEmbedding({
        model,
        text: truncated,
        feature: 'other',
        userId: null,
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('Gemini embedding failed for all configured models')
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
  let lastError: Error | null = null
  const truncated = texts.map((text) => text.slice(0, 8000))

  for (const model of EMBEDDING_MODEL_FALLBACKS) {
    try {
      return await callGeminiBatchEmbeddings({
        model,
        texts: truncated,
        feature: 'other',
        userId: null,
      })
    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error(String(error))
    }
  }

  throw lastError ?? new Error('Gemini batch embedding failed for all configured models')
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
