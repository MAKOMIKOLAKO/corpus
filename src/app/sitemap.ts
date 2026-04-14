import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://usecorpus.app'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // Dynamic public collections
  let collectionPages: MetadataRoute.Sitemap = []
  try {
    const collections = await prisma.collection.findMany({
      where: {
        isPublic: true,
        publicSlug: {
          not: null
        }
      },
      select: {
        publicSlug: true,
        createdAt: true,
      },
      take: 1000, // Limit to prevent oversized sitemap
    })

    collectionPages = collections.map((collection) => ({
      url: `${baseUrl}/c/${collection.publicSlug}`,
      lastModified: collection.createdAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  } catch (error) {
    console.error('Error fetching collections for sitemap:', error)
  }

  // Dynamic public profiles
  let profilePages: MetadataRoute.Sitemap = []
  try {
    const profiles = await prisma.user.findMany({
      where: {
        username: {
          not: null
        }
      },
      select: {
        username: true,
        createdAt: true,
      },
      take: 1000, // Limit to prevent oversized sitemap
    })

    profilePages = profiles.map((profile) => ({
      url: `${baseUrl}/profile/${profile.username}`,
      lastModified: profile.createdAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))
  } catch (error) {
    console.error('Error fetching profiles for sitemap:', error)
  }

  return [...staticPages, ...collectionPages, ...profilePages]
}
