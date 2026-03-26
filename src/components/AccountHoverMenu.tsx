"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

type Props = {
  displayName: string;
};

export function AccountHoverMenu({ displayName }: Props) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/account/settings"
        className="p-1.5 rounded-md hover:bg-[var(--accent)] transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]" />
      </Link>
      <div
        tabIndex={0}
        className="relative group inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className="text-sm font-medium text-[var(--muted-foreground)] truncate max-w-[150px] cursor-default rounded px-1.5 py-0.5 transition-colors group-hover:text-[var(--foreground)] group-hover:bg-[var(--accent)]/40"
          title={displayName}
        >
          {displayName}
        </span>
        <div
          className="absolute right-0 top-full z-50 -mt-px opacity-0 invisible pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto"
          role="menu"
          aria-label="Account menu"
        >
          <div className="rounded-md border border-[var(--border)] bg-[var(--card)] shadow-md py-1 min-w-[11rem]">
            <Link
              href="/account/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <Settings className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
