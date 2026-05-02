import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { workspaceSessionCreateSchema } from '@/lib/validation'
import {
  candidatePaperToWorkspaceMetadata,
  fetchArxivMetadata,
  fetchCandidatePaperForWorkspace,
  findOrCreateWorkspaceSession,
  getArxivIdFromCandidatePaper,
  hydrateWorkspaceSession,
  isArxivCandidatePaper,
  sessionResponseShape,
  upsertCandidatePaperFromArxiv,
} from '@/lib/workspaceServer'
import { extractArxivId } from '@/lib/arxivFetcher'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = workspaceSessionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    if (parsed.data.candidatePaperId) {
      const paper = await fetchCandidatePaperForWorkspace(parsed.data.candidatePaperId)
      if (!paper) {
        return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
      }

      if (!isArxivCandidatePaper(paper)) {
        return NextResponse.json({ error: 'Only arXiv papers are supported in the workspace' }, { status: 400 })
      }

      const arxivId = getArxivIdFromCandidatePaper(paper)
      if (!arxivId) {
        return NextResponse.json({ error: 'Only arXiv papers are supported in the workspace' }, { status: 400 })
      }

      const created = await findOrCreateWorkspaceSession({
        userId: session.user.id,
        candidatePaper: paper,
        ...candidatePaperToWorkspaceMetadata(paper, arxivId),
      })

      void hydrateWorkspaceSession(created.id)

      return NextResponse.json(sessionResponseShape(created))
    }

    const arxivId = extractArxivId(parsed.data.arxivUrl ?? '')
    if (!arxivId) {
      return NextResponse.json({ error: 'Only arXiv papers are supported in the workspace' }, { status: 400 })
    }

    const metadata = await fetchArxivMetadata(arxivId)
    if (!metadata) {
      return NextResponse.json({ error: 'Failed to fetch arXiv metadata' }, { status: 502 })
    }

    const candidatePaper = await upsertCandidatePaperFromArxiv(metadata)
    const created = await findOrCreateWorkspaceSession({
      userId: session.user.id,
      candidatePaper,
      arxivId: metadata.arxivId,
      arxivUrl: metadata.arxivUrl,
      paperTitle: metadata.paperTitle,
      paperAuthors: metadata.paperAuthors,
      paperYear: metadata.paperYear,
      paperAbstract: metadata.paperAbstract,
    })

    void hydrateWorkspaceSession(created.id)

    return NextResponse.json(sessionResponseShape(created))
  } catch (error) {
    console.error('[workspace-session] Failed to create session', error)
    return NextResponse.json({ error: 'Failed to create workspace session' }, { status: 500 })
  }
}
