import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      plan?: "FREE" | "PRO" | "LIFETIME_PRO"
      username?: string | null
      onboardingCompleted?: boolean
      onboardingCompletedAt?: Date | null
      emailVerified?: Date | null
    }
  }
}
