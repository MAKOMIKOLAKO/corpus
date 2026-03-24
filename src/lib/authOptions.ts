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

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        if (
          credentials.username === process.env.ADMIN_USERNAME &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "admin", name: "Admin", email: process.env.ADMIN_USERNAME };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email === process.env.ALLOWED_GOOGLE_EMAIL;
      }
      return true;
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
  secret: process.env.NEXTAUTH_SECRET,
};
