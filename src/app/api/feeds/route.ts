import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prismaWithRetry';
import { discoverFeed } from '@/lib/feedDetector';
import { normalizeUrl } from '@/lib/entryDedup';
import type { User, Source, UserSource } from '@prisma/client';

// GET /api/feeds - List user's feeds
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userSources: {
          include: {
            source: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const feeds = user.userSources.map((us: UserSource & { source: Source }) => ({
      id: us.source.id,
      feedUrl: us.source.feedUrl,
      title: us.source.title,
      domain: us.source.domain,
      lastFetchedAt: us.source.lastFetchedAt,
      addedAt: us.createdAt
    }));

    return NextResponse.json({ feeds });
  } catch (error) {
    console.error('[api/feeds] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/feeds - Add a new feed
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize the URL
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Discover the feed
    const discovery = await discoverFeed(normalizedUrl);
    if (!discovery) {
      return NextResponse.json({
        error: 'No RSS feed found at this URL',
        details: 'Please check if the website has an RSS feed'
      }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      return NextResponse.json({
        error: 'You have already added this feed',
        feed: {
          id: source.id,
          feedUrl: source.feedUrl,
          title: source.title,
          domain: source.domain
        }
      }, { status: 409 });
    }

    // Create user-source relation
    await prisma.userSource.create({
      data: {
        userId: user.id,
        sourceId: source.id
      }
    });

    return NextResponse.json({
      success: true,
      feed: {
        id: source.id,
        feedUrl: source.feedUrl,
        title: source.title,
        domain: source.domain,
        preview: discovery.items
      }
    });
  } catch (error) {
    console.error('[api/feeds] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
