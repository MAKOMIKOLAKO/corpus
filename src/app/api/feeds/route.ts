import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prismaWithRetry';
import { discoverFeed } from '@/lib/feedDetector';
import { normalizeUrl } from '@/lib/entryDedup';
import { canAddFeed, getUserPlan } from '@/lib/plans';
import { timedJson } from '@/lib/serverTiming';

// GET /api/feeds - List user's feeds
export async function GET() {
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'feeds.get');
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return timedJson({ error: 'User not found' }, startedAt, { status: 404 }, 'feeds.get');
    }

    const userSources = await prisma.userSource.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        source: {
          select: {
            id: true,
            feedUrl: true,
            title: true,
            domain: true,
            lastFetchedAt: true,
          }
        }
      }
    });

    const feeds = userSources.map((us) => ({
      id: us.source.id,
      feedUrl: us.source.feedUrl,
      title: us.source.title,
      domain: us.source.domain,
      lastFetchedAt: us.source.lastFetchedAt,
      addedAt: us.createdAt
    }));

    return timedJson({ feeds }, startedAt, undefined, 'feeds.get');
  } catch (error) {
    console.error('[api/feeds] GET error:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'feeds.get');
  }
}

// POST /api/feeds - Add a new feed
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'feeds.post');
    }

    const { url } = await request.json();
    if (!url) {
      return timedJson({ error: 'URL is required' }, startedAt, { status: 400 }, 'feeds.post');
    }

    // Normalize the URL
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return timedJson({ error: 'Invalid URL' }, startedAt, { status: 400 }, 'feeds.post');
    }

    // Discover the feed
    const discovery = await discoverFeed(normalizedUrl);
    if (!discovery) {
      return timedJson({
        error: 'No RSS feed found at this URL',
        details: 'Please check if the website has an RSS feed'
      }, startedAt, { status: 404 }, 'feeds.post');
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return timedJson({ error: 'User not found' }, startedAt, { status: 404 }, 'feeds.post');
    }

    // Create or find the source
    const source = await prisma.source.upsert({
      where: { feedUrl: discovery.feedUrl },
      update: {
        title: discovery.title,
        domain: discovery.domain
      },
      create: {
        feedUrl: discovery.feedUrl,
        title: discovery.title,
        domain: discovery.domain
      }
    });

    // Check if user already has this source
    const existingUserSource = await prisma.userSource.findUnique({
      where: {
        userId_sourceId: {
          userId: user.id,
          sourceId: source.id
        }
      }
    });

    if (existingUserSource) {
      return timedJson({
        error: 'You have already added this feed',
        feed: {
          id: source.id,
          feedUrl: source.feedUrl,
          title: source.title,
          domain: source.domain
        }
      }, startedAt, { status: 409 }, 'feeds.post');
    }

    const currentFeedCount = await prisma.userSource.count({
      where: { userId: user.id }
    });

    const feedLimitCheck = canAddFeed(getUserPlan(user), currentFeedCount);
    if (!feedLimitCheck.allowed) {
      return timedJson({
        error: 'Feed limit reached for your current plan',
        reason: feedLimitCheck.reason
      }, startedAt, { status: 403 }, 'feeds.post');
    }

    // Create user-source relation
    await prisma.userSource.create({
      data: {
        userId: user.id,
        sourceId: source.id
      }
    });

    return timedJson({
      success: true,
      feed: {
        id: source.id,
        feedUrl: source.feedUrl,
        title: source.title,
        domain: source.domain,
        preview: discovery.items
      }
    }, startedAt, undefined, 'feeds.post');
  } catch (error) {
    console.error('[api/feeds] POST error:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'feeds.post');
  }
}
