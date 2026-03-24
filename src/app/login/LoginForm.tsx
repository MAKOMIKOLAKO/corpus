"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, SyntheticEvent } from "react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", {
      username,
      password,
      callbackUrl,
    });
    setLoading(false);
  };

  const errorMessage = error === "CredentialsSignin" || error === "CredentialsSignin" || error === "Credentials"
    ? "Invalid username or password"
    : error === "UnauthorizedAccount" || error === "AccessDenied"
    ? "Unauthorized account"
    : error
    ? "An error occurred during sign in"
    : null;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full h-10 px-4 rounded-md bg-[var(--foreground)] text-[var(--background)] font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
      >
        Continue with Google
      </button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-[var(--foreground)]">Username</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
            placeholder="Enter username"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-[var(--foreground)]">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
            placeholder="Enter password"
          />
        </div>

        {errorMessage && (
          <div className="text-sm font-medium text-red-500">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 px-4 mt-2 rounded-md bg-[var(--foreground)] text-[var(--background)] font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
