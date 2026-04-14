"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2 text-center">
          Reset your password
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-400 text-center">
              If an account exists for that email, a reset link is on its way.
            </div>
            <div className="text-center text-sm text-[var(--muted-foreground)]">
              <Link
                href="/login"
                className="text-[var(--foreground)] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none text-[var(--foreground)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent disabled:opacity-50"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="text-sm font-medium text-red-500 bg-red-50/10 border border-red-500/30 rounded-md p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 px-4 mt-1 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center text-sm text-[var(--muted-foreground)]">
              <Link
                href="/login"
                className="text-[var(--foreground)] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
