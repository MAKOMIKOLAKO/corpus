import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { getDailyBriefCached } from '@/lib/research/feedPipelineV2'
import type { PaperSummaryObject } from '@/lib/research/feedPipelineV2'

export async function GET(
  request: NextRequest,
  { params: _params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const feed = await getDailyBriefCached(user.id)
    if (feed) {
      const needsSummaries = feed.papers.some((p: PaperSummaryObject) => !p.plainSummary || !p.technicalSummary || p.whyExplanation === '')
      if (needsSummaries) {
        return NextResponse.json({ status: 'ready', feed: { ...feed, needsLazySummaries: true } })
      }
      return NextResponse.json({ status: 'ready', feed })
    }
    return NextResponse.json({ status: 'pending', feed: null, reason: 'no_cached_brief' })
  } catch {
    return NextResponse.json({ status: 'failed', feed: null })
  }
}
