import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const filter = searchParams.get("filter") || "all";
    const offset = (page - 1) * limit;

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        receivedConnections: {
          where: { status: "ACCEPTED" },
          select: { requesterId: true }
        },
        sentConnections: {
          where: { status: "ACCEPTED" },
          select: { receiverId: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get connected user IDs
    const connectedUserIds = [
      ...user.receivedConnections.map(c => c.requesterId),
      ...user.sentConnections.map(c => c.receiverId)
    ];

    // Build the where clause based on filter
    let whereClause: any = {};

    if (filter === "mine") {
      whereClause.userId = user.id;
    } else if (filter === "connections") {
      whereClause.userId = { in: connectedUserIds };
    } else {
      // "all" - include user's signals, connections' signals, and public collection signals
      whereClause.OR = [
        { userId: user.id },
        { userId: { in: connectedUserIds } }
      ];
    }

    // Also respect privacy settings
    if (filter !== "mine") {
      whereClause.OR = whereClause.OR.map((condition: any) => ({
        ...condition,
        user: {
          showSignals: true
        }
      }));
    }

    // Fetch signals with related data
    const signals = await prisma.signal.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            plan: true
          }
        },
        entry: {
          select: {
            id: true,
            title: true,
            contentType: true,
            topics: true,
            authors: true,
            year: true
          }
        },
        collection: {
          select: {
            id: true,
            name: true,
            publicSlug: true,
            isPublic: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit
    });

    // Get unread count
    let unreadCount = 0;
    if (user.lastFeedViewedAt) {
      unreadCount = await prisma.signal.count({
        where: {
          ...whereClause,
          createdAt: { gt: user.lastFeedViewedAt }
        }
      });
    } else {
      // If never viewed, all signals are considered read
      unreadCount = 0;
    }

    // Filter out signals about private collections for non-members
    const filteredSignals = signals.filter(signal => {
      if (signal.type === "COLLECTION_MADE_PUBLIC") {
        return true; // Public collection signals are always visible
      }
      if (signal.type === "ENTRY_ADDED_TO_COLLECTION" && signal.collection) {
        // Only show if collection is public or user is a member
        return signal.collection.isPublic || signal.userId === user.id || connectedUserIds.includes(signal.userId);
      }
      if (signal.type === "REFERENCE_REQUESTED") {
        // Only show to sender and receiver
        return signal.userId === user.id || signal.metadata?.receiverUsername === user.username;
      }
      return true;
    });

    return NextResponse.json({
      signals: filteredSignals,
      unreadCount,
      hasMore: signals.length === limit
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lastFeedViewedAt } = await request.json();

    // Update user's last feed viewed timestamp
    await prisma.user.update({
      where: { email: session.user.email },
      data: { lastFeedViewedAt: lastFeedViewedAt ? new Date(lastFeedViewedAt) : new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating feed viewed timestamp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
