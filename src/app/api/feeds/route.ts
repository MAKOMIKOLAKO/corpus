import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { discoverFeed } from '@/lib/feedDetector';
import { timedJson } from '@/lib/serverTiming';
import {
  getUserByEmail,
  listUserSubscriptions,
  subscribeToCustomFeed
} from '@/lib/rssSubscriptions';

// GET /api/feeds - List user's feeds
export async function GET() {
  if (process.env.FEATURE_RESEARCH_FEEDS !== 'enabled') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'feeds.get');
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return timedJson({ error: 'User not found' }, startedAt, { status: 404 }, 'feeds.get');
    }

    const subscriptions = await listUserSubscriptions(user.id);
    const feeds = subscriptions.map((subscription) => ({
      id: subscription.sourceId,
      subscriptionId: subscription.subscriptionId,
      feedUrl: subscription.feedUrl,
      title: subscription.title,
      domain: subscription.domain,
      lastFetchedAt: subscription.lastFetchedAt,
      addedAt: subscription.addedAt,
      isDefault: subscription.isDefault,
      defaultFeedId: subscription.defaultFeedId,
      defaultFeed: subscription.defaultFeed
    }));

    return timedJson({ feeds }, startedAt, undefined, 'feeds.get');
  } catch (error) {
    console.error('[api/feeds] GET error:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'feeds.get');
  }
}

// POST /api/feeds - Add a new feed
export async function POST(request: NextRequest) {
  if (process.env.FEATURE_RESEARCH_FEEDS !== 'enabled') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'feeds.post');
    }

    const { url, name } = await request.json();
    if (!url) {
      return timedJson({ error: 'URL is required' }, startedAt, { status: 400 }, 'feeds.post');
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return timedJson({ error: 'User not found' }, startedAt, { status: 404 }, 'feeds.post');
    }

    let result = await subscribeToCustomFeed({
      userId: user.id,
      url,
      name
    });

    if (result.status === 'invalid_feed') {
      const discovery = await discoverFeed(url);
      if (discovery?.feedUrl) {
        result = await subscribeToCustomFeed({
          userId: user.id,
          url: discovery.feedUrl,
          name: discovery.title ?? name
        });
      } else {
        return timedJson({
          error: 'No RSS feed found at this URL',
          details: 'Please check if the website has an RSS feed'
        }, startedAt, { status: 404 }, 'feeds.post');
      }
    }

    if (result.status === 'already_subscribed') {
      return timedJson({
        error: "You're already subscribed to this feed.",
        code: 'already_subscribed',
        feed: result.subscription
      }, startedAt, { status: 409 }, 'feeds.post');
    }

    if (result.status === 'limit_reached') {
      return timedJson({
        error: 'Feed limit reached for your current plan',
        reason: result.reason
      }, startedAt, { status: 403 }, 'feeds.post');
    }

    if (!result.subscription) {
      return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'feeds.post');
    }

    return timedJson({
      success: true,
      feed: {
        id: result.subscription.sourceId,
        subscriptionId: result.subscription.subscriptionId,
        feedUrl: result.subscription.feedUrl,
        title: result.subscription.title,
        domain: result.subscription.domain,
        isDefault: result.subscription.isDefault,
        defaultFeed: result.subscription.defaultFeed
      },
      convertedToDefault: Boolean(result.convertedToDefault),
      message: result.convertedToDefault
        ? "This feed is already in our curated library. We've added it from there instead."
        : undefined
    }, startedAt, undefined, 'feeds.post');
  } catch (error) {
    console.error('[api/feeds] POST error:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'feeds.post');
  }
}
