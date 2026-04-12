import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = params

  try {
    const readingSession = await (prisma as any).paperReadingSession.findUnique({
      where: { id: sessionId },
      include: {
        candidatePaper: {
          select: {
            id: true,
            title: true,
            authors: true,
            publishedDate: true,
            source: true,
            doi: true,
            arxivId: true,
            url: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    })

    if (!readingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (readingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(readingSession)
  } catch (error) {
    console.error('[reading-session-api] Error:', error)
    return NextResponse.json({ error: 'Failed to load reading session' }, { status: 500 })
  }
}
