import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getUserByEmail, unsubscribeBySubscriptionId } from '@/lib/rssSubscriptions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleted = await unsubscribeBySubscriptionId({
      userId: user.id,
      subscriptionId: params.subscriptionId
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Feed not found or not subscribed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/rss/subscribe/[subscriptionId]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
