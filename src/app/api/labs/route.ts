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

    // Get user with institution using direct SQL to check structure
    const users = await prisma.$queryRaw`
      SELECT * FROM "User" WHERE email = ${session.user.email} LIMIT 1
    ` as any[];

    const user = users[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check what fields actually exist
    console.log("User fields:", Object.keys(user));

    if (!user.institutionid || !user.institutionverifiedat) {
      return NextResponse.json({ error: "You must verify your institution before creating a lab" }, { status: 403 });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    let slugExists = await prisma.$queryRaw`SELECT id FROM "Lab" WHERE slug = ${slug}` as any[];
    let attempts = 0;

    while (slugExists.length > 0 && attempts < 10) {
      slug = `${generateSlug(name)}-${Math.random().toString(36).substring(2, 6)}`;
      slugExists = await prisma.$queryRaw`SELECT id FROM "Lab" WHERE slug = ${slug}` as any[];
      attempts++;
    }

    if (slugExists.length > 0) {
      return NextResponse.json({ error: "Could not generate unique slug" }, { status: 500 });
    }

    // Create lab using raw query with lowercase column names
    const labs = await prisma.$queryRaw`
      INSERT INTO "Lab" (name, slug, description, institutionid, createdby, isverified, createdat)
      VALUES (${name}, ${slug}, ${description || null}, ${user.institutionid}, ${user.id}, false, NOW())
      RETURNING id, name, slug, description, isverified, createdat
    ` as any[];

    const lab = labs[0];

    // Add creator as admin
    await prisma.$queryRaw`
      INSERT INTO "LabMember" (labid, userid, role, joinedat)
      VALUES (${lab.id}, ${user.id}, 'ADMIN', NOW())
    `;

    // Get institution info
    const institutions = await prisma.$queryRaw`
      SELECT id, name, domain 
      FROM "Institution" 
      WHERE id = ${user.institutionid}
    ` as any[];

    const institution = institutions[0];

    // Return lab with userRole and joinedAt
    const labWithRole = {
      ...lab,
      createdAt: lab.createdat.toISOString(),
      institution: institution,
      userRole: 'ADMIN' as const,
      joinedAt: new Date().toISOString(),
      _count: {
        members: 0
      }
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

    // Get user's email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get lab memberships directly
    const labMemberships = await prisma.$queryRaw`
      SELECT 
        l.id,
        l.name,
        l.slug,
        l.description,
        l.isverified,
        l.createdat,
        i.name as "institutionName",
        i.domain as "institutionDomain",
        lm.role as "userRole",
        lm.joinedat
      FROM "LabMember" lm
      JOIN "Lab" l ON lm.labid = l.id
      JOIN "Institution" i ON l.institutionid = i.id
      WHERE lm.userid = ${user.id}
    ` as any[];

    // Convert dates to strings and format response
    const labs = labMemberships.map((lab: any) => ({
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      description: lab.description,
      isVerified: lab.isverified,
      createdAt: lab.createdat.toISOString(),
      institution: {
        id: lab.id, // We'll use lab.id as placeholder since we don't have institution.id
        name: lab.institutionName,
        domain: lab.institutionDomain
      },
      userRole: lab.userRole,
      joinedAt: lab.joinedat.toISOString(),
      _count: {
        members: 0 // We'll count this separately if needed
      }
    }));

    return NextResponse.json(labs);
  } catch (error) {
    console.error("Error fetching labs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
