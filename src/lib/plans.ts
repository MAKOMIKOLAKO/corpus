import { Plan } from '@prisma/client'

export const PLAN_LIMITS = {
  FREE: {
    maxEntries: 50,
    maxFeeds: 1,
    maxPersonalCollections: 1,
    canCreateSharedCollections: false,
    canContributeToSharedCollections: false,
    canViewSharedCollections: true,
    queuePriority: 'standard',
    batchActions: false,
    advancedSearch: false,
    bibliographyGeneration: false,
  },
  PRO: {
    maxEntries: Infinity,
    maxFeeds: Infinity,
    maxPersonalCollections: Infinity,
    canCreateSharedCollections: true,
    canContributeToSharedCollections: true,
    canViewSharedCollections: true,
    queuePriority: 'priority',
    batchActions: true,
    advancedSearch: true,
    bibliographyGeneration: true,
  },
  LIFETIME_PRO: {
    maxEntries: Infinity,
    maxFeeds: Infinity,
    maxPersonalCollections: Infinity,
    canCreateSharedCollections: true,
    canContributeToSharedCollections: true,
    canViewSharedCollections: true,
    queuePriority: 'priority',
    batchActions: true,
    advancedSearch: true,
    bibliographyGeneration: true,
  },
} as const

export type PlanLimits = typeof PLAN_LIMITS[keyof typeof PLAN_LIMITS]

export function getUserLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE
}

export function canAddEntry(
  plan: Plan,
  currentEntryCount: number
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (currentEntryCount >= limits.maxEntries) {
    return {
      allowed: false,
      reason: 'entry_limit_reached'
    }
  }
  return { allowed: true }
}

export function canUseBibliographyGeneration(
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (!limits.bibliographyGeneration) {
    return {
      allowed: false,
      reason: 'bibliography_pro_only'
    }
  }
  return { allowed: true }
}

export function canCreatePersonalCollection(
  plan: Plan,
  currentPersonalCollectionCount: number
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (currentPersonalCollectionCount >= limits.maxPersonalCollections) {
    return {
      allowed: false,
      reason: 'personal_collection_limit_reached'
    }
  }
  return { allowed: true }
}

export function canAddFeed(
  plan: Plan,
  currentFeedCount: number
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (currentFeedCount >= limits.maxFeeds) {
    return {
      allowed: false,
      reason: 'feed_limit_reached'
    }
  }
  return { allowed: true }
}

export function canCreateSharedCollection(
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (!limits.canCreateSharedCollections) {
    return {
      allowed: false,
      reason: 'shared_collections_pro_only'
    }
  }
  return { allowed: true }
}

export function canContributeToSharedCollection(
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (!limits.canContributeToSharedCollections) {
    return {
      allowed: false,
      reason: 'contribution_pro_only'
    }
  }
  return { allowed: true }
}

export function canUseBatchActions(
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (!limits.batchActions) {
    return {
      allowed: false,
      reason: 'batch_actions_pro_only'
    }
  }
  return { allowed: true }
}

export function canUseAdvancedSearch(
  plan: Plan
): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(plan)
  if (!limits.advancedSearch) {
    return {
      allowed: false,
      reason: 'advanced_search_pro_only'
    }
  }
  return { allowed: true }
}

export function isPro(plan: Plan): boolean {
  return plan === 'PRO' || plan === 'LIFETIME_PRO'
}

export function getUserPlan(user: { plan: Plan } | null): Plan {
  return user?.plan || 'FREE'
}

export function hasPaidFeature(plan: Plan, feature: string): boolean {
  return isPro(plan)
}
