import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { SignOutButton } from "@/components/SignOutButton";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
        <html lang="en" className={cn("font-sans", inter.variable)}>
            <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)] theme-transition">
                <NextAuthProvider>
                    <header className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-50">
                        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                            <Link href="/" className="text-xl font-medium tracking-tight text-[var(--foreground)] flex items-center gap-2 hover:opacity-80 transition-opacity">
                                corpus
                            </Link>
                            <nav className="flex items-center gap-4">
                                {session ? (
                                    <>
                                        <Link href="/" className="text-sm font-medium hover:text-[var(--primary)] transition-colors">library</Link>
                                        <Link href="/collections" className="text-sm font-medium hover:text-[var(--primary)] transition-colors">collections</Link>
                                        <Link href="/add" className="text-sm font-medium hover:text-[var(--primary)] transition-colors">add entry</Link>
                                        <div className="w-px h-4 bg-[var(--border)] mx-2 shrink-0" />
                                        <span className="text-sm text-[var(--muted-foreground)] truncate max-w-[150px]" title={session.user?.name || session.user?.email || ""}>
                                            {session.user?.name || session.user?.email}
                                        </span>
                                        <SignOutButton />
                                    </>
                                ) : null}
                            </nav>
                        </div>
                    </header>
                    <main className="max-w-4xl mx-auto px-4 py-12">
                        {children}
                    </main>
                </NextAuthProvider>
            </body>
        </html>
    );
}
