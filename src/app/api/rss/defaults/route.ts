import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';

const CATEGORY_ORDER = [
  'Research & Science News',
  'AI & Machine Learning',
  'Deep Tech & Research Labs',
  'Tech News',
  'Health & Medicine',
  'Trending Papers',
  'Global Affairs & Policy',
  'Ideas, Philosophy & Society'
] as const;

export async function GET() {
  try {
    const activeFeeds = await (prisma as any).defaultFeed.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    const grouped = CATEGORY_ORDER.map((categoryName) => {
      const feeds = activeFeeds
        .filter((feed: any) => feed.category === categoryName)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return {
        name: categoryName,
        feeds
      };
    }).filter((category) => category.feeds.length > 0);

    return NextResponse.json({ categories: grouped });
  } catch (error) {
    console.error('[api/rss/defaults] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
