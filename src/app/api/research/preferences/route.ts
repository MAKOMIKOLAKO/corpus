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

  const profile = await prisma.userResearchProfile.findUnique({
    where: { userId: user.id },
    select: {
      feedSelectionMode: true,
      feedSelectionCollectionId: true,
      feedSelectionPhrase: true,
    },
  })

  return NextResponse.json({
    selectionMode: profile?.feedSelectionMode || 'profile',
    selectedCollection: profile?.feedSelectionCollectionId || null,
    researchPhrase: profile?.feedSelectionPhrase || null,
  })
}

export async function POST(request: NextRequest) {
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

  const body = await request.json()
  const { selectionMode, selectedCollection, researchPhrase } = body

  await prisma.userResearchProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      feedSelectionMode: selectionMode,
      feedSelectionCollectionId: selectedCollection,
      feedSelectionPhrase: researchPhrase,
    },
    update: {
      feedSelectionMode: selectionMode,
      feedSelectionCollectionId: selectedCollection,
      feedSelectionPhrase: researchPhrase,
    },
  })

  return NextResponse.json({ success: true })
}
