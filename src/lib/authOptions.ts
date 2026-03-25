/**
 * Google OAuth Setup Instructions:
 * 1. Go to console.cloud.google.com
 * 2. Create a new project
 * 3. Enable the Google+ API
 * 4. Create OAuth credentials (Web application type)
 * 5. Add http://localhost:3000/api/auth/callback/google as an authorized redirect URI for development
 * 6. Add https://your-vercel-url/api/auth/callback/google for production
 * 7. Copy the client ID and secret into GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
 */

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, withRetry } from "@/lib/prismaWithRetry";

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
          return { id: user.id, name: user.name, email: user.email };
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email;
        if (!email) return false;

        // Allow any Google user; create/update their User record
        await withRetry(() => prisma.user.upsert({
          where: { email },
          update: {
            name: profile?.name,
          },
          create: {
            email,
            name: profile?.name,
          },
        }));

        return true;
      }
      return true;
    },
    async jwt({ token, account, profile, user, trigger }) {
      if (account?.provider === "google") {
        const email = profile?.email ?? token.email;
        if (email && typeof (token as any).userId !== "string") {
          const dbUser = await withRetry(() => prisma.user.findUnique({ where: { email } }));
          if (dbUser) {
            (token as any).userId = dbUser.id;
            (token as any).plan = dbUser.plan || 'FREE';
            (token as any).username = dbUser.username ?? null;
          }
        }
      } else if (user?.id) {
        (token as any).userId = user.id;
        try {
          const dbUser = await withRetry(() => prisma.user.findUnique({
            where: { id: user.id },
            select: { plan: true, username: true }
          }));
          if (dbUser) {
            (token as any).plan = dbUser.plan || 'FREE';
            (token as any).username = (dbUser as any).username ?? null;
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
            select: { username: true, plan: true }
          }));
          if (dbUser) {
            (token as any).username = (dbUser as any).username ?? null;
            (token as any).plan = dbUser.plan || 'FREE';
          }
        } catch { }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof (token as any).userId === "string") {
        (session.user as any).id = (token as any).userId;
        (session.user as any).plan = (token as any).plan || 'FREE';
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
          ? 'corpus-lemon.vercel.app'
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
          ? 'corpus-lemon.vercel.app'
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
          ? 'corpus-lemon.vercel.app'
          : 'localhost'
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
