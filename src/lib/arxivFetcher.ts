import * as cheerio from 'cheerio'

type FetchSource = 'html' | 'abstract_only'

export type ExtractedSection = {
  index: number
  heading: string
  text: string
  wordCount: number
}

const ARXIV_ID_PATTERN = /(\d{4}\.\d{4,5})(?:v\d+)?/
const COMMON_SECTION_NAMES = new Set([
  'introduction',
  'background',
  'related work',
  'method',
  'methodology',
  'approach',
  'model',
  'architecture',
  'experiments',
  'results',
  'evaluation',
  'discussion',
  'conclusion',
  'conclusions',
  'limitations',
  'future work',
  'acknowledgements',
])

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function abortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

function cleanHeading(value: string): string {
  return normalizeWhitespace(value.replace(/^\d+(?:\.\d+)*\s*/, '').replace(/\s+/g, ' '))
}

function looksLikeSectionHeading(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 120) return false

  if (/^\d+(?:\.\d+)*\s+[A-Z]/.test(trimmed)) {
    return true
  }

  const normalized = trimmed.replace(/[:.]+$/, '').toLowerCase()
  if (COMMON_SECTION_NAMES.has(normalized)) {
    return true
  }

  if (/^[A-Z][A-Za-z/&\- ]+$/.test(trimmed) && COMMON_SECTION_NAMES.has(normalized.toLowerCase())) {
    return true
  }

  return false
}

function isReferenceLikeHeading(value: string): boolean {
  const normalized = cleanHeading(value).toLowerCase()
  return ['references', 'bibliography', 'appendix', 'appendices'].includes(normalized)
}

function nodeText($: cheerio.CheerioAPI, element: Parameters<cheerio.CheerioAPI>[0]): string {
  return normalizeWhitespace($(element).text().replace(/\s+/g, ' '))
}

function extractTextFromHtmlDocument(html: string): string | null {
  const $ = cheerio.load(html)

  $('script, style, nav, header, footer, noscript, svg, form, .ltx_role_navigation, .ltx_page_footer, .ltx_page_header, .ltx_bibliography, .ltx_biblist, .references, .reference, .ltx_note_mark, .ltx_note_outer').remove()
  $('figure, figcaption, table, .ltx_table, .ltx_figure').remove()
  $('.ltx_Math, math, mjx-container, .MathJax').replaceWith(' [EQUATION] ')

  const mainRoot = $('main').first().length
    ? $('main').first()
    : $('.ltx_page_main').first().length
      ? $('.ltx_page_main').first()
      : $('.ltx_document').first().length
        ? $('.ltx_document').first()
        : $('article').first().length
          ? $('article').first()
          : $('body')

  const blocks: string[] = []
  let stopAtReferences = false

  mainRoot.find('h1, h2, h3, h4, h5, h6, section, p, li, div.ltx_para').each((_, element) => {
    if (stopAtReferences) return

    const tagName = element.tagName?.toLowerCase() ?? ''
    const text = nodeText($, element)
    if (!text) return

    if (/^h[1-6]$/.test(tagName)) {
      if (isReferenceLikeHeading(text)) {
        stopAtReferences = true
        return
      }
      blocks.push(text)
      return
    }

    if (tagName === 'section') {
      const heading = nodeText($, $(element).children('h1, h2, h3, h4, h5, h6').first().get(0) ?? element)
      if (heading && isReferenceLikeHeading(heading)) {
        stopAtReferences = true
        return
      }
      return
    }

    if (text.length >= 40) {
      blocks.push(text)
    }
  })

  const content = normalizeWhitespace(blocks.join('\n\n'))
  return content.length >= 100 ? content : null
}

async function fetchHtmlText(url: string): Promise<{ text: string | null; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: abortSignal(30000),
    })

    if (!response.ok) {
      return { text: null, error: `${response.status} ${response.statusText}` }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return { text: null, error: 'Non-HTML response' }
    }

    const html = await response.text()
    const text = extractTextFromHtmlDocument(html)
    return text ? { text } : { text: null, error: 'No readable content extracted' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error'
    return { text: null, error: message }
  }
}

export function extractArxivId(url: string): string | null {
  const input = url.trim()
  if (!input) return null

  const directMatch = input.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/)
  if (directMatch) {
    return directMatch[0].replace(/v\d+$/, '')
  }

  const normalized = input.replace(/^https?:\/\//i, '')
  const patterns = [
    /arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?/i,
    /ar5iv\.labs\.arxiv\.org\/html\/(\d{4}\.\d{4,5})(?:v\d+)?/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    const id = match?.[1]
    if (id) return id
  }

  const fallback = input.match(ARXIV_ID_PATTERN)
  return fallback?.[1] ?? null
}

export async function fetchArxivFullText(arxivId: string, abstractText?: string | null): Promise<{ text: string | null; source: FetchSource; error?: string }> {
  // Try ar5iv first (more reliable HTML conversion)
  const ar5iv = await fetchHtmlText(`https://ar5iv.labs.arxiv.org/html/${arxivId}`)
  if (ar5iv.text) {
    return { text: ar5iv.text, source: 'html' }
  }

  // Fallback to official arXiv HTML
  const official = await fetchHtmlText(`https://arxiv.org/html/${arxivId}`)
  if (official.text) {
    return { text: official.text, source: 'html' }
  }

  // Log errors for debugging
  console.error('[arxivFetcher] Failed to fetch full text for', arxivId, {
    ar5ivError: ar5iv.error,
    officialError: official.error,
  })

  return {
    text: abstractText?.trim() ? abstractText.trim() : null,
    source: 'abstract_only',
    error: `Full text unavailable (${ar5iv.error || official.error || 'unknown error'}) — showing abstract only`,
  }
}

export function extractSections(fullText: string): ExtractedSection[] {
  const lines = fullText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const sectionStarts: Array<{ heading: string; lineIndex: number }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (looksLikeSectionHeading(line)) {
      if (!sectionStarts.some((existing) => existing.lineIndex === index)) {
        sectionStarts.push({ heading: line, lineIndex: index })
      }
    }
  }

  if (sectionStarts.length === 0) {
    const text = normalizeWhitespace(fullText)
    return text
      ? [{ index: 0, heading: 'Full Paper', text, wordCount: text.split(/\s+/).length }]
      : []
  }

  const sections: ExtractedSection[] = []

  for (let index = 0; index < sectionStarts.length; index += 1) {
    const current = sectionStarts[index]
    const next = sectionStarts[index + 1]
    const sectionLines = lines.slice(current.lineIndex + 1, next?.lineIndex ?? lines.length)
    const text = normalizeWhitespace(sectionLines.join('\n\n'))
    if (!text) continue

    sections.push({
      index: sections.length,
      heading: cleanHeading(current.heading) || `Section ${sections.length + 1}`,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    })
  }

  if (sections.length === 0) {
    const text = normalizeWhitespace(fullText)
    return text
      ? [{ index: 0, heading: 'Full Paper', text, wordCount: text.split(/\s+/).length }]
      : []
  }

  const merged: ExtractedSection[] = []
  for (const section of sections) {
    if (section.text.length < 100 && merged.length > 0) {
      const previous = merged[merged.length - 1]
      previous.text = normalizeWhitespace(`${previous.text}\n\n${section.heading}\n${section.text}`)
      previous.wordCount = previous.text.split(/\s+/).filter(Boolean).length
      continue
    }
    merged.push({ ...section, index: merged.length })
  }

  if (merged.length === 0) {
    const text = normalizeWhitespace(fullText)
    return [{ index: 0, heading: 'Full Paper', text, wordCount: text.split(/\s+/).length }]
  }

  return merged
}
