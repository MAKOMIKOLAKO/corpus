import type { Metadata } from "next";
import AddEntryForm from '@/components/AddEntryForm';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function AddPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">add new entry</h1>
                <p className="text-sm text-[var(--muted-foreground)]">fetch metadata from a doi or url, or manually enter details.</p>
            </div>

            <AddEntryForm />
        </div>
    );
}
