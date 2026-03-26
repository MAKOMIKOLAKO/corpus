import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prismaWithRetry";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin (you might want to add an isAdmin field to User model)
    // For now, we'll check if the user's email is in a list of admin emails
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, plan: true }
    });

    if (!user || (!adminEmails.includes(user.email || "") && user.plan !== "PRO" && user.plan !== "LIFETIME_PRO")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Fetch feedback with user information
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100, // Limit to last 100 feedback entries
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Failed to fetch feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
