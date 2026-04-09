import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prismaWithRetry'
import { getCurrentUserId } from '@/lib/session'

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const record = await (prisma as any).generatedBibliography.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (record.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await (prisma as any).generatedBibliography.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/bibliography/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
