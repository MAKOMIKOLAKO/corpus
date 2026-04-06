import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { timedJson } from '@/lib/serverTiming';

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'notifications.get');
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');

    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly && { read: false }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      })
    ]);

    const hasMore = notifications.length === limit;

    return timedJson({
      notifications,
      unreadCount,
      hasMore,
    }, startedAt, undefined, 'notifications.get');
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'notifications.get');
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'notifications.post');
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'read-all') {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return timedJson({ message: 'All notifications marked as read' }, startedAt, undefined, 'notifications.post');
    }

    return timedJson({ error: 'Invalid action' }, startedAt, { status: 400 }, 'notifications.post');
  } catch (error) {
    console.error('Error updating notifications:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'notifications.post');
  }
}

export async function PATCH(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'notifications.patch');
    }

    const body = await request.json();
    const validatedData = markReadSchema.parse(body);

    // Mark notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        ...(validatedData.notificationIds?.length && {
          id: { in: validatedData.notificationIds }
        }),
      },
      data: { read: true },
    });

    return timedJson({ success: true }, startedAt, undefined, 'notifications.patch');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return timedJson({ error: 'Invalid input', details: error.issues }, startedAt, { status: 400 }, 'notifications.patch');
    }
    console.error('Error marking notifications as read:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'notifications.patch');
  }
}
