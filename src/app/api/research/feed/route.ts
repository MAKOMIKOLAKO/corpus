import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { rateLimit } from '@/lib/rateLimit'
import { getDailyBriefCached, generateDailyBrief } from '@/lib/research/feedPipeline'

// In-memory job tracking (per-process; cleared on restart)
// Sufficient for single-user scenario — brief is persisted to DB once done.
const pendingJobs = new Map<string, Promise<any>>()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!isPro(user.plan)) {
    return NextResponse.json(
      { error: 'Pro required', reason: 'research_feed_pro_only' },
      { status: 403 }
    )
  }

  // Rate limit: 10 requests per user per hour
  const rl = rateLimit(`research-feed:${user.id}`, 10, 60 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  }

  // Check for cached brief first
  const cached = await getDailyBriefCached(user.id)
  if (cached) {
    return NextResponse.json(cached)
  }

  // No existing brief — check if a job is already running
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const jobId = `${user.id}-${today.toISOString().split('T')[0]}`

  if (pendingJobs.has(jobId)) {
    // Job already in progress — return 202 so client polls
    return NextResponse.json({ status: 'pending', jobId }, { status: 202 })
  }

  // Start generation with a 10-second timeout check
  const startTime = Date.now()

  // For fast connections: attempt synchronous generation first with 10s timeout
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 9500)
  )

  const generatePromise = generateDailyBrief(user.id).catch((err) => {
    console.error(`[feed/route] Generation failed for ${user.id}:`, err)
    return null
  })

  // Race: if generation completes within ~9.5s, return it directly
  const raceResult = await Promise.race([generatePromise, timeoutPromise])

  if (raceResult !== null && Date.now() - startTime < 9500) {
    return NextResponse.json(raceResult)
  }

  // Generation is taking too long — run it in the background, return 202
  if (!pendingJobs.has(jobId)) {
    const bgJob = generateDailyBrief(user.id)
      .catch((err) => console.error(`[feed/route] Background generation failed:`, err))
      .finally(() => pendingJobs.delete(jobId))

    pendingJobs.set(jobId, bgJob)
  }

  return NextResponse.json({ status: 'pending', jobId }, { status: 202 })
}
