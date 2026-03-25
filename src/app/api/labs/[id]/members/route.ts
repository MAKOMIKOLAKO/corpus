import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lab with members
    const lab = await prisma.lab.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                institutionVerifiedAt: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    // Check if user is a member
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMember = lab.members.some(m => m.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this lab" }, { status: 403 });
    }

    return NextResponse.json(lab.members);
  } catch (error) {
    console.error("Error fetching lab members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Get lab
    const lab = await prisma.lab.findUnique({
      where: { id: params.id },
      include: {
        members: true
      }
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    // Check if requester is admin
    const requester = await prisma.labMember.findUnique({
      where: {
        labId_userId: {
          labId: params.id,
          userId: session.user.id
        }
      }
    });

    if (!requester || requester.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can add members" }, { status: 403 });
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has verified institution and it matches
    if (!targetUser.institutionId || !targetUser.institutionVerifiedAt) {
      return NextResponse.json({ error: "User must verify their institution to join a lab" }, { status: 403 });
    }

    if (targetUser.institutionId !== lab.institutionId) {
      return NextResponse.json({ error: "User is not at the same institution" }, { status: 403 });
    }

    // Check if already a member
    const existingMember = await prisma.labMember.findUnique({
      where: { labId_userId: { labId: params.id, userId } }
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    // Add member
    await prisma.labMember.create({
      data: {
        labId: params.id,
        userId,
        role: 'MEMBER'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding lab member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
