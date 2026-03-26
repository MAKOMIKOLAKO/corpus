'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SetupUsernameClient() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; valid: boolean; message: string } | null>(null);
  const debouncedUsername = useDebounce(username, 400);

  // If user already has username (from session), redirect immediately
  useEffect(() => {
    if (session?.user?.username) {
      router.push('/library');
    }
  }, [session, router]);

  const checkAvailability = useCallback(async (val: string) => {
    if (!val) { setAvailability(null); return; }
    setChecking(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(val)}`);
      const data = await res.json();
      setAvailability(data);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability(debouncedUsername);
  }, [debouncedUsername, checkAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availability?.available) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, bio }),
      });
      if (res.ok) {
        // Update session to get the new username in the token
        await update(true);
        // Use router.push instead of window.location.href to avoid hard redirect
        router.push('/library');
        router.refresh();
      } else if (res.status === 404) {
        await signOut({ callbackUrl: '/signup' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save username');
      }
    } finally {
      setSaving(false);
    }
  };

  const statusColor = availability
    ? availability.available
      ? 'text-green-500'
      : 'text-red-500'
    : 'text-[var(--muted-foreground)]';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-xl p-8 border border-[var(--border)] space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Choose your username</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              This is your public handle on Corpus. You can change it later in settings.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="username">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm select-none">@</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourhandle"
                  maxLength={20}
                  autoComplete="off"
                  className="w-full pl-7 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-xs ${statusColor}`}>
                  {checking ? 'Checking…' : availability?.message ?? '3–20 characters: letters, numbers, underscores'}
                </p>
                <span className="text-xs text-[var(--muted-foreground)]">{username.length}/20</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="bio">Bio <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></label>
              <textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short description about you…"
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <p className="text-xs text-[var(--muted-foreground)] text-right">{bio.length}/160</p>
            </div>

            <button
              type="submit"
              disabled={!availability?.available || saving}
              className="w-full py-2 px-4 rounded-md bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Confirm username'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
