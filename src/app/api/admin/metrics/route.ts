import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/adminAuth';
import { prisma, withRetry } from '@/lib/prismaWithRetry';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = adminAuth(request);
  if (authResult) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // User Onboarding Metrics
    const [totalSignups, signupsPerDay, usernameSetups, emailVerifications] = await Promise.all([
      // Total signups
      prisma.analyticsEvent.count({
        where: {
          event: 'USER_SIGNED_UP',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      // Signups per day
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM "AnalyticsEvent"
        WHERE event = 'USER_SIGNED_UP'
          ${startDate ? `AND timestamp >= ${startDate}` : ''}
          ${endDate ? `AND timestamp <= ${endDate}` : ''}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 30
      `,

      // Username setups
      prisma.analyticsEvent.count({
        where: {
          event: 'USERNAME_SET',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      // Email verifications
      prisma.analyticsEvent.count({
        where: {
          event: 'EMAIL_VERIFIED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),
    ]);

    // Entry Actions Metrics
    const [
      totalEntries,
      entriesPerUser,
      readingStatusCounts,
      topUsers,
    ] = await Promise.all([
      // Total entries saved
      prisma.analyticsEvent.count({
        where: {
          event: 'ENTRY_SAVED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      // Average entries per user
      prisma.analyticsEvent.groupBy({
        by: ['userId'],
        where: {
          event: 'ENTRY_SAVED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
        _count: true,
      }),

      // Reading status distribution
      prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT 
          metadata->>'readingStatus' as status,
          COUNT(*) as count
        FROM "AnalyticsEvent"
        WHERE event = 'READING_STATUS_UPDATED'
          ${startDate ? `AND timestamp >= ${startDate}` : ''}
          ${endDate ? `AND timestamp <= ${endDate}` : ''}
        GROUP BY metadata->>'readingStatus'
      `,

      // Top users by entries saved
      prisma.$queryRaw<Array<{ email: string; entryCount: bigint }>>`
        SELECT 
          u.email,
          COUNT(ae.id) as entryCount
        FROM "AnalyticsEvent" ae
        JOIN "User" u ON ae."userId" = u.id
        WHERE ae.event = 'ENTRY_SAVED'
          ${startDate ? `AND ae.timestamp >= ${startDate}` : ''}
          ${endDate ? `AND ae.timestamp <= ${endDate}` : ''}
        GROUP BY u.email
        ORDER BY entryCount DESC
        LIMIT 10
      `,
    ]);

    // Collections Metrics
    const [
      collectionsCreated,
      sharedCollections,
      collectionSharesAccepted,
      avgEntriesPerCollection,
    ] = await Promise.all([
      prisma.analyticsEvent.count({
        where: {
          event: 'COLLECTION_CREATED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      prisma.analyticsEvent.count({
        where: {
          event: 'COLLECTION_SHARED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      prisma.analyticsEvent.count({
        where: {
          event: 'COLLECTION_SHARE_ACCEPTED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      prisma.$queryRaw<Array<{ avg_entries: number }>>`
        SELECT AVG(entry_count) as avg_entries
        FROM (
          SELECT 
            c.id,
            COUNT(ec."entryId") as entry_count
          FROM "Collection" c
          LEFT JOIN "EntryCollection" ec ON c.id = ec."collectionId"
          WHERE c."createdAt" ${startDate ? `>= ${startDate}` : '>= \'2020-01-01\''}
            ${endDate ? `AND c."createdAt" <= ${endDate}` : ''}
          GROUP BY c.id
        ) t
      `,
    ]);

    // Feed & Engagement Metrics
    const [
      feedCardViews,
      addToLibraryClicks,
      multipleSavesUsers,
    ] = await Promise.all([
      prisma.analyticsEvent.count({
        where: {
          event: 'FEED_CARD_VIEWED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      prisma.analyticsEvent.count({
        where: {
          event: 'ADD_TO_LIBRARY_CLICKED',
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
        },
      }),

      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM (
          SELECT "userId"
          FROM "AnalyticsEvent"
          WHERE event = 'ENTRY_SAVED'
            ${startDate ? `AND timestamp >= ${startDate}` : ''}
            ${endDate ? `AND timestamp <= ${endDate}` : ''}
          GROUP BY "userId"
          HAVING COUNT(*) > 1
        ) t
      `,
    ]);

    // Calculate derived metrics
    const avgEntriesPerUserValue = entriesPerUser.length > 0
      ? entriesPerUser.reduce((sum, user) => sum + user._count, 0) / entriesPerUser.length
      : 0;

    const multipleSavePercentage = totalEntries > 0
      ? Number((Number(multipleSavesUsers[0]?.count || 0) / entriesPerUser.length) * 100)
      : 0;

    const metrics = {
      userOnboarding: {
        totalSignups,
        signupsPerDay: signupsPerDay.map(d => ({ date: d.date, count: Number(d.count) })),
        usernameSetups,
        emailVerifications,
      },
      entryActions: {
        totalEntries,
        avgEntriesPerUser: Math.round(avgEntriesPerUserValue * 100) / 100,
        readingStatusDistribution: readingStatusCounts.map(r => ({ status: r.status, count: Number(r.count) })),
        topUsers: topUsers.map(u => ({ email: u.email, entryCount: Number(u.entryCount) })),
      },
      collections: {
        collectionsCreated,
        sharedCollections,
        collectionSharesAccepted,
        avgEntriesPerCollection: Math.round((Number(avgEntriesPerCollection[0]?.avg_entries || 0) * 100) / 100),
      },
      engagement: {
        feedCardViews,
        addToLibraryClicks,
        multipleSavesUsers: Number(multipleSavesUsers[0]?.count || 0),
        multipleSavePercentage,
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
