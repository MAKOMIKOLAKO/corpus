import { Suspense } from "react";
import SignupForm from "./SignupForm";
import { Metadata } from "next";
import AuthRedirect from "@/components/AuthRedirect";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return (
    <>
      <Suspense fallback={<div className="text-center text-sm text-[var(--muted-foreground)]">Loading...</div>}>
        <AuthRedirect />
      </Suspense>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6 text-center">Sign Up</h1>
          <Suspense fallback={<div className="text-center text-sm text-[var(--muted-foreground)]">Loading...</div>}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
