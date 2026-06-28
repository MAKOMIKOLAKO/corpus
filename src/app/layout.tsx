import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { AppShell } from "@/components/AppShell";
import { TimezoneSync } from "@/components/TimezoneSync";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL('https://usecorpus.app'),
  title: {
    default: 'Corpus — Collaborative Research Platform for Academics',
    template: '%s | Corpus'
  },
  description: 'Corpus automatically tracks new research papers from your favorite journals. Get a daily feed with summaries so you never miss important research in your field.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f4ed' },
    { media: '(prefers-color-scheme: dark)', color: '#141413' },
  ],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any' },
      { url: '/icons/icon.png', sizes: 'any' }
    ],
    shortcut: '/favicon.png',
    apple: [
      { url: '/favicon.png', sizes: 'any' }
    ],
  },
  keywords: [
    'knowledge management',
    'personal knowledge base',
    'research paper organizer',
    'academic reading list',
    'DOI lookup tool',
    'research management tool',
    'Zotero alternative',
    'Mendeley alternative',
    'Readwise alternative',
    'read it later app',
    'research notes app',
    'knowledge graph tool',
    'citation manager',
    'paper organizer',
    'academic tool',
    'research workflow',
    'personal library app',
    'article organizer',
    'bookmark manager for researchers',
    'PKM tool',
    'personal knowledge management',
    'save research papers',
    'organize articles',
    'knowledge base software',
    'research reading tracker',
    'collaborative research',
    'citation generator',
    'academic reference manager',
    'arXiv'
  ],
  authors: [{ name: 'Corpus', url: 'https://usecorpus.app' }],
  creator: 'Corpus',
  category: 'productivity',
  // Google Search Console verification: Add verification code here when available
  // verification: { google: 'YOUR_VERIFICATION_CODE' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Corpus',
    title: 'Corpus — Collaborative Research Platform for Academics',
    description: 'Corpus automatically tracks new research papers from your favorite journals. Get a daily feed with summaries so you never miss important research in your field.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Corpus — Collaborative Research Platform'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Corpus — Collaborative Research Platform for Academics',
    description: 'Corpus automatically tracks new research papers from your favorite journals. Get a daily feed with summaries so you never miss important research in your field.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://usecorpus.app',
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

function ThemeBootstrapScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var theme = localStorage.getItem('corpus-theme');
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.add('light');
              }
            } catch (e) {
              document.documentElement.classList.add('light');
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <ThemeBootstrapScript />
      </head>
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)] theme-transition">
        <ThemeProvider>
          <NextAuthProvider>
            <AppShell session={session}>
              <SkipToMainLink />
              {children}
            </AppShell>
          </NextAuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

// Skip navigation component for accessibility
function SkipToMainLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 rounded-md font-medium z-50 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
