import type { Metadata } from "next";
import EntryCreationManager from '@/components/EntryCreationManager';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function AddPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Add to Library</h1>
                <p className="text-sm text-[var(--muted-foreground)]">Add papers, books, or any web content to your library using AI-powered metadata extraction.</p>
            </div>

            <EntryCreationManager />
        </div>
    );
}
