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
      <span
        className="text-sm font-medium text-[var(--muted-foreground)] truncate max-w-[150px] cursor-default"
        title={displayName}
      >
        {displayName}
      </span>
    </div>
  );
}
