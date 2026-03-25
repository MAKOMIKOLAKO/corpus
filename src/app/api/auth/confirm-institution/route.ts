import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Find valid verification code
    const verificationCode = await prisma.institutionVerificationCode.findFirst({
      where: {
        userId: session.user.id,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        // We need to find the institution from the email domain
      }
    });

    if (!verificationCode) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // Extract domain from email and find institution
    const domain = verificationCode.email.split('@')[1].toLowerCase();
    const institution = await prisma.institution.findUnique({
      where: { domain }
    });

    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    // Mark code as used
    await prisma.institutionVerificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() }
    });

    // Update user's institution
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        institutionId: institution.id,
        institutionVerifiedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      institutionName: institution.name
    });
  } catch (error) {
    console.error("Error confirming institution:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
