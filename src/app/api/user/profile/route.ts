import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { userProfilePatchSchema } from '@/lib/validation';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      plan: true,
      createdAt: true,
      email: true,
      showSignals: true
    }
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json().catch(() => ({}));
  const parsed = userProfilePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { username, bio, name, showSignals } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        bio: bio ?? null,
        ...(name !== undefined && { name }),
        ...(showSignals !== undefined && { showSignals })
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        plan: true,
        createdAt: true,
        showSignals: true
      },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    console.error('[api/user/profile PATCH]', e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return NextResponse.json(
          { error: 'A record with that value already exists.' },
          { status: 409 }
        );
      }
      if (e.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
