import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { ResearchFeedClient } from './ResearchFeedClient'
import { UpgradePrompt } from '@/components/UpgradePrompt'

export const metadata = {
  title: 'Research Feed · Corpus',
  description:
    'Your daily personalized research paper feed — 3 to 10 papers curated from arXiv, bioRxiv, and more, ranked by relevance to your library.',
}

export default async function ResearchPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/research')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      plan: true,
      researchProfile: {
        select: { preferredDailyCount: true },
      },
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const preferredCount = user.researchProfile?.preferredDailyCount ?? 5



  if (!isPro(user.plan)) {
    return (
      <div className="min-h-screen bg-[#141413] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <UpgradePrompt reason="research_feed_pro_only" variant="inline" />
        </div>
      </div>
    )
  }

  return (
    <ResearchFeedClient
      userId={user.id}
      preferredCount={preferredCount}
    />
  )
}
