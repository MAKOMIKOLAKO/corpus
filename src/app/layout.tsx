import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "corpus",
  description: "private personal knowledge indexing web app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={cn("font-sans scroll-smooth", inter.variable)}>
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)] theme-transition">
        <NextAuthProvider>
          <AppShell session={session}>{children}</AppShell>
        </NextAuthProvider>
      </body>
    </html>
  );
}
