import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const { status } = await request.json();
  const validStatuses = ['ACCEPTED', 'DECLINED', 'BLOCKED'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const connection = await prisma.connection.findUnique({ where: { id: params.id } });
  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  if (connection.requesterId !== userId && connection.receiverId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (connection.receiverId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.connection.update({
    where: { id: params.id },
    data: { status },
  });

  if (status === 'ACCEPTED') {
    try {
      const [requester, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: connection.requesterId } }),
        prisma.user.findUnique({ where: { id: connection.receiverId } }),
      ]);

      if (requester && receiver) {
        const signalPromises = [
          prisma.signal.create({
            data: {
              userId: connection.requesterId,
              type: 'CONNECTION_MADE',
              metadata: {
                connectedUsername: receiver.username || receiver.email,
              },
            },
          }),
          prisma.signal.create({
            data: {
              userId: connection.receiverId,
              type: 'CONNECTION_MADE',
              metadata: {
                connectedUsername: requester.username || requester.email,
              },
            },
          }),
        ];

        Promise.all(signalPromises).catch((err) =>
          console.error('Failed to create signals:', err)
        );
      }
    } catch (error) {
      console.error('Failed to create signal:', error);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id as string;

  const connection = await prisma.connection.findUnique({ where: { id: params.id } });
  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  const isRequester = connection.requesterId === userId;
  const isReceiver = connection.receiverId === userId;

  if (!isRequester && !isReceiver) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (connection.status === 'PENDING' && !isRequester) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.connection.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
