import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { connectionCreateSchema } from '@/lib/validation';

const USER_SELECT = {
  id: true, username: true, name: true, bio: true, plan: true,
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const [sentRaw, receivedRaw] = await Promise.all([
    prisma.connection.findMany({
      where: { requesterId: userId },
      include: { receiver: { select: USER_SELECT } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.connection.findMany({
      where: { receiverId: userId },
      include: { requester: { select: USER_SELECT } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const accepted = [
    ...sentRaw.filter(c => c.status === 'ACCEPTED').map(c => ({ ...c, otherUser: c.receiver })),
    ...receivedRaw.filter(c => c.status === 'ACCEPTED').map(c => ({ ...c, otherUser: c.requester })),
  ];
  const pendingSent = sentRaw
    .filter(c => c.status === 'PENDING')
    .map(c => ({ ...c, otherUser: c.receiver }));
  const pendingReceived = receivedRaw
    .filter(c => c.status === 'PENDING')
    .map(c => ({ ...c, otherUser: c.requester }));

  return NextResponse.json({ accepted, pending_sent: pendingSent, pending_received: pendingReceived });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const raw = await request.json().catch(() => ({}));
  const parsed = connectionCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { receiverId } = parsed.data;
  if (receiverId === userId) return NextResponse.json({ error: 'You cannot connect with yourself' }, { status: 400 });

  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!receiver) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Check for block
  const blocked = await prisma.connection.findFirst({
    where: {
      status: 'BLOCKED',
      OR: [
        { requesterId: userId, receiverId },
        { requesterId: receiverId, receiverId: userId },
      ],
    },
  });
  if (blocked) return NextResponse.json({ error: 'Cannot send connection request' }, { status: 403 });

  // Check existing connection in either direction
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId },
        { requesterId: receiverId, receiverId: userId },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: 'Connection already exists', connection: existing }, { status: 409 });

  const connection = await prisma.connection.create({
    data: { requesterId: userId, receiverId },
    include: { receiver: { select: USER_SELECT } },
  });

  return NextResponse.json(connection, { status: 201 });
}
