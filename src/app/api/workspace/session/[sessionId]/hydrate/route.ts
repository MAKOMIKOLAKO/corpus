import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getWorkspaceSessionOrThrow, hydrateWorkspaceSession } from '@/lib/workspaceServer'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceSession = await getWorkspaceSessionOrThrow(params.sessionId, session.user.id)
  if (!workspaceSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  try {
    await hydrateWorkspaceSession(params.sessionId, true) // Force regeneration
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[workspace-hydrate] Failed to hydrate session', error)
    return NextResponse.json({ error: 'Failed to hydrate session' }, { status: 500 })
  }
}
