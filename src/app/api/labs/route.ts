import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: "Lab name must be at least 3 characters" }, { status: 400 });
    }

    // Simple approach: just try to create the lab
    const slug = generateSlug(name);

    const lab = await prisma.lab.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        institutionId: "temp-institution-id", // We'll fix this after it works
        createdBy: session.user.id || "temp-user-id", // We'll fix this after it works
      }
    });

    return NextResponse.json({
      ...lab,
      createdAt: lab.createdAt.toISOString(),
      institution: { id: "temp", name: "Temp Institution", domain: "" },
      userRole: 'ADMIN',
      joinedAt: new Date().toISOString(),
      _count: { members: 0 }
    });

  } catch (error: any) {
    console.error("Error creating lab:", error);
    return NextResponse.json({
      error: error.message || "Failed to create lab"
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return empty for now
    return NextResponse.json([]);

  } catch (error: any) {
    console.error("Error fetching labs:", error);
    return NextResponse.json({
      error: error.message || "Failed to fetch labs"
    }, { status: 500 });
  }
}
