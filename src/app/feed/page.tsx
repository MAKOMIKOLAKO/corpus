import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import FeedClient from './FeedClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const [user, userFeeds, signals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    }),
    prisma.userSource.findMany({
      where: { userId },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.signal.findMany({
      where: {
        OR: [
          { isPublic: true },
          { userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        },
        entry: {
          select: {
            id: true,
            title: true,
          }
        },
        collection: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })
  ]);

  const rssSourceNames = Array.from(new Set(userFeeds.flatMap((f: any) => [
    f.source.title,
    f.source.domain,
  ]).filter((name): name is string => Boolean(name && name.trim()))));

  const RSS_PAGE_SIZE = 20;

  const rssRows = rssSourceNames.length > 0
    ? await prisma.globalEntry.findMany({
      where: {
        addedVia: 'rss_ingestion',
        source: {
          in: rssSourceNames
        }
      },
      select: {
        id: true,
        title: true,
        authors: true,
        summary: true,
        source: true,
        url: true,
        createdAt: true,
        publicationYear: true
      },
      orderBy: { createdAt: 'desc' },
      take: RSS_PAGE_SIZE + 1
    })
    : [];

  const rssHasMore = rssRows.length > RSS_PAGE_SIZE;
  const rssEntries = rssRows.slice(0, RSS_PAGE_SIZE);

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <FeedClient
        signals={signals.map(s => ({
          ...s,
          type: s.type as any, // Cast for simplicity
          createdAt: s.createdAt.toISOString()
        }))}
        userPlan={user.plan}
        initialRssPageSize={RSS_PAGE_SIZE}
        initialRssHasMore={rssHasMore}
        rssEntries={rssEntries.map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          authors: entry.authors,
          summary: entry.summary,
          source: entry.source,
          url: entry.url,
          createdAt: entry.createdAt.toISOString(),
          publicationYear: entry.publicationYear,
          addedAt: entry.createdAt.toISOString()
        }))}
        userFeeds={userFeeds.map((f: any) => ({
          id: f.source.id,
          feedUrl: f.source.feedUrl,
          title: f.source.title,
          domain: f.source.domain,
          lastFetchedAt: f.source.lastFetchedAt,
          addedAt: f.createdAt
        }))}
      />
    </div>
  );
}
