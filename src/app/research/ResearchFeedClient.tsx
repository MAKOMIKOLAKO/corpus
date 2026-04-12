'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react'
import { PaperCard } from './PaperCard'
import type { DailyFeedResponse, PaperSummaryObject, ClusterObject } from '@/lib/research/feedPipeline'

interface ResearchFeedClientProps {
  userId: string
  preferredCount: number
  selectionMode?: 'profile' | 'collection' | 'phrase'
  selectedCollection?: string | null
  researchPhrase?: string
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
          className="rounded-xl border border-border bg-card p-5 animate-pulse whisper-shadow"
        >
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-5 w-32 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted mb-2" />
          <div className="h-4 w-1/2 rounded bg-muted mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
            <div className="h-3 w-4/6 rounded bg-muted" />
          </div>
          <div className="mt-3 h-10 w-full rounded-lg bg-muted/60" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-28 rounded-lg bg-muted" />
            <div className="h-8 w-20 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResearchFeedClient({ userId, preferredCount, selectionMode = 'profile', selectedCollection, researchPhrase }: ResearchFeedClientProps) {
  const [state, setState] = useState<FeedState>({ status: 'loading' })
  const [trendsExpanded, setTrendsExpanded] = useState(false)
  const [activeClusterFilter, setActiveClusterFilter] = useState<string | null>(null)
  const [showClusters, setShowClusters] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dailyCount, setDailyCount] = useState(preferredCount)
  const [savingCount, setSavingCount] = useState(false)

  const fetchFeed = useCallback(async (forceRefresh = false) => {
    setState({ status: 'loading' })
    try {
      const params = new URLSearchParams()
      if (selectionMode !== 'profile') {
        params.append('mode', selectionMode)
      }
      if (selectionMode === 'collection' && selectedCollection) {
        params.append('collectionId', selectedCollection)
      }
      if (selectionMode === 'phrase' && researchPhrase) {
        params.append('phrase', researchPhrase)
      }
      if (forceRefresh) {
        params.append('refresh', '1')
      }

      const url = `/api/research/feed${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
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
  }, [selectionMode, selectedCollection, researchPhrase])

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
        } catch {/* keep polling */ }
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

  const papers: PaperSummaryObject[] = feed?.papers ?? []

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <div className="border-b border-border bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] uppercase tracking-widest text-content-secondary font-medium">
                  Research Feed
                </span>
              </div>
              <h1
                className="text-[22px] font-medium text-content-primary font-serif"
                style={{ lineHeight: 1.20 }}
              >
                {today}
              </h1>
              {feed && (
                <p className="mt-0.5 text-[13px] text-content-secondary">
                  {feed.actualCount} paper{feed.actualCount !== 1 ? 's' : ''} curated for you
                  {feed.fromCache && (
                    <span className="ml-2 text-content-tertiary">· from cache</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                id="research-feed-settings"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="p-2 rounded-lg border border-border bg-card text-content-secondary hover:text-content-primary hover:border-border-strong transition-all"
                aria-label="Feed settings"
              >
                <Settings2 size={16} />
              </button>
              <button
                id="research-feed-refresh"
                onClick={() => fetchFeed(true)}
                disabled={state.status === 'loading' || state.status === 'polling'}
                className="p-2 rounded-lg border border-border bg-card text-content-secondary hover:text-content-primary hover:border-border-strong transition-all disabled:opacity-40"
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
                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                  <p className="text-[13px] text-content-tertiary mb-3">Papers per day</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={10}
                      value={dailyCount}
                      onChange={(e) => setDailyCount(Number(e.target.value))}
                      className="flex-1 accent-accent"
                      aria-label="Preferred number of papers per day"
                    />
                    <span className="w-5 text-center text-sm text-foreground">{dailyCount}</span>
                    <button
                      onClick={savePreferredCount}
                      disabled={savingCount}
                      className="rounded-lg bg-accent px-3 py-1.5 text-[13px] text-accent-foreground hover:bg-accent-hover transition-colors disabled:opacity-60"
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
          <div className="mb-6 rounded-xl border border-border bg-card overflow-hidden whisper-shadow">
            <button
              id="emerging-trends-toggle"
              onClick={() => setTrendsExpanded(!trendsExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised transition-colors"
              aria-expanded={trendsExpanded}
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-content-tertiary">
                <TrendingUp size={14} className="text-accent" />
                Emerging Trends
              </span>
              {trendsExpanded ? (
                <ChevronUp size={14} className="text-content-secondary" />
              ) : (
                <ChevronDown size={14} className="text-content-secondary" />
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
                  <p className="px-5 pb-5 text-[14px] text-content-secondary" style={{ lineHeight: 1.60 }}>
                    {feed.emergingTrends}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex gap-6">
          {/* Main content */}
          <main className="flex-1 min-w-0">

            {/* States */}
            {(state.status === 'loading' || state.status === 'polling') && (
              <div>
                {state.status === 'polling' && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[13px] text-content-tertiary whisper-shadow">
                    <RefreshCw size={14} className="animate-spin text-accent" />
                    Generating your personalized feed — this takes a moment…
                  </div>
                )}
                <FeedSkeleton />
              </div>
            )}

            {state.status === 'empty' && (
              <div className="rounded-xl border border-border bg-card px-6 py-12 text-center whisper-shadow">
                <p className="text-content-secondary text-[14px]">{state.message}</p>
              </div>
            )}

            {state.status === 'error' && (
              <div className="rounded-xl border border-red-900/40 bg-red-900/10 px-6 py-8 text-center whisper-shadow">
                <p className="text-red-400 text-[14px] mb-3">{state.message}</p>
                <button
                  onClick={() => fetchFeed(true)}
                  className="rounded-lg bg-accent px-4 py-2 text-[13px] text-accent-foreground hover:bg-accent-hover transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {state.status === 'ready' && (
              <AnimatePresence mode="popLayout">
                {papers.length === 0 ? (
                  <motion.div
                    key="no-papers"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-border bg-card px-6 py-8 text-center whisper-shadow"
                  >
                    <p className="text-content-secondary text-[14px]">
                      No papers found for today.
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {papers.map((paper: PaperSummaryObject) => (
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
      </div >
    </div >
  )
}
