import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import AuthRedirect from "@/components/AuthRedirect";

export const metadata: Metadata = {
  title: 'Sign In',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={<div className="text-center text-sm text-[var(--muted-foreground)]">Loading...</div>}>
        <AuthRedirect />
      </Suspense>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-serif font-medium text-[var(--foreground)] mb-6 text-center">Sign In</h1>
          <Suspense fallback={<div className="text-center text-sm text-[var(--muted-foreground)]">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
