import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function extractDomain(email: string): string {
  const parts = email.toLowerCase().split('@');
  return parts[parts.length - 1];
}

function isPersonalEmail(domain: string): boolean {
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'protonmail.com', 'tutanota.com',
    'mail.com', 'gmx.com', 'yandex.com'
  ];
  return personalDomains.includes(domain);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if it's a personal email
    const domain = extractDomain(email);
    if (isPersonalEmail(domain)) {
      return NextResponse.json({
        error: "Please use your institutional email address (not gmail, yahoo, etc.)"
      }, { status: 400 });
    }

    // Find or create institution
    let institution = await prisma.institution.findUnique({
      where: { domain }
    });

    const isNewInstitution = !institution;

    if (isNewInstitution) {
      // Create new institution
      institution = await prisma.institution.create({
        data: {
          domain,
          name: domain.split('.').slice(0, -1).join('.').toUpperCase(),
          shortName: domain.split('.')[0].toUpperCase()
        }
      });
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing codes for this user
    await prisma.institutionVerificationCode.deleteMany({
      where: { userId: session.user.id }
    });

    // Store verification code
    await prisma.institutionVerificationCode.create({
      data: {
        userId: session.user.id,
        code,
        email,
        expiresAt
      }
    });

    // Send email
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Corpus <noreply@corpus-knowledge.com>',
          to: email,
          subject: 'Your Corpus institution verification code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Verify Your Institution</h2>
              <p>Hi there!</p>
              <p>Your verification code for Corpus is:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
                ${code}
              </div>
              <p>This code will expire in 15 minutes.</p>
              <p>If you didn't request this verification, you can safely ignore this email.</p>
              <p>Best,<br/>The Corpus Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
      }
    } else {
      // For development, log the code
      console.log(`Verification code for ${email}: ${code}`);
    }

    return NextResponse.json({
      institutionName: institution.name,
      codeSent: true,
      ...(isNewInstitution && { newInstitution: true })
    });
  } catch (error) {
    console.error("Error in institution verification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
