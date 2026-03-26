'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, FileText, Users, Calendar, Filter, ArrowRight } from 'lucide-react'

interface Paper {
  id: string
  title: string
  slug: string | null
  authors: string[]
  year: number | null
  summary: string | null
  abstract: string | null
  doi: string | null
}

interface Props {
  initialPapers: Paper[]
  allTopics: string[]
}

export default function PapersClient({ initialPapers, allTopics }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'year' | 'title' | 'recent'>('recent')

  const filteredAndSortedPapers = useMemo(() => {
    let filtered = initialPapers

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Sort papers
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b.year || 0) - (a.year || 0)
        case 'title':
          return a.title.localeCompare(b.title)
        case 'recent':
        default:
          return (b.year || 0) - (a.year || 0)
      }
    })

    return sorted
  }, [initialPapers, searchQuery, selectedTopic, sortBy])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Research Papers
          </h1>
          <p className="text-xl text-gray-600">
            Explore our collection of research papers with comprehensive summaries,
            key contributions, and related topics.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search papers by title, author, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Topic Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Topics</option>
                {allTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="year">Year (New to Old)</option>
              <option value="title">Title (A-Z)</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-600 ml-auto">
              {filteredAndSortedPapers.length} paper{filteredAndSortedPapers.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Papers List */}
        {filteredAndSortedPapers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No papers found</h3>
            <p className="text-gray-600">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAndSortedPapers.map((paper) => (
              <article key={paper.id} className="border-b border-gray-200 pb-6 last:border-0">
                {paper.slug ? (
                  <Link
                    href={`/paper/${paper.slug}`}
                    className="group block"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {paper.title}
                    </h2>
                  </Link>
                ) : (
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                    {paper.title}
                  </h2>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{paper.authors.slice(0, 3).join(', ')}
                      {paper.authors.length > 3 && ' et al.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{paper.year || 'n.d.'}</span>
                  </div>
                </div>

                {(paper.summary || paper.abstract) && (
                  <p className="text-gray-700 line-clamp-3 mb-3">
                    {paper.summary || paper.abstract}
                  </p>
                )}

                <div className="flex items-center gap-4">
                  {paper.slug && (
                    <Link
                      href={`/paper/${paper.slug}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Read summary
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}

                  {paper.doi && (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      View paper
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* CTA */}
        <section className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Build Your Research Library
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Save papers to your personal Corpus library, organize them by topic,
            and discover new research tailored to your interests.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </div>
    </div>
  )
}
