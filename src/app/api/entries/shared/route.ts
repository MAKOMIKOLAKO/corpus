import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

const ENTRY_SELECT = {
  id: true, title: true, authors: true, year: true,
  abstract: true, url: true, source: true, cover: true,
} as const;

const USER_SELECT = { id: true, username: true, name: true } as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const [received, sent] = await Promise.all([
    prisma.sharedEntry.findMany({
      where: { receiverId: userId },
      include: {
        globalEntry: { select: ENTRY_SELECT },
        sender: { select: USER_SELECT }
      },
      orderBy: { sharedAt: 'desc' },
    }),
    prisma.sharedEntry.findMany({
      where: { senderId: userId },
      include: {
        globalEntry: { select: ENTRY_SELECT },
        receiver: { select: USER_SELECT }
      },
      orderBy: { sharedAt: 'desc' },
    }),
  ]);

  // Transform received entries to include user's UserEntry if they have it
  const receivedWithUserEntry = await Promise.all(
    received.map(async (share) => {
      const userEntry = await prisma.userEntry.findFirst({
        where: {
          userId,
          globalEntryId: share.globalEntryId!
        },
        select: userEntryWithGlobal
      });

      return {
        ...share,
        userEntry: userEntry ? flattenUserEntry(userEntry) : null
      };
    })
  );

  // Transform sent entries to include sender's UserEntry
  const sentWithUserEntry = await Promise.all(
    sent.map(async (share) => {
      const userEntry = await prisma.userEntry.findFirst({
        where: {
          userId,
          globalEntryId: share.globalEntryId!
        },
        select: userEntryWithGlobal
      });

      return {
        ...share,
        userEntry: userEntry ? flattenUserEntry(userEntry) : null
      };
    })
  );

  return NextResponse.json({ received: receivedWithUserEntry, sent: sentWithUserEntry });
}
