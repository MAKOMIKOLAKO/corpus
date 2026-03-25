"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthRedirectProps {
  redirectTo?: string;
  requireAuth?: boolean;
}

export default function AuthRedirect({ 
  redirectTo = "/library", 
  requireAuth = false 
}: AuthRedirectProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading, don't do anything yet

    if (requireAuth && status === "unauthenticated") {
      // Page requires authentication but user is not logged in
      router.replace("/login");
    } else if (!requireAuth && status === "authenticated" && session) {
      // Page is for unauthenticated users but user is logged in
      router.replace(redirectTo);
    }
  }, [session, status, router, redirectTo, requireAuth]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center text-sm text-[var(--muted-foreground)]">Checking authentication...</div>
      </div>
    );
  }

  return null;
}
