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
      <header className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={session ? "/library" : "/"}
            className="text-xl font-medium tracking-tight text-[var(--foreground)] flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            corpus
          </Link>
          <nav className="flex items-center gap-4">
            {session ? (
              <>
                <Link
                  href="/library"
                  className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors"
                >
                  library
                </Link>
                <Link
                  href="/collections"
                  className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors"
                >
                  collections
                </Link>
                <Link
                  href="/add"
                  className="inline-flex items-center text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors"
                >
                  add entry
                </Link>
                <div className="h-4 w-px shrink-0 bg-[var(--border)] mx-2" aria-hidden />
                <AccountHoverMenu
                  displayName={session.user?.name || session.user?.email || "Account"}
                />
                <SignOutButton />
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">{children}</main>
    </>
  );
}
