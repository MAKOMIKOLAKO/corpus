import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getWorkspaceSessionOrThrow, sessionResponseShape } from '@/lib/workspaceServer'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const workspaceSession = await getWorkspaceSessionOrThrow(params.sessionId, session.user.id)
    if (!workspaceSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(sessionResponseShape(workspaceSession))
  } catch (error) {
    console.error('[workspace-session-detail] Failed to fetch session', error)
    return NextResponse.json({ error: 'Failed to fetch workspace session' }, { status: 500 })
  }
}
