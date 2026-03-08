import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
    title: "Knowledge Indexer",
    description: "Private personal knowledge indexing web app",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={cn("font-sans", geist.variable)}>
            <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)] theme-transition">
                <header className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-50">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <h1 className="text-xl font-medium tracking-tight text-[var(--foreground)] flex items-center gap-2">
                            Knowledge Indexer
                        </h1>
                        <nav className="flex gap-4">
                            <a href="/" className="text-sm font-medium hover:text-[var(--primary)] transition-colors">Library</a>
                            <a href="/add" className="text-sm font-medium hover:text-[var(--primary)] transition-colors">Add Entry</a>
                        </nav>
                    </div>
                </header>
                <main className="max-w-4xl mx-auto px-4 py-12">
                    {children}
                </main>
            </body>
        </html>
    );
}
