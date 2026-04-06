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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true }
  });

  if (!user) {
    redirect('/login');
  }

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
      <FeedClient signals={signals.map(s => ({
        ...s,
        type: s.type as any, // Cast for simplicity
        createdAt: s.createdAt.toISOString()
      }))} userPlan={user.plan} />
    </div>
  );
}
