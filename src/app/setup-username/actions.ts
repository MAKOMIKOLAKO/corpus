'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function setupUsername(username: string, bio?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  if (!username) return { error: 'Username is required' };
  if (!USERNAME_REGEX.test(username)) {
    return { error: 'Username must be 3-20 characters: lowercase letters, numbers, underscores only' };
  }
  if (bio && bio.length > 160) {
    return { error: 'Bio must be 160 characters or fewer' };
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing && existing.id !== session.user.id) {
    return { error: 'Username is already taken' };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        bio: bio || null,
      },
    });

    // Revalidate all paths to ensure fresh data
    revalidatePath('/', 'layout');
    revalidatePath('/library');

    return { success: true };
  } catch (e: any) {
    if (e?.code === 'P2025') return { error: 'User not found' };
    throw e;
  }
}
