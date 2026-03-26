import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
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

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        bio: bio || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        plan: true,
        createdAt: true,
      },
    });

    // Create a response that will trigger a session refresh
    const response = NextResponse.json({ success: true, user: updated });
    
    // Set a cookie to signal the client to refresh the session
    response.cookies.set('refresh-session', 'true', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 10, // 10 seconds, just enough to trigger the refresh
    });

    return response;
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'User not found' }, { status: 404 });
    throw e;
  }
}
