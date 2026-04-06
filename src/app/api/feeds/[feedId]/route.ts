import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prismaWithRetry';

// DELETE /api/feeds/[feedId] - Remove a feed for the user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { feedId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the user-source relation
    const deletedUserSource = await prisma.userSource.deleteMany({
      where: {
        userId: user.id,
        sourceId: params.feedId
      }
    });

    if (deletedUserSource.count === 0) {
      return NextResponse.json({ error: 'Feed not found or not subscribed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/feeds/[feedId]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
