import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { ResearchPageClient } from './ResearchPageClient'
import { UpgradePrompt } from '@/components/UpgradePrompt'

export const metadata = {
  title: 'Research · Corpus',
  description:
    'Discover papers and deepen your understanding with the Research Reading System.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/research')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      plan: true,
      onboardingCompletedAt: true,
      researchProfile: {
        select: { preferredDailyCount: true },
      },
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const preferredCount = user.researchProfile?.preferredDailyCount ?? 5
  const tab = searchParams.tab || 'discover'

  // Check if user just completed onboarding (within last 5 minutes)
  const justCompletedOnboarding = user.onboardingCompletedAt &&
    (Date.now() - new Date(user.onboardingCompletedAt).getTime()) < 5 * 60 * 1000

  return (
    <ResearchPageClient
      userId={user.id}
      plan={user.plan}
      preferredCount={preferredCount}
      initialTab={tab}
      justCompletedOnboarding={justCompletedOnboarding || false}
    />
  )
}
