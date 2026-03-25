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
  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  // Only the receiver can accept/decline/block
  if (connection.receiverId !== userId) {
    return NextResponse.json({ error: 'Only the receiver can respond to this connection' }, { status: 403 });
  }

  const updated = await prisma.connection.update({
    where: { id: params.id },
    data: { status },
  });

  // Create signal for connection made (fire-and-forget)
  if (status === 'ACCEPTED') {
    try {
      // Get both users' information
      const [requester, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: connection.requesterId } }),
        prisma.user.findUnique({ where: { id: connection.receiverId } })
      ]);

      if (requester && receiver) {
        // Create signal for both users
        const signalPromises = [
          prisma.signal.create({
            data: {
              userId: connection.requesterId,
              type: "CONNECTION_MADE",
              metadata: {
                connectedUsername: receiver.username || receiver.email
              }
            }
          }),
          prisma.signal.create({
            data: {
              userId: connection.receiverId,
              type: "CONNECTION_MADE",
              metadata: {
                connectedUsername: requester.username || requester.email
              }
            }
          })
        ];

        // Don't await these signal creations
        Promise.all(signalPromises).catch(err => console.error("Failed to create signals:", err));
      }
    } catch (error) {
      // Fire-and-forget signal creation
      console.error("Failed to create signal:", error);
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
  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  const isRequester = connection.requesterId === userId;
  const isReceiver = connection.receiverId === userId;

  if (!isRequester && !isReceiver) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Only requester can cancel a pending request
  if (connection.status === 'PENDING' && !isRequester) {
    return NextResponse.json({ error: 'Only the requester can cancel a pending request' }, { status: 403 });
  }

  await prisma.connection.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
