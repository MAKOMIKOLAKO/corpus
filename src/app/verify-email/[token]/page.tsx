"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<VerifyState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMsg("Invalid verification link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setState("success");
        } else {
          setState("error");
          setErrorMsg(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setState("error");
        setErrorMsg("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md rounded-xl p-6 shadow-sm text-center space-y-4">
        {state === "loading" && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Verifying your email…
          </p>
        )}

        {state === "success" && (
          <>
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-400">
              Email verified! Your Corpus account is active.
            </div>
            <Link
              href="/library"
              className="inline-block text-sm text-[var(--foreground)] hover:underline"
            >
              Go to your library →
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Verification failed
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {errorMsg}
            </p>
            <Link
              href="/login"
              className="inline-block text-sm text-[var(--foreground)] hover:underline"
            >
              Back to sign in →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
