import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prismaWithRetry'
import { getCurrentUserId } from '@/lib/session'
import {
  BibliographyOrdering,
  BibliographyEntry,
  CitationStyle,
  buildRelatedWorkPrompt,
  formatBibliography,
} from '@/lib/bibliography'
import { isPro } from '@/lib/plans'
import { callGemini } from '@/lib/research/geminiResearch'

const ALLOWED_STYLES: CitationStyle[] = ['APA', 'MLA', 'CHICAGO']
const ALLOWED_ORDERINGS: BibliographyOrdering[] = ['ALPHABETICAL', 'CHRONOLOGICAL', 'SELECTION']

async function generateRelatedWorkParagraph(prompt: string, userId: string): Promise<string | null> {
  try {
    const text = await callGemini(prompt, "You are a research writing assistant. Write a formal related work paragraph.", 0.3, false, {
      feature: 'bibliography_related_work',
      userId,
    });
    return text.trim() || null;
  } catch (err) {
    console.error('[bibliography/generate] Related work generation failed:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()

    const userEntryIds = Array.isArray(payload?.userEntryIds) ? payload.userEntryIds : []
    const citationStyle = payload?.citationStyle as CitationStyle
    const ordering = payload?.ordering as BibliographyOrdering
    const groupByType = payload?.groupByType === true
    const includeRelatedWork = payload?.includeRelatedWork === true

    if (!Array.isArray(userEntryIds) || userEntryIds.length < 2 || userEntryIds.length > 200) {
      return NextResponse.json({ error: 'userEntryIds must contain between 2 and 200 ids' }, { status: 400 })
    }

    if (!ALLOWED_STYLES.includes(citationStyle)) {
      return NextResponse.json({ error: 'Invalid citationStyle' }, { status: 400 })
    }

    if (!ALLOWED_ORDERINGS.includes(ordering)) {
      return NextResponse.json({ error: 'Invalid ordering' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!isPro(user.plan)) {
      return NextResponse.json({ error: 'bibliography_pro_only' }, { status: 403 })
    }

    const userEntries = await prisma.userEntry.findMany({
      where: {
        id: { in: userEntryIds },
        userId,
      },
      select: {
        id: true,
        globalEntryId: true,
        globalEntry: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            source: true,
            url: true,
            doi: true,
            isbn: true,
            abstract: true,
            metadata: true,
          },
        },
      },
    })

    if (userEntries.length !== userEntryIds.length) {
      return NextResponse.json({ error: 'Some entries were not found or do not belong to you' }, { status: 403 })
    }

    const entries: BibliographyEntry[] = userEntries.map((item) => ({
      userEntryId: item.id,
      globalEntryId: item.globalEntryId,
      title: item.globalEntry.title,
      authors: item.globalEntry.authors,
      year: item.globalEntry.year,
      source: item.globalEntry.source,
      url: item.globalEntry.url,
      doi: item.globalEntry.doi,
      isbn: item.globalEntry.isbn,
      abstract: item.globalEntry.abstract,
      metadata: (item.globalEntry.metadata || null) as Record<string, any> | null,
    }))

    const formatted = formatBibliography({
      entries,
      style: citationStyle,
      ordering,
      selectionOrder: userEntryIds,
      groupByType,
    })

    let relatedWork: string | null = null
    if (includeRelatedWork) {
      const prompt = buildRelatedWorkPrompt(formatted.processedEntries)
      relatedWork = await generateRelatedWorkParagraph(prompt, userId)
    }

    const missingFieldWarnings = formatted.citations
      .filter((citation) => citation.missingFields.length > 0)
      .map((citation) => ({
        entryId: citation.entryId,
        fields: citation.missingFields,
      }))

    const bibliography = relatedWork
      ? `Related Work\n${relatedWork}\n\n${formatted.bibliography}`
      : formatted.bibliography

    return NextResponse.json({
      bibliography,
      relatedWork,
      citationCount: formatted.citations.length,
      deduplicatedCount: formatted.removedEntryIds.length,
      deduplicatedEntryIds: formatted.removedEntryIds,
      missingFieldWarnings,
      groupedSections: groupByType ? formatted.groupedSections : null,
    })
  } catch (error) {
    console.error('[api/bibliography/generate POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
