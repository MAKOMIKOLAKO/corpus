import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = params

  try {
    const body = await request.json()
    const { notes } = body

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Invalid notes format' }, { status: 400 })
    }

    // Update PaperReadingSession
    const readingSession = await (prisma as any).paperReadingSession.findUnique({
      where: { id: sessionId },
      include: { candidatePaper: true, user: true },
    })

    if (!readingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check ownership
    if (readingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update session notes (add field to schema if needed)
    await (prisma as any).paperReadingSession.update({
      where: { id: sessionId },
      data: { notes },
    })

    // If session is linked to a GlobalEntry via UserEntry, also update UserEntry.notes
    if (readingSession.candidatePaper) {
      const userEntry = await (prisma as any).userEntry.findFirst({
        where: {
          userId: session.user.id,
          globalEntryId: readingSession.candidatePaper.id,
        },
      })

      if (userEntry) {
        await (prisma as any).userEntry.update({
          where: { id: userEntry.id },
          data: { notes },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notes-api] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save notes' },
      { status: 500 }
    )
  }
}
