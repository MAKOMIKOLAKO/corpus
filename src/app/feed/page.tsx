import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import FeedClient from './FeedClient';
import { redirect } from 'next/navigation';
import type { UserEntry, UserSource } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true }
  });

  if (!user) {
    redirect('/login');
  }

  // Fetch user's RSS entries
  const userEntries = await prisma.userEntry.findMany({
    where: { userId },
    include: {
      globalEntry: {
        select: {
          id: true,
          title: true,
          authors: true,
          summary: true,
          source: true,
          url: true,
          createdAt: true,
          publicationYear: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  // Fetch user's feeds for management
  const userFeeds = await prisma.userSource.findMany({
    where: { userId },
    include: {
      source: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch signals for the feed — showing public signals for now
  const signals = await prisma.signal.findMany({
    where: {
      OR: [
        { isPublic: true },
        { userId: userId }
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
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <FeedClient
        signals={signals.map(s => ({
          ...s,
          type: s.type as any, // Cast for simplicity
          createdAt: s.createdAt.toISOString()
        }))}
        userPlan={user.plan}
        rssEntries={userEntries.map((ue: any) => ({
          id: ue.globalEntry.id,
          title: ue.globalEntry.title,
          authors: ue.globalEntry.authors,
          summary: ue.globalEntry.summary,
          source: ue.globalEntry.source,
          url: ue.globalEntry.url,
          createdAt: ue.globalEntry.createdAt.toISOString(),
          publicationYear: ue.globalEntry.publicationYear,
          addedAt: ue.createdAt.toISOString()
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
