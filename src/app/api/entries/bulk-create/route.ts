import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entries } = await request.json()

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Invalid entries data' }, { status: 400 })
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create default collection
    let defaultCollection = await prisma.collection.findFirst({
      where: {
        userId: user.id,
        name: 'My Library'
      }
    })

    if (!defaultCollection) {
      defaultCollection = await prisma.collection.create({
        data: {
          userId: user.id,
          name: 'My Library'
        }
      })
    }

    // Process entries and avoid duplicates
    const createdEntries = []

    for (const entry of entries) {
      // Check if entry already exists for this user
      const existingEntry = await prisma.entry.findFirst({
        where: {
          userId: user.id,
          OR: [
            entry.doi ? { doi: entry.doi } : {},
            entry.url ? { url: entry.url } : {},
            { title: entry.title }
          ].filter(condition => Object.keys(condition).length > 0)
        }
      })

      if (!existingEntry) {
        const newEntry = await prisma.entry.create({
          data: {
            userId: user.id,
            title: entry.title,
            authors: entry.authors,
            year: entry.year || null,
            doi: entry.doi || null,
            url: entry.url || null,
            topics: entry.topics || [],
            contentType: 'PAPER',
            collections: {
              create: {
                collectionId: defaultCollection.id
              }
            }
          }
        })
        createdEntries.push(newEntry)
      }
    }

    return NextResponse.json({
      success: true,
      created: createdEntries.length,
      entries: createdEntries
    })

  } catch (error) {
    console.error('Bulk create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
