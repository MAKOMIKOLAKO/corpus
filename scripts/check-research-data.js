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
  console.log('=== Research Feed Debug ===\n')

  // Check embedded papers
  const papers = await prisma.candidatePaper.findMany({
    where: {
      embeddedAt: { not: null },
      publishedDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      OR: [
        { source: { startsWith: 'arXiv:' } },
        { source: { equals: 'bioRxiv' } },
        { source: { equals: 'medRxiv' } },
      ],
    },
    select: {
      id: true,
      title: true,
      source: true,
      publishedDate: true,
      embeddedAt: true,
    },
    orderBy: { publishedDate: 'desc' },
    take: 10,
  })

  console.log(`[1] Embedded papers (last 7 days): ${papers.length}`)
  if (papers.length > 0) {
    papers.forEach(p => {
      console.log(`   - ${p.source} | ${p.publishedDate?.toISOString().split('T')[0]} | ${p.title.substring(0, 60)}...`)
    })
  }

  // Check total embedded papers
  const totalEmbedded = await prisma.candidatePaper.count({
    where: { embeddedAt: { not: null } }
  })
  console.log(`[2] Total embedded papers in DB: ${totalEmbedded}`)

  // Check user research profile
  const users = await prisma.user.findMany({
    where: { plan: { in: ['PRO', 'LIFETIME_PRO'] } },
    select: {
      id: true,
      email: true,
      plan: true,
      researchProfile: {
        select: {
          interestVector: true,
          domainWeights: true,
          lastRecomputedAt: true,
          feedSelectionMode: true,
        }
      }
    },
    take: 5
  })

  console.log(`[3] Pro users with research profiles: ${users.length}`)
  users.forEach(u => {
    const hasProfile = !!u.researchProfile
    const hasInterestVector = !!u.researchProfile?.interestVector
    console.log(`   - ${u.email} | ${u.plan} | profile: ${hasProfile} | interestVector: ${hasInterestVector}`)
    if (hasProfile) {
      console.log(`     lastRecomputedAt: ${u.researchProfile.lastRecomputedAt?.toISOString() || 'never'}`)
      console.log(`     feedSelectionMode: ${u.researchProfile.feedSelectionMode}`)
    }
  })

  // Check daily briefs
  const briefs = await prisma.dailyBrief.findMany({
    orderBy: { date: 'desc' },
    take: 5,
    select: {
      userId: true,
      date: true,
      selectedPaperIds: true,
      generatedAt: true,
    }
  })

  console.log(`[4] Recent daily briefs: ${briefs.length}`)
  briefs.forEach(b => {
    console.log(`   - userId: ${b.userId} | date: ${b.date.toISOString().split('T')[0]} | papers: ${b.selectedPaperIds.length} | generatedAt: ${b.generatedAt.toISOString()}`)
  })
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
