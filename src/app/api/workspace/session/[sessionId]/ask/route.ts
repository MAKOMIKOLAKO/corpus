import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { workspaceAskSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { getWorkspaceSessionOrThrow, parseSections } from '@/lib/workspaceServer'
import { generateQAResponse, selectRelevantSections } from '@/lib/workspaceSummaries'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = workspaceAskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const rateLimitKey = `workspace-qa:${session.user.id}`
  const rateLimitResult = rateLimit(rateLimitKey, 20, 10 * 60 * 1000)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many questions', retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000) },
      { status: 429 }
    )
  }

  try {
    const workspaceSession = await getWorkspaceSessionOrThrow(params.sessionId, session.user.id)
    if (!workspaceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sections = parseSections(workspaceSession.sections)
    if (!sections || sections.length === 0) {
      return NextResponse.json({ error: 'Paper sections not available yet' }, { status: 400 })
    }

    const userMessage = await (prisma as any).workspaceMessage.create({
      data: {
        sessionId: workspaceSession.id,
        role: 'user',
        content: parsed.data.question,
        referencedSectionIndices: [],
        inputTokens: null,
        outputTokens: null,
      },
    })

    const relevantSections = selectRelevantSections(parsed.data.question, sections)

    const history = await (prisma as any).workspaceMessage.findMany({
      where: { sessionId: workspaceSession.id },
      orderBy: { createdAt: 'asc' },
      take: 8,
      select: { role: true, content: true },
    })

    const result = await generateQAResponse({
      paperTitle: workspaceSession.paperTitle,
      question: parsed.data.question,
      relevantSections,
      messageHistory: history,
      userId: session.user.id,
      sessionId: workspaceSession.id,
    })

    const assistantMessage = await (prisma as any).workspaceMessage.create({
      data: {
        sessionId: workspaceSession.id,
        role: 'assistant',
        content: result.content,
        referencedSectionIndices: result.referencedSectionIndices,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    })

    await (prisma as any).paperWorkspaceSession.update({
      where: { id: workspaceSession.id },
      data: { lastActivityAt: new Date() },
    })

    return NextResponse.json({
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        referencedSectionIndices: userMessage.referencedSectionIndices,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        referencedSectionIndices: assistantMessage.referencedSectionIndices,
        createdAt: assistantMessage.createdAt,
      },
    })
  } catch (error) {
    console.error('[workspace-ask] Failed to generate Q&A response', error)
    return NextResponse.json({ error: 'Failed to generate Q&A response' }, { status: 500 })
  }
}
