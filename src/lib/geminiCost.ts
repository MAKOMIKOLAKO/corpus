import { endOfDay, format, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { Prisma } from '@prisma/client';
import { FEATURE_LABELS, formatCost } from '@/lib/geminiPricing';
import { getOverviewMetrics, maskEmail } from '@/lib/adminMetrics';
import { prisma, withRetry } from '@/lib/prismaWithRetry';

type GeminiApiCallRow = {
  id: string;
  userId: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  calledAt: Date;
  user?: {
    id: string;
    email: string | null;
    username: string | null;
    name: string | null;
    plan: string;
  } | null;
};

type GeminiApiCallRowWithUser = GeminiApiCallRow & {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    name: string | null;
    plan: string;
  } | null;
};

type DailyCostSnapshotRow = {
  id?: string;
  date: Date;
  totalCost: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costByFeature: Prisma.JsonValue;
  callsByFeature: Prisma.JsonValue;
  costByModel: Prisma.JsonValue;
  uniqueUsersServed: number;
  avgCostPerActiveUser: number;
  projectedMonthlyCost: number;
  reportText?: string | null;
  createdAt?: Date;
};

type NumericRecord = Record<string, number>;
type CostPeriod = 'today' | '7d' | '30d' | '90d' | '1y' | 'all';
type LooseWhere = Record<string, unknown>;

const prismaDynamic = prisma as typeof prisma & {
  geminiApiCall: {
    findMany: (args: unknown) => Promise<GeminiApiCallRow[]>;
    aggregate: (args: unknown) => Promise<any>;
    count: (args?: unknown) => Promise<number>;
    findFirst: (args: unknown) => Promise<GeminiApiCallRow | null>;
  };
  dailyCostSnapshot: {
    upsert: (args: unknown) => Promise<DailyCostSnapshotRow>;
    findMany: (args: unknown) => Promise<DailyCostSnapshotRow[]>;
    findUnique: (args: unknown) => Promise<DailyCostSnapshotRow | null>;
  };
};

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date = new Date()) {
  return endOfDay(startOfUtcDay(date));
}

function formatDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function startOfUtcMonth(date = new Date()) {
  const d = startOfUtcDay(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function getPeriodBounds(period: CostPeriod) {
  const today = startOfUtcDay();
  if (period === 'all') {
    return null;
  }
  if (period === 'today') {
    return { start: today, end: endOfUtcDay(today) };
  }
  if (period === '7d') {
    return { start: subDays(today, 6), end: endOfUtcDay(today) };
  }
  if (period === '30d') {
    return { start: subDays(today, 29), end: endOfUtcDay(today) };
  }
  if (period === '90d') {
    return { start: subDays(today, 89), end: endOfUtcDay(today) };
  }
  return { start: subDays(today, 364), end: endOfUtcDay(today) };
}

function safeDivide(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 0;
}

function sumRecord(target: NumericRecord, key: string, amount: number) {
  target[key] = (target[key] ?? 0) + amount;
}

function normalizeNumericRecord(value: Prisma.JsonValue | null | undefined): NumericRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const next: NumericRecord = {};
  for (const [key, entry] of Object.entries(value)) {
    const numeric = Number(entry);
    if (Number.isFinite(numeric)) {
      next[key] = numeric;
    }
  }
  return next;
}

function findGeminiCalls(where: LooseWhere, includeUser: true): Promise<GeminiApiCallRowWithUser[]>;
function findGeminiCalls(where: LooseWhere, includeUser?: false): Promise<GeminiApiCallRow[]>;
async function findGeminiCalls(where: LooseWhere, includeUser = false): Promise<GeminiApiCallRow[] | GeminiApiCallRowWithUser[]> {
  return withRetry(() =>
    prismaDynamic.geminiApiCall.findMany({
      where,
      orderBy: { calledAt: 'asc' },
      ...(includeUser
        ? {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                name: true,
                plan: true,
              },
            },
          },
        }
        : {}),
    }) as Promise<GeminiApiCallRow[] | GeminiApiCallRowWithUser[]>
  );
}

function summarizeCalls(calls: GeminiApiCallRow[]) {
  const costByFeature: NumericRecord = {};
  const callsByFeature: NumericRecord = {};
  const costByModel: NumericRecord = {};
  const users = new Set<string>();
  let totalCost = 0;
  let totalCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let successCount = 0;
  const errorCounts: Record<string, number> = {};

  for (const call of calls) {
    totalCost += call.totalCost;
    totalCalls += 1;
    totalInputTokens += call.inputTokens;
    totalOutputTokens += call.outputTokens;
    sumRecord(costByFeature, call.feature, call.totalCost);
    sumRecord(callsByFeature, call.feature, 1);
    sumRecord(costByModel, call.model, call.totalCost);
    if (call.userId) {
      users.add(call.userId);
    }
    if (call.success) {
      successCount += 1;
    } else if (call.errorMessage) {
      sumRecord(errorCounts, call.errorMessage, 1);
    }
  }

  const uniqueUsersServed = users.size;
  const avgCostPerActiveUser = safeDivide(totalCost, uniqueUsersServed);
  const avgCostPerCall = safeDivide(totalCost, totalCalls);
  const successRate = safeDivide(successCount, totalCalls);
  const mostCommonError = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalCost,
    totalCalls,
    totalInputTokens,
    totalOutputTokens,
    costByFeature,
    callsByFeature,
    costByModel,
    uniqueUsersServed,
    avgCostPerActiveUser,
    avgCostPerCall,
    successRate,
    failedCalls: totalCalls - successCount,
    mostCommonError,
  };
}

export async function computeDailyCostSnapshot(date = new Date()) {
  const bucketStart = startOfUtcDay(date);
  const bucketEnd = endOfUtcDay(date);
  const calls = await findGeminiCalls({ calledAt: { gte: bucketStart, lte: bucketEnd } });
  const summary = summarizeCalls(calls);

  return {
    date: bucketStart,
    totalCost: summary.totalCost,
    totalCalls: summary.totalCalls,
    totalInputTokens: summary.totalInputTokens,
    totalOutputTokens: summary.totalOutputTokens,
    costByFeature: summary.costByFeature,
    callsByFeature: summary.callsByFeature,
    costByModel: summary.costByModel,
    uniqueUsersServed: summary.uniqueUsersServed,
    avgCostPerActiveUser: summary.avgCostPerActiveUser,
    projectedMonthlyCost: summary.totalCost * 30,
  };
}

export async function upsertDailyCostSnapshot(date = new Date(), reportText?: string | null) {
  const snapshot = await computeDailyCostSnapshot(date);
  const saved = await withRetry(() =>
    prismaDynamic.dailyCostSnapshot.upsert({
      where: { date: snapshot.date },
      create: { ...snapshot, reportText: reportText ?? null },
      update: { ...snapshot, ...(typeof reportText === 'string' ? { reportText } : {}) },
    })
  );
  return { snapshot: saved, metrics: snapshot };
}

async function getDailySnapshotOrLive(date = new Date()) {
  const bucket = startOfUtcDay(date);
  const existing = await withRetry(() => prismaDynamic.dailyCostSnapshot.findUnique({ where: { date: bucket } }));
  if (existing) {
    return {
      ...existing,
      costByFeature: normalizeNumericRecord(existing.costByFeature),
      callsByFeature: normalizeNumericRecord(existing.callsByFeature),
      costByModel: normalizeNumericRecord(existing.costByModel),
    };
  }
  const live = await computeDailyCostSnapshot(bucket);
  return live;
}

async function getLastSnapshots(days: number) {
  const end = startOfUtcDay();
  const start = subDays(end, Math.max(0, days - 1));
  const snapshots = await withRetry(() =>
    prismaDynamic.dailyCostSnapshot.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    })
  );
  return snapshots.map((snapshot) => ({
    ...snapshot,
    costByFeature: normalizeNumericRecord(snapshot.costByFeature),
    callsByFeature: normalizeNumericRecord(snapshot.callsByFeature),
    costByModel: normalizeNumericRecord(snapshot.costByModel),
  }));
}

export async function getCostOverview() {
  const [today, last30Snapshots, allCalls, firstCall, overviewMetrics] = await Promise.all([
    getDailySnapshotOrLive(new Date()),
    getLastSnapshots(30),
    findGeminiCalls({}, false),
    withRetry(() => prismaDynamic.geminiApiCall.findFirst({ orderBy: { calledAt: 'asc' } })),
    getOverviewMetrics(),
  ]);

  const yesterday = await getDailySnapshotOrLive(subDays(new Date(), 1));
  const monthStart = startOfUtcMonth();
  const monthCalls = allCalls.filter((call) => call.calledAt >= monthStart);
  const allSummary = summarizeCalls(allCalls);
  const monthSummary = summarizeCalls(monthCalls);
  const featureTotals = Object.entries(allSummary.costByFeature).sort((a, b) => b[1] - a[1]);
  const featureCalls = Object.entries(allSummary.callsByFeature).sort((a, b) => b[1] - a[1]);
  const monthFeatureTotals = Object.entries(monthSummary.costByFeature).sort((a, b) => b[1] - a[1]);
  const daysElapsed = Math.max(1, new Date().getUTCDate());
  const daysInMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)).getUTCDate();

  return {
    today: {
      ...today,
      trendVsYesterday: safeDivide(today.totalCost - yesterday.totalCost, yesterday.totalCost || 1),
      totalTokens: today.totalInputTokens + today.totalOutputTokens,
    },
    trend30d: last30Snapshots,
    allTimeCost: allSummary.totalCost,
    allTimeCalls: allSummary.totalCalls,
    mostExpensiveFeature: featureTotals[0]
      ? { key: featureTotals[0][0], label: FEATURE_LABELS[featureTotals[0][0] as keyof typeof FEATURE_LABELS] ?? featureTotals[0][0], totalCost: featureTotals[0][1] }
      : null,
    mostCalledFeature: featureCalls[0]
      ? { key: featureCalls[0][0], label: FEATURE_LABELS[featureCalls[0][0] as keyof typeof FEATURE_LABELS] ?? featureCalls[0][0], totalCalls: featureCalls[0][1] }
      : null,
    avgCostPerCall: allSummary.avgCostPerCall,
    currentMonth: {
      totalCost: monthSummary.totalCost,
      totalCalls: monthSummary.totalCalls,
      estimatedEndOfMonthCost: safeDivide(monthSummary.totalCost, daysElapsed) * daysInMonth,
      topFeature: monthFeatureTotals[0]
        ? {
          key: monthFeatureTotals[0][0],
          label: FEATURE_LABELS[monthFeatureTotals[0][0] as keyof typeof FEATURE_LABELS] ?? monthFeatureTotals[0][0],
          totalCost: monthFeatureTotals[0][1],
          percentage: safeDivide(monthFeatureTotals[0][1], monthSummary.totalCost),
          callCount: monthSummary.callsByFeature[monthFeatureTotals[0][0]] ?? 0,
        }
        : null,
    },
    successRate: allSummary.successRate,
    failedCalls: allSummary.failedCalls,
    mostCommonError: allSummary.mostCommonError,
    firstTrackedAt: firstCall?.calledAt?.toISOString() ?? null,
    estimatedMrr: overviewMetrics.estimatedMrr,
    generatedAt: new Date().toISOString(),
  };
}

export async function getCostsByUser(params: {
  period: 'today' | '7d' | '30d' | 'all';
  page?: number;
  limit?: number;
  sort?: 'cost' | 'calls' | 'userId';
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 25));
  const bounds = getPeriodBounds(params.period);
  const calls = await findGeminiCalls(
    bounds
      ? { calledAt: { gte: bounds.start, lte: bounds.end }, userId: { not: null } }
      : { userId: { not: null } },
    true
  );

  const grouped = new Map<string, {
    userId: string;
    username: string | null;
    email: string | null;
    plan: string | null;
    totalCost: number;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    costByFeature: NumericRecord;
  }>();

  for (const call of calls) {
    if (!call.userId) continue;
    const row = grouped.get(call.userId) ?? {
      userId: call.userId,
      username: call.user?.username ?? call.user?.name ?? null,
      email: maskEmail(call.user?.email ?? null),
      plan: call.user?.plan ?? null,
      totalCost: 0,
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      costByFeature: {},
    };
    row.totalCost += call.totalCost;
    row.totalCalls += 1;
    row.totalInputTokens += call.inputTokens;
    row.totalOutputTokens += call.outputTokens;
    sumRecord(row.costByFeature, call.feature, call.totalCost);
    grouped.set(call.userId, row);
  }

  const daysInPeriod = params.period === 'today' ? 1 : params.period === '7d' ? 7 : params.period === '30d' ? 30 : Math.max(1, Math.ceil((Date.now() - (calls[0]?.calledAt?.getTime() ?? Date.now())) / (1000 * 60 * 60 * 24)));
  const sorted = Array.from(grouped.values())
    .map((row) => {
      const mostUsedFeature = Object.entries(row.costByFeature).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        ...row,
        mostUsedFeature,
        avgCostPerDay: safeDivide(row.totalCost, daysInPeriod),
      };
    })
    .sort((a, b) => {
      if (params.sort === 'calls') return b.totalCalls - a.totalCalls;
      if (params.sort === 'userId') return a.userId.localeCompare(b.userId);
      return b.totalCost - a.totalCost;
    });

  const total = sorted.length;
  const startIndex = (page - 1) * limit;
  const users = sorted.slice(startIndex, startIndex + limit);

  return {
    users,
    totalCost: sorted.reduce((sum, row) => sum + row.totalCost, 0),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    generatedAt: new Date().toISOString(),
  };
}

export async function getCostsByFeature(period: 'today' | '7d' | '30d' | 'all') {
  const bounds = getPeriodBounds(period);
  const calls = await findGeminiCalls(bounds ? { calledAt: { gte: bounds.start, lte: bounds.end } } : {}, false);
  const total = summarizeCalls(calls).totalCost;
  const grouped = new Map<string, {
    feature: string;
    totalCost: number;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    successCount: number;
    userIds: Set<string>;
  }>();

  for (const call of calls) {
    const row = grouped.get(call.feature) ?? {
      feature: call.feature,
      totalCost: 0,
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      successCount: 0,
      userIds: new Set<string>(),
    };
    row.totalCost += call.totalCost;
    row.totalCalls += 1;
    row.totalInputTokens += call.inputTokens;
    row.totalOutputTokens += call.outputTokens;
    row.successCount += call.success ? 1 : 0;
    if (call.userId) row.userIds.add(call.userId);
    grouped.set(call.feature, row);
  }

  return Array.from(grouped.values())
    .map((row) => ({
      feature: row.feature,
      label: FEATURE_LABELS[row.feature as keyof typeof FEATURE_LABELS] ?? row.feature,
      totalCost: row.totalCost,
      totalCalls: row.totalCalls,
      totalInputTokens: row.totalInputTokens,
      totalOutputTokens: row.totalOutputTokens,
      avgCostPerCall: safeDivide(row.totalCost, row.totalCalls),
      avgInputTokensPerCall: safeDivide(row.totalInputTokens, row.totalCalls),
      avgOutputTokensPerCall: safeDivide(row.totalOutputTokens, row.totalCalls),
      successRate: safeDivide(row.successCount, row.totalCalls),
      uniqueUsersUsed: row.userIds.size,
      costAsPercentOfTotal: safeDivide(row.totalCost, total),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}

export async function getCostSeries(period: '7d' | '30d' | '90d' | '1y') {
  const snapshots = await getLastSnapshots(period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365);
  if (period === '7d' || period === '30d') {
    return snapshots.map((snapshot) => ({
      date: formatDateKey(snapshot.date),
      totalCost: snapshot.totalCost,
      totalCalls: snapshot.totalCalls,
      uniqueUsersServed: snapshot.uniqueUsersServed,
      costByFeature: snapshot.costByFeature,
      projectedMonthlyCost: snapshot.projectedMonthlyCost,
    }));
  }

  const weekly = new Map<string, ReturnType<typeof startOfUtcDay>[]>();
  for (const snapshot of snapshots) {
    const weekStart = startOfWeek(snapshot.date, { weekStartsOn: 1 });
    const key = formatDateKey(weekStart);
    const bucket = weekly.get(key) ?? [];
    bucket.push(snapshot.date);
    weekly.set(key, bucket);
  }

  return Array.from(weekly.keys()).sort().map((key) => {
    const group = snapshots.filter((snapshot) => formatDateKey(startOfWeek(snapshot.date, { weekStartsOn: 1 })) === key);
    const costByFeature: NumericRecord = {};
    let totalCost = 0;
    let totalCalls = 0;
    let uniqueUsersServed = 0;
    let projectedMonthlyCost = 0;
    for (const item of group) {
      totalCost += item.totalCost;
      totalCalls += item.totalCalls;
      uniqueUsersServed = Math.max(uniqueUsersServed, item.uniqueUsersServed);
      projectedMonthlyCost += item.projectedMonthlyCost;
      const featureMap = normalizeNumericRecord(item.costByFeature);
      for (const [feature, value] of Object.entries(featureMap)) {
        sumRecord(costByFeature, feature, value);
      }
    }
    return {
      date: key,
      totalCost,
      totalCalls,
      uniqueUsersServed,
      costByFeature,
      projectedMonthlyCost: safeDivide(projectedMonthlyCost, group.length || 1),
    };
  });
}

export async function getCostByUserByDay(userId: string, period: '7d' | '30d') {
  const bounds = getPeriodBounds(period);
  if (!bounds) return [];
  const calls = await findGeminiCalls({ userId, calledAt: { gte: bounds.start, lte: bounds.end } }, false);
  const grouped = new Map<string, { date: string; feature: string; calls: number; cost: number; inputTokens: number; outputTokens: number }>();
  for (const call of calls) {
    const date = formatDateKey(startOfDay(call.calledAt));
    const key = `${date}:${call.feature}`;
    const row = grouped.get(key) ?? { date, feature: call.feature, calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
    row.calls += 1;
    row.cost += call.totalCost;
    row.inputTokens += call.inputTokens;
    row.outputTokens += call.outputTokens;
    grouped.set(key, row);
  }
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date) || a.feature.localeCompare(b.feature));
}

export async function getCostByUserByMonth(months = 3) {
  const cappedMonths = Math.min(12, Math.max(1, months));
  const now = startOfUtcMonth();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (cappedMonths - 1), 1));
  const calls = await findGeminiCalls({ calledAt: { gte: start } }, true);
  const grouped = new Map<string, {
    userId: string | null;
    username: string | null;
    email: string | null;
    plan: string | null;
    month: string;
    totalCost: number;
    totalCalls: number;
    costByFeature: NumericRecord;
  }>();

  for (const call of calls) {
    const month = format(call.calledAt, 'yyyy-MM');
    const key = `${call.userId ?? 'CRON'}:${month}`;
    const row = grouped.get(key) ?? {
      userId: call.userId,
      username: call.user?.username ?? call.user?.name ?? null,
      email: maskEmail(call.user?.email ?? null),
      plan: call.user?.plan ?? null,
      month,
      totalCost: 0,
      totalCalls: 0,
      costByFeature: {},
    };
    row.totalCost += call.totalCost;
    row.totalCalls += 1;
    sumRecord(row.costByFeature, call.feature, call.totalCost);
    grouped.set(key, row);
  }

  return Array.from(grouped.values()).sort((a, b) => b.month.localeCompare(a.month) || (b.totalCost - a.totalCost));
}

export async function getRawGeminiCalls(params: {
  page?: number;
  limit?: number;
  userId?: string;
  feature?: string;
  model?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));
  const where: LooseWhere = {};
  if (params.userId) where.userId = params.userId;
  if (params.feature) where.feature = params.feature;
  if (params.model) where.model = params.model;
  if (typeof params.success === 'boolean') where.success = params.success;
  if (params.startDate || params.endDate) {
    where.calledAt = {
      ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
      ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
    };
  }
  const all = await withRetry(() =>
    prismaDynamic.geminiApiCall.findMany({
      where,
      orderBy: { calledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            plan: true,
          },
        },
      },
    })
  );
  const total = all.length;
  const calls = all.slice((page - 1) * limit, page * limit).map((call) => ({
    ...call,
    maskedEmail: maskEmail(call.user?.email ?? null),
  }));
  return {
    calls,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    generatedAt: new Date().toISOString(),
  };
}

function getRecommendations(params: {
  totalCost: number;
  successRate: number;
  failedCalls: number;
  mostCommonError: string | null;
  estimatedMrr: number;
  costByFeature: NumericRecord;
  topUsers: Array<{ avgCostPerDay: number }>;
  costByModel: NumericRecord;
  averageDailyCost: number;
}) {
  const recommendations: string[] = [];
  const topFeature = Object.entries(params.costByFeature).sort((a, b) => b[1] - a[1])[0];
  if (topFeature && safeDivide(topFeature[1], params.totalCost) > 0.4) {
    const label = FEATURE_LABELS[topFeature[0] as keyof typeof FEATURE_LABELS] ?? topFeature[0];
    recommendations.push(`${label} accounts for ${(safeDivide(topFeature[1], params.totalCost) * 100).toFixed(1)}% of total Gemini cost. Consider caching ${label.toLowerCase()} results more aggressively or reducing call frequency.`);
  }
  const highCostUsers = params.topUsers.filter((user) => user.avgCostPerDay > 1);
  if (highCostUsers.length > 0) {
    recommendations.push(`${highCostUsers.length} users have average daily Gemini costs exceeding $1.00. Review usage patterns for these accounts.`);
  }
  if (params.successRate < 0.95) {
    recommendations.push(`API success rate is ${(params.successRate * 100).toFixed(1)}%, below the 95% threshold. ${params.failedCalls} failed calls in the period. Most common error: ${params.mostCommonError ?? 'Unknown'}.`);
  }
  const projectedMonthly = params.averageDailyCost * 30;
  if (params.estimatedMrr > 0 && projectedMonthly > params.estimatedMrr * 0.5) {
    recommendations.push(`Projected monthly Gemini cost (${formatCost(projectedMonthly)}) represents ${(safeDivide(projectedMonthly, params.estimatedMrr) * 100).toFixed(1)}% of estimated MRR (${formatCost(params.estimatedMrr)}). Monitor closely as user base grows.`);
  }
  const embeddingCost = Object.entries(params.costByModel)
    .filter(([model]) => /embedding/i.test(model))
    .reduce((sum, [, value]) => sum + value, 0);
  if (embeddingCost > 0.01) {
    recommendations.push('Note: text-embedding-004 pricing may have changed. Verify current pricing at ai.google.dev/pricing.');
  }
  if (recommendations.length === 0) {
    recommendations.push('No cost anomalies detected.');
  }
  return recommendations;
}

export async function generateCostReport(options?: { endDate?: Date; days?: number }) {
  const end = startOfUtcDay(options?.endDate ?? new Date());
  const days = Math.max(1, options?.days ?? 30);
  const start = subDays(end, days - 1);
  const [calls, dailyBreakdown, monthlyByUser, topUsersResponse, overview] = await Promise.all([
    findGeminiCalls({ calledAt: { gte: start, lte: endOfUtcDay(end) } }, true),
    getCostSeries('30d'),
    getCostByUserByMonth(3),
    getCostsByUser({ period: days === 1 ? 'today' : days <= 7 ? '7d' : days <= 30 ? '30d' : 'all', page: 1, limit: 20, sort: 'cost' }),
    getCostOverview(),
  ]);

  const summary = summarizeCalls(calls);
  const featureRows = await getCostsByFeature(days === 1 ? 'today' : days <= 7 ? '7d' : days <= 30 ? '30d' : 'all');
  const recommendations = getRecommendations({
    totalCost: summary.totalCost,
    successRate: summary.successRate,
    failedCalls: summary.failedCalls,
    mostCommonError: summary.mostCommonError,
    estimatedMrr: overview.estimatedMrr,
    costByFeature: summary.costByFeature,
    topUsers: topUsersResponse.users,
    costByModel: summary.costByModel,
    averageDailyCost: safeDivide(summary.totalCost, days),
  });

  const lines: string[] = [];
  lines.push('=====================================');
  lines.push('CORPUS GEMINI API COST ANALYSIS REPORT');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Period: ${formatDateKey(start)} to ${formatDateKey(end)}`);
  lines.push('EXECUTIVE SUMMARY');
  lines.push(`Total cost (period): ${formatCost(summary.totalCost)}`);
  lines.push(`Total API calls: ${summary.totalCalls}`);
  lines.push(`Total tokens consumed: ${summary.totalInputTokens + summary.totalOutputTokens} (${summary.totalInputTokens} input, ${summary.totalOutputTokens} output)`);
  lines.push(`Unique users served: ${summary.uniqueUsersServed}`);
  lines.push(`Average cost per active user per day: ${formatCost(safeDivide(summary.totalCost, Math.max(1, summary.uniqueUsersServed * days)))}`);
  lines.push(`Average cost per API call: ${formatCost(summary.avgCostPerCall)}`);
  lines.push(`API success rate: ${(summary.successRate * 100).toFixed(1)}%`);
  lines.push('COST BY MODEL');
  for (const [model, totalCost] of Object.entries(summary.costByModel).sort((a, b) => b[1] - a[1])) {
    lines.push(`${model}: ${formatCost(totalCost)}`);
  }
  lines.push('COST BY FEATURE (sorted by cost descending)');
  for (const feature of featureRows) {
    lines.push(`${feature.label}:`);
    lines.push(`Total cost:          ${formatCost(feature.totalCost)}`);
    lines.push(`Total calls:         ${feature.totalCalls}`);
    lines.push(`Avg cost/call:       ${formatCost(feature.avgCostPerCall)}`);
    lines.push(`Avg input tokens:    ${Math.round(feature.avgInputTokensPerCall)}`);
    lines.push(`Avg output tokens:   ${Math.round(feature.avgOutputTokensPerCall)}`);
    lines.push(`Success rate:        ${(feature.successRate * 100).toFixed(1)}%`);
    lines.push(`% of total cost:     ${(feature.costAsPercentOfTotal * 100).toFixed(1)}%`);
  }
  lines.push('COST BY USER (top 20 by cost, masked emails)');
  lines.push('Rank  User                 Plan        Cost      Calls   Avg/Day');
  topUsersResponse.users.slice(0, 20).forEach((user, index) => {
    lines.push(`${String(index + 1).padEnd(5)} ${String(user.email ?? user.userId).padEnd(20)} ${String(user.plan ?? 'UNKNOWN').padEnd(10)} ${formatCost(user.totalCost).padEnd(9)} ${String(user.totalCalls).padEnd(7)} ${formatCost(user.avgCostPerDay)}`);
  });
  lines.push('DAILY COST BREAKDOWN (last 30 days)');
  lines.push('Date        Total Cost   Calls   Users   Proj Monthly');
  dailyBreakdown.forEach((day) => {
    lines.push(`${day.date}  ${formatCost(day.totalCost).padEnd(11)} ${String(day.totalCalls).padEnd(7)} ${String(day.uniqueUsersServed).padEnd(7)} ${formatCost(day.projectedMonthlyCost)}`);
  });
  lines.push('MONTHLY COST BY USER (last 3 months)');
  lines.push('User                 Plan   Month     Cost      Calls');
  monthlyByUser.slice(0, 50).forEach((row) => {
    lines.push(`${String(row.email ?? row.userId ?? 'CRON').padEnd(20)} ${String(row.plan ?? 'UNKNOWN').padEnd(6)} ${row.month.padEnd(9)} ${formatCost(row.totalCost).padEnd(9)} ${row.totalCalls}`);
  });
  const avgDaily = safeDivide(summary.totalCost, days);
  lines.push('COST PROJECTIONS');
  lines.push(`Based on 30-day average daily cost of ${formatCost(avgDaily)}:`);
  lines.push(`Next 30 days:  ${formatCost(avgDaily * 30)}`);
  lines.push(`Next 90 days:  ${formatCost(avgDaily * 90)}`);
  lines.push(`Next 12 months: ${formatCost(avgDaily * 365)}`);
  lines.push(`As % of current estimated MRR (${formatCost(overview.estimatedMrr)}):`);
  lines.push(`Current Gemini cost is ${(safeDivide(avgDaily * 30, overview.estimatedMrr) * 100).toFixed(1)}% of MRR.`);
  lines.push('RECOMMENDATIONS');
  recommendations.forEach((recommendation) => lines.push(recommendation));
  lines.push('=====================================');
  lines.push('END OF REPORT');

  const reportText = lines.join('\n');
  return {
    reportText,
    summary: {
      generatedAt: new Date().toISOString(),
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
      totalCost: summary.totalCost,
      totalCalls: summary.totalCalls,
      uniqueUsersServed: summary.uniqueUsersServed,
      avgCostPerUser: summary.avgCostPerActiveUser,
      projectedMonthly: avgDaily * 30,
      topFeature: featureRows[0]?.feature ?? null,
    },
  };
}
