import { Plan } from '@prisma/client'

export const PLAN_LIMITS = {
  FREE: {
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
    researchFeed: true,
    readingAssistantFeed: true,
    paperComparison: true,
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
    researchFeed: true,
    readingAssistantFeed: true,
    paperComparison: true,
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
    researchFeed: true,
    readingAssistantFeed: true,
    paperComparison: true,
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
  return { allowed: true }
}

export function canUseBibliographyGeneration(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canCreatePersonalCollection(
  plan: Plan,
  currentPersonalCollectionCount: number
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canAddFeed(
  plan: Plan,
  currentFeedCount: number
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canCreateSharedCollection(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canContributeToSharedCollection(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canUseBatchActions(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canUseAdvancedSearch(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function isPro(plan: Plan): boolean {
  return true
}

export function getUserPlan(user: { plan: Plan } | null): Plan {
  return user?.plan || 'FREE'
}

export function hasPaidFeature(plan: Plan, feature: string): boolean {
  return true
}

export function canUseResearchFeed(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canUseReadingAssistantFeed(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}

export function canUsePaperComparison(
  plan: Plan
): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
