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
      slug: true
    }
  })

  // Get all public collections
  const publicCollections = await prisma.collection.findMany({
    where: {
      publicSlug: { not: null }
    },
    select: {
      publicSlug: true
    }
  })

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/papers`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  // Paper pages
  const paperPages = papers.map((paper) => ({
    url: `${baseUrl}/paper/${paper.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Public collection pages
  const publicCollectionPages = publicCollections.map((collection) => ({
    url: `${baseUrl}/c/${collection.publicSlug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...paperPages, ...publicCollectionPages]
}
