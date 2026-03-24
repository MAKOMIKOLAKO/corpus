import { User } from '@prisma/client'

export const PLAN_LIMITS = {
  FREE: {
    maxEntries: 100,
    collections: false,
    graph: false,
  },
  PRO: {
    maxEntries: Infinity,
    collections: true,
    graph: true,
  },
  LIFETIME_PRO: {
    maxEntries: Infinity,
    collections: true,
    graph: true,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS
export type FeatureType = 'collections' | 'graph'

// Extended user type that includes plan field
interface UserWithPlan extends User {
  plan?: 'FREE' | 'PRO' | 'LIFETIME_PRO'
}

// Session user type
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  plan?: 'FREE' | 'PRO' | 'LIFETIME_PRO';
}

export function getUserPlan(user: UserWithPlan | SessionUser | null): PlanType {
  if (!user || !('plan' in user) || !user.plan) return 'FREE'
  return user.plan === 'LIFETIME_PRO' ? 'PRO' : user.plan
}

export function canAddEntry(user: UserWithPlan | SessionUser | null, currentEntryCount: number): boolean {
  const plan = getUserPlan(user)
  const limit = PLAN_LIMITS[plan].maxEntries
  return currentEntryCount < limit
}

export function hasPaidFeature(user: UserWithPlan | SessionUser | null, feature: FeatureType): boolean {
  const plan = getUserPlan(user)
  return PLAN_LIMITS[plan][feature]
}
