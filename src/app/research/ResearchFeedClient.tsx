'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Settings2,
  Layers,
  Filter,
} from 'lucide-react'
import { PaperCard } from './PaperCard'
import type { DailyFeedResponse, PaperSummaryObject, ClusterObject } from '@/lib/research/feedPipeline'

interface ResearchFeedClientProps {
  userId: string
  preferredCount: number
}

type FeedState =
  | { status: 'loading' }
  | { status: 'polling'; jobId: string }
  | { status: 'ready'; feed: DailyFeedResponse }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }

function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading research feed">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[#30302e] bg-[#1c1c1a] p-5 animate-pulse"
        >
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-20 rounded-full bg-[#30302e]" />
            <div className="h-5 w-32 rounded-full bg-[#30302e]" />
          </div>
          <div className="h-4 w-3/4 rounded bg-[#30302e] mb-2" />
          <div className="h-4 w-1/2 rounded bg-[#30302e] mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-[#30302e]" />
            <div className="h-3 w-5/6 rounded bg-[#30302e]" />
            <div className="h-3 w-4/6 rounded bg-[#30302e]" />
          </div>
          <div className="mt-3 h-10 w-full rounded-lg bg-[#30302e]/60" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-28 rounded-lg bg-[#30302e]" />
            <div className="h-8 w-20 rounded-lg bg-[#30302e]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResearchFeedClient({ userId, preferredCount }: ResearchFeedClientProps) {
  const [state, setState] = useState<FeedState>({ status: 'loading' })
  const [trendsExpanded, setTrendsExpanded] = useState(false)
  const [activeClusterFilter, setActiveClusterFilter] = useState<string | null>(null)
  const [showClusters, setShowClusters] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dailyCount, setDailyCount] = useState(preferredCount)
  const [savingCount, setSavingCount] = useState(false)

  const fetchFeed = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/research/feed')
      if (res.status === 202) {
        const json = await res.json()
        setState({ status: 'polling', jobId: json.jobId })
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setState({ status: 'error', message: json?.error ?? 'Failed to load feed' })
        return
      }
      const feed: DailyFeedResponse = await res.json()
      if (feed.actualCount === 0) {
        setState({
          status: 'empty',
          message: 'No relevant new papers found today. Check back tomorrow!',
        })
        return
      }
      setState({ status: 'ready', feed })
    } catch (err) {
      setState({ status: 'error', message: 'Network error loading feed' })
    }
  }, [])

  // Poll if we got a 202
  useEffect(() => {
    if (state.status !== 'polling') return
    const { jobId } = state
    let stopped = false

    async function poll() {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          const res = await fetch(`/api/research/feed/poll/${encodeURIComponent(jobId)}`)
          if (res.ok) {
            const json = await res.json()
            if (json.status === 'ready' && json.feed) {
              setState({ status: 'ready', feed: json.feed })
              return
            }
            if (json.status === 'failed') {
              setState({ status: 'error', message: 'Feed generation failed. Please try again.' })
              return
            }
          }
        } catch {/* keep polling */}
      }
    }

    poll()
    return () => { stopped = true }
  }, [state])

  // Initial load
  useEffect(() => { fetchFeed() }, [fetchFeed])

  async function handleSave(paperId: string) {
    const res = await fetch('/api/research/feed/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidatePaperId: paperId }),
    })
    if (!res.ok) throw new Error('Save failed')
  }

  async function handleDismiss(paperId: string) {
    const res = await fetch('/api/research/feed/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidatePaperId: paperId }),
    })
    if (!res.ok) throw new Error('Dismiss failed')
  }

  async function savePreferredCount() {
    setSavingCount(true)
    try {
      await fetch('/api/research/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredDailyCount: dailyCount }),
      })
    } finally {
      setSavingCount(false)
      setSettingsOpen(false)
    }
  }

  const feed = state.status === 'ready' ? state.feed : null

  const filteredPapers: PaperSummaryObject[] =
    feed && activeClusterFilter
      ? feed.papers.filter((p) => p.clusterLabel === activeClusterFilter)
      : feed?.papers ?? []

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#141413] text-[#faf9f5]">
      {/* Page header */}
      <div className="border-b border-[#30302e] bg-[#1a1a18]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] uppercase tracking-widest text-[#5e5d59] font-medium">
                  Research Feed
                </span>
              </div>
              <h1
                className="text-[22px] font-semibold text-[#faf9f5]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {today}
              </h1>
              {feed && (
                <p className="mt-0.5 text-[13px] text-[#5e5d59]">
                  {feed.actualCount} paper{feed.actualCount !== 1 ? 's' : ''} curated for you
                  {feed.fromCache && (
                    <span className="ml-2 text-[#3d3d3a]">· from cache</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                id="research-feed-settings"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="p-2 rounded-lg border border-[#30302e] bg-[#1c1c1a] text-[#5e5d59] hover:text-[#87867f] hover:border-[#3d3d3a] transition-all"
                aria-label="Feed settings"
              >
                <Settings2 size={16} />
              </button>
              <button
                id="research-feed-refresh"
                onClick={fetchFeed}
                disabled={state.status === 'loading' || state.status === 'polling'}
                className="p-2 rounded-lg border border-[#30302e] bg-[#1c1c1a] text-[#5e5d59] hover:text-[#87867f] hover:border-[#3d3d3a] transition-all disabled:opacity-40"
                aria-label="Refresh feed"
              >
                <RefreshCw size={16} className={state.status === 'polling' ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-xl border border-[#30302e] bg-[#1c1c1a] p-4">
                  <p className="text-[13px] text-[#87867f] mb-3">Papers per day</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={10}
                      value={dailyCount}
                      onChange={(e) => setDailyCount(Number(e.target.value))}
                      className="flex-1 accent-[#c96442]"
                      aria-label="Preferred number of papers per day"
                    />
                    <span className="w-5 text-center text-sm text-[#faf9f5]">{dailyCount}</span>
                    <button
                      onClick={savePreferredCount}
                      disabled={savingCount}
                      className="rounded-lg bg-[#c96442] px-3 py-1.5 text-[13px] text-[#faf9f5] hover:bg-[#b8573a] transition-colors disabled:opacity-60"
                    >
                      {savingCount ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* Emerging trends */}
        {feed?.emergingTrends && (
          <div className="mb-6 rounded-xl border border-[#30302e] bg-[#1c1c1a] overflow-hidden">
            <button
              id="emerging-trends-toggle"
              onClick={() => setTrendsExpanded(!trendsExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1e1e1c] transition-colors"
              aria-expanded={trendsExpanded}
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-[#87867f]">
                <TrendingUp size={14} className="text-[#c96442]" />
                Emerging Trends
              </span>
              {trendsExpanded ? (
                <ChevronUp size={14} className="text-[#5e5d59]" />
              ) : (
                <ChevronDown size={14} className="text-[#5e5d59]" />
              )}
            </button>
            <AnimatePresence>
              {trendsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[14px] leading-relaxed text-[#b0aea5]">
                    {feed.emergingTrends}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex gap-6">
          {/* Cluster sidebar */}
          {feed && feed.clusters.length > 0 && (
            <aside className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-6">
                <button
                  id="cluster-sidebar-toggle"
                  onClick={() => setShowClusters(!showClusters)}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#5e5d59] mb-3 hover:text-[#87867f] transition-colors"
                >
                  <Layers size={11} />
                  Topics
                  {showClusters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                {showClusters && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveClusterFilter(null)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-[13px] transition-all ${
                        activeClusterFilter === null
                          ? 'bg-[#c96442]/15 text-[#d97757] border border-[#c96442]/20'
                          : 'text-[#5e5d59] hover:text-[#87867f] hover:bg-[#1c1c1a]'
                      }`}
                      aria-pressed={activeClusterFilter === null}
                    >
                      All topics
                    </button>
                    {feed.clusters.map((c: ClusterObject) => (
                      <button
                        key={c.clusterIndex}
                        id={`cluster-filter-${c.clusterIndex}`}
                        onClick={() =>
                          setActiveClusterFilter(
                            activeClusterFilter === c.label ? null : c.label
                          )
                        }
                        className={`w-full text-left rounded-lg px-3 py-2 text-[13px] transition-all ${
                          activeClusterFilter === c.label
                            ? 'bg-[#c96442]/15 text-[#d97757] border border-[#c96442]/20'
                            : 'text-[#5e5d59] hover:text-[#87867f] hover:bg-[#1c1c1a]'
                        }`}
                        aria-pressed={activeClusterFilter === c.label}
                      >
                        <span className="block truncate">{c.label}</span>
                        <span className="text-[11px] text-[#3d3d3a]">
                          {c.paperCount} paper{c.paperCount !== 1 ? 's' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile cluster filter */}
            {feed && feed.clusters.length > 0 && (
              <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setActiveClusterFilter(null)}
                  className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] transition-all ${
                    activeClusterFilter === null
                      ? 'bg-[#c96442] text-[#faf9f5]'
                      : 'bg-[#1c1c1a] border border-[#30302e] text-[#5e5d59]'
                  }`}
                >
                  <Filter size={10} /> All
                </button>
                {feed.clusters.map((c: ClusterObject) => (
                  <button
                    key={c.clusterIndex}
                    onClick={() =>
                      setActiveClusterFilter(activeClusterFilter === c.label ? null : c.label)
                    }
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-all truncate max-w-[140px] ${
                      activeClusterFilter === c.label
                        ? 'bg-[#c96442] text-[#faf9f5]'
                        : 'bg-[#1c1c1a] border border-[#30302e] text-[#5e5d59]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {/* States */}
            {(state.status === 'loading' || state.status === 'polling') && (
              <div>
                {state.status === 'polling' && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#30302e] bg-[#1c1c1a] px-4 py-3 text-[13px] text-[#87867f]">
                    <RefreshCw size={14} className="animate-spin text-[#c96442]" />
                    Generating your personalized feed — this takes a moment…
                  </div>
                )}
                <FeedSkeleton />
              </div>
            )}

            {state.status === 'empty' && (
              <div className="rounded-xl border border-[#30302e] bg-[#1c1c1a] px-6 py-12 text-center">
                <p className="text-[#5e5d59] text-[14px]">{state.message}</p>
              </div>
            )}

            {state.status === 'error' && (
              <div className="rounded-xl border border-red-900/40 bg-red-900/10 px-6 py-8 text-center">
                <p className="text-red-400 text-[14px] mb-3">{state.message}</p>
                <button
                  onClick={fetchFeed}
                  className="rounded-lg bg-[#c96442] px-4 py-2 text-[13px] text-[#faf9f5] hover:bg-[#b8573a] transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {state.status === 'ready' && (
              <AnimatePresence mode="popLayout">
                {filteredPapers.length === 0 ? (
                  <motion.div
                    key="no-cluster-papers"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-[#30302e] bg-[#1c1c1a] px-6 py-8 text-center"
                  >
                    <p className="text-[#5e5d59] text-[14px]">
                      No papers in this topic for today.
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {filteredPapers.map((paper) => (
                      <PaperCard
                        key={paper.candidatePaperId}
                        paper={paper}
                        onSave={handleSave}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
