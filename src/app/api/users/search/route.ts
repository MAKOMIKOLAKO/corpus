import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = request.nextUrl.searchParams.get('q') || '';
  const email = request.nextUrl.searchParams.get('email') || '';

  // Handle email search for lab invitations
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        username: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  }

  // Handle name/username search for connections
  if (!q.trim()) return NextResponse.json([]);

  const userId = session.user.id as string;

  // Find users blocked by or blocking the current user
  const blockedRelations = await prisma.connection.findMany({
    where: {
      status: 'BLOCKED',
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    select: { requesterId: true, receiverId: true },
  });
  const blockedIds = new Set(
    blockedRelations.flatMap(r => [r.requesterId, r.receiverId]).filter(id => id !== userId)
  );

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId, notIn: Array.from(blockedIds) },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, username: true, name: true, bio: true, plan: true },
    take: 10,
  });

  // Attach connection status for each result
  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { requesterId: userId, receiverId: { in: users.map(u => u.id) } },
        { receiverId: userId, requesterId: { in: users.map(u => u.id) } },
      ],
    },
  });

  const enriched = users.map(u => {
    const conn = connections.find(
      c => (c.requesterId === userId && c.receiverId === u.id) ||
        (c.receiverId === userId && c.requesterId === u.id)
    );
    return {
      ...u,
      connectionId: conn?.id ?? null,
      connectionStatus: conn?.status ?? null,
      isSentByMe: conn ? conn.requesterId === userId : false,
    };
  });

  return NextResponse.json(enriched);
}
