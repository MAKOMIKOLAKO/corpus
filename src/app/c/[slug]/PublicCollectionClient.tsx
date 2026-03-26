"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ExternalLink,
  Eye,
  FileText,
  Bookmark,
  Copy,
  Check,
  User,
  Calendar,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import SoftwareApplicationJsonLd from "@/components/SoftwareApplicationJsonLd";

interface Entry {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  contentType: string;
  topics: string[];
  source?: string;
  url?: string;
  doi?: string;
  addedAt: string;
}

interface Collection {
  id: string;
  name: string;
  publicSlug?: string;
  publicDescription?: string;
  publicViewCount: number;
  createdAt: string;
  owner: {
    id: string;
    name?: string;
    username?: string;
  };
  entryCount: number;
  entries: Entry[];
}

interface PublicCollectionClientProps {
  initialCollection: Collection;
}

const contentTypeLabels: Record<string, string> = {
  PAPER: "Paper",
  BLOG: "Blog",
  ESSAY: "Essay",
  ARTICLE: "Article",
  POLICY_REPORT: "Report",
  BOOK: "Book",
  VIDEO: "Video",
  SOCIAL_POST: "Post",
  OTHER: "Other"
};

export default function PublicCollectionClient({ initialCollection }: PublicCollectionClientProps) {
  const { data: session } = useSession();
  const [collection, setCollection] = useState(initialCollection);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [savingEntry, setSavingEntry] = useState<string | null>(null);

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/c/${collection.publicSlug || ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
      toast.success("URL copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleSaveEntry = async (entryId: string) => {
    if (!session) {
      toast.error("Please sign in to save entries");
      return;
    }

    setSavingEntry(entryId);
    try {
      const response = await fetch(`/api/collections/public/${collection.publicSlug}/save-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entryId })
      });

      if (!response.ok) {
        throw new Error('Failed to save entry');
      }

      const data = await response.json();
      toast.success("Entry saved to your library");
    } catch (error) {
      toast.error("Failed to save entry");
    } finally {
      setSavingEntry(null);
    }
  };

  const handleFollowCollection = async () => {
    if (!session) {
      toast.error("Please sign in to follow collections");
      return;
    }
    // This would save the collection as a reference to the user's library
    // Implementation depends on how you want to handle "following" collections
    toast.info("Following collections feature coming soon!");
  };

  return (
    <>
      <SoftwareApplicationJsonLd
        url={`https://corpus.app/c/${collection.publicSlug}`}
        description={collection.publicDescription || `View ${collection.entryCount} research papers in this public collection by ${collection.owner.name}`}
      />
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
                  {collection.name}
                </h1>
                {collection.publicDescription && (
                  <p className="text-lg text-[var(--muted-foreground)] mb-4">
                    {collection.publicDescription}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                  <Link
                    href={`/profile/${collection.owner.username}`}
                    className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {collection.owner.name || collection.owner.username}
                  </Link>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {collection.entryCount} entries
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {collection.publicViewCount} views
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {session ? (
                  <Button onClick={handleFollowCollection} variant="outline">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Follow Collection
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="outline">
                      Sign up to follow this collection
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Entries List */}
          <div className="space-y-4">
            {collection.entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3
                      className="font-semibold text-[var(--foreground)] mb-2 cursor-pointer hover:text-[var(--primary)] transition-colors"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {entry.title}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-2">
                      {entry.authors.join(", ")}
                      {entry.year && ` (${entry.year})`}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {contentTypeLabels[entry.contentType] || entry.contentType}
                      </Badge>
                      {entry.topics.slice(0, 3).map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {entry.source && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {entry.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveEntry(entry.id)}
                    disabled={savingEntry === entry.id}
                  >
                    {savingEntry === entry.id ? (
                      "Saving..."
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save to my library
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Entry Modal */}
          <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedEntry?.title}</DialogTitle>
              </DialogHeader>
              {selectedEntry && (
                <div className="space-y-4">
                  <p className="text-[var(--muted-foreground)]">
                    {selectedEntry.authors.join(", ")}
                    {selectedEntry.year && ` (${selectedEntry.year})`}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {contentTypeLabels[selectedEntry.contentType] || selectedEntry.contentType}
                    </Badge>
                    {selectedEntry.topics.map((topic) => (
                      <Badge key={topic} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  {selectedEntry.source && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Source: {selectedEntry.source}
                    </p>
                  )}

                  {selectedEntry.url && (
                    <a
                      href={selectedEntry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View original
                    </a>
                  )}

                  <div className="pt-4 border-t border-[var(--border)]">
                    <Button
                      onClick={() => handleSaveEntry(selectedEntry.id)}
                      disabled={savingEntry === selectedEntry.id}
                      className="w-full"
                    >
                      {savingEntry === selectedEntry.id ? (
                        "Saving..."
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 mr-2" />
                          Save to my library
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
