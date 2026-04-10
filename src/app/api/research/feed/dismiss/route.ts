import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'

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

  // Add to dismissedPaperIds
  await prisma.userResearchProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      dismissedPaperIds: [candidatePaperId],
      domainWeights: {},
      preferredDailyCount: 5,
    },
    update: {
      dismissedPaperIds: {
        push: candidatePaperId,
      },
    },
  })

  return NextResponse.json({ success: true })
}
