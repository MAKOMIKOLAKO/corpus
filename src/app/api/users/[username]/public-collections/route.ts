import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, username: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collections = await prisma.collection.findMany({
      where: {
        userId: user.id,
        isPublic: true
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        },
        _count: {
          select: { entries: true, members: true }
        },
        userEntryCollections: {
          take: 2,
          orderBy: {
            addedAt: 'desc'
          },
          include: {
            userEntry: {
              include: {
                globalEntry: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      user,
      collections
    });
  } catch (error) {
    console.error('Error fetching public collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
