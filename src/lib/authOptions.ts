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
        const saltRounds = 10;

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
            },
          }));

          // Send verification email asynchronously — do not block sign-up
          (async () => {
            try {
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
      if (account?.provider === "google") {
        const email = (profile?.email ?? token.email) as string | undefined;
        if (email && typeof (token as any).userId !== "string") {
          // Upsert so creation and read are atomic — avoids race with signIn callback
          const dbUser = await withRetry(() => prisma.user.upsert({
            where: { email },
            update: { name: (profile?.name ?? token.name ?? undefined) as string | undefined },
            create: { email, name: (profile?.name ?? token.name ?? null) as string | null },
          })) as any;
          (token as any).userId = dbUser.id;
          (token as any).plan = dbUser.plan || 'FREE';
          (token as any).username = dbUser.username ?? null;
        }
      } else if (user?.id) {
        (token as any).userId = user.id;
        try {
          const dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: user.id },
            select: { plan: true, username: true, emailVerified: true }
          }));
          if (dbUser) {
            (token as any).plan = dbUser.plan || 'FREE';
            (token as any).username = (dbUser as any).username ?? null;
            (token as any).emailVerified = dbUser.emailVerified;
          }
        } catch (error) {
          console.error('Error fetching user plan:', error);
          (token as any).plan = 'FREE';
        }
      }
      // Re-fetch username when session is updated (e.g. after /setup-username)
      if (trigger === 'update' && (token as any).userId) {
        try {
          const dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: (token as any).userId },
            select: { username: true, plan: true, emailVerified: true }
          }));
          if (dbUser) {
            (token as any).username = (dbUser as any).username ?? null;
            (token as any).plan = dbUser.plan || 'FREE';
            (token as any).emailVerified = dbUser.emailVerified;
          }
        } catch { }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof (token as any).userId === "string") {
        (session.user as any).id = (token as any).userId;
        (session.user as any).plan = (token as any).plan || 'FREE';
        (session.user as any).emailVerified = (token as any).emailVerified;
        (session.user as any).username = (token as any).username || null;
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
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: false, // IMPORTANT: Allow JavaScript access for Chrome extension
        sameSite: 'lax', // Allow cross-site access
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL?.includes('usecorpus.app') ? 'usecorpus.app' : 'corpus-lemon.vercel.app'
          : 'localhost'
      }
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL?.includes('usecorpus.app') ? 'usecorpus.app' : 'corpus-lemon.vercel.app'
          : 'localhost'
      }
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL?.includes('usecorpus.app') ? 'usecorpus.app' : 'corpus-lemon.vercel.app'
          : 'localhost'
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
