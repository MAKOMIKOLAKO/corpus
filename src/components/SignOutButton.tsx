"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className || "inline-flex items-center text-sm font-medium leading-none text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors ml-2"}
    >
      Sign Out
    </button>
  );
}
