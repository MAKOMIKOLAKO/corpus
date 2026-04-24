import { canAddFeed, getUserPlan } from '@/lib/plans';
import { prisma } from '@/lib/prismaWithRetry';
import { ingestSourceById } from '@/lib/rssIngestion';
import {
  normalizeFeedUrl,
  normalizeFeedUrlForComparison
} from '@/lib/feedUrl';
import { validateRssFeedUrl } from '@/lib/rssValidation';
import { extractDomain } from '@/lib/urlUtils';

const db = prisma as any;

export interface SerializedUserSubscription {
  subscriptionId: string;
  id: string;
  sourceId: string;
  feedUrl: string;
  title: string | null;
  domain: string;
  lastFetchedAt: Date | null;
  addedAt: Date;
  isDefault: boolean;
  defaultFeedId: string | null;
  defaultFeed: {
    id: string;
    name: string;
    url: string;
    category: string;
    description: string | null;
  } | null;
}

interface SubscribeResult {
  status: 'created' | 'already_subscribed' | 'not_found' | 'inactive' | 'invalid_feed' | 'limit_reached';
  subscription?: SerializedUserSubscription;
  reason?: string;
  convertedToDefault?: boolean;
}

function serializeSubscription(userSource: any): SerializedUserSubscription {
  return {
    subscriptionId: userSource.id,
    id: userSource.source.id,
    sourceId: userSource.source.id,
    feedUrl: userSource.feedUrl,
    title: userSource.source.title,
    domain: userSource.source.domain,
    lastFetchedAt: userSource.source.lastFetchedAt,
    addedAt: userSource.createdAt,
    isDefault: userSource.isDefault,
    defaultFeedId: userSource.defaultFeedId,
    defaultFeed: userSource.defaultFeed
  };
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

async function getDefaultFeeds() {
  return db.defaultFeed.findMany();
}

async function findExistingUserSubscriptionByComparisonUrl(userId: string, comparisonUrl: string) {
  const subscriptions = await db.userSource.findMany({
    where: { userId },
    include: {
      source: {
        select: {
          id: true,
          feedUrl: true,
          title: true,
          domain: true,
          lastFetchedAt: true
        }
      },
      defaultFeed: {
        select: {
          id: true,
          name: true,
          url: true,
          category: true,
          description: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const existing = subscriptions.find((subscription: any) => {
    const normalized = normalizeFeedUrlForComparison(subscription.feedUrl);
    return normalized === comparisonUrl;
  });

  return existing ? serializeSubscription(existing) : null;
}

async function findMatchingDefaultFeedByComparisonUrl(comparisonUrl: string) {
  const defaultFeeds: any[] = await getDefaultFeeds();
  return defaultFeeds.find((defaultFeed: any) => {
    if (!defaultFeed.isActive) {
      return false;
    }
    const normalized = normalizeFeedUrlForComparison(defaultFeed.url);
    return normalized === comparisonUrl;
  }) ?? null;
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002';
}

async function ensureFeedLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { allowed: false, reason: 'user_not_found' };
  }

  const currentFeedCount = await db.userSource.count({ where: { userId } });
  return canAddFeed(getUserPlan(user), currentFeedCount);
}

async function buildOrUpdateSource(params: {
  feedUrl: string;
  title: string | null;
}) {
  const domain = extractDomain(params.feedUrl) || '';
  return db.source.upsert({
    where: { feedUrl: params.feedUrl },
    update: {
      title: params.title,
      domain
    },
    create: {
      feedUrl: params.feedUrl,
      title: params.title,
      domain
    }
  });
}

export async function listUserSubscriptions(userId: string): Promise<SerializedUserSubscription[]> {
  const subscriptions = await db.userSource.findMany({
    where: { userId },
    include: {
      source: {
        select: {
          id: true,
          feedUrl: true,
          title: true,
          domain: true,
          lastFetchedAt: true
        }
      },
      defaultFeed: {
        select: {
          id: true,
          name: true,
          url: true,
          category: true,
          description: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return subscriptions.map(serializeSubscription);
}

export async function listUserSubscriptionsGrouped(userId: string) {
  const subscriptions = await listUserSubscriptions(userId);
  return {
    defaults: subscriptions.filter((subscription) => subscription.isDefault),
    custom: subscriptions.filter((subscription) => !subscription.isDefault)
  };
}

export async function subscribeToDefaultFeed(params: {
  userId: string;
  defaultFeedId: string;
}): Promise<SubscribeResult> {
  const defaultFeed = await db.defaultFeed.findUnique({
    where: { id: params.defaultFeedId }
  });

  if (!defaultFeed) {
    return { status: 'not_found' };
  }

  if (!defaultFeed.isActive) {
    return { status: 'inactive' };
  }

  const normalized = normalizeFeedUrl(defaultFeed.url);
  if (!normalized) {
    return { status: 'invalid_feed' };
  }

  const existing = await findExistingUserSubscriptionByComparisonUrl(
    params.userId,
    normalized.comparisonUrl
  );

  if (existing) {
    return {
      status: 'already_subscribed',
      subscription: existing
    };
  }

  const limitCheck = await ensureFeedLimit(params.userId);
  if (!limitCheck.allowed) {
    return {
      status: 'limit_reached',
      reason: limitCheck.reason
    };
  }

  const source = await buildOrUpdateSource({
    feedUrl: normalized.storageUrl,
    title: defaultFeed.name
  });

  try {
    const created = await db.userSource.create({
      data: {
        userId: params.userId,
        sourceId: source.id,
        feedUrl: source.feedUrl,
        isDefault: true,
        defaultFeedId: defaultFeed.id
      },
      include: {
        source: {
          select: {
            id: true,
            feedUrl: true,
            title: true,
            domain: true,
            lastFetchedAt: true
          }
        },
        defaultFeed: {
          select: {
            id: true,
            name: true,
            url: true,
            category: true,
            description: true
          }
        }
      }
    });

    try {
      await ingestSourceById(source.id);
    } catch (error) {
      console.error('[rssSubscriptions] Immediate ingestion failed for default feed:', error);
    }

    return {
      status: 'created',
      subscription: serializeSubscription(created)
    };
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      const duplicate = await findExistingUserSubscriptionByComparisonUrl(
        params.userId,
        normalized.comparisonUrl
      );

      return {
        status: 'already_subscribed',
        subscription: duplicate ?? undefined
      };
    }

    throw error;
  }
}

export async function subscribeToCustomFeed(params: {
  userId: string;
  url: string;
  name?: string;
}): Promise<SubscribeResult> {
  const normalized = normalizeFeedUrl(params.url);
  if (!normalized) {
    return { status: 'invalid_feed' };
  }

  const existing = await findExistingUserSubscriptionByComparisonUrl(
    params.userId,
    normalized.comparisonUrl
  );

  if (existing) {
    return {
      status: 'already_subscribed',
      subscription: existing
    };
  }

  const matchedDefaultFeed = await findMatchingDefaultFeedByComparisonUrl(normalized.comparisonUrl);
  if (matchedDefaultFeed) {
    const defaultResult = await subscribeToDefaultFeed({
      userId: params.userId,
      defaultFeedId: matchedDefaultFeed.id
    });

    return {
      ...defaultResult,
      convertedToDefault: true
    };
  }

  const isValidFeed = await validateRssFeedUrl(normalized.storageUrl);
  if (!isValidFeed) {
    return { status: 'invalid_feed' };
  }

  const limitCheck = await ensureFeedLimit(params.userId);
  if (!limitCheck.allowed) {
    return {
      status: 'limit_reached',
      reason: limitCheck.reason
    };
  }

  const source = await buildOrUpdateSource({
    feedUrl: normalized.storageUrl,
    title: params.name?.trim() || null
  });

  try {
    const created = await db.userSource.create({
      data: {
        userId: params.userId,
        sourceId: source.id,
        feedUrl: source.feedUrl,
        isDefault: false,
        defaultFeedId: null
      },
      include: {
        source: {
          select: {
            id: true,
            feedUrl: true,
            title: true,
            domain: true,
            lastFetchedAt: true
          }
        },
        defaultFeed: {
          select: {
            id: true,
            name: true,
            url: true,
            category: true,
            description: true
          }
        }
      }
    });

    try {
      await ingestSourceById(source.id);
    } catch (error) {
      console.error('[rssSubscriptions] Immediate ingestion failed for custom feed:', error);
    }

    return {
      status: 'created',
      subscription: serializeSubscription(created)
    };
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      const duplicate = await findExistingUserSubscriptionByComparisonUrl(
        params.userId,
        normalized.comparisonUrl
      );

      return {
        status: 'already_subscribed',
        subscription: duplicate ?? undefined
      };
    }

    throw error;
  }
}

export async function unsubscribeBySubscriptionId(params: {
  userId: string;
  subscriptionId: string;
}): Promise<boolean> {
  const deleted = await db.userSource.deleteMany({
    where: {
      id: params.subscriptionId,
      userId: params.userId
    }
  });

  return deleted.count > 0;
}

export async function unsubscribeBySourceId(params: {
  userId: string;
  sourceId: string;
}): Promise<boolean> {
  const deleted = await db.userSource.deleteMany({
    where: {
      sourceId: params.sourceId,
      userId: params.userId
    }
  });

  return deleted.count > 0;
}
