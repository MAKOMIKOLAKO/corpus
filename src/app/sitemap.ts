import { MetadataRoute } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://usecorpus.app'

  // Get all papers
  const papers = await prisma.entry.findMany({
    where: {
      contentType: 'PAPER',
      slug: { not: null }
    },
    select: {
      slug: true,
      createdAt: true
    }
  })

  // Get all topics
  const topics = await prisma.topic.findMany({
    select: {
      slug: true,
      createdAt: true
    }
  })

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/papers`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/topics`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  // Paper pages
  const paperPages = papers.map((paper) => ({
    url: `${baseUrl}/paper/${paper.slug}`,
    lastModified: paper.createdAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Topic pages
  const topicPages = topics.map((topic) => ({
    url: `${baseUrl}/topics/${topic.slug}`,
    lastModified: topic.createdAt,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Top papers pages
  const topPapersPages = topics.map((topic) => ({
    url: `${baseUrl}/top/${topic.slug}`,
    lastModified: topic.createdAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...paperPages, ...topicPages, ...topPapersPages]
}
