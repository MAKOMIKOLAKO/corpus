'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck, Clock, X, Check, ChevronLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  plan: string;
  isBetaTester?: boolean;
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
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-3xl sm:text-2xl font-semibold shrink-0">
              {((profile.name || profile.username || '?')[0]).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-xl font-semibold truncate">{profile.name || profile.username}</h1>
              {profile.isBetaTester && (
                <Badge variant="default" className="mt-1 w-fit">Beta Tester</Badge>
              )}
              {profile.username && (
                <p className="text-sm text-[var(--muted-foreground)]">@{profile.username}</p>
              )}
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Member since {memberSince}</p>
            </div>
          </div>

          {/* Connection actions */}
          {!isOwnProfile && currentUserId && (
            <div className="w-full sm:w-auto shrink-0">
              {!profile.connectionStatus && (
                <Button
                  onClick={sendRequest}
                  disabled={acting}
                  variant="default"
                  className="w-full sm:w-auto gap-1.5 h-11 sm:h-9 touch-manipulation"
                >
                  <UserPlus className="w-4 h-4" /> Connect
                </Button>
              )}
              {profile.connectionStatus === 'PENDING' && profile.isSentByMe && (
                <div className="flex items-center justify-between sm:justify-end gap-2 p-2 sm:p-0 border sm:border-0 rounded-lg">
                  <span className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                    <Clock className="w-4 h-4" /> Pending
                  </span>
                  <button
                    onClick={remove}
                    disabled={acting}
                    className="p-2 sm:p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors touch-manipulation"
                    title="Cancel request"
                  >
                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
              {profile.connectionStatus === 'PENDING' && !profile.isSentByMe && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => respond('ACCEPTED')}
                    disabled={acting}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:px-3 sm:py-2 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-50 touch-manipulation"
                  >
                    <Check className="w-4 h-4" /> Accept
                  </button>
                  <button
                    onClick={() => respond('DECLINED')}
                    disabled={acting}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:px-3 sm:py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--accent)]/20 disabled:opacity-50 touch-manipulation"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                </div>
              )}
              {profile.connectionStatus === 'ACCEPTED' && (
                <div className="flex items-center justify-between sm:justify-end gap-2 p-2 sm:p-0 border sm:border-0 rounded-lg">
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                    <UserCheck className="w-4 h-4" /> Connected
                  </span>
                  <button
                    onClick={remove}
                    disabled={acting}
                    className="p-2 sm:p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors touch-manipulation"
                    title="Remove connection"
                  >
                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-4 py-3 sm:px-3 sm:py-2 rounded-md border border-[var(--border)] text-sm font-medium hover:bg-[var(--accent)]/20 transition-colors touch-manipulation h-11 sm:h-9"
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
