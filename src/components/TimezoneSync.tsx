"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function TimezoneSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const storedTimezone = session.user.timezone;

    // Only update if different and detected timezone is valid
    if (detectedTimezone && detectedTimezone !== storedTimezone) {
      fetch("/api/user/timezone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: detectedTimezone }),
      }).catch(console.error);
      // Fire and forget — do not block or show UI for this
    }
  }, [session?.user?.id]); // only run when user changes, not on every render

  return null; // renders nothing
}