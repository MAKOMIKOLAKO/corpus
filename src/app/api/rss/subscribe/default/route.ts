import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getUserByEmail, subscribeToDefaultFeed } from '@/lib/rssSubscriptions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const defaultFeedId = typeof body?.defaultFeedId === 'string' ? body.defaultFeedId : '';

    if (!defaultFeedId) {
      return NextResponse.json({ error: 'defaultFeedId is required' }, { status: 400 });
    }

    const result = await subscribeToDefaultFeed({
      userId: user.id,
      defaultFeedId
    });

    if (result.status === 'not_found' || result.status === 'inactive') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (result.status === 'already_subscribed') {
      return NextResponse.json({
        error: 'already_subscribed',
        subscription: result.subscription
      }, { status: 409 });
    }

    if (result.status === 'limit_reached') {
      return NextResponse.json({
        error: 'feed_limit_reached',
        reason: result.reason
      }, { status: 403 });
    }

    if (!result.subscription) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(result.subscription);
  } catch (error) {
    console.error('[api/rss/subscribe/default] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
