import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const { userEntryId, receiverId, userIds, message } = await request.json();

  // Support both single receiver (backward compatibility) and multiple users
  const receivers = userIds || (receiverId ? [receiverId] : []);

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
    select: { id: true, globalEntryId: true }
  });
  if (!senderUserEntry) {
    return NextResponse.json({ error: 'Entry not found or does not belong to you' }, { status: 404 });
  }

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

  if (connections.length !== receivers.length) {
    return NextResponse.json({ error: 'You can only share entries with accepted connections' }, { status: 403 });
  }

  // Check duplicates and create shares
  const results = [];
  for (const receiverId of receivers) {
    const existing = await prisma.sharedEntry.findFirst({
      where: {
        globalEntryId: senderUserEntry.globalEntryId!,
        senderId: userId,
        receiverId,
        status: 'PENDING'
      },
    });

    if (existing) {
      continue; // Skip duplicates
    }

    const shared = await prisma.sharedEntry.create({
      data: {
        entryId: senderUserEntry.globalEntryId!, // Use globalEntryId as entryId for now
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
