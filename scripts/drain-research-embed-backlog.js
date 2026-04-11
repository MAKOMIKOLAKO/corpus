#!/usr/bin/env node

try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config()
} catch {
  // optional
}

function parseArgs(argv) {
  const args = {
    endpoint: process.env.RESEARCH_INGEST_URL || 'https://usecorpus.app/api/cron/research-ingest',
    token: process.env.CRON_SECRET || '',
    maxRuns: Number(process.env.BACKLOG_MAX_RUNS || 50),
    sleepMs: Number(process.env.BACKLOG_SLEEP_MS || 4000),
    stopOnNoProgress: true,
  }

  const positional = []

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--endpoint' && argv[i + 1]) {
      args.endpoint = argv[i + 1]
      i += 1
      continue
    }
    if (token === '--token' && argv[i + 1]) {
      args.token = argv[i + 1]
      i += 1
      continue
    }
    if (token === '--max-runs' && argv[i + 1]) {
      args.maxRuns = Math.max(1, parseInt(argv[i + 1], 10) || args.maxRuns)
      i += 1
      continue
    }
    if (token === '--sleep-ms' && argv[i + 1]) {
      args.sleepMs = Math.max(0, parseInt(argv[i + 1], 10) || args.sleepMs)
      i += 1
      continue
    }
    if (token === '--no-stop-on-no-progress') {
      args.stopOnNoProgress = false
      continue
    }

    if (!token.startsWith('--')) {
      positional.push(token)
    }
  }

  if (!args.token && positional.length > 0) {
    args.token = positional[0]
  }

  return args
}

async function sleep(ms) {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function runOnce(endpoint, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(endpoint, { method: 'POST', headers })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  return res.json()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.token) {
    console.error('Missing cron token. Provide --token or set CRON_SECRET env var.')
    process.exit(1)
  }

  console.log('[drain] starting embed backlog drain')
  console.log(`[drain] endpoint=${args.endpoint}`)
  console.log(`[drain] maxRuns=${args.maxRuns}, sleepMs=${args.sleepMs}`)

  let totalEmbedded = 0

  for (let run = 1; run <= args.maxRuns; run += 1) {
    console.log(`\n[drain] run ${run}/${args.maxRuns}`)

    let result
    try {
      result = await runOnce(args.endpoint, args.token)
    } catch (err) {
      console.error('[drain] run failed:', err.message || err)
      process.exit(1)
    }

    const embedded = Number(result.embedded || 0)
    const failed = Number(result.embedFailed || 0)
    const rssPapers = Number(result.rssPapers || 0)
    const arxivPapers = Number(result.arxivPapers || 0)
    const biorxivPapers = Number(result.biorxivPapers || 0)

    totalEmbedded += embedded

    console.log('[drain] result:', { arxivPapers, biorxivPapers, rssPapers, embedded, failed })

    if (failed > 0) {
      console.warn('[drain] stopping: embed failures detected')
      process.exit(2)
    }

    if (embedded === 0) {
      if (args.stopOnNoProgress) {
        console.log('[drain] stopping: no embedding progress this run (likely backlog drained)')
        break
      }
    }

    if (run < args.maxRuns) {
      await sleep(args.sleepMs)
    }
  }

  console.log(`\n[drain] complete. totalEmbedded=${totalEmbedded}`)
}

main().catch((err) => {
  console.error('[drain] fatal:', err)
  process.exit(1)
})
