import { Metadata } from 'next'
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import { BookOpen, FileText, ArrowRight } from 'lucide-react'

const prisma = new PrismaClient()

export const metadata: Metadata = {
  title: 'Research Topics | Corpus',
  description: 'Explore comprehensive research topics in computer science, biology, engineering, and more. Find papers, explanations, and key concepts.',
  openGraph: {
    title: 'Research Topics | Corpus',
    description: 'Explore comprehensive research topics in computer science, biology, engineering, and more.',
    type: 'website',
    url: 'https://corpus.app/topics',
  },
  alternates: {
    canonical: 'https://corpus.app/topics'
  }
}

async function getTopicsWithPaperCount() {
  const topics = await prisma.topic.findMany({
    orderBy: {
      name: 'asc'
    }
  })

  // Get paper count for each topic
  const topicsWithCounts = await Promise.all(
    topics.map(async (topic) => {
      const paperCount = await prisma.entry.count({
        where: {
          contentType: 'PAPER',
          OR: [
            { topics: { has: topic.name } },
            { topics: { has: topic.name.toLowerCase() } },
            { autoKeywords: { has: topic.name } },
            { autoKeywords: { has: topic.name.toLowerCase() } }
          ]
        }
      })

      return {
        ...topic,
        paperCount
      }
    })
  )

  return topicsWithCounts
}

export default async function TopicsPage() {
  const topics = await getTopicsWithPaperCount()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Research Topics
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore in-depth explanations, key concepts, and curated paper collections
            across various research fields. Each topic provides a comprehensive overview
            to help you understand and navigate the literature.
          </p>
        </header>

        {/* Topics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              className="group block p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <BookOpen className="w-8 h-8 text-blue-600 group-hover:text-blue-700" />
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {topic.paperCount} papers
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {topic.name}
              </h3>

              {topic.description && (
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {topic.description}
                </p>
              )}

              {topic.keyConcepts && topic.keyConcepts.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {topic.keyConcepts.slice(0, 3).map((concept, index) => (
                    <span
                      key={index}
                      className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded"
                    >
                      {concept}
                    </span>
                  ))}
                  {topic.keyConcepts.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{topic.keyConcepts.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700 font-medium text-sm">
                Explore topic
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <section className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Don&apos;t see your topic?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Corpus is constantly expanding. Join our community to suggest new topics
            and contribute to growing our collection of research summaries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Join Corpus
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/papers"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Browse all papers
              <FileText className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
