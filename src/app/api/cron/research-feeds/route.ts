import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateDailyBrief } from '@/lib/research/feedPipelineV2'
import { verifyCronAuth } from '@/lib/verifyCronAuth'

async function runFeedPreGeneration(): Promise<{
  processed: number
  skipped: number
  failed: number
}> {
  const results = { processed: 0, skipped: 0, failed: 0 }

  // Get active Pro users (logged in within 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const activeProUsers = await prisma.user.findMany({
    where: {
      plan: { in: ['PRO', 'LIFETIME_PRO'] },
      OR: [
        { lastFeedViewedAt: { gte: thirtyDaysAgo } },
        { createdAt: { gte: thirtyDaysAgo } },
      ],
    },
    select: { id: true },
  })

  console.log(`[research-feeds] Found ${activeProUsers.length} active Pro users`)

  for (const user of activeProUsers) {
    try {
      // Check if daily brief already exists for today
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)

      const existingBrief = await prisma.dailyBrief.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
      })

      if (existingBrief) {
        results.skipped++
        continue
      }

      // Pre-generate feed without AI summarization
      await generateDailyBrief(user.id, { skipSummarization: true })
      results.processed++

      // Brief pause to avoid overwhelming the database
      await new Promise((r) => setTimeout(r, 100))
    } catch (err) {
      console.error(`[research-feeds] Failed for user ${user.id}:`, err)
      results.failed++
    }
  }

  return results
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[research-feeds] Starting feed pre-generation...')
    const results = await runFeedPreGeneration()
    console.log('[research-feeds] Complete:', results)
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[research-feeds] Fatal error:', err)
    return NextResponse.json({ error: 'Feed pre-generation failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
