import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();

    if (!role || !['MEMBER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
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
      return NextResponse.json({ error: "Only admins can update roles" }, { status: 403 });
    }

    // Get member to update
    const member = await prisma.labMember.findUnique({
      where: { id: params.memberId },
      include: { lab: true }
    });

    if (!member || member.labId !== params.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent removing admin from self if they're the only admin
    if (member.userId === session.user.id && role === 'MEMBER') {
      const adminCount = await prisma.labMember.count({
        where: {
          labId: params.id,
          role: 'ADMIN'
        }
      });

      if (adminCount === 1) {
        return NextResponse.json({ error: "Cannot remove admin role from yourself when you're the only admin" }, { status: 400 });
      }
    }

    // Update role
    await prisma.labMember.update({
      where: { id: params.memberId },
      data: { role }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
    }

    // Get member to remove
    const member = await prisma.labMember.findUnique({
      where: { id: params.memberId },
      include: { lab: true }
    });

    if (!member || member.labId !== params.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if removing admin
    if (member.role === 'ADMIN') {
      const adminCount = await prisma.labMember.count({
        where: {
          labId: params.id,
          role: 'ADMIN'
        }
      });

      if (adminCount === 1) {
        return NextResponse.json({ error: "Cannot remove the only admin" }, { status: 400 });
      }
    }

    // Remove member
    await prisma.labMember.delete({
      where: { id: params.memberId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
