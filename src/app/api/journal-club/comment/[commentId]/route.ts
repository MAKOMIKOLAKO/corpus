// AUDIT: 2026-03-28
// Found: Admin check used owner plan; collection owner without membership not admin
// Fixed: actingUserPlan + isOwner for delete auth; 404 policy

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { canManageJournalClub } from '@/lib/journalClub'
import {
  getJournalClubAccess,
  getManageRole
} from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId } = params
    if (!commentId?.trim()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const comment = await prisma.entryComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        collectionId: true
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const access = await getJournalClubAccess(comment.collectionId, userId)
    if (!access || !access.isMember) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAuthor = comment.userId === userId
    const { isOwner, membership, actingUserPlan } = access
    const manageRole = getManageRole(isOwner, membership)
    const isAdmin = canManageJournalClub(actingUserPlan, manageRole)

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.entryComment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[journal-club/comment DELETE]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
