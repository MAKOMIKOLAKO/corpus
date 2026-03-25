// Re-export the retry-enabled Prisma client to ensure a single robust client
// instance is used across the application (avoids connection storms in dev
// and adds simple retries for transient errors).
import { prisma as prismaWithRetry } from './prismaWithRetry'

export default prismaWithRetry
