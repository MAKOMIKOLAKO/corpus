import type { Metadata } from "next";
import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { AppShell } from "@/components/AppShell";
import { TimezoneSync } from "@/components/TimezoneSync";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL('https://usecorpus.app'),
  title: {
    default: 'Corpus — Personal Knowledge Indexing for Researchers',
    template: '%s | Corpus'
  },
  description: 'Corpus is a personal knowledge management system for researchers, academics, and students. Save research papers by DOI, articles by URL, and books by ISBN. Automatically organized with AI keyword extraction and a semantic knowledge graph.',
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
    'research reading tracker'
  ],
  authors: [{ name: 'Corpus' }],
  creator: 'Corpus',
  verification: {
    google: 'PASTE_YOUR_VERIFICATION_CODE_HERE'
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
    <html lang="en" className={cn("font-sans scroll-smooth", inter.variable, playfair.variable)}>
      <head>
        <ThemeBootstrapScript />
        <ExtensionDetection />
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
