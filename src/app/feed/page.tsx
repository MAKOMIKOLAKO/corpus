import FeedClient from "./FeedClient";

export default function FeedPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Feed Coming Soon</h1>
        <p className="text-lg text-[var(--muted-foreground)]">
          The feed feature is currently under construction. We're working on something great!
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Check back later for updates from your connections and the research community.
        </p>
      </div>
    </div>
  );
}
