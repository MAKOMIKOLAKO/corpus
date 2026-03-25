import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, name: true, bio: true, plan: true, createdAt: true, email: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username, bio } = await request.json();

  if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3-20 characters: lowercase letters, numbers, underscores only' },
      { status: 400 }
    );
  }
  if (bio && bio.length > 160) {
    return NextResponse.json({ error: 'Bio must be 160 characters or fewer' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { username, bio: bio || null },
    select: { id: true, username: true, name: true, bio: true, plan: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
