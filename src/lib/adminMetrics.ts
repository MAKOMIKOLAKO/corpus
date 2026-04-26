import { Prisma } from '@prisma/client';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { prisma, withRetry } from '@/lib/prismaWithRetry';

const PRO_PLANS = ['PRO', 'LIFETIME_PRO'] as const;
const MONTHLY_PRICE = 6;
const ANNUAL_MRR_EQUIVALENT = 4;

const prismaDynamic = prisma as typeof prisma & {
  dailyMetricsSnapshot: {
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<Array<Record<string, any>>>;
  };
};

type SnapshotRow = SnapshotMetricPayload & {
  id?: string;
  createdAt: Date;
};

type Period = '7d' | '30d' | '90d' | '1y';

type QueueStatusCount = {
  status: string;
  _count: { status: number };
};

type NumericRecord = Record<string, number>;

type SnapshotMetricPayload = {
  date: Date;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  proUsers: number;
  newProSubscriptions: number;
  churnedSubscriptions: number;
  totalEntries: number;
  newEntries: number;
  totalCollections: number;
  newCollections: number;
  totalConnections: number;
  newConnections: number;
  queueItemsProcessed: number;
  queueSuccessRate: number;
  dailyBriefsGenerated: number;
  readingSessionsStarted: number;
  bibliographiesGenerated: number;
};

export function maskEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const [localPart, domain] = email.split('@');

  if (!domain) {
    return `${email.slice(0, 3)}***`;
  }

  return `${localPart.slice(0, 3)}***@${domain}`;
}

export function maskStripeCustomerId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.slice(0, 8);
}

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getPeriodRange(period: Period) {
  const today = startOfUtcDay();

  switch (period) {
    case '7d':
      return { start: subDays(today, 6), end: today, bucket: 'day' as const };
    case '30d':
      return { start: subDays(today, 29), end: today, bucket: 'day' as const };
    case '90d':
      return { start: subDays(today, 89), end: today, bucket: 'day' as const };
    case '1y':
    default:
      return { start: subDays(today, 364), end: today, bucket: 'week' as const };
  }
}

function buildContinuousDateSeries(start: Date, end: Date) {
  const series: Date[] = [];
  let cursor = startOfUtcDay(start);

  while (cursor <= end) {
    series.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return series;
}

function safeDivide(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}

function normalizeBucketCounts<T extends { date: Date | string; value: number }>(points: T[]) {
  return points.map((point) => ({
    date: typeof point.date === 'string' ? point.date : formatDateKey(point.date),
    value: point.value,
  }));
}

async function getQueueSuccessRateSince(startDate: Date) {
  const queueStatuses = await withRetry(() => prisma.queueItem.groupBy({
    by: ['status'],
    where: {
      createdAt: { gte: startDate },
      status: { in: ['COMPLETED', 'FAILED'] },
    },
    _count: { status: true },
  }));

  const completed = queueStatuses.find((item) => item.status === 'COMPLETED')?._count.status ?? 0;
  const failed = queueStatuses.find((item) => item.status === 'FAILED')?._count.status ?? 0;

  return safeDivide(completed, completed + failed);
}

async function getActiveUsersBetween(startDate: Date, endDate: Date) {
  const [entryUsers, queueUsers, readingUsers] = await Promise.all([
    withRetry(() => prisma.userEntry.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { userId: true },
      distinct: ['userId'],
    })),
    withRetry(() => prisma.queueItem.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { userId: true },
      distinct: ['userId'],
    })),
    withRetry(() => prisma.paperReadingSession.findMany({
      where: { sessionStarted: { gte: startDate, lte: endDate } },
      select: { userId: true },
      distinct: ['userId'],
    })),
  ]);

  return new Set([
    ...entryUsers.map((item) => item.userId),
    ...queueUsers.map((item) => item.userId),
    ...readingUsers.map((item) => item.userId),
  ]).size;
}

async function getApproximateMonthlyAnnualLifetimeCounts() {
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;

  const activeUsers = await withRetry(() => prisma.user.findMany({
    where: {
      plan: { in: ['PRO', 'LIFETIME_PRO'] },
    },
    select: {
      id: true,
      plan: true,
      stripePriceId: true,
      subscriptionStatus: true,
    },
  }));

  let monthly = 0;
  let annual = 0;
  let lifetime = 0;

  for (const user of activeUsers) {
    if (user.plan === 'LIFETIME_PRO') {
      lifetime += 1;
      continue;
    }

    if (user.subscriptionStatus === 'active' && monthlyPriceId && user.stripePriceId === monthlyPriceId) {
      monthly += 1;
      continue;
    }

    if (user.subscriptionStatus === 'active' && annualPriceId && user.stripePriceId === annualPriceId) {
      annual += 1;
      continue;
    }

    if (user.plan === 'PRO') {
      monthly += 1;
    }
  }

  return { monthly, annual, lifetime };
}

export async function computeDailyMetricsSnapshot(date = new Date()): Promise<SnapshotMetricPayload> {
  const bucketStart = startOfUtcDay(date);
  const bucketEnd = endOfDay(bucketStart);
  const last7DaysStart = subDays(bucketStart, 6);

  const [
    totalUsers,
    newUsers,
    proUsers,
    totalEntries,
    newEntries,
    totalCollections,
    newCollections,
    totalConnections,
    newConnections,
    queueItemsProcessed,
    dailyBriefsGenerated,
    readingSessionsStarted,
    bibliographiesGenerated,
    queueSuccessRate,
    activeUsers,
  ] = await Promise.all([
    withRetry(() => prisma.user.count()),
    withRetry(() => prisma.user.count({ where: { createdAt: { gte: bucketStart, lte: bucketEnd } } })),
    withRetry(() => prisma.user.count({ where: { plan: { in: ['PRO', 'LIFETIME_PRO'] } } })),
    withRetry(() => prisma.userEntry.count()),
    withRetry(() => prisma.userEntry.count({ where: { createdAt: { gte: bucketStart, lte: bucketEnd } } })),
    withRetry(() => prisma.collection.count()),
    withRetry(() => prisma.collection.count({ where: { createdAt: { gte: bucketStart, lte: bucketEnd } } })),
    withRetry(() => prisma.connection.count({ where: { status: 'ACCEPTED' } })),
    withRetry(() => prisma.connection.count({ where: { status: 'ACCEPTED', updatedAt: { gte: bucketStart, lte: bucketEnd } } })),
    withRetry(() => prisma.queueItem.count({ where: { completedAt: { gte: bucketStart, lte: bucketEnd }, status: { in: ['COMPLETED', 'FAILED'] } } })),
    withRetry(() => prisma.dailyBrief.count({ where: { generatedAt: { gte: bucketStart, lte: bucketEnd } } })),
    withRetry(() => prisma.paperReadingSession.count({ where: { sessionStarted: { gte: bucketStart, lte: bucketEnd } } })),
    withRetry(() => prisma.generatedBibliography.count({ where: { createdAt: { gte: bucketStart, lte: bucketEnd } } })),
    getQueueSuccessRateSince(bucketStart),
    getActiveUsersBetween(bucketStart, bucketEnd),
  ]);

  const previousProUsers = await withRetry(() => prisma.user.count({
    where: {
      plan: { in: ['PRO', 'LIFETIME_PRO'] },
      createdAt: { lt: bucketStart },
    },
  }));

  const rollingProUsers = await withRetry(() => prisma.user.count({
    where: {
      plan: { in: ['PRO', 'LIFETIME_PRO'] },
      createdAt: { gte: last7DaysStart, lte: bucketEnd },
    },
  }));

  return {
    date: bucketStart,
    totalUsers,
    newUsers,
    activeUsers,
    proUsers,
    newProSubscriptions: Math.max(0, proUsers - previousProUsers),
    churnedSubscriptions: Math.max(0, rollingProUsers - proUsers),
    totalEntries,
    newEntries,
    totalCollections,
    newCollections,
    totalConnections,
    newConnections,
    queueItemsProcessed,
    queueSuccessRate,
    dailyBriefsGenerated,
    readingSessionsStarted,
    bibliographiesGenerated,
  };
}

export async function upsertDailyMetricsSnapshot(date = new Date()) {
  const metrics = await computeDailyMetricsSnapshot(date);

  const snapshot = await withRetry(() => prismaDynamic.dailyMetricsSnapshot.upsert({
    where: { date: metrics.date },
    create: metrics,
    update: metrics,
  }));

  return { snapshot, metrics };
}

export async function getOverviewMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const weekAgo = subDays(todayStart, 7);
  const monthAgo = subDays(todayStart, 30);

  const [
    totalUsers,
    totalProUsers,
    lifetimeProUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    verifiedUsers,
    totalEntries,
    totalGlobalEntries,
    totalCollections,
    totalConnections,
    activeAlerts,
    totalReadingSessions,
    totalBibliographies,
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    queueSuccessRate,
    totalFeedback,
    recentSignups,
    recentFeedback,
  ] = await Promise.all([
    withRetry(() => prisma.user.count()),
    withRetry(() => prisma.user.count({ where: { plan: { in: ['PRO', 'LIFETIME_PRO'] } } })),
    withRetry(() => prisma.user.count({ where: { plan: 'LIFETIME_PRO' } })),
    withRetry(() => prisma.user.count({ where: { createdAt: { gte: todayStart } } })),
    withRetry(() => prisma.user.count({ where: { createdAt: { gte: weekStart } } })),
    withRetry(() => prisma.user.count({ where: { createdAt: { gte: monthStart } } })),
    withRetry(() => prisma.user.count({ where: { emailVerified: { not: null } } })),
    withRetry(() => prisma.userEntry.count()),
    withRetry(() => prisma.globalEntry.count()),
    withRetry(() => prisma.collection.count()),
    withRetry(() => prisma.connection.count({ where: { status: 'ACCEPTED' } })),
    withRetry(() => prisma.watchQuery.count({ where: { isActive: true } })),
    withRetry(() => prisma.paperReadingSession.count()),
    withRetry(() => prisma.generatedBibliography.count()),
    getActiveUsersBetween(todayStart, endOfDay(now)),
    getActiveUsersBetween(weekStart, endOfDay(now)),
    getActiveUsersBetween(monthStart, endOfDay(now)),
    getQueueSuccessRateSince(weekAgo),
    withRetry(() => prisma.feedback.count()),
    withRetry(() => prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        email: true,
        plan: true,
        createdAt: true,
        emailVerified: true,
      },
    })),
    withRetry(() => prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        message: true,
        rating: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            plan: true,
          },
        },
      },
    })),
  ]);

  const proBreakdown = await getApproximateMonthlyAnnualLifetimeCounts();
  const activePayingUsers = await withRetry(() => prisma.user.count({
    where: {
      plan: 'PRO',
      subscriptionStatus: 'active',
    },
  }));

  const snapshots = await withRetry(() => prismaDynamic.dailyMetricsSnapshot.findMany({
    where: { date: { gte: monthAgo } },
    orderBy: { date: 'asc' },
  })) as SnapshotRow[];

  const sparkline = snapshots.map((snapshot) => ({
    date: formatDateKey(snapshot.date),
    value: snapshot.activeUsers,
  }));

  const featureUsageCounts = await Promise.all([
    withRetry(() => prisma.user.findMany({ where: { entriesCount: { gt: 0 } }, select: { id: true } })),
    withRetry(() => prisma.collection.findMany({ distinct: ['userId'], where: { userId: { not: null } }, select: { userId: true } })),
    withRetry(() => prisma.connection.findMany({
      distinct: ['requesterId'],
      where: { status: 'ACCEPTED' },
      select: { requesterId: true, receiverId: true },
    })),
    withRetry(() => prisma.watchQuery.findMany({ distinct: ['userId'], select: { userId: true } })),
    withRetry(() => prisma.paperReadingSession.findMany({ distinct: ['userId'], select: { userId: true } })),
    withRetry(() => prisma.generatedBibliography.findMany({ distinct: ['userId'], select: { userId: true } })),
  ]);

  const userFeatureCounts = new Map<string, number>();

  featureUsageCounts[0].forEach((user) => {
    userFeatureCounts.set(user.id, (userFeatureCounts.get(user.id) ?? 0) + 1);
  });
  featureUsageCounts[1].forEach((item) => {
    if (item.userId) {
      userFeatureCounts.set(item.userId, (userFeatureCounts.get(item.userId) ?? 0) + 1);
    }
  });
  featureUsageCounts[2].forEach((item) => {
    userFeatureCounts.set(item.requesterId, (userFeatureCounts.get(item.requesterId) ?? 0) + 1);
    userFeatureCounts.set(item.receiverId, (userFeatureCounts.get(item.receiverId) ?? 0) + 1);
  });
  featureUsageCounts[3].forEach((item) => {
    userFeatureCounts.set(item.userId, (userFeatureCounts.get(item.userId) ?? 0) + 1);
  });
  featureUsageCounts[4].forEach((item) => {
    userFeatureCounts.set(item.userId, (userFeatureCounts.get(item.userId) ?? 0) + 1);
  });
  featureUsageCounts[5].forEach((item) => {
    userFeatureCounts.set(item.userId, (userFeatureCounts.get(item.userId) ?? 0) + 1);
  });

  let multiFeatureUsers = 0;
  for (const count of Array.from(userFeatureCounts.values())) {
    if (count >= 3) {
      multiFeatureUsers += 1;
    }
  }

  const popularFeatures: Array<{ name: string; users: number }> = [
    { name: 'Saved entries', users: featureUsageCounts[0].length },
    { name: 'Collections', users: featureUsageCounts[1].length },
    { name: 'Connections', users: new Set(featureUsageCounts[2].flatMap((item) => [item.requesterId, item.receiverId])).size },
    { name: 'Alerts', users: featureUsageCounts[3].length },
    { name: 'Workspace', users: featureUsageCounts[4].length },
    { name: 'Bibliography', users: featureUsageCounts[5].length },
  ].sort((a, b) => b.users - a.users);

  return {
    totalUsers,
    totalProUsers,
    lifetimeProUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    verifiedUsers,
    totalEntries,
    totalGlobalEntries,
    totalCollections,
    totalConnections,
    activeAlerts,
    totalReadingSessions,
    totalBibliographies,
    queueSuccessRate,
    estimatedMrr: proBreakdown.monthly * MONTHLY_PRICE + proBreakdown.annual * ANNUAL_MRR_EQUIVALENT,
    activePayingUsers,
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    totalFeedback,
    proBreakdown,
    featureAdoption: {
      usersWithThreePlusFeatures: multiFeatureUsers,
      mostPopularFeature: popularFeatures[0] ?? { name: 'None yet', users: 0 },
    },
    recentSignups: recentSignups.map((user) => ({
      id: user.id,
      email: maskEmail(user.email),
      plan: user.plan,
      createdAt: user.createdAt,
      verified: Boolean(user.emailVerified),
    })),
    recentProConversions: recentSignups
      .filter((user) => user.plan !== 'FREE')
      .slice(0, 10)
      .map((user) => ({
        id: user.id,
        email: maskEmail(user.email),
        convertedAt: user.createdAt,
        plan: user.plan,
      })),
    recentFeedback: recentFeedback.map((item) => ({
      id: item.id,
      message: truncate(item.message, 100),
      rating: item.rating,
      createdAt: item.createdAt,
      email: maskEmail(item.user?.email ?? null),
      plan: item.user?.plan ?? null,
    })),
    sparkline,
    generatedAt: new Date().toISOString(),
    notes: {
      mrr: 'Estimated — contact Stripe for exact figures',
    },
  };
}

export async function getGrowthMetrics(period: Period) {
  const { start, end, bucket } = getPeriodRange(period);
  const snapshots = await withRetry(() => prismaDynamic.dailyMetricsSnapshot.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  })) as SnapshotRow[];

  let rows: SnapshotRow[] = snapshots;

  if (rows.length === 0) {
    const dailyUsers = await withRetry(() => prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: start, lte: endOfDay(end) } },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    }));

    const dateMap = new Map<string, number>();
    for (const item of dailyUsers) {
      dateMap.set(formatDateKey(startOfDay(item.createdAt)), item._count.id);
    }

    let cumulativeUsers = await withRetry(() => prisma.user.count({ where: { createdAt: { lt: start } } }));
    rows = buildContinuousDateSeries(start, end).map((date) => {
      const key = formatDateKey(date);
      const newUsers = dateMap.get(key) ?? 0;
      cumulativeUsers += newUsers;
      return {
        id: key,
        date,
        totalUsers: cumulativeUsers,
        newUsers,
        activeUsers: 0,
        proUsers: 0,
        newProSubscriptions: 0,
        churnedSubscriptions: 0,
        totalEntries: 0,
        newEntries: 0,
        totalCollections: 0,
        newCollections: 0,
        totalConnections: 0,
        newConnections: 0,
        queueItemsProcessed: 0,
        queueSuccessRate: 0,
        dailyBriefsGenerated: 0,
        readingSessionsStarted: 0,
        bibliographiesGenerated: 0,
        createdAt: date,
      };
    });
  }

  if (bucket === 'week') {
    const weekly = new Map<string, { label: string; items: SnapshotRow[] }>();
    for (const row of rows) {
      const weekStart = startOfWeek(row.date, { weekStartsOn: 1 });
      const key = formatDateKey(weekStart);
      const group = weekly.get(key) ?? { label: key, items: [] as SnapshotRow[] };
      group.items.push(row);
      weekly.set(key, group);
    }

    const aggregateRows = Array.from(weekly.values()).map((group) => {
      const last = group.items[group.items.length - 1];
      return {
        date: group.label,
        newUsers: group.items.reduce((sum, item) => sum + item.newUsers, 0),
        cumulativeUsers: last?.totalUsers ?? 0,
        newProSubscriptions: group.items.reduce((sum, item) => sum + item.newProSubscriptions, 0),
        cumulativeProUsers: last?.proUsers ?? 0,
        newEntries: group.items.reduce((sum, item) => sum + item.newEntries, 0),
        activeUsers: Math.max(...group.items.map((item) => item.activeUsers), 0),
        mrr: group.items.reduce((sum, item) => sum + item.proUsers * MONTHLY_PRICE, 0) / Math.max(group.items.length, 1),
      };
    });

    return {
      period,
      newUsers: aggregateRows.map(({ date, newUsers }) => ({ date, value: newUsers })),
      cumulativeUsers: aggregateRows.map(({ date, cumulativeUsers }) => ({ date, value: cumulativeUsers })),
      newProSubscriptions: aggregateRows.map(({ date, newProSubscriptions }) => ({ date, value: newProSubscriptions })),
      cumulativeProUsers: aggregateRows.map(({ date, cumulativeProUsers }) => ({ date, value: cumulativeProUsers })),
      newEntries: aggregateRows.map(({ date, newEntries }) => ({ date, value: newEntries })),
      activeUsers: aggregateRows.map(({ date, activeUsers }) => ({ date, value: activeUsers })),
      mrr: aggregateRows.map(({ date, mrr }) => ({ date, value: Math.round(mrr * 100) / 100 })),
      generatedAt: new Date().toISOString(),
      usedFallback: snapshots.length === 0,
    };
  }

  return {
    period,
    newUsers: rows.map((row) => ({ date: formatDateKey(row.date), value: row.newUsers })),
    cumulativeUsers: rows.map((row) => ({ date: formatDateKey(row.date), value: row.totalUsers })),
    newProSubscriptions: rows.map((row) => ({ date: formatDateKey(row.date), value: row.newProSubscriptions })),
    cumulativeProUsers: rows.map((row) => ({ date: formatDateKey(row.date), value: row.proUsers })),
    newEntries: rows.map((row) => ({ date: formatDateKey(row.date), value: row.newEntries })),
    activeUsers: rows.map((row) => ({ date: formatDateKey(row.date), value: row.activeUsers })),
    mrr: rows.map((row) => ({ date: formatDateKey(row.date), value: row.proUsers * MONTHLY_PRICE })),
    generatedAt: new Date().toISOString(),
    usedFallback: snapshots.length === 0,
  };
}

export async function getUsersMetrics(params: {
  page: number;
  limit: number;
  search?: string;
  plan?: string;
  verified?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 25));
  const order = params.order === 'asc' ? 'asc' : 'desc';
  const where: Prisma.UserWhereInput = {
    ...(params.search
      ? {
        OR: [
          { email: { contains: params.search, mode: 'insensitive' } },
          { username: { contains: params.search, mode: 'insensitive' } },
          { name: { contains: params.search, mode: 'insensitive' } },
        ],
      }
      : {}),
    ...(params.plan && params.plan !== 'all'
      ? { plan: params.plan as 'FREE' | 'PRO' | 'LIFETIME_PRO' }
      : {}),
    ...(params.verified === 'yes' ? { emailVerified: { not: null } } : {}),
    ...(params.verified === 'no' ? { emailVerified: null } : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    params.sort === 'entriesCount'
      ? { entriesCount: order }
      : params.sort === 'plan'
        ? { plan: order }
        : { createdAt: order };

  const [users, total] = await Promise.all([
    withRetry(() => prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        emailVerified: true,
        createdAt: true,
        entriesCount: true,
        personalCollectionsCount: true,
        stripeCustomerId: true,
        bio: true,
      },
    })),
    withRetry(() => prisma.user.count({ where })),
  ]);

  const userIds = users.map((user) => user.id);

  const [connectionCounts, lastEntryActivity, lastQueueActivity, lastReadingActivity, recentActivities] = await Promise.all([
    withRetry(() => prisma.connection.groupBy({
      by: ['requesterId'],
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: { in: userIds } }, { receiverId: { in: userIds } }],
      },
      _count: { requesterId: true },
    })),
    withRetry(() => prisma.userEntry.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _max: { createdAt: true },
    })),
    withRetry(() => prisma.queueItem.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _max: { createdAt: true },
    })),
    withRetry(() => prisma.paperReadingSession.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _max: { lastActivity: true },
    })),
    withRetry(() => prisma.analyticsEvent.findMany({
      where: { userId: { in: userIds } },
      orderBy: { timestamp: 'desc' },
      take: 100,
      select: { userId: true, event: true, timestamp: true },
    })),
  ]);

  const connectionMap = new Map<string, number>();
  for (const userId of userIds) {
    const sent = await prisma.connection.count({ where: { status: 'ACCEPTED', requesterId: userId } });
    const received = await prisma.connection.count({ where: { status: 'ACCEPTED', receiverId: userId } });
    connectionMap.set(userId, sent + received);
  }

  const lastEntryMap = new Map(lastEntryActivity.map((item) => [item.userId, item._max.createdAt]));
  const lastQueueMap = new Map(lastQueueActivity.map((item) => [item.userId, item._max.createdAt]));
  const lastReadingMap = new Map(lastReadingActivity.map((item) => [item.userId, item._max.lastActivity]));
  const activityMap = new Map<string, Array<{ event: string; timestamp: Date }>>();

  for (const activity of recentActivities) {
    if (!activity.userId) {
      continue;
    }

    const bucket = activityMap.get(activity.userId) ?? [];
    if (bucket.length < 5) {
      bucket.push({ event: activity.event, timestamp: activity.timestamp });
    }
    activityMap.set(activity.userId, bucket);
  }

  return {
    users: users.map((user) => {
      const lastActivityCandidates = [
        lastEntryMap.get(user.id),
        lastQueueMap.get(user.id),
        lastReadingMap.get(user.id),
      ].filter(Boolean) as Date[];

      const hasCollections = user.personalCollectionsCount > 0;
      const hasConnections = (connectionMap.get(user.id) ?? 0) > 0;

      return {
        id: user.id,
        email: maskEmail(user.email),
        fullEmail: user.email,
        username: user.username,
        name: user.name,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndsAt: user.subscriptionEndsAt,
        emailVerified: Boolean(user.emailVerified),
        emailVerifiedAt: user.emailVerified,
        createdAt: user.createdAt,
        entriesCount: user.entriesCount,
        collectionCount: user.personalCollectionsCount,
        connectionCount: connectionMap.get(user.id) ?? 0,
        lastActivity: lastActivityCandidates.length > 0 ? new Date(Math.max(...lastActivityCandidates.map((item) => item.getTime()))) : null,
        institutionName: null,
        stripeCustomerId: maskStripeCustomerId(user.stripeCustomerId),
        fullStripeCustomerId: user.stripeCustomerId,
        featureUsage: {
          hasEntries: user.entriesCount > 0,
          hasCollections,
          hasConnections,
          hasAlerts: false,
          hasWorkspace: Boolean(lastReadingMap.get(user.id)),
          hasBibliography: false,
          hasSharedEntry: false,
          hasPublicProfile: Boolean(user.bio),
        },
        recentActivity: activityMap.get(user.id) ?? [],
      };
    }),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    generatedAt: new Date().toISOString(),
  };
}

export async function getFeedbackMetrics(params: {
  page: number;
  limit: number;
  sort?: 'newest' | 'oldest';
  auth?: 'all' | 'authenticated' | 'anonymous';
  category?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 25));
  const orderBy = params.sort === 'oldest' ? 'asc' : 'desc';
  const where: Prisma.FeedbackWhereInput = {
    ...(params.auth === 'authenticated' ? { userId: { not: null } } : {}),
    ...(params.auth === 'anonymous' ? { userId: null } : {}),
  };

  const [items, total, weekCount, monthCount, authenticatedCount, anonymousCount, ratingBreakdown, perDay] = await Promise.all([
    withRetry(() => prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            username: true,
            plan: true,
          },
        },
      },
      orderBy: { createdAt: orderBy },
      skip: (page - 1) * limit,
      take: limit,
    })),
    withRetry(() => prisma.feedback.count({ where })),
    withRetry(() => prisma.feedback.count({ where: { ...where, createdAt: { gte: subDays(new Date(), 7) } } })),
    withRetry(() => prisma.feedback.count({ where: { ...where, createdAt: { gte: subDays(new Date(), 30) } } })),
    withRetry(() => prisma.feedback.count({ where: { ...where, userId: { not: null } } })),
    withRetry(() => prisma.feedback.count({ where: { ...where, userId: null } })),
    withRetry(() => prisma.feedback.groupBy({ by: ['rating'], _count: { rating: true }, where: { ...where, rating: { not: null } } })),
    withRetry(() => prisma.feedback.findMany({
      where: { ...where, createdAt: { gte: subDays(new Date(), 30) } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })),
  ]);

  const perDayMap = new Map<string, number>();
  perDay.forEach((item) => {
    const key = formatDateKey(startOfDay(item.createdAt));
    perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      content: item.message,
      rating: item.rating,
      category: null,
      createdAt: item.createdAt,
      userId: item.userId,
      user: item.user
        ? {
          email: maskEmail(item.user.email),
          fullEmail: item.user.email,
          username: item.user.username,
          plan: item.user.plan,
        }
        : null,
      anonymousEmail: item.user ? null : maskEmail(item.email),
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    aggregates: {
      total,
      thisWeek: weekCount,
      thisMonth: monthCount,
      authenticated: authenticatedCount,
      anonymous: anonymousCount,
      categories: [],
      ratings: ratingBreakdown.map((item) => ({ rating: item.rating, count: item._count.rating })),
      submissionsPerDay: buildContinuousDateSeries(subDays(startOfDay(new Date()), 29), startOfDay(new Date())).map((date) => ({
        date: formatDateKey(date),
        value: perDayMap.get(formatDateKey(date)) ?? 0,
      })),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getRevenueMetrics() {
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;
  const monthStart = startOfMonth(new Date());

  const [
    activePayingUsers,
    lifetimeProUsers,
    activeByStatus,
    usersByPriceId,
    canceledThisMonth,
    promoRedeemed,
    promoCreated,
    recentPromoCodes,
  ] = await Promise.all([
    withRetry(() => prisma.user.count({ where: { plan: 'PRO', subscriptionStatus: 'active' } })),
    withRetry(() => prisma.user.count({ where: { plan: 'LIFETIME_PRO' } })),
    withRetry(() => prisma.user.groupBy({
      by: ['subscriptionStatus'],
      where: { plan: { in: ['PRO', 'LIFETIME_PRO'] } },
      _count: { subscriptionStatus: true },
    })),
    withRetry(() => prisma.user.groupBy({
      by: ['stripePriceId'],
      where: { plan: { in: ['PRO', 'LIFETIME_PRO'] } },
      _count: { stripePriceId: true },
    })),
    withRetry(() => prisma.user.count({
      where: {
        OR: [
          { subscriptionStatus: 'canceled', subscriptionEndsAt: { gte: monthStart } },
          { plan: 'FREE', subscriptionEndsAt: { gte: monthStart } },
        ],
      },
    })),
    withRetry(() => prisma.promoCode.count({ where: { usedAt: { not: null } } })),
    withRetry(() => prisma.promoCode.count()),
    withRetry(() => prisma.promoCode.findMany({
      where: { usedAt: { not: null } },
      orderBy: { usedAt: 'desc' },
      take: 10,
      include: { user: { select: { email: true } } },
    })),
  ]);

  const monthlyUsers = usersByPriceId.find((item) => item.stripePriceId === monthlyPriceId)?._count.stripePriceId ?? 0;
  const annualUsers = usersByPriceId.find((item) => item.stripePriceId === annualPriceId)?._count.stripePriceId ?? 0;
  const estimatedMrr = monthlyUsers * MONTHLY_PRICE + annualUsers * ANNUAL_MRR_EQUIVALENT;
  const newSubscriptionsThisMonth = await withRetry(() => prisma.user.count({
    where: {
      plan: 'PRO',
      createdAt: { gte: monthStart },
    },
  }));

  const lifetimeUsers = await withRetry(() => prisma.user.findMany({
    where: { plan: 'LIFETIME_PRO' },
    select: { createdAt: true },
  }));
  const averageLifetimeMonths = lifetimeUsers.length > 0
    ? lifetimeUsers.reduce((sum, item) => sum + Math.max(1, differenceInCalendarDays(new Date(), item.createdAt) / 30), 0) / lifetimeUsers.length
    : 0;

  return {
    activePayingUsers,
    lifetimeProUsers,
    estimatedMrr,
    churnThisMonth: canceledThisMonth,
    newSubscriptionsThisMonth,
    netNewMrrThisMonth: newSubscriptionsThisMonth * MONTHLY_PRICE - canceledThisMonth * MONTHLY_PRICE,
    lostRevenueFromLifetimeDeals: Math.round(lifetimeProUsers * MONTHLY_PRICE * averageLifetimeMonths),
    priceBreakdown: [
      { label: 'Monthly Plan', activeUsers: monthlyUsers, revenueContribution: monthlyUsers * MONTHLY_PRICE },
      { label: 'Annual Plan', activeUsers: annualUsers, revenueContribution: annualUsers * ANNUAL_MRR_EQUIVALENT },
      { label: 'Lifetime Pro', activeUsers: lifetimeProUsers, revenueContribution: 0 },
    ],
    subscriptionStatuses: activeByStatus.map((item) => ({
      status: item.subscriptionStatus ?? 'unknown',
      count: item._count.subscriptionStatus,
    })),
    promoCodes: {
      totalCreated: promoCreated,
      totalRedeemed: promoRedeemed,
      redemptionRate: safeDivide(promoRedeemed, promoCreated),
      recentRedemptions: recentPromoCodes.map((item) => ({
        id: item.id,
        code: item.code,
        usedAt: item.usedAt,
        email: maskEmail(item.user?.email ?? null),
      })),
    },
    notes: 'Estimated — contact Stripe for exact figures',
    generatedAt: new Date().toISOString(),
  };
}

export async function getLoginMetrics() {
  const startDate = subDays(startOfDay(new Date()), 89);
  const endDate = endOfDay(new Date());

  const [events, active24h, active7d, active30d, neverActiveUsers, recentUsers] = await Promise.all([
    withRetry(() => prisma.analyticsEvent.findMany({
      where: { timestamp: { gte: startDate, lte: endDate }, userId: { not: null } },
      select: { userId: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    })),
    getActiveUsersBetween(subDays(new Date(), 1), endDate),
    getActiveUsersBetween(subDays(new Date(), 7), endDate),
    getActiveUsersBetween(subDays(new Date(), 30), endDate),
    withRetry(() => prisma.user.count({ where: { entriesCount: 0, createdAt: { lt: subDays(new Date(), 7) } } })),
    withRetry(() => prisma.user.count({ where: { entriesCount: 0, createdAt: { gte: subDays(new Date(), 7) } } })),
  ]);

  const dayMap = new Map<string, Set<string>>();
  const totalEventMap = new Map<string, number>();

  events.forEach((event) => {
    if (!event.userId) {
      return;
    }

    const key = formatDateKey(startOfDay(event.timestamp));
    const users = dayMap.get(key) ?? new Set<string>();
    users.add(event.userId);
    dayMap.set(key, users);
    totalEventMap.set(key, (totalEventMap.get(key) ?? 0) + 1);
  });

  const daily = buildContinuousDateSeries(startDate, startOfDay(new Date())).map((date) => {
    const key = formatDateKey(date);
    return {
      date: key,
      uniqueActiveUsers: dayMap.get(key)?.size ?? 0,
      totalEvents: totalEventMap.get(key) ?? 0,
    };
  });

  return {
    daily,
    activeLast24h: active24h,
    activeLast7d: active7d,
    activeLast30d: active30d,
    neverActiveUsers: {
      total: neverActiveUsers + recentUsers,
      recentSignups: recentUsers,
      olderSignups: neverActiveUsers,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getFeaturesMetrics() {
  const [entryCreationBreakdown, queueBreakdown, collectionBreakdown, alertsBreakdown, briefs, sessions, bibliographies, rssSubscriptions, publicCollections] = await Promise.all([
    withRetry(() => prisma.userEntry.groupBy({ by: ['addedVia'], _count: { addedVia: true } })),
    withRetry(() => prisma.queueItem.groupBy({ by: ['inputType', 'status'], _count: { status: true } })),
    withRetry(() => prisma.collection.groupBy({ by: ['isShared'], _count: { isShared: true } })),
    withRetry(() => prisma.watchQuery.groupBy({ by: ['isActive'], _count: { isActive: true } })),
    withRetry(() => prisma.dailyBrief.findMany({ select: { selectedPaperIds: true, viewedAt: true } })),
    withRetry(() => prisma.paperReadingSession.findMany({ include: { messages: { select: { id: true } } } })),
    withRetry(() => prisma.generatedBibliography.findMany({ select: { citationStyle: true, entryIds: true } })),
    withRetry(() => prisma.userSource.findMany({ include: { defaultFeed: { select: { name: true, category: true } } } })),
    withRetry(() => prisma.collection.findMany({ where: { isPublic: true }, select: { id: true, publicViewCount: true, name: true } })),
  ]);

  const queueTotals: NumericRecord = {};
  queueBreakdown.forEach((item) => {
    const key = `${item.inputType}_${item.status}`;
    queueTotals[key] = item._count.status;
  });

  const totalBriefs = briefs.length;
  const briefsViewed = briefs.filter((item) => item.viewedAt).length;
  const averagePapersPerBrief = totalBriefs > 0
    ? briefs.reduce((sum, item) => sum + item.selectedPaperIds.length, 0) / totalBriefs
    : 0;

  const averageMessagesPerSession = sessions.length > 0
    ? sessions.reduce((sum, item) => sum + item.messages.length, 0) / sessions.length
    : 0;

  const sessionLengthDistribution = new Map<string, number>();
  sessions.forEach((item) => {
    const label = `${item.messages.length} messages`;
    sessionLengthDistribution.set(label, (sessionLengthDistribution.get(label) ?? 0) + 1);
  });

  const citationBreakdown = new Map<string, number>();
  bibliographies.forEach((item) => {
    citationBreakdown.set(item.citationStyle, (citationBreakdown.get(item.citationStyle) ?? 0) + 1);
  });

  const defaultFeedBreakdown = new Map<string, number>();
  const defaultFeedCount = rssSubscriptions.filter((item) => item.isDefault).length;
  rssSubscriptions.forEach((item) => {
    if (item.defaultFeed?.name) {
      defaultFeedBreakdown.set(item.defaultFeed.name, (defaultFeedBreakdown.get(item.defaultFeed.name) ?? 0) + 1);
    }
  });

  return {
    entryCreationBySource: entryCreationBreakdown.map((item) => ({ source: item.addedVia ?? 'unknown', count: item._count.addedVia })),
    queueUsage: queueBreakdown.map((item) => ({ inputType: item.inputType, status: item.status, count: item._count.status })),
    queuePerformance: {
      successRate: safeDivide(
        (queueTotals.URL_COMPLETED ?? 0) + (queueTotals.PAPER_COMPLETED ?? 0) + (queueTotals.BOOK_COMPLETED ?? 0),
        Object.values(queueTotals).reduce((sum, value) => sum + value, 0)
      ),
      averageProcessingTime: { p50Minutes: 0, p95Minutes: 0 },
    },
    collectionTypeBreakdown: collectionBreakdown.map((item) => ({ isShared: item.isShared, count: item._count.isShared })),
    sharedCollections: {
      count: collectionBreakdown.find((item) => item.isShared)?._count.isShared ?? 0,
      totalMembers: await prisma.collectionMember.count({ where: { status: 'ACCEPTED' } }),
    },
    alerts: alertsBreakdown.map((item) => ({ isActive: item.isActive, count: item._count.isActive })),
    dailyBriefs: {
      totalGenerated: totalBriefs,
      averagePapersSelected: averagePapersPerBrief,
      viewedRatio: safeDivide(briefsViewed, totalBriefs),
    },
    readingSessions: {
      totalSessions: sessions.length,
      sessionsWithFullText: sessions.filter((item) => item.paperText.length > 5000).length,
      sessionsAbstractOnly: sessions.filter((item) => item.paperText.length <= 5000).length,
      averageMessagesPerSession,
      mostCommonSessionLength: Array.from(sessionLengthDistribution.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '0 messages',
    },
    bibliographies: {
      totalGenerated: bibliographies.length,
      citationStyleBreakdown: Array.from(citationBreakdown.entries()).map(([style, count]) => ({ style, count })),
      averageEntriesPerBibliography: bibliographies.length > 0
        ? bibliographies.reduce((sum, item) => sum + item.entryIds.length, 0) / bibliographies.length
        : 0,
    },
    rssSubscriptions: {
      totalSubscriptions: rssSubscriptions.length,
      defaultSubscriptions: defaultFeedCount,
      customSubscriptions: rssSubscriptions.length - defaultFeedCount,
      topDefaultFeeds: Array.from(defaultFeedBreakdown.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
    },
    publicCollections: {
      total: publicCollections.length,
      totalViews: publicCollections.reduce((sum, item) => sum + item.publicViewCount, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function getEngagementMetrics() {
  const cohortCutoff = subDays(new Date(), 30);
  const [users, averageEntriesByPlan, topUsers, usersWithAlerts, usersWithWorkspace, usersWithBiblio, usersWithRss, publicProfiles] = await Promise.all([
    withRetry(() => prisma.user.findMany({
      where: { createdAt: { lt: cohortCutoff } },
      select: {
        id: true,
        createdAt: true,
        plan: true,
        entriesCount: true,
        personalCollectionsCount: true,
        username: true,
        email: true,
        bio: true,
      },
    })),
    withRetry(() => prisma.user.groupBy({ by: ['plan'], _avg: { entriesCount: true } })),
    withRetry(() => prisma.user.findMany({
      orderBy: { entriesCount: 'desc' },
      take: 20,
      select: {
        id: true,
        username: true,
        plan: true,
        entriesCount: true,
        personalCollectionsCount: true,
        createdAt: true,
      },
    })),
    withRetry(() => prisma.watchQuery.findMany({ distinct: ['userId'], select: { userId: true } })),
    withRetry(() => prisma.paperReadingSession.findMany({ distinct: ['userId'], select: { userId: true } })),
    withRetry(() => prisma.generatedBibliography.findMany({ distinct: ['userId'], select: { userId: true } })),
    withRetry(() => prisma.userSource.findMany({ distinct: ['userId'], select: { userId: true } })),
    withRetry(() => prisma.user.count({ where: { bio: { not: null } } })),
  ]);

  const firstEntries = await withRetry(() => prisma.userEntry.groupBy({
    by: ['userId'],
    _min: { createdAt: true },
  }));
  const firstEntryMap = new Map(firstEntries.map((item) => [item.userId, item._min.createdAt]));

  const calculateRetention = (days: number) => {
    if (users.length === 0) {
      return 0;
    }

    let retained = 0;
    users.forEach((user) => {
      const firstEntry = firstEntryMap.get(user.id);
      if (!firstEntry) {
        return;
      }

      const hours = (firstEntry.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60);
      if (hours <= days * 24) {
        retained += 1;
      }
    });

    return safeDivide(retained, users.length);
  };

  const totalUsers = await prisma.user.count();
  const totalCollectionsUsers = await prisma.user.count({ where: { personalCollectionsCount: { gt: 0 } } });
  const totalConnectionUsers = await prisma.user.count({ where: { OR: [{ sentConnections: { some: { status: 'ACCEPTED' } } }, { receivedConnections: { some: { status: 'ACCEPTED' } } }] } });
  const totalProEver = await prisma.user.count({ where: { plan: { in: ['PRO', 'LIFETIME_PRO'] } } });
  const eligibleUsers = await prisma.user.count({ where: { createdAt: { lt: subDays(new Date(), 7) } } });

  const timeToFirstEntryHistogram = {
    within1Hour: 0,
    within24Hours: 0,
    within7Days: 0,
    within30Days: 0,
    never: 0,
  };

  users.forEach((user) => {
    const firstEntry = firstEntryMap.get(user.id);
    if (!firstEntry) {
      timeToFirstEntryHistogram.never += 1;
      return;
    }

    const hours = (firstEntry.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60);
    if (hours <= 1) {
      timeToFirstEntryHistogram.within1Hour += 1;
    } else if (hours <= 24) {
      timeToFirstEntryHistogram.within24Hours += 1;
    } else if (hours <= 24 * 7) {
      timeToFirstEntryHistogram.within7Days += 1;
    } else if (hours <= 24 * 30) {
      timeToFirstEntryHistogram.within30Days += 1;
    } else {
      timeToFirstEntryHistogram.never += 1;
    }
  });

  return {
    retention: {
      day1: calculateRetention(1),
      day7: calculateRetention(7),
      day30: calculateRetention(30),
    },
    freeToProConversionRate: safeDivide(totalProEver, eligibleUsers),
    averageEntriesPerUserByPlan: averageEntriesByPlan.map((item) => ({
      plan: item.plan,
      averageEntries: item._avg.entriesCount ?? 0,
    })),
    averageTimeToFirstEntryHours: 0,
    mostActiveUsers: topUsers,
    featureAdoptionRates: {
      collections: safeDivide(totalCollectionsUsers, totalUsers),
      connections: safeDivide(totalConnectionUsers, totalUsers),
      workspace: safeDivide(usersWithWorkspace.length, totalUsers),
      bibliography: safeDivide(usersWithBiblio.length, totalUsers),
      alerts: safeDivide(usersWithAlerts.length, totalUsers),
      rss: safeDivide(usersWithRss.length, totalUsers),
      publicProfiles: safeDivide(publicProfiles, totalUsers),
    },
    timeToFirstEntryHistogram,
    generatedAt: new Date().toISOString(),
  };
}
