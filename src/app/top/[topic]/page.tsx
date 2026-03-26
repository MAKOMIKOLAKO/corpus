import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import TopPapersPage from './TopPapersPage'
import SEOLayoutWrapper from '@/components/SEOLayoutWrapper'

interface Props {
  params: { topic: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = await prisma.topic.findUnique({
    where: { slug: params.topic }
  })

  if (!topic) {
    return {
      title: 'Topic Not Found | Corpus',
      description: 'The requested topic could not be found.'
    }
  }

  const title = `Top Papers on ${topic.name} | Corpus`
  const description = `Discover the most influential and cited papers on ${topic.name}. Curated list of research papers with summaries and key contributions.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://corpus.app/top/${topic.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://corpus.app/top/${topic.slug}`
    }
  }
}

export async function generateStaticParams() {
  const topics = await prisma.topic.findMany({
    select: {
      slug: true
    }
  })

  return topics.map((topic) => ({
    topic: topic.slug
  }))
}

export default async function TopPapersPageWrapper({ params }: Props) {
  const topic = await prisma.topic.findUnique({
    where: { slug: params.topic }
  })

  if (!topic) {
    notFound()
  }

  // Get all papers related to this topic
  const papers = await prisma.entry.findMany({
    where: {
      contentType: 'PAPER',
      OR: [
        { topics: { has: topic.name } },
        { topics: { has: topic.name.toLowerCase() } },
        { autoKeywords: { has: topic.name } },
        { autoKeywords: { has: topic.name.toLowerCase() } }
      ]
    },
    orderBy: [
      { year: 'desc' },
      { createdAt: 'desc' }
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      authors: true,
      year: true,
      summary: true,
      abstract: true,
      doi: true
    }
  })

  // Get other topics for navigation
  const otherTopics = await prisma.topic.findMany({
    where: {
      slug: { not: topic.slug }
    },
    take: 10,
    select: {
      slug: true,
      name: true
    }
  })

  return (
    <SEOLayoutWrapper>
      <TopPapersPage
        topic={topic}
        papers={papers}
        otherTopics={otherTopics}
      />
    </SEOLayoutWrapper>
  )
}
