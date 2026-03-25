"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, SyntheticEvent } from "react";
import Link from "next/link";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/library";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", {
      email,
      password,
      callbackUrl,
    });
    setLoading(false);
  };

  const errorMessage = error === "CredentialsSignin" || error === "CredentialsSignin" || error === "Credentials"
    ? "Invalid email or password"
    : error === "UnauthorizedAccount" || error === "AccessDenied"
      ? "Unauthorized account"
      : error
        ? "An error occurred during sign in"
        : null;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full h-10 px-4 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
        aria-describedby="signin-description"
      >
        Continue with Google
      </button>

      <div className="relative" role="separator" aria-orientation="horizontal">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border)]" aria-hidden="true" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
            placeholder="Enter email"
            autoComplete="email"
            aria-describedby={errorMessage ? "error-message" : undefined}
            aria-invalid={errorMessage ? "true" : "false"}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none text-[var(--foreground)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent disabled:opacity-50"
            placeholder="Enter password"
            autoComplete="current-password"
            aria-describedby={errorMessage ? "error-message" : undefined}
            aria-invalid={errorMessage ? "true" : "false"}
          />
        </div>

        {errorMessage && (
          <div
            id="error-message"
            className="text-sm font-medium text-red-500 bg-red-50 border border-red-200 rounded-md p-3"
            role="alert"
            aria-live="polite"
          >
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 px-4 mt-2 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          aria-describedby="signin-description"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="text-center text-sm text-[var(--muted-foreground)]">
        No account?{" "}
        <Link
          href="/signup"
          className="text-[var(--foreground)] hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
        >
          Sign up
        </Link>
      </div>

      <div id="signin-description" className="sr-only">
        Sign in to your Corpus account to access your personal knowledge library
      </div>
    </div>
  );
}
