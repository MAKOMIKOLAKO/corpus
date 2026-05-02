import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { workspaceSummaryRequestSchema } from '@/lib/validation'
import { getWorkspaceSessionOrThrow, parseSections } from '@/lib/workspaceServer'
import { generatePaperOverview, generateSectionSummary } from '@/lib/workspaceSummaries'
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
  const parsed = workspaceSummaryRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
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

    if (parsed.data.summaryType === 'overview') {
      if (parsed.data.regenerate) {
        await (prisma as any).sectionSummary.deleteMany({
          where: {
            sessionId: workspaceSession.id,
            summaryType: 'overview',
          },
        })
      }

      const existing = await (prisma as any).sectionSummary.findFirst({
        where: {
          sessionId: workspaceSession.id,
          summaryType: 'overview',
        },
      })

      if (existing) {
        return NextResponse.json({
          id: existing.id,
          sectionIndex: existing.sectionIndex,
          sectionHeading: existing.sectionHeading,
          summaryType: existing.summaryType,
          content: existing.content,
          inputTokens: existing.inputTokens,
          outputTokens: existing.outputTokens,
          generatedAt: existing.generatedAt,
        })
      }

      const result = await generatePaperOverview({
        title: workspaceSession.paperTitle,
        authors: workspaceSession.paperAuthors,
        abstract: workspaceSession.paperAbstract ?? '',
        fullText: workspaceSession.fullText,
        userId: session.user.id,
        sessionId: workspaceSession.id,
      })

      const created = await (prisma as any).sectionSummary.create({
        data: {
          sessionId: workspaceSession.id,
          sectionIndex: -1,
          sectionHeading: 'Overview',
          summaryType: 'overview',
          content: result.content,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      })

      return NextResponse.json({
        id: created.id,
        sectionIndex: created.sectionIndex,
        sectionHeading: created.sectionHeading,
        summaryType: created.summaryType,
        content: created.content,
        inputTokens: created.inputTokens,
        outputTokens: created.outputTokens,
        generatedAt: created.generatedAt,
      })
    }

    if (parsed.data.summaryType === 'section') {
      if (typeof parsed.data.sectionIndex !== 'number') {
        return NextResponse.json({ error: 'sectionIndex required for section summary' }, { status: 400 })
      }

      const section = sections.find((s: { index: number }) => s.index === parsed.data.sectionIndex)
      if (!section) {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 })
      }

      if (parsed.data.regenerate) {
        await (prisma as any).sectionSummary.deleteMany({
          where: {
            sessionId: workspaceSession.id,
            sectionIndex: parsed.data.sectionIndex,
            summaryType: 'section',
          },
        })
      }

      const existing = await (prisma as any).sectionSummary.findFirst({
        where: {
          sessionId: workspaceSession.id,
          sectionIndex: parsed.data.sectionIndex,
          summaryType: 'section',
        },
      })

      if (existing) {
        return NextResponse.json({
          id: existing.id,
          sectionIndex: existing.sectionIndex,
          sectionHeading: existing.sectionHeading,
          summaryType: existing.summaryType,
          content: existing.content,
          inputTokens: existing.inputTokens,
          outputTokens: existing.outputTokens,
          generatedAt: existing.generatedAt,
        })
      }

      const result = await generateSectionSummary({
        paperTitle: workspaceSession.paperTitle,
        sectionHeading: section.heading,
        sectionText: section.text,
        userId: session.user.id,
        sessionId: workspaceSession.id,
      })

      const created = await (prisma as any).sectionSummary.create({
        data: {
          sessionId: workspaceSession.id,
          sectionIndex: section.index,
          sectionHeading: section.heading,
          summaryType: 'section',
          content: result.content,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      })

      return NextResponse.json({
        id: created.id,
        sectionIndex: created.sectionIndex,
        sectionHeading: created.sectionHeading,
        summaryType: created.summaryType,
        content: created.content,
        inputTokens: created.inputTokens,
        outputTokens: created.outputTokens,
        generatedAt: created.generatedAt,
      })
    }

    return NextResponse.json({ error: 'Invalid summaryType' }, { status: 400 })
  } catch (error) {
    console.error('[workspace-summaries] Failed to generate summary', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
