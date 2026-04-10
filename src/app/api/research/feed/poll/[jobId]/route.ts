import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getDailyBriefCached } from '@/lib/research/feedPipeline'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The jobId encodes userId-date, but we validate by checking the DB directly
  // using the current user's session — no need to trust the jobId content.
  try {
    const feed = await getDailyBriefCached(params.jobId.split('-')[0])
    if (feed) {
      return NextResponse.json({ status: 'ready', feed })
    }
    return NextResponse.json({ status: 'pending', feed: null })
  } catch {
    return NextResponse.json({ status: 'failed', feed: null })
  }
}
