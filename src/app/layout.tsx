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
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://corpus-lemon.vercel.app'),
  title: {
    default: 'Corpus — Personal Knowledge Indexing for Researchers',
    template: '%s | Corpus'
  },
  description: 'Corpus indexes everything you read — papers, articles, books, essays — and automatically extracts its ideas that matter. Built for researchers, academics, and students.',
  keywords: ['knowledge management', 'research tool', 'academic reading', 'paper organizer', 'personal library', 'knowledge graph', 'research notes', 'DOI lookup', 'citation manager'],
  authors: [{ name: 'Corpus' }],
  creator: 'Corpus',
  verification: {
    google: 'iYNYU8hznL0W3Xoiyix9ij1eN_tSPbtKQ7YjezmLE4k'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Corpus',
    title: 'Corpus — Personal Knowledge Indexing for Researchers',
    description: 'Index everything you read. Automatically organized, instantly searchable.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Corpus — Personal Knowledge Indexing'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Corpus — Personal Knowledge Indexing for Researchers',
    description: 'Index everything you read. Automatically organized, instantly searchable.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// Extension detection component
function ExtensionDetection() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const fromExtension = urlParams.get('from_extension');
            
            if (fromExtension === 'true') {
              console.log('User arrived from Chrome extension');
              localStorage.setItem('from_extension', 'true');
              
              // Optionally show a welcome message or trigger extension-specific UI
              window.dispatchEvent(new CustomEvent('fromExtension', { 
                detail: { fromExtension: true } 
              }));
            }
          })();
        `,
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={cn("font-sans scroll-smooth", inter.variable)}>
      <head>
        <ExtensionDetection />
      </head>
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)] theme-transition">
        <NextAuthProvider>
          <AppShell session={session}>{children}</AppShell>
        </NextAuthProvider>
      </body>
    </html>
  );
}
