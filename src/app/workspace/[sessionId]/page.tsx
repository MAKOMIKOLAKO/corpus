import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getWorkspaceSessionOrThrow, parseSections } from '@/lib/workspaceServer'
import { WorkspaceClient } from './WorkspaceClient'

export default async function WorkspacePage({ params }: { params: { sessionId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  const workspaceSession = await getWorkspaceSessionOrThrow(params.sessionId, session.user.id)
  if (!workspaceSession) {
    redirect('/research?tab=workspace')
  }

  const sections = parseSections(workspaceSession.sections)

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceClient
        sessionId={workspaceSession.id}
        arxivId={workspaceSession.arxivId}
        arxivUrl={workspaceSession.arxivUrl}
        paperTitle={workspaceSession.paperTitle}
        paperAuthors={workspaceSession.paperAuthors}
        paperYear={workspaceSession.paperYear}
        paperAbstract={workspaceSession.paperAbstract}
        sections={sections}
        hasFullText={Boolean(workspaceSession.fullText)}
        userId={session.user.id}
      />
    </div>
  )
}
