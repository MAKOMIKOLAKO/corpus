'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck, Clock, X, Check, ChevronLeft, Shield } from 'lucide-react';
import Link from 'next/link';

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  plan: string;
  createdAt: string;
  connectionStatus: string | null;
  connectionId: string | null;
  isSentByMe: boolean;
};

export default function ProfilePageClient({
  username,
  currentUserId,
}: {
  username: string;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (res.ok) setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProfile(); }, [username]);

  const sendRequest = async () => {
    if (!profile) return;
    setActing(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: profile.id }),
      });
      if (res.ok) {
        const conn = await res.json();
        setProfile(p => p ? { ...p, connectionStatus: 'PENDING', connectionId: conn.id, isSentByMe: true } : p);
      }
    } finally {
      setActing(false);
    }
  };

  const respond = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!profile?.connectionId) return;
    setActing(true);
    try {
      const res = await fetch(`/api/connections/${profile.connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setProfile(p => p ? { ...p, connectionStatus: status } : p);
    } finally {
      setActing(false);
    }
  };

  const remove = async () => {
    if (!profile?.connectionId || !confirm('Remove this connection?')) return;
    setActing(true);
    try {
      const res = await fetch(`/api/connections/${profile.connectionId}`, { method: 'DELETE' });
      if (res.ok) setProfile(p => p ? { ...p, connectionStatus: null, connectionId: null } : p);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <button onClick={() => router.back()} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <button onClick={() => router.back()} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="glass-card rounded-xl border border-[var(--border)] p-8 text-center">
          <p className="font-medium">User not found</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">@{username} doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const memberSince = new Date(profile.createdAt).getFullYear();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={() => router.back()} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="glass-card rounded-xl border border-[var(--border)] p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-2xl font-semibold shrink-0">
              {((profile.name || profile.username || '?')[0]).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{profile.name || profile.username}</h1>
              {profile.username && (
                <p className="text-sm text-[var(--muted-foreground)]">@{profile.username}</p>
              )}
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Member since {memberSince}</p>
            </div>
          </div>

          {/* Connection actions */}
          {!isOwnProfile && currentUserId && (
            <div className="shrink-0">
              {!profile.connectionStatus && (
                <button
                  onClick={sendRequest}
                  disabled={acting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" /> Connect
                </button>
              )}
              {profile.connectionStatus === 'PENDING' && profile.isSentByMe && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                    <Clock className="w-4 h-4" /> Pending
                  </span>
                  <button
                    onClick={remove}
                    disabled={acting}
                    className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Cancel request"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {profile.connectionStatus === 'PENDING' && !profile.isSentByMe && (
                <div className="flex gap-2">
                  <button
                    onClick={() => respond('ACCEPTED')}
                    disabled={acting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Accept
                  </button>
                  <button
                    onClick={() => respond('DECLINED')}
                    disabled={acting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--accent)]/20 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                </div>
              )}
              {profile.connectionStatus === 'ACCEPTED' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                    <UserCheck className="w-4 h-4" /> Connected
                  </span>
                  <button
                    onClick={remove}
                    disabled={acting}
                    className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove connection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {profile.connectionStatus === 'BLOCKED' && (
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                  <Shield className="w-4 h-4" /> Blocked
                </span>
              )}
            </div>
          )}

          {isOwnProfile && (
            <Link
              href="/account/settings"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--accent)]/20 transition-colors"
            >
              Edit profile
            </Link>
          )}
        </div>

        {profile.bio && (
          <p className="text-sm text-[var(--muted-foreground)] border-t border-[var(--border)] pt-4">{profile.bio}</p>
        )}
      </div>
    </div>
  );
}
