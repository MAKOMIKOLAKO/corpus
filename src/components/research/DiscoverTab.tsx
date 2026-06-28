// HIDDEN — feature disabled, do not import
'use client'

import { useState } from 'react'
import { Search, Rss, FlaskConical, Loader2, ChevronDown, Filter } from 'lucide-react'
import { ResearchFeedClient } from '@/app/research/ResearchFeedClient'
import { RssFeedView } from './RssFeedView'

interface DiscoverTabProps {
  userId: string
  preferredCount: number
}

interface SearchResult {
  candidatePaperId: string
  globalEntryId: string | null
  title: string
  authors: string[]
  year: number | null
  publishedDate: string | null
  source: string | null
  doi: string | null
  url: string | null
  plainSummary: string | null
  compositeScore: number
  scoreBreakdown: {
    keywordScore: number
    semanticScore: number
    alertScore: number
    historyScore: number
  }
  sourceLabel: string
  alreadySaved: boolean
  sessionExists: boolean
  whyExplanation: string | null
}

export function DiscoverTab({ userId, preferredCount }: DiscoverTabProps) {
  const [viewMode, setViewMode] = useState<'rss' | 'discovery'>('discovery')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const res = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results || [])
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* View Toggle */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center py-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('discovery')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${viewMode === 'discovery'
                  ? 'bg-card text-content-primary border border-border'
                  : 'text-content-secondary hover:bg-card hover:text-content-primary'
                  }`}
              >
                <FlaskConical className="w-4 h-4" />
                Paper Discovery
              </button>
              <button
                onClick={() => setViewMode('rss')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] font-sans font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${viewMode === 'rss'
                  ? 'bg-card text-content-primary border border-border'
                  : 'text-content-secondary hover:bg-card hover:text-content-primary'
                  }`}
              >
                <Rss className="w-4 h-4" />
                RSS Feed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Discovery View */}
      {viewMode === 'discovery' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for papers by topic, keyword, or concept..."
                className="w-full rounded-lg border border-border bg-card py-3 pl-12 pr-4 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
          </form>


          {/* Filters (collapsible) */}
          {searchQuery && (
            <div className="mb-6">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-content-secondary hover:text-content-primary mb-3"
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {showFilters && (
                <div className="p-4 rounded-xl border border-border bg-card whisper-shadow">
                  <p className="text-xs text-content-tertiary mb-2">Filters coming soon</p>
                </div>
              )}
            </div>
          )}

          {/* Empty State - Show Daily Brief */}
          {!searchQuery && (
            <ResearchFeedClient
              userId={userId}
              preferredCount={preferredCount}
            />
          )}

          {/* Search Results */}
          {searchQuery && isSearching && (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
              <p className="text-content-secondary">Searching papers...</p>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-20">
              <p className="text-content-secondary">No results found</p>
              <p className="text-content-tertiary text-sm mt-2">
                Try adjusting your search terms
              </p>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length > 0 && (
            <div>
              <p className="text-sm text-content-tertiary mb-4">
                {totalCount} result{totalCount !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <div
                    key={result.candidatePaperId}
                    className="p-5 rounded-xl border border-border bg-card hover:border-border-strong transition-colors whisper-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-serif font-medium text-content-primary flex-1" style={{ lineHeight: 1.20 }}>
                        <a
                          href={result.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent transition-colors"
                        >
                          {result.title}
                        </a>
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-surface-sunken text-content-tertiary">
                        {result.sourceLabel}
                      </span>
                    </div>
                    <p className="text-sm text-content-secondary mb-2" style={{ lineHeight: 1.60 }}>
                      {result.authors.slice(0, 3).join(', ')}
                      {result.authors.length > 3 && ' et al.'}
                      {result.year && ` · ${result.year}`}
                    </p>
                    {result.plainSummary && (
                      <p className="text-sm text-content-secondary mb-3 line-clamp-3" style={{ lineHeight: 1.60 }}>
                        {result.plainSummary}
                      </p>
                    )}
                    {result.whyExplanation && (
                      <p className="text-xs text-content-tertiary mb-3 italic">
                        {result.whyExplanation}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-xs text-content-tertiary">Relevance:</div>
                      <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${result.compositeScore * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-content-tertiary w-12 text-right">
                        {Math.round(result.compositeScore * 100)}%
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="button-warm-sand rounded-lg px-3 py-1.5 text-sm transition-colors hover:text-content-primary">
                        Save to Library
                      </button>
                      <button className="px-3 py-1.5 text-sm rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover transition-colors button-terracotta">
                        Open in Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {totalCount > searchResults.length && (
                <button className="w-full mt-6 py-3 rounded-lg border border-border bg-card text-content-secondary hover:border-accent transition-colors ring-shadow-warm">
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* RSS Feed View */}
      {viewMode === 'rss' && (
        <RssFeedView userId={userId} />
      )}
    </div>
  )
}
