import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prismaWithRetry'
import { getCurrentUserId } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    const title = typeof payload?.title === 'string' ? payload.title.trim() : null
    const content = typeof payload?.content === 'string' ? payload.content.trim() : ''
    const relatedWorkParagraph = typeof payload?.relatedWorkParagraph === 'string' ? payload.relatedWorkParagraph.trim() : null
    const citationStyle = typeof payload?.citationStyle === 'string' ? payload.citationStyle.trim() : ''
    const ordering = typeof payload?.ordering === 'string' ? payload.ordering.trim() : ''
    const entryIds = Array.isArray(payload?.userEntryIds)
      ? payload.userEntryIds.filter((id: unknown) => typeof id === 'string' && id.trim())
      : []

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    if (!citationStyle || !ordering) {
      return NextResponse.json({ error: 'citationStyle and ordering are required' }, { status: 400 })
    }

    if (entryIds.length === 0) {
      return NextResponse.json({ error: 'userEntryIds is required' }, { status: 400 })
    }

    const saved = await (prisma as any).generatedBibliography.create({
      data: {
        userId,
        title: title || null,
        entryIds,
        citationStyle,
        ordering,
        content,
        relatedWorkParagraph,
      },
    })

    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    console.error('[api/bibliography/save POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
