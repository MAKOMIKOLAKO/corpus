import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lab
    const lab = await prisma.lab.findUnique({
      where: { id: params.id },
      include: { institution: true }
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has verified institution and it matches
    if (!user.institutionId || !user.institutionVerifiedAt) {
      return NextResponse.json({ error: "You must verify your institution to join a lab" }, { status: 403 });
    }

    if (user.institutionId !== lab.institutionId) {
      return NextResponse.json({ error: "You can only join labs at your institution" }, { status: 403 });
    }

    // Check if already a member
    const existingMember = await prisma.labMember.findUnique({
      where: { labId_userId: { labId: params.id, userId: user.id } }
    });

    if (existingMember) {
      return NextResponse.json({ error: "Already a member of this lab" }, { status: 409 });
    }

    // Add as member
    await prisma.labMember.create({
      data: {
        labId: params.id,
        userId: user.id,
        role: 'MEMBER'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error joining lab:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get membership
    const membership = await prisma.labMember.findUnique({
      where: { labId_userId: { labId: params.id, userId: user.id } },
      include: {
        lab: {
          include: {
            members: {
              where: { role: 'ADMIN' }
            }
          }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this lab" }, { status: 404 });
    }

    // If user is the only admin, transfer or delete lab
    if (membership.role === 'ADMIN' && membership.lab.members.length === 1) {
      // Find the oldest member to transfer admin to
      const oldestMember = await prisma.labMember.findFirst({
        where: {
          labId: params.id,
          userId: { not: user.id },
          role: 'MEMBER'
        },
        orderBy: { joinedAt: 'asc' }
      });

      if (oldestMember) {
        // Transfer admin role
        await prisma.labMember.update({
          where: { id: oldestMember.id },
          data: { role: 'ADMIN' }
        });
      } else {
        // No other members, delete the lab
        await prisma.lab.delete({
          where: { id: params.id }
        });
        return NextResponse.json({ success: true });
      }
    }

    // Remove membership
    await prisma.labMember.delete({
      where: { id: membership.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving lab:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
