"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountHoverMenu } from "@/components/AccountHoverMenu";
import TemporaryUsernameBanner from "@/components/TemporaryUsernameBanner";
import { BookOpen, Compass, Folder, Plus, Shield } from "lucide-react";

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isOnboarding = pathname === "/onboarding";
  const sessionUser = session?.user as (Session["user"] & { isAdmin?: boolean }) | undefined;
  const isAdmin = Boolean(sessionUser?.isAdmin);
  const [emailVerified, setEmailVerified] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const desktopNavLinkClassName =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-sans font-medium leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring";
  const desktopNavLinkActiveClassName =
    "bg-terracotta text-white shadow-[var(--terracotta)_0px_0px_0px_0px,var(--terracotta)_0px_0px_0px_1px]";
  const desktopNavLinkInactiveClassName =
    "text-content-secondary hover:text-content-primary hover:bg-warm-sand";
  const mobileNavLinkClassName =
    "flex items-center gap-3 rounded-lg px-4 h-12 text-[15px] font-sans font-medium transition-colors";

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


  return (
    <>
      {isLanding || isOnboarding ? (
        <>
          {isLanding && session && !emailVerified && !bannerDismissed && (
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
            className={`sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}
            style={{ minHeight: '73px' }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center" style={{ minHeight: '41px' }}>
              <Link
                href={session ? "/library" : "/"}
                className="text-xl font-serif font-medium tracking-tight text-content-primary flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring rounded-md px-2 py-1"
                aria-label="Corpus - Go to homepage"
              >
                corpus
                <span className="text-xs font-sans font-normal text-content-tertiary bg-surface-raised px-1.5 py-0.5 rounded-sm border border-border/50">
                  beta
                </span>
              </Link>
              <div className="flex-1" />

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1.5 lg:gap-2" role="navigation" aria-label="Main navigation">
                {session ? (
                  <>
                    <Link
                      href="/add"
                      className={`${desktopNavLinkClassName} ${pathname === "/add" ? desktopNavLinkActiveClassName : desktopNavLinkInactiveClassName}`}
                      aria-current={pathname === "/add" ? "page" : undefined}
                    >
                      <Plus className="w-4 h-4" />
                      add
                    </Link>
                    <Link
                      href="/library"
                      className={`${desktopNavLinkClassName} ${pathname === "/library" ? desktopNavLinkActiveClassName : desktopNavLinkInactiveClassName}`}
                      aria-current={pathname === "/library" ? "page" : undefined}
                    >
                      <BookOpen className="w-4 h-4" />
                      library
                    </Link>
                    <Link
                      href="/collections"
                      className={`${desktopNavLinkClassName} ${pathname === "/collections" ? desktopNavLinkActiveClassName : desktopNavLinkInactiveClassName}`}
                      aria-current={pathname === "/collections" ? "page" : undefined}
                    >
                      <Folder className="w-4 h-4" />
                      collections
                    </Link>
                    <Link
                      href="/discover"
                      className={`${desktopNavLinkClassName} ${pathname === "/discover" ? desktopNavLinkActiveClassName : desktopNavLinkInactiveClassName}`}
                      aria-current={pathname === "/discover" ? "page" : undefined}
                    >
                      <Compass className="w-4 h-4" />
                      discover
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className={`${desktopNavLinkClassName} ${pathname?.startsWith("/admin") ? "bg-red-500/15 text-red-300 shadow-[rgba(239,68,68,0.35)_0px_0px_0px_1px]" : "text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"}`}
                        aria-current={pathname?.startsWith("/admin") ? "page" : undefined}
                      >
                        <Shield className="w-4 h-4" />
                        admin
                      </Link>
                    )}
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
                  className="md:hidden flex items-center justify-center rounded-lg p-2 text-content-primary transition-colors hover:bg-warm-sand focus:outline-none focus:ring-2 focus:ring-ring"
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
              <div className="md:hidden border-t border-border bg-background/95 backdrop-blur animate-in slide-in-from-top duration-300">
                <nav className="flex flex-col p-4 space-y-2">
                  <Link
                    href="/add"
                    className={`${mobileNavLinkClassName} ${pathname === "/add" ? desktopNavLinkActiveClassName : "text-content-secondary hover:bg-warm-sand hover:text-content-primary"}`}
                  >
                    <Plus className="w-5 h-5" />
                    add
                  </Link>
                  <Link
                    href="/library"
                    className={`${mobileNavLinkClassName} ${pathname === "/library" ? desktopNavLinkActiveClassName : "text-content-secondary hover:bg-warm-sand hover:text-content-primary"}`}
                  >
                    <BookOpen className="w-5 h-5" />
                    library
                  </Link>
                  <Link
                    href="/collections"
                    className={`${mobileNavLinkClassName} ${pathname === "/collections" ? desktopNavLinkActiveClassName : "text-content-secondary hover:bg-warm-sand hover:text-content-primary"}`}
                  >
                    <Folder className="w-5 h-5" />
                    collections
                  </Link>
                  <Link
                    href="/discover"
                    className={`${mobileNavLinkClassName} ${pathname === "/discover" ? desktopNavLinkActiveClassName : "text-content-secondary hover:bg-warm-sand hover:text-content-primary"}`}
                  >
                    <Compass className="w-5 h-5" />
                    discover
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={`${mobileNavLinkClassName} ${pathname?.startsWith("/admin") ? "bg-red-500/15 text-red-300 shadow-[rgba(239,68,68,0.35)_0px_0px_0px_1px]" : "text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"}`}
                    >
                      <Shield className="w-5 h-5" />
                      admin
                    </Link>
                  )}
                  <div className="my-2 h-px bg-border" />
                  <div className="px-4 py-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12px] text-content-tertiary">Account</p>
                    <Link
                      href="/account/settings"
                      className="flex h-12 items-center gap-3 rounded-lg border border-border px-4 text-[15px] font-sans font-medium text-content-secondary transition-colors hover:bg-warm-sand hover:text-content-primary"
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
            className="max-w-5xl mx-auto px-4 py-6 sm:py-12"
            role="main"
            tabIndex={-1}
          >
            {children}
          </main>
        </>
      )}
    </>
  );
}
