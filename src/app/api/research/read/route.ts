import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { fetchPaperContent, sectionPaper, chatWithPaper } from '@/lib/research/activeReading'

function normalizePaperId(rawInput: string): string {
  const input = rawInput.trim()

  const doiMatch = input.match(/10\.\d{4,9}\/[\w.()/:;-]+/i)
  if (doiMatch) return doiMatch[0]

  const arxivUrlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i)
  if (arxivUrlMatch) {
    const cleaned = arxivUrlMatch[1].replace(/\.pdf$/i, '').trim()
    const idMatch = cleaned.match(/(\d{4}\.\d{4,5})(?:v\d+)?$/i)
    if (idMatch) return idMatch[1]
    return cleaned
  }

  const ar5ivUrlMatch = input.match(/ar5iv\.org\/abs\/([^?#]+)/i)
  if (ar5ivUrlMatch) {
    const cleaned = ar5ivUrlMatch[1].trim()
    const idMatch = cleaned.match(/(\d{4}\.\d{4,5})(?:v\d+)?$/i)
    if (idMatch) return idMatch[1]
    return cleaned
  }

  const directArxivMatch = input.match(/^(\d{4}\.\d{4,5})(?:v\d+)?$/i)
  if (directArxivMatch) return directArxivMatch[1]

  return input
}

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
  const rawPaperId = searchParams.get('paperId')

  if (!rawPaperId) return NextResponse.json({ error: 'Missing paperId' }, { status: 400 })
  const normalizedPaperId = normalizePaperId(rawPaperId)

  try {
    // Resolve rawPaperId to a CandidatePaper ID and/or GlobalEntry ID
    // The client may pass an arXiv ID (e.g. "2301.00000"), a DOI, or a CUID
    let candidatePaperId: string | null = null
    let globalEntryId: string | null = null

    // Try CandidatePaper lookup by arxivId or id
    const candidatePaper = await (prisma as any).candidatePaper.findFirst({
      where: {
        OR: [
          { id: normalizedPaperId },
          { arxivId: normalizedPaperId },
          { doi: normalizedPaperId },
        ]
      },
      select: { id: true }
    })

    if (candidatePaper) {
      candidatePaperId = candidatePaper.id
    }

    // Try GlobalEntry lookup by id or doi
    const globalEntry = await (prisma as any).globalEntry.findFirst({
      where: {
        OR: [
          { id: normalizedPaperId },
          { doi: normalizedPaperId },
        ]
      },
      select: { id: true }
    })

    if (globalEntry) {
      globalEntryId = globalEntry.id
      // If no candidatePaper found, try linking via GlobalEntry's arxivId
      if (!candidatePaperId) {
        const ge = await (prisma as any).globalEntry.findUnique({
          where: { id: globalEntry.id },
          select: { source: true }
        })
        // Try to find a CandidatePaper with matching source/arxivId
        const arxivMatch = normalizedPaperId.match(/^\d{4}\.\d{4,5}$/)
        if (arxivMatch) {
          const cpByArxiv = await (prisma as any).candidatePaper.findUnique({
            where: { arxivId: normalizedPaperId },
            select: { id: true }
          })
          if (cpByArxiv) candidatePaperId = cpByArxiv.id
        }
      }
    }

    // If neither found, we still try with the raw ID (fetchPaperContent may handle it)
    const effectivePaperId = candidatePaperId || normalizedPaperId

    // 1. Check if session already exists
    let readingSession
    try {
      readingSession = await (prisma as any).paperReadingSession.findFirst({
        where: {
          userId: session.user.id,
          OR: [
            ...(candidatePaperId ? [{ candidatePaperId }] : []),
            ...(globalEntryId ? [{ globalEntryId }] : []),
            { candidatePaperId: normalizedPaperId },
            { globalEntryId: normalizedPaperId },
          ]
        },
        include: {
          messages: { orderBy: { createdAt: 'asc' } }
        }
      })
    } catch (dbErr: any) {
      console.error('[read-api] Database query error:', dbErr)
      return NextResponse.json({ error: 'Database query failed', details: dbErr?.message }, { status: 500 })
    }

    // 2. If not, initialize it
    if (!readingSession) {
      console.log(`[read-api] Initializing new session for paper ${effectivePaperId}`)

      let rawText
      try {
        rawText = await fetchPaperContent(effectivePaperId)
      } catch (fetchErr: any) {
        console.error('[read-api] Fetch paper error:', fetchErr)
        if (fetchErr.message?.includes('Paper not found')) {
          return NextResponse.json({ error: fetchErr.message }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to fetch paper content', details: fetchErr?.message }, { status: 500 })
      }

      let sections
      try {
        sections = await sectionPaper(rawText)
      } catch (sectionErr: any) {
        console.error('[read-api] Section paper error:', sectionErr)
        return NextResponse.json({ error: 'Failed to section paper', details: sectionErr?.message }, { status: 500 })
      }

      try {
        readingSession = await (prisma as any).paperReadingSession.create({
          data: {
            userId: session.user.id,
            ...(candidatePaperId ? { candidatePaperId } : {}),
            ...(globalEntryId ? { globalEntryId } : {}),
            paperText: rawText,
            sections: sections as any,
          },
          include: { messages: true }
        })
      } catch (createErr: any) {
        console.error('[read-api] Create session error:', createErr)
        return NextResponse.json({ error: 'Failed to create session', details: createErr?.message }, { status: 500 })
      }
    }

    return NextResponse.json(readingSession)
  } catch (err: any) {
    console.error('[read-api] Unexpected error:', err)
    console.error('[read-api] Error message:', err?.message)
    console.error('[read-api] Error stack:', err?.stack)
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
