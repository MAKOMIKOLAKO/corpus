import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      plan: "FREE" | "PRO" | "LIFETIME_PRO"
      timezone: string
      username?: string | null
      emailVerified?: Date | null
      subscriptionStatus?: string | null
      subscriptionEndsAt?: Date | null
      entriesCount?: number
      personalCollectionsCount?: number
      isAdmin: boolean
    }
  }
}
