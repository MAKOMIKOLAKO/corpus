import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { seedDefaultFeeds } from '../../../../../../prisma/seeds/defaultFeeds';

export async function POST(_request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await seedDefaultFeeds(prisma as any);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/admin/feeds/seed] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
