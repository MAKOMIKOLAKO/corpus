import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const preferredDailyCount = body?.preferredDailyCount as number | undefined

  if (
    preferredDailyCount === undefined ||
    !Number.isInteger(preferredDailyCount) ||
    preferredDailyCount < 3 ||
    preferredDailyCount > 10
  ) {
    return NextResponse.json(
      { error: 'preferredDailyCount must be an integer between 3 and 10' },
      { status: 400 }
    )
  }

  const profile = await prisma.userResearchProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      preferredDailyCount,
      dismissedPaperIds: [],
      domainWeights: {},
    },
    update: { preferredDailyCount },
  })

  return NextResponse.json(profile)
}
