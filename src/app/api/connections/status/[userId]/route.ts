import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const targetUserId = params.userId;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ status: "self" });
    }

    // Check if there's an existing connection
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: currentUserId }
        ]
      }
    });

    if (!connection) {
      return NextResponse.json({ status: "none" });
    }

    // Determine the status from the current user's perspective
    if (connection.requesterId === currentUserId) {
      return NextResponse.json({ status: connection.status.toLowerCase() });
    } else {
      // If current user is the receiver
      if (connection.status === 'PENDING') {
        return NextResponse.json({ status: "received" });
      } else {
        return NextResponse.json({ status: connection.status.toLowerCase() });
      }
    }
  } catch (error) {
    console.error("Error checking connection status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
