// AUDIT: 2026-03-28
// Found: (new file) duplicate vote POST logic; owner bypass; P2002; signals blocking
// Fixed: executeJournalClubVote shared by /vote and /[collectionId]/votes POST

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prismaWithRetry'
import { getJournalClubAccess } from '@/lib/journalClubAccess'

export type JournalClubVoteResponse =
  | { ok: true; action: 'added' | 'removed'; voteCount: number }
  | { ok: false; status: number; body: { error: string } }

/**
 * Toggle vote for an entry in a journal club collection.
 */
export async function executeJournalClubVote(
  userId: string,
  collectionId: string,
  entryId: string
): Promise<JournalClubVoteResponse> {
  const access = await getJournalClubAccess(collectionId, userId)
  if (!access) {
    return { ok: false, status: 404, body: { error: 'Not found' } }
  }
  if (!access.isMember) {
    return { ok: false, status: 404, body: { error: 'Not found' } }
  }

  const entryCollection = await prisma.entryCollection.findUnique({
    where: {
      entryId_collectionId: {
        entryId,
        collectionId
      }
    },
    include: {
      entry: true
    }
  })

  if (!entryCollection) {
    return { ok: false, status: 404, body: { error: 'Not found' } }
  }

  const entryMeta = entryCollection.entry.metadata as Record<string, unknown> | null
  if (entryMeta?.presentationDate) {
    return {
      ok: false,
      status: 400,
      body: { error: 'Cannot vote on a paper that is already scheduled' }
    }
  }

  const existingVote = await prisma.vote.findUnique({
    where: {
      entryId_collectionId_userId: {
        entryId,
        collectionId,
        userId
      }
    }
  })

  if (existingVote) {
    await prisma.vote.delete({
      where: { id: existingVote.id }
    })
    const voteCount = await prisma.vote.count({
      where: { entryId, collectionId }
    })
    return { ok: true, action: 'removed', voteCount }
  }

  try {
    await prisma.vote.create({
      data: { entryId, collectionId, userId }
    })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      // Concurrent add — treat as success with current count
    } else {
      throw e
    }
  }

  const voteCount = await prisma.vote.count({
    where: { entryId, collectionId }
  })

  if (voteCount === 1 || voteCount === 3 || voteCount === 5) {
    prisma.collection
      .findUnique({
        where: { id: collectionId },
        select: { name: true }
      })
      .then((collection) => {
        if (!collection) return
        return prisma.signal
          .create({
            data: {
              userId,
              type: 'VOTE_CAST',
              entryId,
              collectionId,
              metadata: {
                entryTitle: entryCollection.entry.title,
                collectionName: collection.name,
                voteCount
              },
              isPublic: false
            }
          })
          .catch((err) => console.error('[journal-club/vote] signal:', err))
      })
      .catch((err) => console.error('[journal-club/vote] signal prefetch:', err))
  }

  return { ok: true, action: 'added', voteCount }
}
