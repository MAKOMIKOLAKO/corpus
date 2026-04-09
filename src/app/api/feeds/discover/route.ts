import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { discoverFeed } from '@/lib/feedDetector';
import { normalizeFeedUrlForStorage } from '@/lib/feedUrl';

// POST /api/feeds/discover - Discover and preview a feed without adding it
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
    const normalizedUrl = normalizeFeedUrlForStorage(url);
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

    return NextResponse.json({
      feedUrl: discovery.feedUrl,
      title: discovery.title,
      description: discovery.description,
      domain: discovery.domain,
      items: discovery.items
    });
  } catch (error) {
    console.error('[api/feeds/discover] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
