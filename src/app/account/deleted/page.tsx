import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountDeletedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <CheckCircle className="w-10 h-10 mx-auto text-accent" />
        <h1 className="text-2xl font-serif font-medium tracking-tight">account deleted</h1>
        <p className="text-sm text-muted-foreground">
          Your account and all associated data have been permanently deleted.
        </p>
        <Link href="/" className="inline-block text-sm underline text-muted-foreground hover:text-foreground">
          Return home
        </Link>
      </div>
    </div>
  );
}
