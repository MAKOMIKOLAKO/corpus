import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    // Get user's watch queries
    const watchQueries = await prisma.watchQuery.findMany({
      where: { userId: user.id, isActive: true },
      select: { query: true },
      take: 5,
    })

    // Get user's domain weights from research profile
    const researchProfile = await prisma.userResearchProfile.findUnique({
      where: { userId: user.id },
      select: { domainWeights: true },
    })

    const domainTags = researchProfile?.domainWeights
      ? Object.keys(researchProfile.domainWeights as Record<string, number>).slice(0, 3)
      : []

    // Combine and deduplicate suggestions
    const suggestions = new Set<string>()

    // Add watch query suggestions
    watchQueries.forEach((wq) => {
      suggestions.add(wq.query)
    })

    // Add domain tag suggestions
    domainTags.forEach((tag) => {
      suggestions.add(tag)
    })

    // Convert to array and limit to 8
    const suggestionArray = Array.from(suggestions).slice(0, 8)

    return NextResponse.json({
      suggestions: suggestionArray,
    })
  } catch (error) {
    console.error('[suggestions-api] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
