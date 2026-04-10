import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { saveEntryForUser } from '@/lib/globalEntryService'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  })

  if (!user || !isPro(user.plan)) {
    return NextResponse.json(
      { error: 'Pro required', reason: 'research_feed_pro_only' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const candidatePaperId = body?.candidatePaperId as string | undefined

  if (!candidatePaperId) {
    return NextResponse.json({ error: 'candidatePaperId required' }, { status: 400 })
  }

  // Fetch the CandidatePaper
  const paper = await prisma.candidatePaper.findUnique({
    where: { id: candidatePaperId },
  })

  if (!paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  // Map CandidatePaper → GlobalEntryInput and save
  const result = await saveEntryForUser(
    user.id,
    {
      title: paper.title,
      authors: paper.authors,
      year: paper.publishedDate?.getFullYear() ?? null,
      abstract: paper.abstract,
      source: paper.source,
      url: paper.url,
      doi: paper.doi,
      metadata: paper.candidateMetadata as Record<string, unknown> | null,
      rawContentType: 'PAPER',
      addedVia: 'research_feed',
    },
    {
      addedVia: 'research_feed',
    }
  )

  return NextResponse.json({ success: true, ...result })
}
