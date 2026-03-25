import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Find lab by slug
    const lab = await prisma.lab.findUnique({
      where: { slug: params.slug },
      include: {
        institution: true,
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
        },
        _count: {
          select: { members: true }
        }
      }
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    // Check if user is a member
    let userRole: 'MEMBER' | 'ADMIN' | null = null;
    let joinedAt: string | undefined;

    if (session?.user?.id) {
      const membership = lab.members.find(m => m.userId === session.user.id);
      if (membership) {
        userRole = membership.role;
        joinedAt = membership.joinedAt;
      }
    }

    // Remove sensitive info if not a member
    if (!userRole) {
      // Only show basic info for non-members
      const publicLab = {
        id: lab.id,
        name: lab.name,
        slug: lab.slug,
        description: lab.description,
        isVerified: lab.isVerified,
        createdAt: lab.createdAt,
        institution: lab.institution,
        _count: lab._count,
        userRole: null
      };
      return NextResponse.json(publicLab);
    }

    return NextResponse.json({
      ...lab,
      userRole,
      joinedAt
    });
  } catch (error) {
    console.error("Error fetching lab:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    // Find lab and check if user is admin
    const lab = await prisma.lab.findUnique({
      where: { slug: params.slug },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    const membership = lab.members[0];
    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can edit labs" }, { status: 403 });
    }

    // Update lab
    const updatedLab = await prisma.lab.update({
      where: { id: lab.id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null
      },
      include: {
        institution: true,
        _count: {
          select: { members: true }
        }
      }
    });

    return NextResponse.json(updatedLab);
  } catch (error) {
    console.error("Error updating lab:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
