import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { rateLimit } from '@/lib/rateLimit'
import { generatePaperSummaries, type PaperMetadata } from '@/lib/research/geminiResearch'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!isPro(user.plan)) {
    return NextResponse.json(
      { error: 'Pro required', reason: 'research_feed_pro_only' },
      { status: 403 }
    )
  }

  // Rate limit: 50 requests per user per hour (higher than feed generation since this is just fetching summaries)
  const rl = rateLimit(`research-summaries:${user.id}`, 50, 60 * 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { paperIds } = body

    if (!Array.isArray(paperIds) || paperIds.length === 0) {
      return NextResponse.json({ error: 'Invalid paperIds' }, { status: 400 })
    }

    if (paperIds.length > 20) {
      return NextResponse.json({ error: 'Too many paperIds (max 20)' }, { status: 400 })
    }

    // Fetch papers
    const papers = await prisma.candidatePaper.findMany({
      where: { id: { in: paperIds } },
      select: {
        id: true,
        title: true,
        authors: true,
        abstract: true,
        candidateMetadata: true,
        plainSummary: true,
        technicalSummary: true,
        noveltyTag: true,
      },
    })

    if (papers.length === 0) {
      return NextResponse.json({ error: 'No papers found' }, { status: 404 })
    }

    // Generate summaries for papers that don't have them cached
    const summaries: Record<string, { plainSummary: string; technicalSummary: string; noveltyTag: string }> = {}

    await Promise.allSettled(
      papers.map(async (paper) => {
        // If already cached, use cached value
        if (paper.plainSummary && paper.technicalSummary && paper.noveltyTag) {
          summaries[paper.id] = {
            plainSummary: paper.plainSummary,
            technicalSummary: paper.technicalSummary,
            noveltyTag: paper.noveltyTag,
          }
          return
        }

        // Generate new summaries
        try {
          const newSummaries = await generatePaperSummaries({
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            candidateMetadata: paper.candidateMetadata as PaperMetadata | null,
          })

          // Cache to CandidatePaper
          await prisma.candidatePaper.update({
            where: { id: paper.id },
            data: {
              plainSummary: newSummaries.plainSummary,
              technicalSummary: newSummaries.technicalSummary,
              noveltyTag: newSummaries.noveltyTag,
            },
          }).catch(() => {
            // Non-fatal if caching fails
          })

          summaries[paper.id] = {
            plainSummary: newSummaries.plainSummary,
            technicalSummary: newSummaries.technicalSummary,
            noveltyTag: newSummaries.noveltyTag,
          }
        } catch (err) {
          console.error(`Failed to generate summary for ${paper.id}:`, err)
          // Use fallback values
          summaries[paper.id] = {
            plainSummary: paper.plainSummary ?? '',
            technicalSummary: paper.technicalSummary ?? '',
            noveltyTag: paper.noveltyTag ?? 'New method',
          }
        }
      })
    )

    return NextResponse.json({ summaries })
  } catch (err) {
    console.error('[research-feed-summaries] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 })
  }
}
