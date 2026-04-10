import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { fetchPaperContent, sectionPaper, chatWithPaper } from '@/lib/research/activeReading'

/**
 * GET /api/research/read?paperId=[id]
 * Fetch or initialize a reading session for a specific paper.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check Pro status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true }
  })
  if (user?.plan === 'FREE') return NextResponse.json({ error: 'Pro feature' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const paperId = searchParams.get('paperId')

  if (!paperId) return NextResponse.json({ error: 'Missing paperId' }, { status: 400 })

  try {
    // 1. Check if session already exists
    let readingSession = await (prisma as any).paperReadingSession.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          { candidatePaperId: paperId },
          { globalEntryId: paperId }
        ]
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    })

    // 2. If not, initialize it
    if (!readingSession) {
      console.log(`[read-api] Initializing new session for paper ${paperId}`)

      const rawText = await fetchPaperContent(paperId)
      const sections = await sectionPaper(rawText)

      readingSession = await (prisma as any).paperReadingSession.create({
        data: {
          userId: session.user.id,
          candidatePaperId: paperId, // assume candidateId for now
          paperText: rawText,
          sections: sections as any,
        },
        include: { messages: true }
      })
    }

    return NextResponse.json(readingSession)
  } catch (err: any) {
    console.error('[read-api] Session error:', err)
    console.error('[read-api] Error message:', err?.message)
    console.error('[read-api] Error stack:', err?.stack)
    if (err.message?.includes('Paper not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to initialize session', details: err?.message }, { status: 500 })
  }
}

/**
 * POST /api/research/read
 * Send a message to the assistant.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId, message } = await request.json()
    if (!sessionId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // 1. Save user message
    await (prisma as any).paperReadingMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message
      }
    })

    // 2. Generate AI response
    const aiResponse = await chatWithPaper(sessionId, message)

    // 3. Save AI response
    const savedAiMessage = await (prisma as any).paperReadingMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: aiResponse
      }
    })

    return NextResponse.json(savedAiMessage)
  } catch (err: any) {
    console.error('[read-api] Chat error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
