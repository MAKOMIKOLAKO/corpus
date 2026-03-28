"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountHoverMenu } from "@/components/AccountHoverMenu";
import TemporaryUsernameBanner from "@/components/TemporaryUsernameBanner";
import { OnboardingTour } from "@/components/OnboardingTour";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Users, BookOpen, Folder, MessageSquare, HelpCircle, Plus } from "lucide-react";

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

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
        const [connRes, sharedRes, onboardingRes] = await Promise.all([
          fetch('/api/connections'),
          fetch('/api/entries/shared'),
          fetch('/api/user/onboarding-status')
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
        if (onboardingRes.ok) {
          const d = await onboardingRes.json();
          setOnboardingCompleted(d.onboardingCompleted);
          if (!d.onboardingCompleted && session.user?.id) {
            // Check if this is the first session by checking if user has any entries
            const entriesRes = await fetch('/api/entries');
            if (entriesRes.ok) {
              const entriesData = await entriesRes.json();
              if (!entriesData.entries || entriesData.entries.length === 0) {
                setShowOnboarding(true);
              }
            }
          }
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
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between" style={{ minHeight: '41px' }}>
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
              <nav className="flex items-center gap-2 ml-8" role="navigation" aria-label="Main navigation">
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
                      data-onboarding="library-view"
                    >
                      <BookOpen className="w-4 h-4" />
                      library
                    </Link>
                    <Link
                      href="/collections"
                      className="inline-flex items-center gap-2 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      aria-current={pathname === "/collections" ? "page" : undefined}
                      data-onboarding="collections"
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
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium leading-none hover:text-[var(--primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                      title="Start guided tour"
                      style={{ visibility: onboardingCompleted ? 'hidden' : 'visible' }}
                    >
                      <HelpCircle className="w-4 h-4" />
                      tour
                    </button>
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
      )}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCompleted={() => setOnboardingCompleted(true)}
      />
      <FeedbackModal
        trigger={null}
        open={showFeedback}
        onOpenChange={setShowFeedback}
      />
    </>
  );
}
