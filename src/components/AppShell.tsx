"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountHoverMenu } from "@/components/AccountHoverMenu";
import TemporaryUsernameBanner from "@/components/TemporaryUsernameBanner";
import { Activity, Users } from "lucide-react";

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [pendingCount, setPendingCount] = useState(0);
  const [emailVerified, setEmailVerified] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [unreadSignalCount, setUnreadSignalCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    fetch('/api/user/email-status')
      .then((r) => r.json())
      .then((d) => setEmailVerified(d.emailVerified ?? true))
      .catch(() => { });
  }, [session]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResendMessage('Verification email sent.');
      } else {
        setResendMessage(data.error || 'Could not send email.');
      }
    } catch {
      setResendMessage('Could not send email.');
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    const fetchPending = async () => {
      try {
        const [connRes, sharedRes, feedRes] = await Promise.all([
          fetch('/api/connections'),
          fetch('/api/entries/shared'),
          fetch('/api/feed?limit=1')
        ]);
        let count = 0;
        if (connRes.ok) {
          const d = await connRes.json();
          count += (d.pending_received || []).length;
        }
        if (sharedRes.ok) {
          const d = await sharedRes.json();
          count += (d.received || []).filter((e: any) => e.status === 'PENDING').length;
        }
        if (feedRes.ok) {
          const d = await feedRes.json();
          setUnreadSignalCount(d.unreadCount || 0);
        }
        setPendingCount(count);
      } catch { }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <TemporaryUsernameBanner />
      {session && !emailVerified && !bannerDismissed && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2.5 text-sm text-yellow-300 flex items-center justify-between gap-4 flex-wrap">
          <span>
            Please verify your email address. Check your inbox or{" "}
            {resendMessage ? (
              <span className="text-yellow-200">{resendMessage}</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="underline hover:text-yellow-100 disabled:opacity-50 transition-colors"
              >
                {resendLoading ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-yellow-400 hover:text-yellow-200 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      <header
        className={`sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)/60]`}
      >
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
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-1.5 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                  aria-current={pathname === "/feed" ? "page" : undefined}
                >
                  <Activity className="w-4 h-4" />
                  feed
                  {unreadSignalCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-bold">
                      {unreadSignalCount > 9 ? '9+' : unreadSignalCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/connections"
                  className="inline-flex items-center gap-1.5 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                  aria-current={pathname === "/connections" ? "page" : undefined}
                >
                  <Users className="w-4 h-4" />
                  connections
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-bold">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
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
