/**
 * Google OAuth Setup Instructions:
 * 1. Go to console.cloud.google.com
 * 2. Create a new project
 * 3. Enable the Google+ API
 * 4. Create OAuth credentials (Web application type)
 * 5. Add http://localhost:3000/api/auth/callback/google as an authorized redirect URI for development
 * 6. Add https://usecorpus.app/api/auth/callback/google for production
 * 7. Copy the client ID and secret into GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
 */

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, withRetry } from "@/lib/prismaWithRetry";
import { sendVerificationEmail } from "@/lib/email";
import { isAdminUser } from "@/lib/adminAuth";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name (optional)", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const bcrypt = require("bcryptjs");
        const saltRounds = 12;

        // Try to find existing user
        const existingUser = await withRetry(() => prisma.user.findUnique({
          where: { email: credentials.email },
        }));

        if (existingUser) {
          // Sign-in: verify password
          if (!existingUser.passwordHash) return null; // OAuth user without password
          const isValid = await bcrypt.compare(credentials.password, existingUser.passwordHash);
          if (!isValid) return null;
          return { id: existingUser.id, name: existingUser.name, email: existingUser.email };
        } else {
          // Sign-up: only allow if name is provided
          if (!credentials.name) return null;
          const passwordHash = await bcrypt.hash(credentials.password, saltRounds);
          const user = await withRetry(() => prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.name,
              passwordHash,
              username: `user_${Math.random().toString(36).substring(2, 10)}`, // Random username
            },
          }));

          // Send verification email asynchronously — do not block sign-up
          (async () => {
            try {
              // SECURITY AUDIT: 64-char hex from 32 bytes (not Math.random).
              const token = crypto.randomBytes(32).toString("hex");
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              await prisma.emailVerificationToken.create({
                data: { token, userId: user.id, expiresAt },
              });
              await sendVerificationEmail(user.email, token, user.name || "");
            } catch (err) {
              console.error("Failed to send verification email:", err);
            }
          })();

          return { id: user.id, name: user.name, email: user.email };
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Validate email is present; actual user creation happens in jwt callback
        if (!profile?.email) return false;
      }
      return true;
    },
    async jwt({ token, account, profile, user, trigger }) {
      if (!token.jti) {
        token.jti = crypto.randomUUID();
      }
      if (account?.provider === "google") {
        const email = (profile?.email ?? token.email) as string | undefined;
        if (email && typeof (token as any).userId !== "string") {
          // Upsert so creation and read are atomic — avoids race with signIn callback
          const dbUser = await withRetry(() => prisma.user.upsert({
            where: { email },
            update: { name: (profile?.name ?? token.name ?? undefined) as string | undefined },
            create: {
              email,
              name: (profile?.name ?? token.name ?? null) as string | null,
              username: `user_${Math.random().toString(36).substring(2, 10)}` // Random username
            },
            select: {
              id: true,
              plan: true,
              username: true,
              onboardingCompleted: true,
              entriesCount: true,
              personalCollectionsCount: true,
            },
          })) as any;
          (token as any).userId = dbUser.id;
          (token as any).plan = dbUser.plan || 'FREE';
          (token as any).username = dbUser.username ?? null;
          (token as any).onboardingCompleted = dbUser.onboardingCompleted ?? false;
          (token as any).entriesCount = dbUser.entriesCount || 0;
          (token as any).personalCollectionsCount = dbUser.personalCollectionsCount || 0;
          (token as any).isAdmin = isAdminUser(dbUser.id);
        }
      } else if (user?.id) {
        (token as any).userId = user.id;
        try {
          const dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: user.id },
            select: {
              plan: true,
              username: true,
              emailVerified: true,
              onboardingCompleted: true,
              entriesCount: true,
              personalCollectionsCount: true
            }
          }));
          if (dbUser) {
            (token as any).plan = dbUser.plan || 'FREE';
            (token as any).username = (dbUser as any).username ?? null;
            (token as any).emailVerified = dbUser.emailVerified;
            (token as any).onboardingCompleted = dbUser.onboardingCompleted ?? false;
            (token as any).entriesCount = dbUser.entriesCount || 0;
            (token as any).personalCollectionsCount = dbUser.personalCollectionsCount || 0;
            (token as any).isAdmin = isAdminUser(user.id);
          }
        } catch (error) {
          console.error('Error fetching user plan:', error);
          (token as any).plan = 'FREE';
          (token as any).isAdmin = isAdminUser(user.id);
        }
      }
      // Re-fetch data when session is updated (trigger === 'update')
      if (trigger === 'update' && (token as any).userId) {
        try {
          const dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: (token as any).userId },
            select: {
              username: true,
              plan: true,
              emailVerified: true,
              onboardingCompleted: true,
              entriesCount: true,
              personalCollectionsCount: true
            }
          }));
          if (dbUser) {
            (token as any).username = (dbUser as any).username ?? null;
            (token as any).plan = dbUser.plan || 'FREE';
            (token as any).emailVerified = dbUser.emailVerified;
            (token as any).onboardingCompleted = dbUser.onboardingCompleted ?? false;
            (token as any).entriesCount = dbUser.entriesCount || 0;
            (token as any).personalCollectionsCount = dbUser.personalCollectionsCount || 0;
            (token as any).isAdmin = isAdminUser((token as any).userId);
          }
        } catch { }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof (token as any).userId === "string") {
        // Fetch fresh data from database on every session check
        try {
          const dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: (token as any).userId },
            select: {
              plan: true,
              subscriptionStatus: true,
              subscriptionEndsAt: true,
              onboardingCompleted: true,
              onboardingCompletedAt: true,
              entriesCount: true,
              personalCollectionsCount: true,
              timezone: true // Include timezone in session
            }
          }));

          if (dbUser) {
            // Server-side expiry check as safety net for missed webhook events
            if (
              dbUser.plan === 'PRO' &&
              dbUser.subscriptionEndsAt &&
              dbUser.subscriptionEndsAt < new Date() &&
              dbUser.subscriptionStatus !== 'active'
            ) {
              // Downgrade expired user to FREE
              await withRetry(() => prisma.user.update({
                where: { id: (token as any).userId },
                data: { plan: 'FREE' }
              }));
              dbUser.plan = 'FREE';
            }

            (session.user as any).id = (token as any).userId;
            (session.user as any).plan = dbUser.plan || 'FREE';
            (session.user as any).subscriptionStatus = dbUser.subscriptionStatus;
            (session.user as any).subscriptionEndsAt = dbUser.subscriptionEndsAt;
            (session.user as any).emailVerified = (token as any).emailVerified;
            (session.user as any).username = (token as any).username || null;
            (session.user as any).onboardingCompleted = dbUser.onboardingCompleted ?? false;
            (session.user as any).onboardingCompletedAt = dbUser.onboardingCompletedAt ?? null;
            (session.user as any).entriesCount = dbUser.entriesCount || 0;
            (session.user as any).personalCollectionsCount = dbUser.personalCollectionsCount || 0;
            (session.user as any).timezone = dbUser.timezone ?? 'UTC'; // Default to 'UTC' if timezone is not set
            (session.user as any).isAdmin = isAdminUser((token as any).userId);
          } else {
            // Fallback to token data if user not found
            (session.user as any).id = (token as any).userId;
            (session.user as any).plan = (token as any).plan || 'FREE';
            (session.user as any).emailVerified = (token as any).emailVerified;
            (session.user as any).username = (token as any).username || null;
            (session.user as any).onboardingCompleted = (token as any).onboardingCompleted ?? false;
            (session.user as any).onboardingCompletedAt = null;
            (session.user as any).entriesCount = (token as any).entriesCount || 0;
            (session.user as any).personalCollectionsCount = (token as any).personalCollectionsCount || 0;
            (session.user as any).timezone = 'UTC'; // Default to 'UTC' if user is not found in DB
            (session.user as any).isAdmin = isAdminUser((token as any).userId);
          }
        } catch (error) {
          console.error('Error fetching fresh session data:', error);
          // Fallback to token data
          (session.user as any).id = (token as any).userId;
          (session.user as any).plan = (token as any).plan || 'FREE';
          (session.user as any).emailVerified = (token as any).emailVerified;
          (session.user as any).username = (token as any).username || null;
          (session.user as any).onboardingCompleted = (token as any).onboardingCompleted ?? false;
          (session.user as any).onboardingCompletedAt = null;
          (session.user as any).entriesCount = (token as any).entriesCount || 0;
          (session.user as any).personalCollectionsCount = (token as any).personalCollectionsCount || 0;
          (session.user as any).timezone = 'UTC'; // Default to 'UTC' on error
          (session.user as any).isAdmin = isAdminUser((token as any).userId);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // refresh session token every 24h
  },
  secret: process.env.NEXTAUTH_SECRET,
};
