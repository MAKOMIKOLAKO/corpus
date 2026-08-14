'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

  // Workspace tab is available to all, but non-library papers require Pro
  // This gating is handled at the API level when loading papers

  return (
    <div className="min-h-screen bg-background">
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
