import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import PaperPage from './PaperPage'
import SEOLayoutWrapper from '@/components/SEOLayoutWrapper'

const prisma = new PrismaClient()

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = await prisma.entry.findUnique({
    where: { slug: params.slug },
    include: {
      user: {
        select: { username: true }
      }
    }
  })

  if (!entry) {
    return {
      title: 'Paper Not Found | Corpus',
      description: 'The requested paper could not be found.'
    }
  }

  const title = `${entry.title} - Summary & Key Contributions | Corpus`
  const description = entry.metaDescription || `Read a comprehensive summary of "${entry.title}" by ${entry.authors.join(', ')}. Key contributions, abstract, and related topics.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: entry.publishDate || undefined,
      authors: entry.authors,
      url: `https://corpus.app/paper/${entry.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://corpus.app/paper/${entry.slug}`
    }
  }
}

export async function generateStaticParams() {
  const entries = await prisma.entry.findMany({
    where: {
      slug: { not: null },
      contentType: 'PAPER'
    },
    select: {
      slug: true
    }
  })

  return entries.map((entry) => ({
    slug: entry.slug!
  }))
}

export default async function PaperPageWrapper({ params }: Props) {
  const entry = await prisma.entry.findUnique({
    where: { slug: params.slug },
    include: {
      user: {
        select: { username: true, name: true }
      }
    }
  })

  if (!entry) {
    notFound()
  }

  // Get related papers based on shared topics
  const relatedPapers = await prisma.entry.findMany({
    where: {
      id: { not: entry.id },
      contentType: 'PAPER',
      OR: entry.topics.map(topic => ({
        topics: { has: topic }
      }))
    },
    take: 5,
    select: {
      id: true,
      title: true,
      slug: true,
      authors: true,
      year: true,
      summary: true
    }
  })

  // Get related topics
  const relatedTopics = await prisma.topic.findMany({
    where: {
      slug: { in: entry.topics.map(t => t.toLowerCase().replace(/\s+/g, '-')) }
    },
    take: 5,
    select: {
      slug: true,
      name: true,
      description: true
    }
  })

  return (
    <SEOLayoutWrapper>
      <PaperPage
        entry={entry}
        relatedPapers={relatedPapers}
        relatedTopics={relatedTopics}
      />
    </SEOLayoutWrapper>
  )
}
