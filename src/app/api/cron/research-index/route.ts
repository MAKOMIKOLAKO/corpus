import { NextRequest, NextResponse } from 'next/server'
import { buildDailyResearchIndex } from '@/lib/research/dailyResearchIndex'

const CRON_SECRET = process.env.CRON_SECRET

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true
  }
  return Boolean(request.headers.get('x-vercel-cron'))
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await buildDailyResearchIndex()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[research-index] Failed:', err)
    return NextResponse.json({ error: 'Research index build failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
