import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id as string | undefined;

  let user: any;
  try {
    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        plan: true,
        isBetaTester: true,
        createdAt: true,
      },
    } as any);
  } catch (error: any) {
    if (error?.code !== 'P2022') throw error;

    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        plan: true,
        createdAt: true,
      },
    } as any);
  }

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Count total connections
  const totalConnections = await prisma.connection.count({
    where: {
      OR: [
        { requesterId: user.id, status: 'ACCEPTED' },
        { receiverId: user.id, status: 'ACCEPTED' }
      ]
    }
  });

  let connectionStatus: string | null = null;
  let connectionId: string | null = null;
  let isSentByMe = false;

  if (viewerId && viewerId !== user.id) {
    const conn = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: viewerId, receiverId: user.id },
          { requesterId: user.id, receiverId: viewerId },
        ],
      },
    });
    if (conn) {
      connectionStatus = conn.status;
      connectionId = conn.id;
      isSentByMe = conn.requesterId === viewerId;
    }
  }

  return NextResponse.json({ ...user, isBetaTester: user.isBetaTester ?? false, connectionStatus, connectionId, isSentByMe, totalConnections });
}
