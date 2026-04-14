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
const BASE_RETRY_MS = 1500
const MAX_RETRY_MS = 30000

async function sleep(ms) {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

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

function computeBackoffMs(attempt, retryAfterHeader) {
  const retryAfterSeconds = Number(retryAfterHeader)
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(MAX_RETRY_MS, retryAfterSeconds * 1000)
  }
  const jitter = Math.floor(Math.random() * 1000)
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * Math.pow(2, attempt) + jitter)
}

async function fetchWithRetry(url, maxRetries = 6) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res

    if (res.status === 429 || res.status >= 500) {
      const waitTime = computeBackoffMs(attempt, res.headers.get('retry-after'))
      console.log(
        `[backfill] HTTP ${res.status} for ${url}. Waiting ${Math.round(waitTime)}ms before retry ${attempt + 1}/${maxRetries}`
      )
      await sleep(waitTime)
      continue
    }

    // Other errors: fail fast
    return res
  }
  throw new Error(`Max retries exceeded for ${url}`)
}

async function parseFeedWithRetry(url, maxRetries = 6) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await parser.parseURL(url)
    } catch (err) {
      const message = err && err.message ? String(err.message) : String(err)
      const likelyRateLimited = /429|too many requests|rate limit|econnreset|etimedout/i.test(message)
      if (!likelyRateLimited || attempt === maxRetries - 1) {
        throw err
      }
      const waitTime = computeBackoffMs(attempt)
      console.log(
        `[backfill] RSS parse retry for ${url} after error "${message}". Waiting ${Math.round(waitTime)}ms (${attempt + 1}/${maxRetries})`
      )
      await sleep(waitTime)
    }
  }
  throw new Error(`Max RSS retries exceeded for ${url}`)
}

// FUTURE: Enable batch abstract fetching from arXiv API when needed
// The arXiv RSS feeds only provide abstract snippets, not full abstracts.
// To fetch full abstracts, use the arXiv API with batch requests:
// https://export.arxiv.org/api/query?id_list=ID1,ID2,ID3
// This requires:
// 1. Collecting all arxivIds from the RSS feed
// 2. Batch fetching abstracts in groups of 50-100
// 3. Adding retry logic with exponential backoff for rate limiting (HTTP 429)
// 4. Parsing the XML response to extract <summary> tags for each paper
// See the commented-out fetchArxivAbstracts function for implementation details.

async function fetchArxivCategory(category, maxItems) {
  const perPage = 100
  const papers = []

  for (let start = 0; start < maxItems; start += perPage) {
    const take = Math.min(perPage, maxItems - start)
    const url = `https://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}&start=${start}&max_results=${take}&sortBy=submittedDate&sortOrder=descending`

    let feed
    try {
      feed = await parseFeedWithRetry(url)
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

      // Use RSS snippet abstract (not full abstract)
      // FUTURE: Replace with batch-fetched full abstracts when needed
      const abstract = (item.contentSnippet || item.summary || item.content || null)
        ? String(item.contentSnippet || item.summary || item.content).replace(/\s+/g, ' ').trim()
        : null

      papers.push({
        doi: null,
        arxivId,
        title: String(item.title || '').replace(/\s+/g, ' ').trim(),
        authors,
        abstract,
        url: item.link || idUrl || null,
        source: `arXiv:${category}`,
        publishedDate: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null,
      })
    }

    await sleep(900)
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
      const res = await fetchWithRetry(url)
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
    await sleep(900)
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
    select: { id: true, doi: true, arxivId: true, abstract: true },
  })

  const existingByDoi = new Map(existing.filter(e => e.doi).map(e => [e.doi, e]))
  const existingByArxiv = new Map(existing.filter(e => e.arxivId).map(e => [e.arxivId, e]))

  // Return all papers with existingId attached for updates
  return deduped.map(p => {
    // Add existing ID if this is an update
    if (p.doi) {
      const existing = existingByDoi.get(p.doi)
      if (existing) return { ...p, existingId: existing.id }
    }
    if (p.arxivId) {
      const existing = existingByArxiv.get(p.arxivId)
      if (existing) return { ...p, existingId: existing.id }
    }
    return p
  })
}

async function insertPapers(papers) {
  let inserted = 0
  let updated = 0
  for (let i = 0; i < papers.length; i += INSERT_BATCH) {
    const batch = papers.slice(i, i + INSERT_BATCH)

    // Separate into new papers and updates
    const newPapers = batch.filter(p => !p.existingId)
    const updatePapers = batch.filter(p => p.existingId)

    // Insert new papers
    if (newPapers.length > 0) {
      const result = await prisma.candidatePaper.createMany({
        data: newPapers.map((p) => ({
          doi: p.doi,
          arxivId: p.arxivId,
          title: p.title,
          authors: p.authors,
          abstract: p.abstract,
          url: p.url,
          source: p.source,
          publishedDate: p.publishedDate,
        })),
        skipDuplicates: true,
      })
      inserted += result.count
      console.log(`[backfill] inserted batch ${Math.floor(i / INSERT_BATCH) + 1}: +${result.count} new`)
    }

    // Update existing papers with abstracts
    for (const p of updatePapers) {
      try {
        await prisma.candidatePaper.update({
          where: { id: p.existingId },
          data: { abstract: p.abstract }
        })
        updated++
      } catch (err) {
        console.error(`[backfill] Failed to update paper ${p.existingId}:`, err)
      }
    }

    if (updated > 0) {
      console.log(`[backfill] updated batch ${Math.floor(i / INSERT_BATCH) + 1}: +${updated} with abstracts`)
    }

    await sleep(250)
  }
  return { inserted, updated }
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

  const result = await insertPapers(candidates)
  console.log(`[backfill] done. inserted=${result.inserted}, updated=${result.updated}, queued_for_embedding=${result.inserted}`)
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
