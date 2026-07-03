// arXiv API communication and keyword/author extraction for the discover feature.

export interface ArxivPaper {
  arxivId: string
  title: string
  authors: string[]
  abstract: string
  year: number
  venue: string
  url: string
  pdfUrl: string
  categories: string[]
  publishedDate: string
}

const STOPWORDS = new Set([
  'a', 'the', 'of', 'in', 'and', 'or', 'for', 'with', 'that',
  'this', 'are', 'was', 'were', 'been', 'have', 'has', 'from', 'by', 'an', 'as', 'at', 'be',
  'is', 'it', 'its', 'on', 'to', 'we', 'our', 'their', 'these', 'those', 'which',
  'using', 'based', 'show', 'shows', 'paper', 'study', 'method', 'methods',
  'results', 'propose', 'proposed', 'model', 'models', 'approach', 'approaches',
  'data', 'used', 'use', 'can', 'also', 'two', 'new', 'than', 'more', 'all', 'one',
  'both', 'between', 'into', 'through', 'over', 'after', 'while', 'during',
  'such', 'each', 'other', 'within', 'across', 'among', 'via', 'per', 'non',
])

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export function extractKeywords(texts: string[]): string[] {
  const freq = new Map<string, number>()

  for (const text of texts) {
    if (!text) continue
    const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    for (const word of words) {
      if (word.length < 4) continue
      if (STOPWORDS.has(word)) continue
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word)
}

export function extractAuthors(authorLists: string[][]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const authors of authorLists) {
    for (const author of authors) {
      const trimmed = author.trim()
      if (!trimmed) continue
      const parts = trimmed.split(/\s+/)
      const lastName = parts[parts.length - 1]
      if (!lastName || seen.has(lastName)) continue
      seen.add(lastName)
      result.push(lastName)
      if (result.length >= 6) return result
    }
  }

  return result
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function cleanWhitespace(value: string): string {
  return decodeXmlEntities(value).replace(/\s+/g, ' ').trim()
}

function buildKeywordQuery(keywords: string[]): string | null {
  if (keywords.length === 0) return null
  const clauses = keywords.map((keyword) => {
    const encoded = encodeURIComponent(keyword)
    return `(ti:${encoded}+OR+abs:${encoded})`
  })
  return `(${clauses.join('+OR+')})`
}

function buildAuthorQuery(authors: string[]): string | null {
  if (authors.length === 0) return null
  const clauses = authors.map((author) => `au:${encodeURIComponent(author)}`)
  return `(${clauses.join('+OR+')})`
}

function parseArxivFeed(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = []
  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []

  for (const entryXml of entryMatches) {
    const idMatch = entryXml.match(/<id>([^<]*)<\/id>/)
    const idText = idMatch?.[1]?.trim() ?? ''
    if (!idText) continue

    const arxivId = idText.includes('/abs/')
      ? idText.split('/abs/').pop()!.trim()
      : idText.split('/').pop()!.trim()
    if (!arxivId) continue

    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/)
    const title = titleMatch ? cleanWhitespace(titleMatch[1]) : ''

    const authors = Array.from(entryXml.matchAll(/<name>([^<]*)<\/name>/g)).map((m) =>
      cleanWhitespace(m[1])
    ).filter(Boolean)

    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/)
    const abstract = summaryMatch ? cleanWhitespace(summaryMatch[1]) : ''

    const publishedMatch = entryXml.match(/<published>([^<]*)<\/published>/)
    const publishedDate = publishedMatch?.[1]?.trim() ?? ''
    const year = publishedDate ? parseInt(publishedDate.slice(0, 4), 10) : NaN

    const categories = Array.from(entryXml.matchAll(/<category[^>]*term="([^"]*)"/g)).map(
      (m) => m[1]
    )

    papers.push({
      arxivId,
      title,
      authors,
      abstract,
      year: Number.isFinite(year) ? year : 0,
      venue: 'arXiv',
      url: `https://arxiv.org/abs/${arxivId}`,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
      categories,
      publishedDate,
    })
  }

  return papers
}

async function fetchArxivQuery(searchQuery: string, maxResults: number): Promise<ArxivPaper[]> {
  try {
    const url = `${ARXIV_API_BASE}?search_query=${searchQuery}&start=0&max_results=${maxResults}`
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error('[searchArxiv] Non-OK response:', response.status, response.statusText)
      return []
    }

    const xml = await response.text()
    return parseArxivFeed(xml)
  } catch (error) {
    console.error('[searchArxiv] Fetch failed:', error)
    return []
  }
}

export async function searchArxiv(params: {
  keywords: string[]
  authors: string[]
  maxResults?: number
}): Promise<ArxivPaper[]> {
  const perQueryMax = 15

  const keywordQuery = buildKeywordQuery(params.keywords)
  const authorQuery = buildAuthorQuery(params.authors)

  const [keywordResults, authorResults] = await Promise.all([
    keywordQuery ? fetchArxivQuery(keywordQuery, perQueryMax) : Promise.resolve([]),
    authorQuery ? fetchArxivQuery(authorQuery, perQueryMax) : Promise.resolve([]),
  ])

  const merged = new Map<string, ArxivPaper>()
  for (const paper of [...keywordResults, ...authorResults]) {
    if (!merged.has(paper.arxivId)) {
      merged.set(paper.arxivId, paper)
    }
  }

  return Array.from(merged.values()).slice(0, 20)
}
