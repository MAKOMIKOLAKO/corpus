import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();

    if (!['ACKNOWLEDGED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get request
    const referenceRequest = await prisma.referenceRequest.findUnique({
      where: { id: params.id },
      include: {
        owner: true,
        requester: true,
        entry: true
      }
    });

    if (!referenceRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check if user is the owner
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.id !== referenceRequest.ownerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update request
    const updatedRequest = await prisma.referenceRequest.update({
      where: { id: params.id },
      data: {
        status,
        respondedAt: new Date()
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
            year: true
          }
        }
      }
    });

    // If acknowledged, share the entry
    if (status === 'ACKNOWLEDGED') {
      try {
        await prisma.sharedEntry.create({
          data: {
            entryId: referenceRequest.entryId,
            senderId: referenceRequest.ownerId,
            receiverId: referenceRequest.requesterId,
            message: `Shared via reference request: "${referenceRequest.entry.title}"`,
            status: 'ACCEPTED'
          }
        });
      } catch (error) {
        console.error("Failed to share entry:", error);
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[api/reference-requests/[id] PATCH]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
