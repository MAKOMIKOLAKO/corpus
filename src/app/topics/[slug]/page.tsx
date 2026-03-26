import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import TopicPage from './TopicPage'
import SEOLayoutWrapper from '@/components/SEOLayoutWrapper'

const prisma = new PrismaClient()

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = await prisma.topic.findUnique({
    where: { slug: params.slug }
  })

  if (!topic) {
    return {
      title: 'Topic Not Found | Corpus',
      description: 'The requested topic could not be found.'
    }
  }

  const title = `${topic.name} - Research Papers & Resources | Corpus`
  const description = topic.description || `Explore ${topic.name} with comprehensive explanations, key concepts, and related research papers on Corpus.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://corpus.app/topics/${topic.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://corpus.app/topics/${topic.slug}`
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
    slug: topic.slug
  }))
}

export default async function TopicPageWrapper({ params }: Props) {
  const topic = await prisma.topic.findUnique({
    where: { slug: params.slug }
  })

  if (!topic) {
    notFound()
  }

  // Get papers related to this topic
  const relatedPapers = await prisma.entry.findMany({
    where: {
      contentType: 'PAPER',
      OR: [
        { topics: { has: topic.name } },
        { topics: { has: topic.name.toLowerCase() } },
        { autoKeywords: { has: topic.name } },
        { autoKeywords: { has: topic.name.toLowerCase() } }
      ]
    },
    take: 20,
    orderBy: {
      year: 'desc'
    },
    select: {
      id: true,
      title: true,
      slug: true,
      authors: true,
      year: true,
      summary: true,
      abstract: true
    }
  })

  // Get related topics
  const relatedTopics = await prisma.topic.findMany({
    where: {
      slug: { not: topic.slug }
    },
    take: 8,
    select: {
      slug: true,
      name: true,
      description: true
    }
  })

  return (
    <SEOLayoutWrapper>
      <TopicPage
        topic={topic}
        relatedPapers={relatedPapers}
        relatedTopics={relatedTopics}
      />
    </SEOLayoutWrapper>
  )
}
