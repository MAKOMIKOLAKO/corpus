import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prismaWithRetry'
import { getCurrentUserId } from '@/lib/session'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await (prisma as any).generatedBibliography.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ bibliographies: rows })
  } catch (error) {
    console.error('[api/bibliography GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
