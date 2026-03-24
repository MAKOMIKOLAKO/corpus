"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, SyntheticEvent } from "react";

export default function SignupForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/library";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      name,
      callbackUrl,
      redirect: false,
    });
    if (result?.error) {
      console.error("Signup error:", result.error);
    } else {
      window.location.href = callbackUrl;
    }
    setLoading(false);
  };

  const errorMessage = error
    ? "An error occurred during sign up"
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
          <label className="text-sm font-medium leading-none text-[var(--foreground)]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
            placeholder="Enter email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-[var(--foreground)]">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
            placeholder="Enter name"
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
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <a href="/login" className="text-[var(--foreground)] hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
}
