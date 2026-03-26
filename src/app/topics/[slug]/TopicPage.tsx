'use client'

import React, { useState } from 'react'
import { Topic } from '@prisma/client'
import Link from 'next/link'
import { BookOpen, Lightbulb, ArrowRight, FileText, Users, Calendar } from 'lucide-react'
import SaveButton from '@/components/SaveButton'
import SignupPrompt from '@/components/SignupPrompt'
import SoftwareApplicationJsonLd from '@/components/SoftwareApplicationJsonLd'
import { useSession } from 'next-auth/react'
import { useSavedEntries } from '@/hooks/useSavedEntries'
import { useScrollDepth } from '@/hooks/useScrollDepth'

interface RelatedPaper {
  id: string
  title: string
  slug: string | null
  authors: string[]
  year: number | null
  summary: string | null
  abstract: string | null
}

interface RelatedTopic {
  slug: string
  name: string
  description: string | null
}

interface Props {
  topic: Topic
  relatedPapers: RelatedPaper[]
  relatedTopics: RelatedTopic[]
}

export default function TopicPage({ topic, relatedPapers, relatedTopics }: Props) {
  const { data: session } = useSession()
  const { syncToBackend } = useSavedEntries()
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)

  // Track scroll depth for signup trigger
  useScrollDepth(60, () => {
    if (!session?.user) {
      setShowSignupPrompt(true)
    }
  })

  // Sync saved entries when user logs in
  React.useEffect(() => {
    if (session?.user) {
      syncToBackend().catch(console.error)
    }
  }, [session, syncToBackend])
  return (
    <>
      <SoftwareApplicationJsonLd
        url={`https://corpus.app/topics/${topic.slug}`}
        description={topic.description || `Explore ${topic.name} with comprehensive explanations, key concepts, and related research papers on Corpus.`}
      />

      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li><Link href="/" className="hover:text-gray-700">Home</Link></li>
              <li>/</li>
              <li><Link href="/topics" className="hover:text-gray-700">Topics</Link></li>
              <li>/</li>
              <li className="text-gray-900">{topic.name}</li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {topic.name}
            </h1>
            {topic.description && (
              <p className="text-xl text-gray-600 leading-relaxed">{topic.description}</p>
            )}
          </header>

          {/* Explanation */}
          {topic.explanation && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Overview
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {topic.explanation}
                </p>
              </div>
            </section>
          )}

          {/* Key Concepts */}
          {topic.keyConcepts && topic.keyConcepts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Key Concepts
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {topic.keyConcepts.map((concept: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{concept}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Common Papers in this Area */}
          {relatedPapers.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Common Papers in this Area
              </h2>
              <div className="space-y-4">
                {relatedPapers.filter(paper => paper.slug).slice(0, 10).map((paper) => (
                  <div key={paper.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/paper/${paper.slug}`}
                          className="block group"
                        >
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {paper.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{paper.authors.slice(0, 2).join(', ')}
                              {paper.authors.length > 2 && ' et al.'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{paper.year || 'n.d.'}</span>
                          </div>
                        </div>
                        {(paper.summary || paper.abstract) && (
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {paper.summary || paper.abstract}
                          </p>
                        )}
                      </div>
                      <SaveButton
                        title={paper.title}
                        authors={paper.authors}
                        year={paper.year || undefined}
                        topics={[topic.name]}
                        className="flex-shrink-0"
                        onSignupTrigger={() => setShowSignupPrompt(true)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {relatedPapers.length > 10 && (
                <div className="mt-6 text-center">
                  <Link
                    href={`/top/${topic.slug}`}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all papers in {topic.name}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Topics</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedTopics.map((relatedTopic) => (
                  <Link
                    key={relatedTopic.slug}
                    href={`/topics/${relatedTopic.slug}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 mb-2">{relatedTopic.name}</h3>
                    {relatedTopic.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{relatedTopic.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Explore {topic.name} on Corpus
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Discover more papers, create your personal library, and stay updated with the latest
              research in {topic.name}.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Exploring
              <ArrowRight className="w-5 h-5" />
            </Link>
          </section>
        </div>
      </div>

      <SignupPrompt
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
      />
    </>
  )
}
