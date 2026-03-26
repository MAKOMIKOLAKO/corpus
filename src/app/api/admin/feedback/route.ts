import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/adminAuth";
import { prisma } from "@/lib/prismaWithRetry";

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authResult = adminAuth(request);
  if (authResult) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get feedback entries with pagination
    const [feedback, totalCount] = await Promise.all([
      prisma.feedback.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({
        where: {
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),
    ]);

    // Get rating distribution
    const ratingDistribution = await prisma.feedback.groupBy({
      by: ['rating'],
      where: {
        rating: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: true,
    });

    // Calculate average rating
    const avgRatingResult = await prisma.feedback.aggregate({
      where: {
        rating: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _avg: {
        rating: true,
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats: {
        totalCount,
        averageRating: avgRatingResult._avg.rating || 0,
        ratingDistribution: ratingDistribution.map((r: { rating: number; _count: number }) => ({
          rating: r.rating,
          count: r._count,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
