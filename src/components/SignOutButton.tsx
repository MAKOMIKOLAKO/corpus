"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors ml-2"
    >
      Sign Out
    </button>
  );
}
