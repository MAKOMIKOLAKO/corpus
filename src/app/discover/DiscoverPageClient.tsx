"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ArxivPaper {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  venue: string;
  url: string;
  pdfUrl: string;
  categories: string[];
  publishedDate: string;
  alreadySaved: boolean;
}

interface Collection {
  id: string;
  name: string;
  entryCount: number;
}

type FetchStatus = "idle" | "loading" | "success" | "error";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 min-h-[44px] px-4 border-b border-[#e8e4d8]">
      <div className="w-4 h-4 rounded bg-[#f0ede4] animate-pulse shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5 py-2">
        <div className="h-3.5 w-2/3 rounded bg-[#f0ede4] animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-[#f0ede4] animate-pulse" />
      </div>
      <div className="h-6 w-16 rounded-full bg-[#f0ede4] animate-pulse shrink-0" />
    </div>
  );
}

export default function DiscoverPageClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  const fetchRecommendations = useCallback(async (collectionId: string) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/discover?collectionId=${encodeURIComponent(collectionId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not fetch recommendations. Try again.");
      }
      setPapers(data.papers ?? []);
      setKeywords(data.keywords ?? []);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch recommendations. Try again.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/collections");
        const data = await res.json();
        const owned = data.owned ?? [];
        const member = data.member ?? [];
        const all: Collection[] = [...owned, ...member].map((c: any) => ({
          id: c.id,
          name: c.name,
          entryCount: c.entryCount ?? 0,
        }));
        if (cancelled) return;
        setCollections(all);
        setCollectionsLoaded(true);
        if (all.length > 0) {
          setSelectedCollectionId(all[0].id);
          if (all[0].entryCount >= 2) {
            fetchRecommendations(all[0].id);
          }
        }
      } catch {
        if (!cancelled) setCollectionsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRecommendations]);

  const handleSelectCollection = (id: string) => {
    if (id === selectedCollectionId) return;
    setSelectedCollectionId(id);
    const collection = collections.find((c) => c.id === id);
    if (collection && collection.entryCount >= 2) {
      fetchRecommendations(id);
    } else {
      setStatus("idle");
      setPapers([]);
      setKeywords([]);
    }
  };

  const handleSave = async (paper: ArxivPaper) => {
    if (savingId) return;
    setSavingId(paper.arxivId);
    try {
      const res = await fetch("/api/add/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arxivId: paper.arxivId,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          year: paper.year,
          url: paper.url,
          pdfUrl: paper.pdfUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save paper");
      }
      setPapers((prev) =>
        prev.map((p) => (p.arxivId === paper.arxivId ? { ...p, alreadySaved: true } : p))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save paper");
    } finally {
      setSavingId(null);
    }
  };

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId) || null;

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            fontWeight: 500,
            color: "#1e2d27",
          }}
        >
          Discover
        </h1>
        <p className="mt-1 text-[15px] font-sans text-[#4a5e56]">
          Papers recommended based on your collection
        </p>
      </div>

      {collectionsLoaded && collections.length === 0 ? (
        <p className="text-[14px] text-[#4a5e56] py-8 text-center">
          Create a collection first to get recommendations.
        </p>
      ) : (
        <>
          <div className="mb-2 text-[13px] text-[#7a8e86]">Based on</div>
          <div
            className="flex gap-2 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {collections.map((c) => {
              const active = c.id === selectedCollectionId;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCollection(c.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-sans transition-colors ${
                    active
                      ? "bg-[#c96442] text-[#f7f4ee]"
                      : "bg-[#f7f4ee] border border-[#e8e4d8] text-[#1e2d27]"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {keywords.length > 0 && (
            <div className="mb-4 text-[12px] text-[#7a8e86]">
              Showing results for: {keywords.join(" · ")}
            </div>
          )}

          {selectedCollection && selectedCollection.entryCount < 2 ? (
            <p className="text-[14px] text-[#4a5e56] py-8 text-center">
              Add at least 2 papers to this collection to get recommendations.
            </p>
          ) : (
          <div className="border-t border-[#e8e4d8]">
            {status === "loading" &&
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

            {status === "error" && (
              <div className="py-8 text-center">
                <p className="text-[14px] text-[#4a5e56] mb-3">
                  {error || "Could not fetch recommendations. Try again."}
                </p>
                <button
                  onClick={() => selectedCollectionId && fetchRecommendations(selectedCollectionId)}
                  className="rounded-full bg-[#c96442] text-[#f7f4ee] text-[13px] px-4 py-1.5"
                >
                  Retry
                </button>
              </div>
            )}

            {status === "success" && papers.length === 0 && (
              <p className="text-[14px] text-[#4a5e56] py-8 text-center">
                No new papers found. Try a different collection.
              </p>
            )}

            {status === "success" &&
              papers.map((paper) => {
                const isSaving = savingId === paper.arxivId;
                return (
                  <div
                    key={paper.arxivId}
                    onClick={() => window.open(paper.url, "_blank", "noopener,noreferrer")}
                    className={`group flex items-center gap-3 min-h-[44px] px-4 border-b border-[#e8e4d8] cursor-pointer transition-colors hover:bg-[#f7f4ee] relative ${
                      isSaving ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c96442] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileText className="w-4 h-4 text-[#7a8e86] shrink-0" />
                    <div className="flex-1 min-w-0 flex items-baseline gap-2 py-2">
                      <span
                        className="truncate"
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: "15px",
                          color: "#1e2d27",
                        }}
                      >
                        {paper.title}
                      </span>
                      <span className="shrink-0 truncate max-w-[300px] text-[13px] text-[#7a8e86]">
                        {paper.authors.slice(0, 3).join(", ")}
                        {paper.authors.length > 3 ? " et al." : ""}
                        {paper.year ? ` · ${paper.year}` : ""}
                      </span>
                    </div>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#c96442]" />
                      ) : paper.alreadySaved ? (
                        <span className="rounded-full bg-[#e8e4d8] text-[#4a5e56] text-[12px] px-3 py-1">
                          Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSave(paper)}
                          className="rounded-full bg-[#c96442] text-[#f7f4ee] text-[12px] px-3 py-1"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          )}
        </>
      )}
    </div>
  );
}
