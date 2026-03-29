"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountHoverMenu } from "@/components/AccountHoverMenu";
import TemporaryUsernameBanner from "@/components/TemporaryUsernameBanner";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Users, BookOpen, Folder, MessageSquare, Plus, Brain, Bell } from "lucide-react";

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
  const [showFeedback, setShowFeedback] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
        const [connRes, sharedRes] = await Promise.all([
          fetch('/api/connections'),
          fetch('/api/entries/shared')
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
        setPendingCount(count);
      } catch { }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <>
      {isLanding ? (
        <>
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
          {children}
        </>
      ) : (
        <>
          {session && <TemporaryUsernameBanner />}
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
            style={{ minHeight: '73px' }}
          >
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center" style={{ minHeight: '41px' }}>
              <Link
                href={session ? "/library" : "/"}
                className="text-xl font-medium tracking-tight text-[var(--foreground)] flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                aria-label="Corpus - Go to homepage"
              >
                corpus
                <span className="text-xs font-normal text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded-sm">
                  beta
                </span>
              </Link>
              <div className="flex-1" />

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-2" role="navigation" aria-label="Main navigation">
                {session ? (
                  <>
                    <Link
                      href="/add"
                      className="inline-flex items-center gap-2 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      aria-current={pathname === "/add" ? "page" : undefined}
                    >
                      <Plus className="w-4 h-4" />
                      add
                    </Link>
                    <Link
                      href="/library"
                      className="inline-flex items-center gap-2 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      aria-current={pathname === "/library" ? "page" : undefined}
                    >
                      <BookOpen className="w-4 h-4" />
                      library
                    </Link>
                    <Link
                      href="/collections"
                      className="inline-flex items-center gap-2 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      aria-current={pathname === "/collections" ? "page" : undefined}
                    >
                      <Folder className="w-4 h-4" />
                      collections
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
                    <Link
                      href="/alerts"
                      className="inline-flex items-center gap-2 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      aria-current={pathname === "/alerts" ? "page" : undefined}
                    >
                      <Brain className="w-4 h-4" />
                      alerts
                    </Link>
                    <Link
                      href="/notifications"
                      className="inline-flex items-center gap-2 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      aria-current={pathname === "/notifications" ? "page" : undefined}
                    >
                      <Bell className="w-4 h-4" />
                      notifications
                    </Link>
                    <div className="h-4 w-px shrink-0 bg-[var(--border)] mx-2" aria-hidden="true" />
                    <button
                      onClick={() => setShowFeedback(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      feedback
                    </button>
                    <AccountHoverMenu
                      displayName={session.user?.name || session.user?.email || "Account"}
                    />
                    <SignOutButton />
                  </>
                ) : null}
              </nav>

              {/* Mobile Hamburger Button */}
              {session && (
                <button
                  className="md:hidden flex items-center justify-center p-2 text-[var(--foreground)] hover:bg-[var(--muted)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-expanded={isMenuOpen}
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? <span className="text-2xl">✕</span> : <span className="text-2xl">☰</span>}
                </button>
              )}
            </div>

            {/* Mobile Navigation Menu */}
            {isMenuOpen && session && (
              <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)]/98 backdrop-blur animate-in slide-in-from-top duration-300">
                <nav className="flex flex-col p-4 space-y-2">
                  <Link
                    href="/add"
                    className={`flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium transition-colors ${pathname === "/add" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"}`}
                  >
                    <Plus className="w-5 h-5" />
                    add
                  </Link>
                  <Link
                    href="/library"
                    className={`flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium transition-colors ${pathname === "/library" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"}`}
                  >
                    <BookOpen className="w-5 h-5" />
                    library
                  </Link>
                  <Link
                    href="/collections"
                    className={`flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium transition-colors ${pathname === "/collections" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"}`}
                  >
                    <Folder className="w-5 h-5" />
                    collections
                  </Link>
                  <Link
                    href="/connections"
                    className={`flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium transition-colors ${pathname === "/connections" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"}`}
                  >
                    <Users className="w-5 h-5" />
                    connections
                    {pendingCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-xs font-bold">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/alerts"
                    className={`flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium transition-colors ${pathname === "/alerts" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"}`}
                  >
                    <Brain className="w-5 h-5" />
                    alerts
                  </Link>
                  <Link
                    href="/notifications"
                    className={`flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium transition-colors ${pathname === "/notifications" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--muted)]"}`}
                  >
                    <Bell className="w-5 h-5" />
                    notifications
                  </Link>
                  <button
                    onClick={() => { setShowFeedback(true); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 h-12 rounded-md text-base font-medium hover:bg-[var(--muted)] transition-colors text-left"
                  >
                    <MessageSquare className="w-5 h-5" />
                    feedback
                  </button>
                  <div className="h-px bg-[var(--border)] my-2" />
                  <div className="px-4 py-2">
                    <p className="text-xs text-[var(--muted-foreground)] mb-2 uppercase tracking-wider font-semibold">Account</p>
                    <Link
                      href="/account/settings"
                      className="flex items-center gap-3 h-12 rounded-md text-base font-medium hover:bg-[var(--muted)] transition-colors border border-[var(--border)] px-4"
                    >
                      Settings
                    </Link>
                  </div>
                  <div className="pt-2">
                    <SignOutButton className="w-full h-12 justify-start px-4 text-base font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors" />
                  </div>
                </nav>
              </div>
            )}
          </header>
          <main
            id="main-content"
            className="max-w-4xl mx-auto px-4 py-6 sm:py-12"
            role="main"
            tabIndex={-1}
          >
            {children}
          </main>
        </>
      )}
      <FeedbackModal
        trigger={null}
        open={showFeedback}
        onOpenChange={setShowFeedback}
      />
    </>
  );
}
