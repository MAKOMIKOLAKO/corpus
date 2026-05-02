'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { isPro } from '@/lib/plans'
import type { Plan } from '@prisma/client'
import { DiscoverTab } from '@/components/research/DiscoverTab'
import { WorkspaceTab } from '@/components/research/WorkspaceTab'

interface ResearchPageClientProps {
  userId: string
  plan: string
  preferredCount: number
  initialTab: string
  justCompletedOnboarding?: boolean
}

export function ResearchPageClient({
  userId,
  plan,
  preferredCount,
  initialTab,
  justCompletedOnboarding = false,
}: ResearchPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'discover' | 'workspace'>(initialTab as 'discover' | 'workspace')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!searchParams) return
    const tabParam = searchParams.get('tab') as 'discover' | 'workspace' | null
    if (tabParam && (tabParam === 'discover' || tabParam === 'workspace')) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (tab: 'discover' | 'workspace') => {
    setActiveTab(tab)
    router.push(`/research?tab=${tab}`)
  }

  if (!mounted) {
    return null
  }

  // Pro gating for Discovery tab (full corpus search)
  if (activeTab === 'discover' && !isPro(plan as Plan)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <UpgradePrompt reason="research_feed_pro_only" variant="inline" />
        </div>
      </div>
    )
  }

  // Workspace tab is available to all, but non-library papers require Pro
  // This gating is handled at the API level when loading papers

  return (
    <div className="min-h-screen bg-background">
      {/* Post-onboarding Banner */}
      {justCompletedOnboarding && (
        <div className="border-b border-border bg-surface-raised">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-content-primary">Welcome to your personalized feed!</h3>
                <p className="text-sm text-content-secondary mt-1">
                  Papers matching your interests will appear here. Add some papers to your library or create a collection to get started.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/library"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity button-terracotta"
                >
                  Add papers
                </a>
                <a
                  href="/collections"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-surface-sunken text-content-primary text-sm font-medium hover:bg-card transition-colors"
                >
                  Create collection
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="border-b border-border bg-background ring-shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-8">
            <button
              onClick={() => handleTabChange('discover')}
              className={`rounded-lg px-4 py-2.5 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${activeTab === 'discover'
                ? 'bg-card text-content-primary border border-border'
                : 'text-content-secondary hover:bg-card hover:text-content-primary'
                }`}
            >
              Discover
            </button>
            <button
              onClick={() => handleTabChange('workspace')}
              className={`rounded-lg px-4 py-2.5 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${activeTab === 'workspace'
                ? 'bg-card text-content-primary border border-border'
                : 'text-content-secondary hover:bg-card hover:text-content-primary'
                }`}
            >
              Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'discover' ? (
        <DiscoverTab userId={userId} preferredCount={preferredCount} />
      ) : (
        <WorkspaceTab userId={userId} />
      )}
    </div>
  )
}
