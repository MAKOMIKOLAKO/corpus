import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: "Lab name must be at least 3 characters" }, { status: 400 });
    }

    // Get user with institution
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { institution: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.institutionId || !user.institutionVerifiedAt) {
      return NextResponse.json({ error: "You must verify your institution before creating a lab" }, { status: 403 });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    let slugExists = await prisma.lab.findUnique({ where: { slug } });
    let attempts = 0;

    while (slugExists && attempts < 10) {
      slug = `${generateSlug(name)}-${Math.random().toString(36).substring(2, 6)}`;
      slugExists = await prisma.lab.findUnique({ where: { slug } });
      attempts++;
    }

    if (slugExists) {
      return NextResponse.json({ error: "Unable to generate unique slug for lab" }, { status: 500 });
    }

    // Create lab
    const lab = await prisma.lab.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        institutionId: user.institutionId,
        createdBy: user.id
      },
      include: {
        institution: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    // Add creator as admin
    await prisma.labMember.create({
      data: {
        labId: lab.id,
        userId: user.id,
        role: 'ADMIN'
      }
    });

    // Return lab with userRole and joinedAt
    const labWithRole = {
      ...lab,
      userRole: 'ADMIN' as const,
      joinedAt: new Date().toISOString()
    };

    return NextResponse.json(labWithRole);
  } catch (error) {
    console.error("Error creating lab:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's labs
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        labMemberships: {
          include: {
            lab: {
              include: {
                institution: true,
                _count: {
                  select: { members: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const labs = user.labMemberships.map(membership => ({
      ...membership.lab,
      userRole: membership.role,
      joinedAt: membership.joinedAt
    }));

    return NextResponse.json(labs);
  } catch (error) {
    console.error("Error fetching labs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
