export type PaperIdentifierKind = 'doi' | 'arxiv' | 'unknown'

export interface NormalizedPaperIdentifier {
  raw: string
  normalized: string
  kind: PaperIdentifierKind
  doi?: string
  arxivId?: string
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeDoiValue(rawDoi: string): string {
  return rawDoi
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim()
    .toLowerCase()
}

function extractDoi(input: string): string | null {
  const doiMatch = input.match(/10\.\d{4,9}\/[\w.()/:;-]+/i)
  if (!doiMatch) return null

  return normalizeDoiValue(doiMatch[0])
}

function normalizeArxivId(candidate: string): string | null {
  const cleaned = candidate
    .replace(/\.pdf$/i, '')
    .replace(/\/$/, '')
    .trim()

  const modern = cleaned.match(/^(\d{4}\.\d{4,5})(?:v\d+)?$/i)
  if (modern) return modern[1]

  const legacy = cleaned.match(/^([a-z\-]+(?:\.[a-z\-]+)?\/\d{7})(?:v\d+)?$/i)
  if (legacy) return legacy[1]

  return null
}

function extractArxivId(input: string): string | null {
  const arxivUrlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i)
  if (arxivUrlMatch) {
    return normalizeArxivId(arxivUrlMatch[1])
  }

  const ar5ivUrlMatch = input.match(/ar5iv\.org\/abs\/([^?#]+)/i)
  if (ar5ivUrlMatch) {
    return normalizeArxivId(ar5ivUrlMatch[1])
  }

  return normalizeArxivId(input)
}

export function normalizePaperIdentifier(rawInput: string): NormalizedPaperIdentifier {
  const raw = rawInput.trim()
  const decoded = safeDecode(raw)

  const doi = extractDoi(decoded)
  if (doi) {
    return {
      raw,
      normalized: doi,
      kind: 'doi',
      doi,
    }
  }

  const arxivId = extractArxivId(decoded)
  if (arxivId) {
    return {
      raw,
      normalized: arxivId,
      kind: 'arxiv',
      arxivId,
    }
  }

  return {
    raw,
    normalized: raw,
    kind: 'unknown',
  }
}

export function looksLikeBrokenDoiInput(input: string): boolean {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return false
  return trimmed.includes('doi.org') || trimmed.startsWith('doi:')
}

export function looksLikeBrokenArxivInput(input: string): boolean {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return false
  return trimmed.includes('arxiv.org') || trimmed.includes('ar5iv.org')
}
