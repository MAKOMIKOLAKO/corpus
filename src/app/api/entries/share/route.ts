import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const { entryId, receiverId, message } = await request.json();
  if (!entryId || !receiverId) {
    return NextResponse.json({ error: 'entryId and receiverId are required' }, { status: 400 });
  }
  if (receiverId === userId) {
    return NextResponse.json({ error: 'You cannot share an entry with yourself' }, { status: 400 });
  }
  if (message && message.length > 280) {
    return NextResponse.json({ error: 'Message must be 280 characters or fewer' }, { status: 400 });
  }

  // Verify entry belongs to sender
  const entry = await prisma.entry.findUnique({ where: { id: entryId }, select: { id: true, userId: true } });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: 'Entry not found or does not belong to you' }, { status: 404 });
  }

  // Verify they are accepted connections
  const connection = await prisma.connection.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, receiverId },
        { requesterId: receiverId, receiverId: userId },
      ],
    },
  });
  if (!connection) {
    return NextResponse.json({ error: 'You can only share entries with accepted connections' }, { status: 403 });
  }

  // Check duplicate
  const existing = await prisma.sharedEntry.findUnique({
    where: { entryId_senderId_receiverId: { entryId, senderId: userId, receiverId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You've already shared this entry with that user" },
      { status: 409 }
    );
  }

  const shared = await prisma.sharedEntry.create({
    data: { entryId, senderId: userId, receiverId, message: message || null },
    include: {
      entry: { select: { id: true, title: true, contentType: true } },
      receiver: { select: { id: true, username: true, name: true } },
    },
  });

  return NextResponse.json(shared, { status: 201 });
}
