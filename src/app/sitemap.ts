import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usecorpus.app'

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      changeFrequency: 'daily' as const,
      priority: 1,
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

  let publicCollectionPages: any[] = []

  try {
    // Get all public collections
    const publicCollections = await prisma.collection.findMany({
      where: {
        publicSlug: { not: null }
      },
      select: {
        publicSlug: true
      },
      take: 100 // Limit for sitemap during build
    })

    // Public collection pages
    publicCollectionPages = publicCollections.map((collection) => ({
      url: `${baseUrl}/c/${collection.publicSlug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error('Error fetching data for sitemap:', error)
  }

  return [...staticPages, ...publicCollectionPages]
}
