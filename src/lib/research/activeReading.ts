import * as cheerio from 'cheerio'
import prisma from '@/lib/prisma'
import { callGemini, safeParseJson } from './geminiResearch'
import { normalizePaperIdentifier } from './paperIdentifier'

type FetchContentStatus = 'full_text' | 'metadata_only'

type PaperResolutionErrorCode =
  | 'INVALID_IDENTIFIER'
  | 'UNRESOLVED_IDENTIFIER'
  | 'FETCH_FAILED'

export class PaperResolutionError extends Error {
  code: PaperResolutionErrorCode

  constructor(message: string, code: PaperResolutionErrorCode) {
    super(message)
    this.name = 'PaperResolutionError'
    this.code = code
  }
}

export interface FetchPaperContentResult {
  text: string
  candidatePaperId: string | null
  status: FetchContentStatus
  note: string | null
}

interface ResolvedPaperData {
  title: string
  authors: string[]
  abstract: string | null
  url: string | null
  source: string
  doi: string | null
  arxivId: string | null
  publishedDate: Date | null
}

export interface PaperSection {
  title: string
  content: string
}

function normalizeWhitespace(content: string): string {
  return content.replace(/\s+/g, ' ').trim()
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, .ltx_page_footer, .ltx_page_header, .ltx_role_navigation').remove()

  const mainContent =
    $('.ltx_page_main').text() ||
    $('.ltx_document').text() ||
    $('article').text() ||
    $('.ltx_para').map((_, el) => $(el).text()).get().join('\n\n') ||
    $('.abstract').text() ||
    $('main').text() ||
    $('body').text()

  return normalizeWhitespace(mainContent)
}

async function fetchReadableTextFromUrl(url: string, sourceLabel: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/pdf')) {
      return null
    }

    const text = await response.text()
    const extracted = extractTextFromHtml(text)

    if (extracted.length > 1000) {
      console.log(`[activeReading] Extracted ${extracted.length} chars from ${sourceLabel}: ${url}`)
      return extracted
    }

    return null
  } catch (err) {
    console.error(`[activeReading] Failed fetching ${sourceLabel} URL ${url}:`, err)
    return null
  }
}

async function fetchAr5ivTextById(arxivId: string): Promise<string | null> {
  try {
    const ar5ivUrl = `https://ar5iv.org/abs/${arxivId}`
    const text = await fetchReadableTextFromUrl(ar5ivUrl, 'ar5iv')
    if (text) return text

    return null
  } catch (err) {
    console.error(`[activeReading] Failed to fetch ar5iv for ${arxivId}:`, err)
    return null
  }
}

async function fetchArxivTextById(arxivId: string): Promise<string | null> {
  const ar5ivText = await fetchAr5ivTextById(arxivId)
  if (ar5ivText) return ar5ivText

  const arxivAbsText = await fetchReadableTextFromUrl(`https://arxiv.org/abs/${arxivId}`, 'arxiv-abs')
  if (arxivAbsText) return arxivAbsText

  return null
}

function stripHtmlLikeTags(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fetchCrossrefMetadata(doi: string): Promise<ResolvedPaperData | null> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    const message = payload?.message
    if (!message?.title?.[0]) {
      return null
    }

    const title = String(message.title[0]).trim()
    const authors = Array.isArray(message.author)
      ? message.author
        .map((author: { given?: string; family?: string; name?: string }) => {
          if (author?.name) return String(author.name).trim()
          const name = `${author?.given ?? ''} ${author?.family ?? ''}`.trim()
          return name
        })
        .filter(Boolean)
      : []

    const abstract = typeof message.abstract === 'string'
      ? stripHtmlLikeTags(message.abstract)
      : null

    const issuedDateParts = message?.issued?.['date-parts']?.[0]
    const publishedDate = Array.isArray(issuedDateParts) && issuedDateParts.length >= 1
      ? new Date(
        issuedDateParts[0],
        Math.max(0, (issuedDateParts[1] ?? 1) - 1),
        issuedDateParts[2] ?? 1,
      )
      : null

    return {
      title,
      authors,
      abstract,
      url: typeof message.URL === 'string' ? message.URL : `https://doi.org/${doi}`,
      source: 'Crossref',
      doi,
      arxivId: null,
      publishedDate,
    }
  } catch (err) {
    console.error(`[activeReading] Crossref lookup failed for DOI ${doi}:`, err)
    return null
  }
}

async function fetchUnpaywallUrls(doi: string): Promise<string[]> {
  const email = process.env.UNPAYWALL_EMAIL || process.env.RESEARCH_CONTACT_EMAIL
  if (!email) return []

  try {
    const response = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`)
    if (!response.ok) return []

    const payload = await response.json()
    const best = payload?.best_oa_location

    const urls = [
      best?.url_for_pdf,
      best?.url,
    ].filter((value): value is string => Boolean(value && typeof value === 'string'))

    return Array.from(new Set(urls))
  } catch (err) {
    console.error(`[activeReading] Unpaywall lookup failed for DOI ${doi}:`, err)
    return []
  }
}

async function upsertResolvedCandidatePaper(data: ResolvedPaperData): Promise<string | null> {
  try {
    if (data.doi) {
      const paper = await (prisma as any).candidatePaper.upsert({
        where: { doi: data.doi },
        update: {
          title: data.title,
          authors: data.authors,
          abstract: data.abstract,
          url: data.url,
          source: data.source,
          publishedDate: data.publishedDate,
        },
        create: {
          doi: data.doi,
          arxivId: data.arxivId,
          title: data.title,
          authors: data.authors,
          abstract: data.abstract,
          url: data.url,
          source: data.source,
          publishedDate: data.publishedDate,
        },
        select: { id: true },
      })
      return paper.id
    }

    if (data.arxivId) {
      const paper = await (prisma as any).candidatePaper.upsert({
        where: { arxivId: data.arxivId },
        update: {
          title: data.title,
          authors: data.authors,
          abstract: data.abstract,
          url: data.url,
          source: data.source,
          publishedDate: data.publishedDate,
        },
        create: {
          doi: data.doi,
          arxivId: data.arxivId,
          title: data.title,
          authors: data.authors,
          abstract: data.abstract,
          url: data.url,
          source: data.source,
          publishedDate: data.publishedDate,
        },
        select: { id: true },
      })
      return paper.id
    }

    const created = await (prisma as any).candidatePaper.create({
      data: {
        doi: data.doi,
        arxivId: data.arxivId,
        title: data.title,
        authors: data.authors,
        abstract: data.abstract,
        url: data.url,
        source: data.source,
        publishedDate: data.publishedDate,
      },
      select: { id: true },
    })

    return created.id
  } catch (err) {
    console.error('[activeReading] Failed to upsert resolved CandidatePaper:', err)
    return null
  }
}

function buildMetadataFallbackText(data: {
  title: string
  authors: string[]
  abstract: string | null
  note: string
}): string {
  const authorLine = data.authors.length > 0 ? data.authors.join(', ') : 'Unknown authors'
  const abstractLine = data.abstract || 'No abstract available.'

  return `Title: ${data.title}\n\nAuthors: ${authorLine}\n\nAbstract: ${abstractLine}\n\n[${data.note}]`
}

/**
 * Fetch paper content from external sources (primarily ar5iv for arXiv).
 */
export async function fetchPaperContent(candidatePaperId: string): Promise<FetchPaperContentResult> {
  const normalizedIdentifier = normalizePaperIdentifier(candidatePaperId)
  const normalizedPaperRef = normalizedIdentifier.normalized

  const paper = await (prisma as any).candidatePaper.findFirst({
    where: {
      OR: [
        { id: normalizedPaperRef },
        { arxivId: normalizedPaperRef },
        { doi: normalizedPaperRef },
      ]
    },
    select: { id: true, arxivId: true, url: true, title: true, abstract: true }
  })

  if (!paper) {
    if (normalizedIdentifier.kind === 'arxiv' && normalizedIdentifier.arxivId) {
      const arxivText = await fetchArxivTextById(normalizedIdentifier.arxivId)
      if (arxivText) {
        const hydratedId = await upsertResolvedCandidatePaper({
          title: `arXiv:${normalizedIdentifier.arxivId}`,
          authors: [],
          abstract: null,
          url: `https://arxiv.org/abs/${normalizedIdentifier.arxivId}`,
          source: 'arXiv:direct',
          doi: null,
          arxivId: normalizedIdentifier.arxivId,
          publishedDate: null,
        })

        return {
          text: arxivText,
          candidatePaperId: hydratedId,
          status: 'full_text',
          note: null,
        }
      }

      throw new PaperResolutionError(
        `Paper not found or inaccessible for arXiv ID: ${normalizedIdentifier.arxivId}`,
        'UNRESOLVED_IDENTIFIER',
      )
    }

    if (normalizedIdentifier.kind === 'doi' && normalizedIdentifier.doi) {
      const crossrefData = await fetchCrossrefMetadata(normalizedIdentifier.doi)
      if (!crossrefData) {
        throw new PaperResolutionError(
          `Could not resolve DOI: ${normalizedIdentifier.doi}`,
          'UNRESOLVED_IDENTIFIER',
        )
      }

      const unpaywallUrls = await fetchUnpaywallUrls(normalizedIdentifier.doi)
      const candidateUrls = Array.from(
        new Set(
          [...unpaywallUrls, crossrefData.url].filter((url): url is string => Boolean(url)),
        ),
      )

      for (const url of candidateUrls) {
        const text = await fetchReadableTextFromUrl(url, 'doi')
        if (text) {
          const hydratedId = await upsertResolvedCandidatePaper({
            ...crossrefData,
            url,
          })

          return {
            text,
            candidatePaperId: hydratedId,
            status: 'full_text',
            note: null,
          }
        }
      }

      const hydratedId = await upsertResolvedCandidatePaper(crossrefData)
      const note = 'Full text could not be retrieved (likely paywalled). Loaded metadata and abstract instead.'

      return {
        text: buildMetadataFallbackText({
          title: crossrefData.title,
          authors: crossrefData.authors,
          abstract: crossrefData.abstract,
          note,
        }),
        candidatePaperId: hydratedId,
        status: 'metadata_only',
        note,
      }
    }

    if (normalizedIdentifier.kind === 'unknown') {
      throw new PaperResolutionError(
        `Paper not found in database: ${candidatePaperId}`,
        'UNRESOLVED_IDENTIFIER',
      )
    }

    throw new PaperResolutionError('Invalid paper identifier format.', 'INVALID_IDENTIFIER')
  }

  // ArXiv papers are best fetched via ar5iv.org (HTML version)
  if (paper.arxivId) {
    const arxivText = await fetchArxivTextById(paper.arxivId)
    if (arxivText) {
      return {
        text: arxivText,
        candidatePaperId: paper.id,
        status: 'full_text',
        note: null,
      }
    }
  }

  // Try fetching from URL if available
  if (paper.url) {
    const urlText = await fetchReadableTextFromUrl(paper.url, 'paper-url')
    if (urlText) {
      return {
        text: urlText,
        candidatePaperId: paper.id,
        status: 'full_text',
        note: null,
      }
    }
  }

  // Fallback to abstract if full text fails or isn't available
  console.log(`[activeReading] Using abstract fallback for ${paper.title}`)
  const note = 'Full text extraction failed or unavailable for this source. Only abstract/metadata is available.'
  return {
    text: buildMetadataFallbackText({
      title: paper.title,
      authors: [],
      abstract: paper.abstract,
      note,
    }),
    candidatePaperId: paper.id,
    status: 'metadata_only',
    note,
  }
}

/**
 * Split raw paper text into logical sections using Gemini.
 * Max 10 sections to keep context manageable.
 */
export async function sectionPaper(text: string): Promise<PaperSection[]> {
  const system = `You are a research paper segmenter. Your goal is to split a long research paper text into logical sections. Return only valid JSON.`
  const prompt = `Text (truncated to 15k chars):
"${text.slice(0, 15000)}"

Split the text into logical sections (e.g., Abstract, Introduction, Background, Methodology, Results, Discussion, Conclusion).
Return a JSON array of objects: [{"title": "Section Title", "content": "Full section text content"}]
Keep the content verbatim from the input. Do not summarize. If a section is very long, keep the most important parts.`

  const responseText = await callGemini(prompt, system, 0, true, {
    feature: 'section_explanation',
    userId: null,
  })
  return safeParseJson<PaperSection[]>(responseText, [
    { title: 'Full Text', content: text.slice(0, 10000) }
  ])
}

/**
 * Generate an AI response for the reading assistant.
 * Uses the specific paper context and previous messages.
 */
export async function chatWithPaper(
  sessionId: string,
  userMessage: string
): Promise<string> {
  const session = await (prisma as any).paperReadingSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 6 }
    }
  })

  if (!session) throw new Error('Session not found')

  const sections = session.sections as unknown as PaperSection[]
  const sectionContext = sections.map(s => `## ${s.title}\n${s.content.slice(0, 1500)}`).join('\n\n')

  const history = session.messages
    .reverse()
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n')

  const system = `Act as a research reading buddy that helps me deeply understand academic papers and think clearly about them. Your goal is to turn dense research into structured understanding that I can retain and use, not just summarize text. When given a paper, first identify its core problem in simple terms, then explain why that problem matters in its field. Break the paper into clear components: problem setup, key idea or method, technical approach, experiments or evaluation, results, and limitations. For each part, explain both what it is and why it is structured that way in the context of the paper's goal. Prioritize intuition and mental models over surface-level restatement. When technical concepts appear, explain them step-by-step using simple building blocks, and connect them to familiar ideas when possible. If equations, algorithms, or architectures are present, describe their role in the system and how they contribute to the final result, rather than focusing on full derivations unless explicitly requested.

Always extract and clearly state the paper's main contribution in one or two sentences. Then go one level deeper and explain what is actually new compared to prior work, including what assumption it challenges or improves. When discussing results, interpret what the numbers or findings mean in practical terms and what conclusions can and cannot be drawn. Explicitly highlight limitations, failure cases, or constraints the authors acknowledge or imply.

When I ask questions, respond directly using only the paper content and logically grounded reasoning. If a concept is unclear, break it down further instead of repeating the same explanation. If I ask for comparisons between papers, structure the comparison across key dimensions such as problem framing, method, data or assumptions, and performance outcomes. Always emphasize differences in design choices and what trade-offs those choices create.

Maintain a structured, readable format with clear sections and short paragraphs. Avoid unnecessary verbosity, but do not oversimplify to the point of losing technical meaning. Your job is to act like a patient expert who helps me build a correct mental model of the work, step by step, until I can explain it back myself.`

  const prompt = `Paper Context (Sections):
${sectionContext}

Recent Conversation:
${history}

USER: ${userMessage}
ASSISTANT:`

  // Use temperature 0.3 for a balance of precision and helpfulness
  return callGemini(prompt, system, 0.3, false, {
    feature: 'qa_response',
    userId: session.userId,
  })
}

/**
 * Generate a deep methodology breakdown.
 */
export async function getMethodologyBreakdown(sessionId: string): Promise<string> {
  const session = await (prisma as any).paperReadingSession.findUnique({
    where: { id: sessionId }
  })

  if (!session) throw new Error('Session not found')

  const sections = session.sections as unknown as PaperSection[]
  const methodologySection = sections.find(s =>
    /method|approach|experiment|model|architecture/i.test(s.title)
  ) || sections[0]

  const system = `You are a research methodology auditor. Break down the paper's approach into key technical pillars. Use markdown.`
  const prompt = `Paper Content:
Title: ${session.candidatePaperId ?? 'Unknown'}
Content: ${methodologySection.content.slice(0, 4000)}

Analyze the methodology and provide:
1. Study Type (e.g. Randomized controlled, benchmark, theoretical proof)
2. Primary Method/Architecture details
3. Data/Dataset used (if applicable)
4. Evaluation metrics used
5. Key assumptions or limitations stated by the authors.`

  return callGemini(prompt, system, 0, false, {
    feature: 'method_breakdown',
    userId: session.userId,
  })
}
