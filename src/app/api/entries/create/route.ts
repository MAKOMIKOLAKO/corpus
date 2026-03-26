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

    const { title, authors, year, doi, url, topics } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if entry already exists for this user
    const existingEntry = await prisma.entry.findFirst({
      where: {
        userId: user.id,
        OR: [
          doi ? { doi } : {},
          url ? { url } : {},
          { title }
        ].filter(condition => Object.keys(condition).length > 0)
      }
    })

    if (existingEntry) {
      // If it exists, we could return it or delete it (toggle behavior)
      // For now, let's delete it to implement toggle
      await prisma.entry.delete({
        where: { id: existingEntry.id }
      })
      return NextResponse.json({ success: true, action: 'deleted', entry: existingEntry })
    }

    // Create new entry
    const newEntry = await prisma.entry.create({
      data: {
        userId: user.id,
        title,
        authors: authors || [],
        year: year || null,
        doi: doi || null,
        url: url || null,
        topics: topics || [],
        contentType: 'PAPER'
      }
    })

    return NextResponse.json({ success: true, action: 'created', entry: newEntry })

  } catch (error) {
    console.error('Create entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
