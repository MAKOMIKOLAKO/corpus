import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { workspaceMessageListSchema } from '@/lib/validation'
import { getWorkspaceSessionOrThrow } from '@/lib/workspaceServer'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = workspaceMessageListSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const workspaceSession = await getWorkspaceSessionOrThrow(params.sessionId, session.user.id)
    if (!workspaceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const skip = (parsed.data.page - 1) * parsed.data.limit
    const messages = await (prisma as any).workspaceMessage.findMany({
      where: { sessionId: workspaceSession.id },
      orderBy: { createdAt: 'asc' },
      skip,
      take: parsed.data.limit,
      select: {
        id: true,
        role: true,
        content: true,
        referencedSectionIndices: true,
        createdAt: true,
      },
    })

    const totalCount = await (prisma as any).workspaceMessage.count({
      where: { sessionId: workspaceSession.id },
    })

    return NextResponse.json({
      messages,
      pagination: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        totalCount,
        hasMore: skip + messages.length < totalCount,
      },
    })
  } catch (error) {
    console.error('[workspace-messages] Failed to fetch messages', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
