import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan === 'FREE') {
      return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    }

    const watchQueryId = params.id;

    // Verify the watch query belongs to the user
    const watchQuery = await prisma.watchQuery.findFirst({
      where: {
        id: watchQueryId,
        userId: session.user.id,
      },
    });

    if (!watchQuery) {
      return NextResponse.json({ error: 'Watch query not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const updatedQuery = await prisma.watchQuery.update({
      where: { id: watchQueryId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Watch query deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating watch query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
