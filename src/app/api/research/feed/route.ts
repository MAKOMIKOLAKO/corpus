import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { rateLimit } from '@/lib/rateLimit'
import { getDailyBriefCached, generateDailyBrief, type FeedOverrides, type PaperSummaryObject } from '@/lib/research/feedPipelineV2'

export async function GET(request: NextRequest) {
  try {
    return await handleGet(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[research-feed] Unhandled route error:', { message, stack })
    return NextResponse.json(
      { error: 'Research feed failed', details: message },
      { status: 500 }
    )
  }
}

async function handleGet(request: NextRequest) {
  console.log('[research-feed] API called')

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    console.log('[research-feed] Unauthorized - no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  })

  if (!user) {
    console.log('[research-feed] User not found:', session.user.email)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  console.log('[research-feed] User found:', { userId: user.id, plan: user.plan })

  if (!isPro(user.plan)) {
    console.log('[research-feed] Access denied - not Pro plan:', user.plan)
    return NextResponse.json(
      { error: 'Pro required', reason: 'research_feed_pro_only' },
      { status: 403 }
    )
  }

  // Rate limit: 10 requests per user per hour
  const rl = rateLimit(`research-feed:${user.id}`, 10, 60 * 60 * 1000)
  if (!rl.success) {
    console.log('[research-feed] Rate limit exceeded for user:', user.id)
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  }

  // Parse selection mode overrides from query params
  const { searchParams } = new URL(request.url)
  const modeOverride = searchParams.get('mode') as 'profile' | 'collection' | 'phrase' | null
  const collectionIdOverride = searchParams.get('collectionId')
  const phraseOverride = searchParams.get('phrase')
  const forceRefresh = searchParams.get('refresh') === '1'

  console.log('[research-feed] Request params:', {
    modeOverride,
    collectionIdOverride,
    phraseOverride,
    forceRefresh
  })

  // Check for cached brief first. Keep feed stable across page reloads;
  // only regenerate when explicitly requested via refresh=1.
  const hasOverrides = modeOverride || collectionIdOverride || phraseOverride
  if (!forceRefresh && !hasOverrides) {
    console.log('[research-feed] Checking for cached feed...')
    try {
      const cached = await getDailyBriefCached(user.id)
      if (cached) {
        console.log('[research-feed] Found cached feed:', {
          paperCount: cached.papers.length,
          fromCache: cached.fromCache,
          generatedAt: cached.generatedAt
        })
        // Check if feed has summaries (if not, it was pre-generated via cron)
        const needsSummaries = cached.papers.some((p: PaperSummaryObject) => !p.plainSummary || !p.technicalSummary || p.whyExplanation === '')
        if (needsSummaries) {
          console.log('[research-feed] Feed needs lazy summaries')
          // Return feed without summaries, frontend will lazy-load them
          return NextResponse.json({ ...cached, needsLazySummaries: true })
        }
        console.log('[research-feed] Returning cached feed with summaries')
        return NextResponse.json(cached)
      }
      console.log('[research-feed] No cached feed found')
    } catch (err) {
      console.error('[research-feed] Cached feed lookup failed, continuing with fresh generation:', err)
    }
  } else {
    console.log('[research-feed] Skipping cache due to overrides or refresh')
  }

  const overrides: FeedOverrides | undefined = hasOverrides
    ? { mode: modeOverride || undefined, collectionId: collectionIdOverride || undefined, phrase: phraseOverride || undefined }
    : undefined

  console.log('[research-feed] Using overrides:', overrides)

  const fresh = await generateDailyBrief(user.id, overrides)
  return NextResponse.json(fresh)
}
