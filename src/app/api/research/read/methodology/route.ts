import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { getMethodologyBreakdown } from '@/lib/research/activeReading'

/**
 * GET /api/research/read/methodology?sessionId=[id]
 * Generate/fetch the methodology breakdown for a paper session.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  try {
    const readingSession = await (prisma as any).paperReadingSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })
    if (!readingSession || readingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const breakdown = await getMethodologyBreakdown(sessionId)
    return NextResponse.json({ breakdown })
  } catch (err: any) {
    console.error('[methodology-api] Error:', err)
    return NextResponse.json({ error: 'Failed to generate methodology breakdown' }, { status: 500 })
  }
}
