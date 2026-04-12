import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  bio: true,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = params;

    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === currentUserId) {
      return NextResponse.json({ mutualConnections: [] });
    }

    // Get all accepted connections for current user
    const [currentUserSent, currentUserReceived] = await Promise.all([
      prisma.connection.findMany({
        where: {
          requesterId: currentUserId,
          status: 'ACCEPTED'
        },
        select: { receiverId: true }
      }),
      prisma.connection.findMany({
        where: {
          receiverId: currentUserId,
          status: 'ACCEPTED'
        },
        select: { requesterId: true }
      })
    ]);

    const currentUserConnectionIds = new Set([
      ...currentUserSent.map(c => c.receiverId),
      ...currentUserReceived.map(c => c.requesterId)
    ]);

    // Get all accepted connections for target user
    const [targetUserSent, targetUserReceived] = await Promise.all([
      prisma.connection.findMany({
        where: {
          requesterId: targetUser.id,
          status: 'ACCEPTED'
        },
        select: { receiverId: true }
      }),
      prisma.connection.findMany({
        where: {
          receiverId: targetUser.id,
          status: 'ACCEPTED'
        },
        select: { requesterId: true }
      })
    ]);

    const targetUserConnectionIds = new Set([
      ...targetUserSent.map(c => c.receiverId),
      ...targetUserReceived.map(c => c.requesterId)
    ]);

    // Find mutual connections
    const currentUserConnectionArray = Array.from(currentUserConnectionIds);
    const mutualConnectionIds = currentUserConnectionArray.filter(id =>
      targetUserConnectionIds.has(id)
    );

    if (mutualConnectionIds.length === 0) {
      return NextResponse.json({ mutualConnections: [] });
    }

    // Fetch user details for mutual connections
    const mutualConnections = await prisma.user.findMany({
      where: {
        id: { in: mutualConnectionIds }
      },
      select: USER_SELECT
    });

    return NextResponse.json({ mutualConnections });
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
