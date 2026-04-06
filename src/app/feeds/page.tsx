import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { redirect } from 'next/navigation';
import FeedsClient from './FeedsClient';

export const dynamic = 'force-dynamic';

export default async function FeedsPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  // Fetch user's feeds
  const feeds = await prisma.userSource.findMany({
    where: { userId },
    include: {
      source: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <FeedsClient feeds={feeds.map(f => ({
        id: f.source.id,
        feedUrl: f.source.feedUrl,
        title: f.source.title,
        domain: f.source.domain,
        lastFetchedAt: f.source.lastFetchedAt,
        addedAt: f.createdAt
      }))} />
    </div>
  );
}
