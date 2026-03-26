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
    const type = searchParams.get("type"); // "sent" or "received"

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const whereClause = type === "sent"
      ? { requesterId: user.id }
      : { ownerId: user.id };

    const requests = await prisma.referenceRequest.findMany({
      where: whereClause,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        entry: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            contentType: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching reference requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId, ownerId, message } = await request.json();

    if (!entryId || !ownerId) {
      return NextResponse.json({ error: "Entry ID and owner ID are required" }, { status: 400 });
    }

    if (ownerId === session.user.id) {
      return NextResponse.json({ error: "Cannot request access to your own entry" }, { status: 400 });
    }

    // Get current user
    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        sentConnections: {
          where: { status: "ACCEPTED" },
          select: { receiverId: true }
        },
        receivedConnections: {
          where: { status: "ACCEPTED" },
          select: { requesterId: true }
        }
      }
    });

    if (!requester) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if they are connected
    const connectedUserIds = [
      ...requester.sentConnections.map(c => c.receiverId),
      ...requester.receivedConnections.map(c => c.requesterId)
    ];

    if (!connectedUserIds.includes(ownerId)) {
      return NextResponse.json({
        error: "You can only request access from connections"
      }, { status: 403 });
    }

    // Check for existing request
    const existingRequest = await prisma.referenceRequest.findUnique({
      where: {
        requesterId_ownerId_entryId: {
          requesterId: requester.id,
          ownerId,
          entryId
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: "Request already exists" }, { status: 409 });
    }

    // Get owner username for metadata
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { username: true }
    });

    // Create request
    const referenceRequest = await prisma.referenceRequest.create({
      data: {
        requesterId: requester.id,
        ownerId,
        entryId,
        message: message?.trim() || null
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        entry: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            contentType: true
          }
        }
      }
    });

    // Create signal (fire-and-forget)
    try {
      prisma.signal.create({
        data: {
          userId: requester.id,
          type: "REFERENCE_REQUESTED",
          entryId,
          metadata: {
            entryTitle: referenceRequest.entry.title,
            receiverUsername: owner?.username
          }
        }
      }).catch(err => console.error("Failed to create signal:", err));
    } catch (error) {
      console.error("Failed to create signal:", error);
    }

    return NextResponse.json(referenceRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating reference request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
