"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountHoverMenu } from "@/components/AccountHoverMenu";

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-50" role="banner">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={session ? "/library" : "/"}
            className="text-xl font-medium tracking-tight text-[var(--foreground)] flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
            aria-label="Corpus - Go to homepage"
          >
            corpus
          </Link>
          <nav className="flex items-center gap-4" role="navigation" aria-label="Main navigation">
            {session ? (
              <>
                <Link
                  href="/library"
                  className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                  aria-current={pathname === "/library" ? "page" : undefined}
                >
                  library
                </Link>
                <Link
                  href="/collections"
                  className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                  aria-current={pathname === "/collections" ? "page" : undefined}
                >
                  collections
                </Link>
                {false && (
                  <Link
                    href="/graph"
                    className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                    aria-current={pathname === "/graph" ? "page" : undefined}
                  >
                    graph
                  </Link>
                )}
                <Link
                  href="/add"
                  className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                  aria-current={pathname === "/add" ? "page" : undefined}
                >
                  add entry
                </Link>
                <div className="h-4 w-px shrink-0 bg-[var(--border)] mx-2" aria-hidden="true" />
                <AccountHoverMenu
                  displayName={session.user?.name || session.user?.email || "Account"}
                />
                <SignOutButton />
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 py-12"
        role="main"
        tabIndex={-1}
      >
        {children}
      </main>
    </>
  );
}
