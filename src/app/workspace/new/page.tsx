import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { extractArxivId } from '@/lib/arxivFetcher'
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

export default async function NewWorkspacePage({
  searchParams,
}: {
  searchParams: { candidatePaperId?: string; arxivUrl?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  const { candidatePaperId, arxivUrl } = searchParams

  if (!candidatePaperId && !arxivUrl) {
    redirect('/research?tab=workspace')
  }

  try {
    let created

    if (candidatePaperId) {
      const paper = await fetchCandidatePaperForWorkspace(candidatePaperId)
      if (!paper) {
        redirect('/research?tab=workspace')
      }

      if (!isArxivCandidatePaper(paper)) {
        redirect('/research?tab=workspace')
      }

      const arxivId = getArxivIdFromCandidatePaper(paper)
      if (!arxivId) {
        redirect('/research?tab=workspace')
      }

      created = await findOrCreateWorkspaceSession({
        userId: session.user.id,
        candidatePaper: paper,
        ...candidatePaperToWorkspaceMetadata(paper, arxivId),
      })

      void hydrateWorkspaceSession(created.id)
    } else {
      const arxivId = extractArxivId(arxivUrl ?? '')
      if (!arxivId) {
        redirect('/research?tab=workspace')
      }

      const metadata = await fetchArxivMetadata(arxivId)
      if (!metadata) {
        redirect('/research?tab=workspace')
      }

      const candidatePaper = await upsertCandidatePaperFromArxiv(metadata)
      created = await findOrCreateWorkspaceSession({
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
    }

    redirect(`/workspace/${created.id}`)
  } catch (error) {
    // Don't catch NEXT_REDIRECT errors - they're how Next.js implements redirects
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Failed to create workspace session:', error)
    redirect('/research?tab=workspace')
  }
}
