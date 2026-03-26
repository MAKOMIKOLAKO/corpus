import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prismaWithRetry";
import { z } from "zod";

const feedbackSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  email: z.string().email().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const { message, email, rating } = feedbackSchema.parse(body);

    // Create feedback entry
    const feedback = await prisma.feedback.create({
      data: {
        message,
        email,
        rating,
        userId: session?.user?.id || null,
      },
    });

    return NextResponse.json({ success: true, feedbackId: feedback.id });
  } catch (error) {
    console.error("Failed to submit feedback:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
