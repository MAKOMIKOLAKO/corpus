"use client";

import { useSession } from "next-auth/react";

export function useTimezone(): string {
  const { data: session } = useSession();
  return (
    (session?.user as any)?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC"
  );
}