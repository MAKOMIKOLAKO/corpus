import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'

export async function GET(request: NextRequest) {
  console.log('[research-feed-simple] Simple fallback feed called')
  
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
    // Get recent papers without complex scoring
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const recentPapers = await prisma.candidatePaper.findMany({
      where: {
        embeddedAt: { not: null },
        publishedDate: { gte: sevenDaysAgo },
        source: {
          contains: 'arxiv',
          mode: 'insensitive'
        }
      },
      orderBy: { publishedDate: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        authors: true,
        abstract: true,
        source: true,
        publishedDate: true,
        doi: true,
        url: true,
        plainSummary: true,
        technicalSummary: true,
        noveltyTag: true
      }
    })

    console.log(`[research-feed-simple] Returning ${recentPapers.length} recent papers`)

    const simpleFeed = {
      date: new Date().toISOString().split('T')[0],
      userId: user.id,
      preferredCount: 5,
      actualCount: recentPapers.length,
      emergingTrends: null,
      papers: recentPapers.map(paper => ({
        candidatePaperId: paper.id,
        globalEntryId: null,
        title: paper.title,
        authors: paper.authors,
        year: paper.publishedDate?.getFullYear() ?? null,
        publishedDate: paper.publishedDate?.toISOString() ?? null,
        source: paper.source,
        doi: paper.doi,
        url: paper.url,
        plainSummary: paper.plainSummary || 'No summary available',
        technicalSummary: paper.technicalSummary || 'No technical summary available',
        whyExplanation: 'Recent paper from your field of interest',
        noveltyTag: paper.noveltyTag || 'New paper',
        compositeScore: 0.5,
        scoreBreakdown: { semantic: 0.5, domain: 0.5, novelty: 0.5, citation: 0.5, engagement: 0.5 },
        clusterLabel: 'Recent Papers',
        alreadySaved: false,
        openAccessUrl: null
      })),
      clusters: [{
        clusterIndex: 0,
        label: 'Recent Papers',
        paperCount: recentPapers.length,
        representativePaperIds: recentPapers.slice(0, 3).map(p => p.id)
      }],
      generatedAt: new Date().toISOString(),
      fromCache: false,
      isSimpleFeed: true
    }

    return NextResponse.json(simpleFeed)

  } catch (error) {
    console.error('[research-feed-simple] Error:', error)
    return NextResponse.json({ 
      error: 'Simple feed failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
