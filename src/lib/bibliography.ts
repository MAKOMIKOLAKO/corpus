export type CitationStyle = 'APA' | 'MLA' | 'CHICAGO'

export type BibliographyOrdering = 'ALPHABETICAL' | 'CHRONOLOGICAL' | 'SELECTION'

export type SourceType =
  | 'JOURNAL_ARTICLE'
  | 'CONFERENCE_PAPER'
  | 'PREPRINT'
  | 'BOOK'
  | 'WEB_ARTICLE'
  | 'GENERIC'

export interface BibliographyEntry {
  userEntryId: string
  globalEntryId?: string | null
  title?: string | null
  authors?: string[] | null
  year?: number | null
  source?: string | null
  url?: string | null
  doi?: string | null
  isbn?: string | null
  abstract?: string | null
  metadata?: Record<string, any> | null
}

export interface FormattedCitation {
  entryId: string
  sourceType: SourceType
  citation: string
  missingFields: string[]
}

interface ParsedAuthor {
  given: string[]
  family: string | null
  literal: string | null
  isOrganization: boolean
}

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref',
])

const DOI_PATTERN = /^10\.\d{4,9}\/[\w.()/:;-]+$/i

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTHS_SHORT = [
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May',
  'June',
  'July',
  'Aug.',
  'Sept.',
  'Oct.',
  'Nov.',
  'Dec.',
]

function cleanText(value?: string | null): string {
  return (value || '').trim().replace(/\s+/g, ' ')
}

function normalizeForCompare(value?: string | null): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDoi(raw?: string | null): string | null {
  const cleaned = cleanText(raw)
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')

  if (!cleaned) return null
  if (!DOI_PATTERN.test(cleaned)) return null
  return `https://doi.org/${cleaned}`
}

function normalizeUrl(raw?: string | null): string | null {
  const cleaned = cleanText(raw)
  if (!cleaned) return null

  try {
    const url = new URL(cleaned)
    const keptParams = new URLSearchParams()
    url.searchParams.forEach((value, key) => {
      if (key.toLowerCase().startsWith('utm_')) return
      if (TRACKING_PARAMS.has(key.toLowerCase())) return
      keptParams.append(key, value)
    })
    url.search = keptParams.toString()
    url.hash = ''
    return url.toString()
  } catch {
    return cleaned
  }
}

function extractDomain(url?: string | null): string | null {
  const normalized = normalizeUrl(url)
  if (!normalized) return null
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '')
  } catch {
    return null
  }
}

function splitWords(value: string): string[] {
  return value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function isLikelyOrganization(value: string): boolean {
  if (!value) return false
  if (/\b(inc|llc|ltd|university|institute|society|association|agency|department|committee|team|group|center|centre|press)\b/i.test(value)) {
    return true
  }
  const words = splitWords(value)
  if (words.length >= 2 && words.every((word) => /^[A-Z]{2,}$/.test(word))) {
    return true
  }
  return false
}

function parseAuthor(raw: string): ParsedAuthor {
  const cleaned = cleanText(raw).replace(/\bet\s+al\.?$/i, '').trim()
  if (!cleaned) {
    return { given: [], family: null, literal: null, isOrganization: false }
  }

  if (isLikelyOrganization(cleaned)) {
    return { given: [], family: null, literal: cleaned, isOrganization: true }
  }

  if (cleaned.includes(',')) {
    const [familyPart, givenPart] = cleaned.split(',', 2)
    const family = cleanText(familyPart)
    const given = splitWords(cleanText(givenPart))
    if (!family) {
      return { given: [], family: null, literal: cleaned, isOrganization: true }
    }
    return { given, family, literal: null, isOrganization: false }
  }

  const words = splitWords(cleaned)
  if (words.length === 1) {
    return { given: [], family: words[0], literal: null, isOrganization: false }
  }

  const family = words[words.length - 1]
  const given = words.slice(0, -1)
  return { given, family, literal: null, isOrganization: false }
}

function normalizeAuthors(authors?: string[] | null): ParsedAuthor[] {
  return (authors || [])
    .map((author) => parseAuthor(author))
    .filter((author) => author.family || author.literal)
}

function initials(parts: string[]): string {
  return parts
    .map((part) => part.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ')
}

function formatGiven(parts: string[]): string {
  return parts
    .map((part) => part.replace(/\.$/, ''))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

function titleCase(input: string): string {
  const lower = cleanText(input).toLowerCase()
  if (!lower) return '[Untitled]'
  return lower
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function sentenceCase(input: string): string {
  const cleaned = cleanText(input)
  if (!cleaned) return '[Untitled]'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

function getDateParts(entry: BibliographyEntry): { year: number | null; month: number | null; day: number | null } {
  const year = Number.isInteger(entry.year) ? Number(entry.year) : null

  const dateCandidates = [
    entry.metadata?.publishedAt,
    entry.metadata?.publishDate,
    entry.metadata?.date,
    entry.metadata?.publicationDate,
  ]

  for (const candidate of dateCandidates) {
    const text = cleanText(typeof candidate === 'string' ? candidate : '')
    if (!text) continue
    const parsed = new Date(text)
    if (Number.isNaN(parsed.getTime())) continue
    return {
      year: year ?? parsed.getUTCFullYear(),
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate(),
    }
  }

  return { year, month: null, day: null }
}

function formatDate(entry: BibliographyEntry, style: CitationStyle): string {
  const { year, month, day } = getDateParts(entry)

  if (style === 'APA') {
    if (!year) return '(n.d.).'
    if (!month || !day) return `(${year}).`
    return `(${year}, ${MONTHS_LONG[month - 1]} ${day}).`
  }

  if (style === 'MLA') {
    if (!year) return 'n.d.'
    if (!month || !day) return `${year}.`
    return `${day} ${MONTHS_SHORT[month - 1]} ${year}.`
  }

  if (!year) return 'n.d.'
  return `${year}.`
}

function fallbackCreator(entry: BibliographyEntry): string {
  const source = cleanText(entry.source)
  if (source) return source
  const domain = extractDomain(entry.url)
  if (domain) return domain
  return 'Anonymous'
}

function authorLastNameForSort(entry: BibliographyEntry): string | null {
  const authors = normalizeAuthors(entry.authors)
  const first = authors[0]
  if (!first) return null
  if (first.family) return first.family.toLowerCase()
  if (first.literal) return first.literal.toLowerCase()
  return null
}

function authorLastNameForDedup(entry: BibliographyEntry): string {
  const authors = normalizeAuthors(entry.authors)
  const first = authors[0]
  if (!first) return ''
  if (first.family) return first.family.toLowerCase()
  if (first.literal) return normalizeForCompare(first.literal)
  return ''
}

function formatAuthorsAPA(entry: BibliographyEntry): string {
  const authors = normalizeAuthors(entry.authors)
  if (authors.length === 0) return fallbackCreator(entry)

  const formatOne = (author: ParsedAuthor, first: boolean): string => {
    if (author.literal) return author.literal
    if (!author.family) return 'Anonymous'
    if (first) return `${author.family}, ${initials(author.given)}`.trim()
    const givenInitials = initials(author.given)
    return `${givenInitials} ${author.family}`.trim()
  }

  if (authors.length > 20) {
    const firstTwenty = authors.slice(0, 20).map((author, index) => formatOne(author, index === 0))
    return `${firstTwenty.join(', ')}, ... et al.`
  }

  if (authors.length === 1) return formatOne(authors[0], true)
  const formatted = authors.map((author, index) => formatOne(author, index === 0))
  const last = formatted.pop()!
  return `${formatted.join(', ')}, & ${last}`
}

function formatAuthorsMLA(entry: BibliographyEntry): string {
  const authors = normalizeAuthors(entry.authors)
  if (authors.length === 0) return ''

  const first = authors[0]
  if (authors.length > 3) {
    if (first.literal) return `${first.literal}, et al.`
    if (!first.family) return 'Anonymous, et al.'
    return `${first.family}, ${formatGiven(first.given)}, et al.`.replace(/,\s*,/g, ',')
  }

  const formatted = authors.map((author, index) => {
    if (author.literal) return author.literal
    if (!author.family) return 'Anonymous'
    if (index === 0) return `${author.family}, ${formatGiven(author.given)}`.trim()
    return `${formatGiven(author.given)} ${author.family}`.trim()
  })

  return formatted.join(', ')
}

function formatAuthorsChicago(entry: BibliographyEntry): string {
  const authors = normalizeAuthors(entry.authors)
  if (authors.length === 0) return fallbackCreator(entry)

  const formatted = authors.map((author, index) => {
    if (author.literal) return author.literal
    if (!author.family) return 'Anonymous'
    if (index === 0) return `${author.family}, ${formatGiven(author.given)}`.trim()
    return `${formatGiven(author.given)} ${author.family}`.trim()
  })

  if (authors.length > 10) {
    return `${formatted.slice(0, 10).join(', ')}, et al.`
  }

  return formatted.join(', ')
}

function detectSourceType(entry: BibliographyEntry): SourceType {
  const doi = normalizeDoi(entry.doi)
  const url = normalizeUrl(entry.url)
  const source = cleanText(entry.source).toLowerCase()
  const hasArxiv = /arxiv\.org|arxiv:/i.test(`${entry.url || ''} ${JSON.stringify(entry.metadata || {})}`)

  if (hasArxiv) return 'PREPRINT'
  if (entry.isbn) return 'BOOK'
  if (doi && /(conference|proceedings|symposium|workshop|ieee|acm)/i.test(source)) return 'CONFERENCE_PAPER'
  if (doi) return 'JOURNAL_ARTICLE'
  if (url && /(conference|proceedings|symposium|workshop|ieee|acm)/i.test(source)) return 'CONFERENCE_PAPER'
  if (url) return 'WEB_ARTICLE'
  return 'GENERIC'
}

function withTerminalPeriod(value: string): string {
  const text = cleanText(value)
  if (!text) return ''
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function normalizeTitleOutput(title?: string | null, style?: CitationStyle): string {
  const base = cleanText(title) || '[Untitled]'
  if (style === 'APA') return sentenceCase(base)
  return titleCase(base)
}

function normalizeSourceOutput(source?: string | null): string {
  const text = cleanText(source)
  if (!text) return ''
  return `*${text}*`
}

function composeLink(entry: BibliographyEntry): { linkText: string | null; usesDoi: boolean } {
  const normalizedDoi = normalizeDoi(entry.doi)
  if (normalizedDoi) {
    return { linkText: normalizedDoi, usesDoi: true }
  }

  const url = normalizeUrl(entry.url)
  if (url) {
    return { linkText: url, usesDoi: false }
  }

  const malformedDoi = cleanText(entry.doi)
  if (malformedDoi && !normalizeDoi(entry.doi)) {
    return { linkText: malformedDoi, usesDoi: false }
  }

  return { linkText: null, usesDoi: false }
}

function citationMissingFields(entry: BibliographyEntry): string[] {
  const fields: string[] = []
  const authors = normalizeAuthors(entry.authors)
  if (authors.length === 0) fields.push('authors')
  if (!entry.year) fields.push('year')
  if (!cleanText(entry.title)) fields.push('title')
  if (!cleanText(entry.source)) fields.push('source')
  if (!normalizeDoi(entry.doi) && !normalizeUrl(entry.url)) fields.push('url_or_doi')
  return fields
}

export function formatCitation(entry: BibliographyEntry, style: CitationStyle): FormattedCitation {
  const sourceType = detectSourceType(entry)
  const missingFields = citationMissingFields(entry)
  const date = formatDate(entry, style)
  const title = normalizeTitleOutput(entry.title, style)
  const source = normalizeSourceOutput(entry.source)
  const { linkText } = composeLink(entry)

  const mlaAuthor = formatAuthorsMLA(entry)
  const apaAuthor = formatAuthorsAPA(entry)
  const chicagoAuthor = formatAuthorsChicago(entry)

  let citation = ''

  if (style === 'APA') {
    const titlePart = withTerminalPeriod(title)
    const sourcePart = source ? `${source}.` : ''
    const linkPart = linkText ? `${linkText}.` : ''

    if (sourceType === 'BOOK') {
      citation = [apaAuthor, date, `*${title}*.`, linkPart].filter(Boolean).join(' ')
    } else if (sourceType === 'PREPRINT') {
      citation = [apaAuthor, date, `${titlePart} Preprint.`, linkPart].filter(Boolean).join(' ')
    } else {
      citation = [apaAuthor, date, titlePart, sourcePart, linkPart].filter(Boolean).join(' ')
    }
  } else if (style === 'MLA') {
    const quotedTitle = `"${normalizeTitleOutput(entry.title, 'MLA')}"`
    const sourcePart = source || ''
    const linkPart = linkText ? `${linkText}.` : ''

    if (sourceType === 'BOOK') {
      citation = [mlaAuthor || quotedTitle, `*${normalizeTitleOutput(entry.title, 'MLA')}*`, date, linkPart]
        .filter(Boolean)
        .join(', ')
        .replace(/,\s*$/, '')
    } else {
      const firstPart = mlaAuthor ? `${mlaAuthor}. ${quotedTitle}.` : `${quotedTitle}.`
      citation = [firstPart, sourcePart, date, linkPart].filter(Boolean).join(' ')
    }
  } else {
    const quotedTitle = `"${normalizeTitleOutput(entry.title, 'CHICAGO')}"`
    const sourcePart = source ? `${source}.` : ''
    const linkPart = linkText ? `${linkText}.` : ''

    if (sourceType === 'BOOK') {
      citation = [chicagoAuthor, `*${normalizeTitleOutput(entry.title, 'CHICAGO')}*.`, date, linkPart]
        .filter(Boolean)
        .join(' ')
    } else {
      citation = [chicagoAuthor, `${quotedTitle}.`, sourcePart, date, linkPart].filter(Boolean).join(' ')
    }
  }

  return {
    entryId: entry.userEntryId,
    sourceType,
    citation: citation.replace(/\s+/g, ' ').trim(),
    missingFields,
  }
}

function completenessScore(entry: BibliographyEntry): number {
  let score = 0
  if (cleanText(entry.title)) score += 3
  if ((entry.authors || []).length > 0) score += 2
  if (entry.year) score += 2
  if (cleanText(entry.source)) score += 1
  if (normalizeDoi(entry.doi)) score += 3
  if (entry.isbn) score += 2
  if (normalizeUrl(entry.url)) score += 1
  if (cleanText(entry.abstract)) score += 1
  return score
}

function mergeEntries(primary: BibliographyEntry, duplicate: BibliographyEntry): BibliographyEntry {
  return {
    ...primary,
    title: cleanText(primary.title) || duplicate.title,
    authors: (primary.authors && primary.authors.length > 0) ? primary.authors : duplicate.authors,
    year: primary.year ?? duplicate.year,
    source: cleanText(primary.source) || duplicate.source,
    url: normalizeUrl(primary.url) || normalizeUrl(duplicate.url) || primary.url || duplicate.url,
    doi: normalizeDoi(primary.doi) || normalizeDoi(duplicate.doi) || primary.doi || duplicate.doi,
    isbn: cleanText(primary.isbn) || cleanText(duplicate.isbn) || null,
    abstract: cleanText(primary.abstract) || duplicate.abstract,
    metadata: {
      ...(duplicate.metadata || {}),
      ...(primary.metadata || {}),
    },
  }
}

export function deduplicateEntries(entries: BibliographyEntry[]): {
  entries: BibliographyEntry[]
  removedEntryIds: string[]
} {
  const byDoi = new Map<string, BibliographyEntry>()
  const byTitleAuthor = new Map<string, BibliographyEntry>()
  const byUrl = new Map<string, BibliographyEntry>()

  const result: BibliographyEntry[] = []
  const removedEntryIds: string[] = []

  const chooseKeeper = (current: BibliographyEntry, candidate: BibliographyEntry): BibliographyEntry => {
    return completenessScore(candidate) > completenessScore(current) ? candidate : current
  }

  for (const entry of entries) {
    let duplicateTarget: BibliographyEntry | null = null

    const doiKey = normalizeDoi(entry.doi)
    if (doiKey && byDoi.has(doiKey)) duplicateTarget = byDoi.get(doiKey) || null

    if (!duplicateTarget) {
      const titleKey = normalizeForCompare(entry.title)
      const authorKey = authorLastNameForDedup(entry)
      if (titleKey && authorKey) {
        const secondaryKey = `${titleKey}::${authorKey}`
        if (byTitleAuthor.has(secondaryKey)) duplicateTarget = byTitleAuthor.get(secondaryKey) || null
      }
    }

    if (!duplicateTarget) {
      const urlKey = normalizeUrl(entry.url)
      if (urlKey && byUrl.has(urlKey)) duplicateTarget = byUrl.get(urlKey) || null
    }

    if (!duplicateTarget) {
      result.push(entry)
      const normalizedDoi = normalizeDoi(entry.doi)
      const normalizedTitle = normalizeForCompare(entry.title)
      const normalizedAuthor = authorLastNameForDedup(entry)
      const normalizedUrl = normalizeUrl(entry.url)

      if (normalizedDoi) byDoi.set(normalizedDoi, entry)
      if (normalizedTitle && normalizedAuthor) byTitleAuthor.set(`${normalizedTitle}::${normalizedAuthor}`, entry)
      if (normalizedUrl) byUrl.set(normalizedUrl, entry)
      continue
    }

    removedEntryIds.push(entry.userEntryId)

    const keeper = chooseKeeper(duplicateTarget, entry)
    const merged = keeper === duplicateTarget
      ? mergeEntries(duplicateTarget, entry)
      : mergeEntries(entry, duplicateTarget)

    const keeperIndex = result.findIndex((value) => value.userEntryId === duplicateTarget.userEntryId)
    if (keeperIndex !== -1) result[keeperIndex] = merged

    const normalizedDoi = normalizeDoi(merged.doi)
    const normalizedTitle = normalizeForCompare(merged.title)
    const normalizedAuthor = authorLastNameForDedup(merged)
    const normalizedUrl = normalizeUrl(merged.url)

    if (normalizedDoi) byDoi.set(normalizedDoi, merged)
    if (normalizedTitle && normalizedAuthor) byTitleAuthor.set(`${normalizedTitle}::${normalizedAuthor}`, merged)
    if (normalizedUrl) byUrl.set(normalizedUrl, merged)
  }

  return { entries: result, removedEntryIds }
}

export function sortEntries(
  entries: BibliographyEntry[],
  ordering: BibliographyOrdering,
  selectionOrder: string[]
): BibliographyEntry[] {
  if (ordering === 'SELECTION') {
    const orderMap = new Map<string, number>()
    selectionOrder.forEach((id, index) => orderMap.set(id, index))
    return [...entries].sort((a, b) => {
      const aIndex = orderMap.get(a.userEntryId) ?? Number.MAX_SAFE_INTEGER
      const bIndex = orderMap.get(b.userEntryId) ?? Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    })
  }

  if (ordering === 'CHRONOLOGICAL') {
    return [...entries].sort((a, b) => {
      const aDate = getDateParts(a)
      const bDate = getDateParts(b)

      if (!aDate.year && !bDate.year) {
        return (authorLastNameForSort(a) || 'zzzz').localeCompare(authorLastNameForSort(b) || 'zzzz')
      }
      if (!aDate.year) return 1
      if (!bDate.year) return -1

      if (aDate.year !== bDate.year) return aDate.year - bDate.year
      if ((aDate.month || 99) !== (bDate.month || 99)) return (aDate.month || 99) - (bDate.month || 99)
      if ((aDate.day || 99) !== (bDate.day || 99)) return (aDate.day || 99) - (bDate.day || 99)
      return (authorLastNameForSort(a) || 'zzzz').localeCompare(authorLastNameForSort(b) || 'zzzz')
    })
  }

  return [...entries].sort((a, b) => {
    const aAuthor = authorLastNameForSort(a)
    const bAuthor = authorLastNameForSort(b)

    if (!aAuthor && !bAuthor) return cleanText(a.title).localeCompare(cleanText(b.title))
    if (!aAuthor) return 1
    if (!bAuthor) return -1

    if (aAuthor !== bAuthor) return aAuthor.localeCompare(bAuthor)

    const aYear = a.year || Number.MAX_SAFE_INTEGER
    const bYear = b.year || Number.MAX_SAFE_INTEGER
    if (aYear !== bYear) return aYear - bYear

    return cleanText(a.title).localeCompare(cleanText(b.title))
  })
}

export function sourceTypeHeading(sourceType: SourceType): string {
  switch (sourceType) {
    case 'JOURNAL_ARTICLE':
      return 'Journal Articles'
    case 'CONFERENCE_PAPER':
      return 'Conference Papers'
    case 'PREPRINT':
      return 'Preprints'
    case 'BOOK':
      return 'Books'
    case 'WEB_ARTICLE':
      return 'Web Articles'
    default:
      return 'Other Sources'
  }
}

export function formatBibliography(params: {
  entries: BibliographyEntry[]
  style: CitationStyle
  ordering: BibliographyOrdering
  selectionOrder: string[]
  groupByType?: boolean
}): {
  processedEntries: BibliographyEntry[]
  citations: FormattedCitation[]
  bibliography: string
  groupedSections: Array<{ heading: string; citations: string[] }> | null
  removedEntryIds: string[]
} {
  const deduped = deduplicateEntries(params.entries)
  const sorted = sortEntries(deduped.entries, params.ordering, params.selectionOrder)
  const citations = sorted.map((entry) => formatCitation(entry, params.style))

  if (params.groupByType) {
    const grouped = new Map<string, string[]>()
    for (const citation of citations) {
      const heading = sourceTypeHeading(citation.sourceType)
      const list = grouped.get(heading) || []
      list.push(citation.citation)
      grouped.set(heading, list)
    }

    const groupedSections = Array.from(grouped.entries()).map(([heading, citationsForGroup]) => ({
      heading,
      citations: citationsForGroup,
    }))

    const bibliography = groupedSections
      .map((section) => `${section.heading}\n${section.citations.join('\n\n')}`)
      .join('\n\n')

    return {
      processedEntries: sorted,
      citations,
      bibliography,
      groupedSections,
      removedEntryIds: deduped.removedEntryIds,
    }
  }

  return {
    processedEntries: sorted,
    citations,
    bibliography: citations.map((item) => item.citation).join('\n\n'),
    groupedSections: null,
    removedEntryIds: deduped.removedEntryIds,
  }
}

export function buildRelatedWorkPrompt(entries: BibliographyEntry[]): string {
  const lines = entries.map((entry, index) => {
    const title = cleanText(entry.title) || '[Untitled]'
    const abstract = cleanText(entry.abstract) || 'No abstract available.'
    return `${index + 1}. Title: ${title}\n   Abstract: ${abstract}`
  })

  return [
    'You are writing a Related Work paragraph for an academic manuscript.',
    'Read the provided source titles and abstracts.',
    'Identify 3-5 major themes or research threads across the source set.',
    'Write one 150-250 word paragraph titled implicitly as related work or sources overview.',
    'Use academic prose suitable for inclusion in a paper.',
    'Do not fabricate citations or claims tied to specific papers; synthesize themes only.',
    'Return plain text only. No markdown, no bullets, no headings.',
    '',
    'Sources:',
    lines.join('\n'),
  ].join('\n')
}
