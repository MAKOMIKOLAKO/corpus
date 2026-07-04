import { NextRequest, NextResponse } from 'next/server'
import { buildDailyResearchIndex } from '@/lib/research/dailyResearchIndex'
import { verifyCronAuth } from '@/lib/verifyCronAuth'

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
