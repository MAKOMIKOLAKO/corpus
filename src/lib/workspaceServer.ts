import prisma from '@/lib/prisma'
import { extractArxivId, extractSections, fetchArxivFullText, type ExtractedSection } from '@/lib/arxivFetcher'
import { generateStructuredSections } from '@/lib/workspaceSummaries'

type CandidatePaperRecord = {
  id: string
  title: string
  authors: string[]
  abstract: string | null
  url: string | null
  doi: string | null
  arxivId: string | null
  source: string | null
  publishedDate: Date | null
  candidateMetadata: unknown
}

type SessionSummaryRecord = {
  id: string
  sectionIndex: number
  sectionHeading: string
  summaryType: string
  content: string
  inputTokens: number
  outputTokens: number
  generatedAt: Date
}

type WorkspaceMessageRecord = {
  id: string
  role: string
  content: string
  referencedSectionIndices: number[]
  inputTokens: number | null
  outputTokens: number | null
  createdAt: Date
}

type WorkspaceSessionRecord = {
  id: string
  userId: string
  candidatePaperId: string | null
  arxivId: string
  arxivUrl: string
  paperTitle: string
  paperAuthors: string[]
  paperYear: number | null
  paperAbstract: string | null
  fullText: string | null
  fullTextFetchedAt: Date | null
  sections: unknown
  sectionsExtractedAt: Date | null
  createdAt: Date
  lastActivityAt: Date
  summaries?: SessionSummaryRecord[]
  messages?: WorkspaceMessageRecord[]
}

type ArxivMetadata = {
  arxivId: string
  arxivUrl: string
  paperTitle: string
  paperAuthors: string[]
  paperYear: number | null
  paperAbstract: string | null
}

export function parseSections(sections: unknown): ExtractedSection[] | null {
  if (!Array.isArray(sections)) return null
  const normalized = sections
    .filter((section): section is Record<string, unknown> => typeof section === 'object' && section !== null)
    .map((section, index) => ({
      index: typeof section.index === 'number' ? section.index : index,
      heading: typeof section.heading === 'string' && section.heading.trim() ? section.heading : `Section ${index + 1}`,
      text: typeof section.text === 'string' ? section.text : '',
      wordCount: typeof section.wordCount === 'number' ? section.wordCount : (typeof section.text === 'string' ? section.text.split(/\s+/).filter(Boolean).length : 0),
    }))
    .filter((section) => section.text.trim().length > 0)
  return normalized.length > 0 ? normalized : null
}

function yearFromDate(value: Date | null | undefined): number | null {
  return value ? value.getFullYear() : null
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function textBetween(source: string, tag: string): string | null {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match?.[1]) return null
  return decodeXml(match[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/\s+/g, ' ').trim())
}

function collectTags(source: string, tag: string): string[] {
  const matches = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')) ?? []
  return matches
    .map((match) => textBetween(match, tag))
    .filter((value): value is string => Boolean(value))
}

export function isArxivCandidatePaper(paper: Pick<CandidatePaperRecord, 'arxivId' | 'url' | 'candidateMetadata'>): boolean {
  const metadata = (paper.candidateMetadata ?? {}) as Record<string, unknown>
  if (typeof paper.arxivId === 'string' && paper.arxivId.trim()) return true
  if (typeof metadata.arxivId === 'string' && metadata.arxivId.trim()) return true
  if (typeof paper.url === 'string' && paper.url.includes('arxiv.org')) return true
  return false
}

export function getArxivIdFromCandidatePaper(paper: Pick<CandidatePaperRecord, 'arxivId' | 'url' | 'candidateMetadata'>): string | null {
  const metadata = (paper.candidateMetadata ?? {}) as Record<string, unknown>
  if (typeof paper.arxivId === 'string' && paper.arxivId.trim()) return extractArxivId(paper.arxivId)
  if (typeof metadata.arxivId === 'string' && metadata.arxivId.trim()) return extractArxivId(metadata.arxivId)
  if (typeof paper.url === 'string' && paper.url.trim()) return extractArxivId(paper.url)
  return null
}

export async function fetchCandidatePaperForWorkspace(candidatePaperId: string): Promise<CandidatePaperRecord | null> {
  return (prisma as any).candidatePaper.findUnique({
    where: { id: candidatePaperId },
    select: {
      id: true,
      title: true,
      authors: true,
      abstract: true,
      url: true,
      doi: true,
      arxivId: true,
      source: true,
      publishedDate: true,
      candidateMetadata: true,
    },
  })
}

export async function fetchArxivMetadata(arxivId: string): Promise<ArxivMetadata | null> {
  try {
    const response = await fetch(`http://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`, {
      headers: {
        Accept: 'application/atom+xml,text/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) return null

    const xml = await response.text()
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i)
    const entry = entryMatch?.[1]
    if (!entry) return null

    const paperTitle = textBetween(entry, 'title')
    const paperAbstract = textBetween(entry, 'summary')
    const published = textBetween(entry, 'published')
    const paperAuthors = collectTags(entry, 'name')

    return {
      arxivId,
      arxivUrl: `https://arxiv.org/abs/${arxivId}`,
      paperTitle: paperTitle ?? `arXiv:${arxivId}`,
      paperAuthors,
      paperYear: published ? new Date(published).getFullYear() : null,
      paperAbstract,
    }
  } catch (error) {
    console.error('[workspace] Failed to fetch arXiv metadata', error)
    return null
  }
}

export function sessionResponseShape(session: WorkspaceSessionRecord) {
  const sections = parseSections(session.sections)
  const summaries = Array.isArray(session.summaries)
    ? session.summaries.map((summary) => ({
      id: summary.id,
      sectionIndex: summary.sectionIndex,
      sectionHeading: summary.sectionHeading,
      summaryType: summary.summaryType,
      content: summary.content,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      generatedAt: summary.generatedAt,
    }))
    : []

  return {
    id: session.id,
    candidatePaperId: session.candidatePaperId,
    arxivId: session.arxivId,
    arxivUrl: session.arxivUrl,
    paperTitle: session.paperTitle,
    paperAuthors: session.paperAuthors,
    paperYear: session.paperYear,
    paperAbstract: session.paperAbstract,
    hasFullText: Boolean(session.fullText),
    fullTextFetchedAt: session.fullTextFetchedAt,
    sections,
    sectionsExtractedAt: session.sectionsExtractedAt,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    summaries,
  }
}

export async function getWorkspaceSessionOrThrow(sessionId: string, userId: string): Promise<WorkspaceSessionRecord | null> {
  const session = await (prisma as any).paperWorkspaceSession.findUnique({
    where: { id: sessionId },
    include: {
      summaries: {
        orderBy: [{ sectionIndex: 'asc' }, { generatedAt: 'asc' }],
      },
    },
  })

  if (!session || session.userId !== userId) {
    return null
  }

  return session
}

export async function hydrateWorkspaceSession(sessionId: string): Promise<void> {
  try {
    const session = await (prisma as any).paperWorkspaceSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        arxivId: true,
        paperAbstract: true,
        paperTitle: true,
        paperAuthors: true,
        fullTextFetchedAt: true,
        userId: true,
      },
    })

    if (!session || session.fullTextFetchedAt) {
      // If already hydrated, force re-hydration for AI sections
      if (session && session.fullTextFetchedAt) {
        console.log('[workspace] Session already hydrated, forcing re-hydration for AI sections')
      } else {
        return
      }
    }

    console.log('[workspace] Hydrating session', sessionId, 'for arxivId', session.arxivId)

    const result = await fetchArxivFullText(session.arxivId, session.paperAbstract)

    console.log('[workspace] Fetch result for', session.arxivId, {
      source: result.source,
      hasText: Boolean(result.text),
      error: result.error,
      textLength: result.text?.length,
    })

    // Generate AI-structured sections instead of extracting from text
    let sections = null
    if (result.text) {
      try {
        console.log('[workspace] Generating AI-structured sections...')
        console.log('[workspace] Paper title:', session.paperTitle)
        console.log('[workspace] Authors:', session.paperAuthors)
        console.log('[workspace] Abstract length:', session.paperAbstract?.length)
        console.log('[workspace] Full text length:', result.text.length)

        const structuredContent = await generateStructuredSections({
          title: session.paperTitle,
          authors: session.paperAuthors,
          abstract: session.paperAbstract || '',
          fullText: result.text,
          userId: session.userId,
        })

        console.log('[workspace] AI-generated content (first 1000 chars):', structuredContent.content.substring(0, 1000))

        // Parse the markdown sections into ExtractedSection format
        const sectionTexts = structuredContent.content.split(/##\s+/).filter(Boolean)
        console.log('[workspace] Split into', sectionTexts.length, 'sections')

        sections = sectionTexts.map((text, index) => {
          const lines = text.split('\n')
          const heading = lines[0]?.trim() || `Section ${index + 1}`
          const content = lines.slice(1).join('\n').trim()
          const section = {
            index,
            heading,
            text: content,
            wordCount: content.split(/\s+/).filter(Boolean).length,
          }
          console.log('[workspace] Section', index, 'heading:', heading, 'wordCount:', section.wordCount)
          return section
        })

        console.log('[workspace] Final sections:', JSON.stringify(sections.slice(0, 2), null, 2))
      } catch (error) {
        console.error('[workspace] Failed to generate AI sections, falling back to extraction', error)
        sections = result.text ? extractSections(result.text) : null
        console.log('[workspace] Fallback extraction resulted in', sections?.length, 'sections')
      }
    }

    await (prisma as any).paperWorkspaceSession.update({
      where: { id: session.id },
      data: {
        fullText: result.text,
        fullTextFetchedAt: new Date(),
        sections: sections,
        sectionsExtractedAt: sections ? new Date() : null,
        lastActivityAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[workspace] Failed to hydrate workspace session', sessionId, error)
  }
}

export async function findOrCreateWorkspaceSession(params: {
  userId: string
  candidatePaper?: CandidatePaperRecord | null
  arxivId: string
  arxivUrl: string
  paperTitle: string
  paperAuthors: string[]
  paperYear: number | null
  paperAbstract: string | null
}): Promise<WorkspaceSessionRecord> {
  const existing = await (prisma as any).paperWorkspaceSession.findUnique({
    where: {
      userId_arxivId: {
        userId: params.userId,
        arxivId: params.arxivId,
      },
    },
    include: {
      summaries: {
        orderBy: [{ sectionIndex: 'asc' }, { generatedAt: 'asc' }],
      },
    },
  })

  if (existing) {
    await (prisma as any).paperWorkspaceSession.update({
      where: { id: existing.id },
      data: { lastActivityAt: new Date() },
    })
    return existing
  }

  const created = await (prisma as any).paperWorkspaceSession.create({
    data: {
      userId: params.userId,
      candidatePaperId: params.candidatePaper?.id ?? null,
      arxivId: params.arxivId,
      arxivUrl: params.arxivUrl,
      paperTitle: params.paperTitle,
      paperAuthors: params.paperAuthors,
      paperYear: params.paperYear,
      paperAbstract: params.paperAbstract,
      sections: null,
    },
    include: {
      summaries: {
        orderBy: [{ sectionIndex: 'asc' }, { generatedAt: 'asc' }],
      },
    },
  })

  return created
}

export async function upsertCandidatePaperFromArxiv(metadata: ArxivMetadata): Promise<CandidatePaperRecord | null> {
  try {
    return (prisma as any).candidatePaper.upsert({
      where: { arxivId: metadata.arxivId },
      update: {
        title: metadata.paperTitle,
        authors: metadata.paperAuthors,
        abstract: metadata.paperAbstract,
        url: metadata.arxivUrl,
        publishedDate: metadata.paperYear ? new Date(metadata.paperYear, 0, 1) : null,
        source: 'arXiv',
      },
      create: {
        arxivId: metadata.arxivId,
        title: metadata.paperTitle,
        authors: metadata.paperAuthors,
        abstract: metadata.paperAbstract,
        url: metadata.arxivUrl,
        publishedDate: metadata.paperYear ? new Date(metadata.paperYear, 0, 1) : null,
        source: 'arXiv',
      },
      select: {
        id: true,
        title: true,
        authors: true,
        abstract: true,
        url: true,
        doi: true,
        arxivId: true,
        source: true,
        publishedDate: true,
        candidateMetadata: true,
      },
    })
  } catch (error) {
    console.error('[workspace] Failed to upsert candidate paper from arXiv', error)
    return null
  }
}

export function candidatePaperToWorkspaceMetadata(paper: CandidatePaperRecord, arxivId: string) {
  return {
    arxivId,
    arxivUrl: paper.url && paper.url.includes('arxiv.org') ? paper.url.replace('/pdf/', '/abs/').replace(/\.pdf$/i, '') : `https://arxiv.org/abs/${arxivId}`,
    paperTitle: paper.title,
    paperAuthors: paper.authors,
    paperYear: yearFromDate(paper.publishedDate),
    paperAbstract: paper.abstract,
  }
}
