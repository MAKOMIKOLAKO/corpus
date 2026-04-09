import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getUserByEmail, subscribeToCustomFeed } from '@/lib/rssSubscriptions';

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
    const url = typeof body?.url === 'string' ? body.url : '';
    const name = typeof body?.name === 'string' ? body.name : undefined;

    if (!url.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const result = await subscribeToCustomFeed({
      userId: user.id,
      url,
      name
    });

    if (result.status === 'already_subscribed') {
      return NextResponse.json({
        error: 'already_subscribed',
        subscription: result.subscription
      }, { status: 409 });
    }

    if (result.status === 'invalid_feed') {
      return NextResponse.json({ error: 'invalid_feed' }, { status: 422 });
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

    return NextResponse.json({
      ...result.subscription,
      convertedToDefault: Boolean(result.convertedToDefault),
      message: result.convertedToDefault
        ? "This feed is already in our curated library. We've added it from there instead."
        : undefined
    });
  } catch (error) {
    console.error('[api/rss/subscribe/custom] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
