'use client'

import { Topic } from '@prisma/client'
import Link from 'next/link'
import { FileText, Users, Calendar, ArrowRight, BookOpen, List } from 'lucide-react'

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

interface OtherTopic {
  slug: string
  name: string
}

interface Props {
  topic: Topic
  papers: Paper[]
  otherTopics: OtherTopic[]
}

const jsonLd = (topic: Topic, papers: Paper[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Top Papers on ${topic.name}`,
    description: `A curated list of influential papers on ${topic.name}`,
    url: `https://corpus.app/top/${topic.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: papers.map((paper, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ScholarlyArticle',
          name: paper.title,
          author: paper.authors,
          datePublished: paper.year ? paper.year.toString() : undefined,
          url: paper.slug ? `https://corpus.app/paper/${paper.slug}` : undefined
        }
      }))
    },
    publisher: {
      '@type': 'Organization',
      name: 'Corpus'
    }
  }
}

export default function TopPapersPage({ topic, papers, otherTopics }: Props) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(topic, papers)) }}
      />

      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li><Link href="/" className="hover:text-gray-700">Home</Link></li>
              <li>/</li>
              <li><Link href="/topics" className="hover:text-gray-700">Topics</Link></li>
              <li>/</li>
              <li className="text-gray-900">Top Papers</li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Top Papers on {topic.name}
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              A curated collection of influential research papers in {topic.name},
              featuring groundbreaking contributions and foundational work in the field.
            </p>
          </header>

          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {papers.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No papers found</h3>
                  <p className="text-gray-600">We couldn&apos;t find any papers for this topic yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {papers.map((paper, index) => (
                    <article key={paper.id} className="border-b border-gray-200 pb-6 last:border-0">
                      <div className="flex items-start gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {paper.slug ? (
                            <Link
                              href={`/paper/${paper.slug}`}
                              className="block group"
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
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              {/* Topic Overview */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  About {topic.name}
                </h3>
                {topic.description && (
                  <p className="text-sm text-gray-700 mb-3">{topic.description}</p>
                )}
                {topic.explanation && (
                  <p className="text-sm text-gray-600 line-clamp-4">{topic.explanation}</p>
                )}
                <Link
                  href={`/topics/${topic.slug}`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium mt-3"
                >
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Other Topics */}
              {otherTopics.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Explore Other Topics
                  </h3>
                  <div className="space-y-2">
                    {otherTopics.map((otherTopic) => (
                      <Link
                        key={otherTopic.slug}
                        href={`/top/${otherTopic.slug}`}
                        className="block text-sm text-gray-700 hover:text-blue-600 py-1"
                      >
                        {otherTopic.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/topics"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium mt-4"
                  >
                    View all topics
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </aside>
          </div>

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
    </>
  )
}
