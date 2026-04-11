#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const Parser = require('rss-parser')

try {
  require('dotenv').config()
} catch {
  // optional in environments where vars are already injected
}

const prisma = new PrismaClient()
const parser = new Parser({ timeout: 15000 })

const ARXIV_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.NE', 'stat.ML', 'q-bio', 'eess.SP']
const INSERT_BATCH = 200

function parseArgs(argv) {
  const args = {
    arxivMax: 2000,
    biorxivMax: 1000,
    medrxivMax: 1000,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--arxiv-max') args.arxivMax = Math.max(0, parseInt(argv[i + 1] || '0', 10) || 0)
    if (token === '--biorxiv-max') args.biorxivMax = Math.max(0, parseInt(argv[i + 1] || '0', 10) || 0)
    if (token === '--medrxiv-max') args.medrxivMax = Math.max(0, parseInt(argv[i + 1] || '0', 10) || 0)
  }

  return args
}

function normalizeDoi(doi) {
  if (!doi) return null
  return String(doi)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, '')
    .replace(/^doi:/, '')
}

function normalizeTitle(title) {
  if (!title) return null
  return String(title).toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizeFirstAuthor(authors) {
  const first = Array.isArray(authors) && authors.length ? authors[0] : null
  if (!first) return null
  return String(first).toLowerCase().replace(/\s+/g, ' ').trim()
}

async function fetchArxivCategory(category, maxItems) {
  const perPage = 100
  const papers = []

  for (let start = 0; start < maxItems; start += perPage) {
    const take = Math.min(perPage, maxItems - start)
    const url = `https://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}&start=${start}&max_results=${take}&sortBy=submittedDate&sortOrder=descending`

    let feed
    try {
      feed = await parser.parseURL(url)
    } catch (err) {
      console.error(`[backfill] arXiv fetch failed for ${category} start=${start}:`, err.message || err)
      break
    }

    const items = feed.items || []
    if (!items.length) break

    for (const item of items) {
      const idUrl = item.id || item.link || ''
      const arxivMatch = String(idUrl).match(/arxiv\.org\/(?:abs|pdf)\/([^v?#\s]+(?:v\d+)?)/i)
      const arxivId = arxivMatch ? arxivMatch[1] : null

      let authors = []
      if (Array.isArray(item.creator)) {
        authors = item.creator.map((a) => String(a).trim()).filter(Boolean)
      } else if (typeof item.creator === 'string' && item.creator.trim()) {
        authors = item.creator.split(/,|;/).map((a) => a.trim()).filter(Boolean)
      } else if (typeof item.author === 'string' && item.author.trim()) {
        authors = item.author.split(/,|;/).map((a) => a.trim()).filter(Boolean)
      }

      papers.push({
        doi: null,
        arxivId,
        title: String(item.title || '').replace(/\s+/g, ' ').trim(),
        authors,
        abstract: (item.contentSnippet || item.summary || item.content || null)
          ? String(item.contentSnippet || item.summary || item.content).replace(/\s+/g, ' ').trim()
          : null,
        url: item.link || idUrl || null,
        source: `arXiv:${category}`,
        publishedDate: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null,
      })
    }

    await new Promise((r) => setTimeout(r, 400))
  }

  return papers
}

async function fetchBioRxiv(server, maxItems) {
  const papers = []
  let cursor = 0

  while (papers.length < maxItems) {
    const url = `https://api.biorxiv.org/details/${server}/2018-01-01/3000-01-01/${cursor}`
    let json
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.error(`[backfill] ${server} API failed at cursor=${cursor}: ${res.status}`)
        break
      }
      json = await res.json()
    } catch (err) {
      console.error(`[backfill] ${server} request failed at cursor=${cursor}:`, err.message || err)
      break
    }

    const collection = Array.isArray(json?.collection) ? json.collection : []
    if (!collection.length) break

    for (const item of collection) {
      if (papers.length >= maxItems) break
      const authors = String(item.authors || '')
        .split(';')
        .map((a) => a.trim())
        .filter(Boolean)

      papers.push({
        doi: normalizeDoi(item.doi),
        arxivId: null,
        title: String(item.title || '').replace(/\s+/g, ' ').trim(),
        authors,
        abstract: item.abstract ? String(item.abstract).replace(/\s+/g, ' ').trim() : null,
        url: item.doi ? `https://doi.org/${normalizeDoi(item.doi)}` : null,
        source: server,
        publishedDate: item.date ? new Date(item.date) : null,
      })
    }

    cursor += collection.length
    await new Promise((r) => setTimeout(r, 400))
  }

  return papers
}

async function filterExisting(rawPapers) {
  const byKey = new Map()
  for (const p of rawPapers) {
    if (!p.title || p.title.length < 6) continue
    const titleKey = normalizeTitle(p.title)
    const authorKey = normalizeFirstAuthor(p.authors)
    const key = `${titleKey || ''}::${authorKey || ''}`
    if (!byKey.has(key)) byKey.set(key, p)
  }

  const deduped = Array.from(byKey.values())

  const dois = deduped.map((p) => p.doi).filter(Boolean)
  const arxivIds = deduped.map((p) => p.arxivId).filter(Boolean)

  const existing = await prisma.candidatePaper.findMany({
    where: {
      OR: [
        ...(dois.length ? [{ doi: { in: dois } }] : []),
        ...(arxivIds.length ? [{ arxivId: { in: arxivIds } }] : []),
      ],
    },
    select: { doi: true, arxivId: true },
  })

  const existingDoi = new Set(existing.map((e) => e.doi).filter(Boolean))
  const existingArxiv = new Set(existing.map((e) => e.arxivId).filter(Boolean))

  return deduped.filter((p) => {
    if (p.doi && existingDoi.has(p.doi)) return false
    if (p.arxivId && existingArxiv.has(p.arxivId)) return false
    return true
  })
}

async function insertPapers(papers) {
  let inserted = 0
  for (let i = 0; i < papers.length; i += INSERT_BATCH) {
    const batch = papers.slice(i, i + INSERT_BATCH)
    const result = await prisma.candidatePaper.createMany({
      data: batch.map((p) => ({
        doi: p.doi,
        arxivId: p.arxivId,
        title: p.title,
        authors: p.authors,
        abstract: p.abstract,
        url: p.url,
        source: p.source,
        publishedDate: p.publishedDate,
        embeddedAt: null,
      })),
      skipDuplicates: true,
    })
    inserted += result.count
    console.log(`[backfill] inserted batch ${Math.floor(i / INSERT_BATCH) + 1}: +${result.count}`)
  }
  return inserted
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log('[backfill] starting one-time research backfill')
  console.log(`[backfill] targets: arxiv=${args.arxivMax}, biorxiv=${args.biorxivMax}, medrxiv=${args.medrxivMax}`)

  let allPapers = []

  if (args.arxivMax > 0) {
    const perCategory = Math.ceil(args.arxivMax / ARXIV_CATEGORIES.length)
    for (const cat of ARXIV_CATEGORIES) {
      const papers = await fetchArxivCategory(cat, perCategory)
      console.log(`[backfill] arXiv ${cat}: fetched ${papers.length}`)
      allPapers.push(...papers)
    }
  }

  if (args.biorxivMax > 0) {
    const papers = await fetchBioRxiv('biorxiv', args.biorxivMax)
    console.log(`[backfill] bioRxiv: fetched ${papers.length}`)
    allPapers.push(...papers)
  }

  if (args.medrxivMax > 0) {
    const papers = await fetchBioRxiv('medrxiv', args.medrxivMax)
    console.log(`[backfill] medRxiv: fetched ${papers.length}`)
    allPapers.push(...papers)
  }

  console.log(`[backfill] total fetched before dedup: ${allPapers.length}`)

  const candidates = await filterExisting(allPapers)
  console.log(`[backfill] candidates after dedup/existing-filter: ${candidates.length}`)

  const inserted = await insertPapers(candidates)
  console.log(`[backfill] done. inserted=${inserted}, queued_for_embedding=${inserted}`)
  console.log('[backfill] next step: run your cron endpoint repeatedly until embed backlog clears')
}

main()
  .catch((err) => {
    console.error('[backfill] failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
