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
}

export function ResearchPageClient({
  userId,
  plan,
  preferredCount,
  initialTab,
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
      {/* Tab Switcher */}
      <div className="border-b border-border bg-surface-sunken ring-shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-8">
            <button
              onClick={() => handleTabChange('discover')}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'discover'
                ? 'border-accent text-content-primary font-serif'
                : 'border-transparent text-content-secondary hover:text-content-primary'
                }`}
            >
              Discover
            </button>
            <button
              onClick={() => handleTabChange('workspace')}
              className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'workspace'
                ? 'border-accent text-content-primary font-serif'
                : 'border-transparent text-content-secondary hover:text-content-primary'
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
        <WorkspaceTab userId={userId} plan={plan} />
      )}
    </div>
  )
}
