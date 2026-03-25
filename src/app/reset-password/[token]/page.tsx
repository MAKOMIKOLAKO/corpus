"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type TokenState = "loading" | "valid" | "invalid" | "expired";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [tokenState, setTokenState] = useState<TokenState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) setTokenState("valid");
        else if (data.expired) setTokenState("expired");
        else setTokenState("invalid");
      })
      .catch(() => setTokenState("invalid"));
  }, [token]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push("/login"), 2000);
      return () => clearTimeout(t);
    }
  }, [success, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
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
        {tokenState === "loading" && (
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Validating link…
          </p>
        )}

        {(tokenState === "invalid" || tokenState === "expired") && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Link {tokenState === "expired" ? "expired" : "invalid"}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              This reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm text-[var(--foreground)] hover:underline"
            >
              Request a new reset link →
            </Link>
          </div>
        )}

        {tokenState === "valid" && !success && (
          <>
            <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2 text-center">
              Set new password
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none text-[var(--foreground)]"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent disabled:opacity-50"
                  placeholder="New password"
                  autoComplete="new-password"
                />
                <p className="text-xs text-[var(--muted-foreground)]">Minimum 8 characters</p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm"
                  className="text-sm font-medium leading-none text-[var(--foreground)]"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent disabled:opacity-50"
                  placeholder="Confirm password"
                  autoComplete="new-password"
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
                {loading ? "Saving…" : "Set New Password"}
              </button>
            </form>
          </>
        )}

        {success && (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-400">
              Password updated successfully. Redirecting to sign in…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
