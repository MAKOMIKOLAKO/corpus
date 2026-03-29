export const ALERT_LIMITS = {
  FREE: { maxQueries: 0 },
  PRO: { maxQueries: 5 },
  LIFETIME_PRO: { maxQueries: 5 },
} as const

export const ALERT_CONFIG = {
  maxCandidatesPerQuery: 20,
  minHoursBetweenChecks: 23, // skip if checked within last 23 hours
  semanticScholarDaysBack: 3, // fetch papers from last 3 days
  relevanceModel: 'gemini-2.5-flash',
} as const

// Normalize a title for deduplication comparison
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// Check if a user can create more watch queries
export function canCreateWatchQuery(
  plan: string,
  currentQueryCount: number
): { allowed: boolean; reason?: string } {
  const limits = ALERT_LIMITS[plan as keyof typeof ALERT_LIMITS]
    ?? ALERT_LIMITS.FREE
  if (limits.maxQueries === 0) {
    return { allowed: false, reason: 'alerts_pro_only' }
  }
  if (currentQueryCount >= limits.maxQueries) {
    return {
      allowed: false,
      reason: 'alert_query_limit_reached',
    }
  }
  return { allowed: true }
}
