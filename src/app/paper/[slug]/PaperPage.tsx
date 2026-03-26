'use client'

import { Entry, Topic } from '@prisma/client'
import Link from 'next/link'
import { ExternalLink, Calendar, Users, FileText, BookOpen, ArrowRight } from 'lucide-react'

interface RelatedPaper {
  id: string
  title: string
  slug: string | null
  authors: string[]
  year: number | null
  summary: string | null
}

interface RelatedTopic {
  slug: string
  name: string
  description: string | null
}

interface Props {
  entry: Entry & {
    user?: {
      username: string | null
      name: string | null
    } | null
  }
  relatedPapers: RelatedPaper[]
  relatedTopics: RelatedTopic[]
}

const jsonLd = (entry: Entry) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: entry.title,
    author: entry.authors.map(author => ({ '@type': 'Person', name: author })),
    datePublished: entry.publishDate,
    abstract: entry.abstract,
    description: entry.metaDescription,
    keywords: entry.autoKeywords.join(', '),
    publisher: {
      '@type': 'Organization',
      name: 'Corpus'
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://corpus.app/paper/${entry.slug}`
    }
  }
}

export default function PaperPage({ entry, relatedPapers, relatedTopics }: Props) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(entry)) }}
      />

      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li><Link href="/" className="hover:text-gray-700">Home</Link></li>
              <li>/</li>
              <li><Link href="/papers" className="hover:text-gray-700">Papers</Link></li>
              <li>/</li>
              <li className="text-gray-900 truncate max-w-xs">{entry.title}</li>
            </ol>
          </nav>

          {/* Title Section */}
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {entry.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              {entry.authors && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{entry.authors.join(', ')}</span>
                </div>
              )}

              {entry.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{entry.year}</span>
                </div>
              )}

              {entry.doi && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>DOI: {entry.doi}</span>
                </div>
              )}
            </div>

            {entry.doi && (
              <a
                href={`https://doi.org/${entry.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Original Paper
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </header>

          {/* Abstract */}
          {entry.abstract && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Abstract
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">{entry.abstract}</p>
              </div>
            </section>
          )}

          {/* Key Contributions */}
          {entry.userKeywords && entry.userKeywords.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Contributions</h2>
              <ul className="space-y-2">
                {entry.userKeywords.map((contribution, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{contribution}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Summary */}
          {entry.summary && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">{entry.summary}</p>
              </div>
            </section>
          )}

          {/* Topics */}
          {entry.topics && entry.topics.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Topics</h2>
              <div className="flex flex-wrap gap-2">
                {entry.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Topics</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedTopics.map((topic) => (
                  <Link
                    key={topic.slug}
                    href={`/topics/${topic.slug}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 mb-1">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{topic.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Similar Papers */}
          {relatedPapers.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Papers</h2>
              <div className="space-y-4">
                {relatedPapers.filter(paper => paper.slug).map((paper) => (
                  <Link
                    key={paper.id}
                    href={`/paper/${paper.slug}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{paper.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {paper.authors.slice(0, 3).join(', ')}
                      {paper.authors.length > 3 && ' et al.'} • {paper.year || 'n.d.'}
                    </p>
                    {paper.summary && (
                      <p className="text-sm text-gray-700 line-clamp-2">{paper.summary}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Save to your library on Corpus
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Keep track of important papers, organize your research, and discover related content
              with your personal Corpus library.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </section>
        </div>
      </div>
    </>
  )
}
