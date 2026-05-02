import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { workspaceSessionListSchema } from '@/lib/validation'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = workspaceSessionListSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const sessions = await (prisma as any).paperWorkspaceSession.findMany({
      where: { userId: session.user.id },
      orderBy: { lastActivityAt: 'desc' },
      take: parsed.data.limit,
      select: {
        id: true,
        arxivId: true,
        arxivUrl: true,
        paperTitle: true,
        paperAuthors: true,
        paperYear: true,
        paperAbstract: true,
        hasFullText: true,
        createdAt: true,
        lastActivityAt: true,
        _count: {
          select: { summaries: true, messages: true },
        },
      },
    })

    return NextResponse.json({
      sessions: sessions.map((s: any) => ({
        id: s.id,
        arxivId: s.arxivId,
        arxivUrl: s.arxivUrl,
        paperTitle: s.paperTitle,
        paperAuthors: s.paperAuthors,
        paperYear: s.paperYear,
        paperAbstract: s.paperAbstract,
        hasFullText: s.hasFullText,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        summaryCount: s._count.summaries,
        messageCount: s._count.messages,
      })),
    })
  } catch (error) {
    console.error('[workspace-sessions] Failed to fetch sessions', error)
    return NextResponse.json({ error: 'Failed to fetch workspace sessions' }, { status: 500 })
  }
}
