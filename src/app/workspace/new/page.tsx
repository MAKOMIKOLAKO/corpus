import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

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
    const body = candidatePaperId ? { candidatePaperId } : { arxivUrl }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/workspace/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create workspace session')
    }

    const workspaceSession = await response.json()
    redirect(`/workspace/${workspaceSession.id}`)
  } catch (error) {
    console.error('Failed to create workspace session:', error)
    redirect('/research?tab=workspace')
  }
}
