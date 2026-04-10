import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { recomputeUserProfile, shouldRecompute } from '@/lib/research/interestProfile'

const CRON_SECRET = process.env.CRON_SECRET

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${CRON_SECRET}`
}

async function runProfileRecomputation(): Promise<{
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
    select: {
      id: true,
      researchProfile: {
        select: { lastRecomputedAt: true },
      },
    },
  })

  console.log(`[research-profiles] Found ${activeProUsers.length} active Pro users`)

  for (const user of activeProUsers) {
    try {
      const lastRecomputedAt = user.researchProfile?.lastRecomputedAt ?? null

      if (!shouldRecompute(lastRecomputedAt)) {
        results.skipped++
        continue
      }

      await recomputeUserProfile(user.id)
      results.processed++

      // Brief pause to avoid rate-limiting Gemini embedding API
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      console.error(`[research-profiles] Failed for user ${user.id}:`, err)
      results.failed++
    }
  }

  return results
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    console.log('[research-profiles] Starting profile recomputation...')
    const results = await runProfileRecomputation()
    console.log('[research-profiles] Complete:', results)
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[research-profiles] Fatal error:', err)
    return NextResponse.json({ error: 'Profile recomputation failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
