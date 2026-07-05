'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Users, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function sliceTitle(title: string, max = 140) {
  return title.length > max ? `${title.slice(0, max - 3)}...` : title;
}

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  plan: string;
  isBetaTester?: boolean;
  createdAt: string;
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
  const [publicCollections, setPublicCollections] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  const isOwnProfile = currentUserId === profile?.id;

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

  useEffect(() => {
    if (profile && !isOwnProfile) {
      fetchExtras();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, currentUserId]);

  const fetchExtras = async () => {
    if (!profile) return;
    setLoadingExtras(true);
    try {
      const collectionsRes = await fetch(`/api/users/${encodeURIComponent(username)}/public-collections`);

      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        setPublicCollections(collectionsData.collections || []);
      }
    } catch (error) {
      console.error('Error fetching profile extras:', error);
    } finally {
      setLoadingExtras(false);
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

  const memberSince = new Date(profile.createdAt).getFullYear();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={() => router.back()} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="glass-card rounded-xl border border-[var(--border)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-3xl sm:text-2xl font-medium shrink-0">
              {((profile.name || profile.username || '?')[0]).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-xl font-serif font-medium truncate">{profile.name || profile.username}</h1>
              {profile.isBetaTester && (
                <Badge variant="default" className="mt-1 w-fit">Beta Tester</Badge>
              )}
              {profile.username && (
                <p className="text-sm text-[var(--muted-foreground)]">@{profile.username}</p>
              )}
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Member since {memberSince}</p>
            </div>
          </div>

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

      {/* Public Collections */}
      {!isOwnProfile && publicCollections.length > 0 && (
        <Card className="border border-[var(--border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Public Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publicCollections.map((collection: any) => (
                <Link key={collection.id} href={`/collections/${collection.id}`}>
                  <Card className="cursor-pointer hover:border-[var(--primary)] transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{collection.name}</CardTitle>
                      {collection.publicDescription && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                          {collection.publicDescription}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}</span>
                        </div>
                        {collection.publicViewCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{collection.publicViewCount} views</span>
                          </div>
                        )}
                      </div>
                      {collection.userEntryCollections && collection.userEntryCollections.length > 0 && (
                        <div className="mt-3 space-y-1 rounded-md border border-[var(--border)] bg-[var(--muted)]/20 p-2">
                          {collection.userEntryCollections.slice(0, 2).map((item: any) => (
                            <p
                              key={item.userEntry.globalEntry.id}
                              className="text-xs text-[var(--muted-foreground)]"
                              title={item.userEntry.globalEntry.title}
                            >
                              • {sliceTitle(item.userEntry.globalEntry.title)}
                            </p>
                          ))}
                          {collection._count.entries > 2 && (
                            <p className="text-xs text-[var(--muted-foreground)] italic">
                              +{collection._count.entries - 2} more
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
