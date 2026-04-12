#!/usr/bin/env node

try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config()
} catch {
  // optional
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('[clear-backfill] Deleting CandidatePapers from arXiv, bioRxiv, medRxiv sources...')

  const result = await prisma.candidatePaper.deleteMany({
    where: {
      OR: [
        { source: { startsWith: 'arXiv:' } },
        { source: 'bioRxiv' },
        { source: 'medRxiv' },
      ]
    }
  })

  console.log(`[clear-backfill] Deleted ${result.count} papers from research sources`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
