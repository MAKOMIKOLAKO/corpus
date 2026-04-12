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

  const user = await prisma.user.findUnique({
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

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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

  return NextResponse.json({ ...user, connectionStatus, connectionId, isSentByMe });
}
