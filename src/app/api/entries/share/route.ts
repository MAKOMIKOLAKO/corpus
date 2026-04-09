import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const { userEntryId, receiverId, userIds, message } = await request.json();

  // Support both single receiver (backward compatibility) and multiple users
  const rawReceivers = Array.isArray(userIds)
    ? userIds
    : receiverId
      ? [receiverId]
      : [];

  const receivers = Array.from(
    new Set(
      rawReceivers.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      )
    )
  );

  if (!userEntryId || receivers.length === 0) {
    return NextResponse.json({ error: 'userEntryId and at least one receiverId are required' }, { status: 400 });
  }

  if (receivers.includes(userId)) {
    return NextResponse.json({ error: 'You cannot share an entry with yourself' }, { status: 400 });
  }

  if (message && message.length > 280) {
    return NextResponse.json({ error: 'Message must be 280 characters or fewer' }, { status: 400 });
  }

  // Get sender's UserEntry to find the GlobalEntry
  const senderUserEntry = await prisma.userEntry.findFirst({
    where: { id: userEntryId, userId },
    select: {
      id: true,
      globalEntryId: true,
      globalEntry: {
        select: {
          title: true,
          authors: true,
          year: true,
          abstract: true,
          source: true,
        }
      }
    }
  });
  if (!senderUserEntry || !senderUserEntry.globalEntryId || !senderUserEntry.globalEntry) {
    return NextResponse.json({ error: 'Entry not found or does not belong to you' }, { status: 404 });
  }

  // SharedEntry.entryId still references legacy Entry. Ensure a compatible Entry exists.
  const legacyEntry = await prisma.entry.upsert({
    where: { id: senderUserEntry.globalEntryId },
    update: {},
    create: {
      id: senderUserEntry.globalEntryId,
      title: senderUserEntry.globalEntry.title,
      authors: senderUserEntry.globalEntry.authors,
      year: senderUserEntry.globalEntry.year,
      abstract: senderUserEntry.globalEntry.abstract,
      description: senderUserEntry.globalEntry.abstract,
      source: 'MANUAL',
      userId,
    },
    select: { id: true }
  });

  // Verify they are accepted connections for all receivers
  const connections = await prisma.connection.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, receiverId: { in: receivers } },
        { requesterId: { in: receivers }, receiverId: userId },
      ],
    },
  });

  const connectedUserIds = new Set(
    connections.map(c => (c.requesterId === userId ? c.receiverId : c.requesterId))
  );

  if (receivers.some(receiver => !connectedUserIds.has(receiver))) {
    return NextResponse.json({ error: 'You can only share entries with accepted connections' }, { status: 403 });
  }

  // Check duplicates and create shares
  const results = [];
  for (const receiverId of receivers) {
    const existing = await prisma.sharedEntry.findFirst({
      where: {
        entryId: legacyEntry.id,
        senderId: userId,
        receiverId
      },
    });

    if (existing) {
      continue; // Skip duplicates
    }

    const shared = await prisma.sharedEntry.create({
      data: {
        entryId: legacyEntry.id,
        globalEntryId: senderUserEntry.globalEntryId!,
        senderId: userId,
        receiverId,
        message: message || null
      },
      include: {
        globalEntry: { select: { id: true, title: true } },
        receiver: { select: { id: true, username: true, name: true } },
      },
    });

    results.push(shared);
  }

  return NextResponse.json({ shared: results, count: results.length }, { status: 201 });
}
