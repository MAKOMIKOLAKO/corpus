import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { getOrCreateProfile } from '@/lib/research/interestProfile'

export async function GET(request: NextRequest) {
  console.log('[research-debug] Debug endpoint called')
  
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
    return NextResponse.json({ error: 'Pro required' }, { status: 403 })
  }

  try {
    // Check user profile
    const profile = await getOrCreateProfile(user.id)
    
    // Check candidate papers count
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const totalCandidates = await prisma.candidatePaper.count()
    const embeddedCandidates = await prisma.candidatePaper.count({
      where: { embeddedAt: { not: null } }
    })
    const recentCandidates = await prisma.candidatePaper.count({
      where: {
        embeddedAt: { not: null },
        AND: [
          {
            OR: [
              { publishedDate: { gte: sevenDaysAgo } },
              { ingestedAt: { gte: thirtyDaysAgo } },
              { embeddedAt: { gte: thirtyDaysAgo } },
            ],
          },
          {
            OR: [
              { source: { startsWith: 'arXiv:' } },
              { source: { contains: 'arxiv', mode: 'insensitive' } },
              { source: { contains: 'biorxiv', mode: 'insensitive' } },
              { source: { contains: 'medrxiv', mode: 'insensitive' } },
            ],
          },
        ],
      }
    })

    // Check user's saved entries
    const userEntries = await prisma.userEntry.count({
      where: { userId: user.id }
    })

    // Check cached daily brief
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const cachedBrief = await prisma.dailyBrief.findUnique({
      where: { userId_date: { userId: user.id, date: today } }
    })

    // Sample recent candidate papers
    const recentPapers = await prisma.candidatePaper.findMany({
      where: {
        embeddedAt: { not: null },
        publishedDate: { gte: sevenDaysAgo }
      },
      orderBy: { publishedDate: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        source: true,
        publishedDate: true,
        embeddedAt: true,
        doi: true
      }
    })

    const debugInfo = {
      user: {
        id: user.id,
        plan: user.plan,
        entryCount: userEntries
      },
      profile: {
        exists: !!profile,
        hasInterestVector: !!profile.interestVector,
        lastRecomputedAt: profile.lastRecomputedAt,
        domainWeightsCount: Object.keys(profile.domainWeights as Record<string, any> || {}).length,
        dismissedCount: (profile.dismissedPaperIds as string[] || []).length,
        preferredCount: profile.preferredDailyCount
      },
      candidatePapers: {
        total: totalCandidates,
        embedded: embeddedCandidates,
        recentForFeed: recentCandidates,
        sampleRecent: recentPapers
      },
      cache: {
        hasCachedBrief: !!cachedBrief,
        cachedBriefGeneratedAt: cachedBrief?.generatedAt,
        cachedPaperCount: cachedBrief?.selectedPaperIds ? (cachedBrief.selectedPaperIds as string[]).length : 0
      },
      timestamps: {
        now: new Date().toISOString(),
        sevenDaysAgo: sevenDaysAgo.toISOString(),
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
        todayUtc: today.toISOString()
      }
    }

    console.log('[research-debug] Debug info collected:', {
      userId: user.id,
      hasProfile: !!profile,
      hasInterestVector: !!profile.interestVector,
      recentCandidates,
      hasCachedBrief: !!cachedBrief
    })

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error('[research-debug] Error:', error)
    return NextResponse.json({ 
      error: 'Debug query failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
