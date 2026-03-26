import type { Metadata } from "next";
import AddPaperForm from '@/components/AddPaperForm';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function AddPage() {
    return (
        <div className="max-w-[640px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Add a Paper</h1>
                <p className="text-sm text-[var(--muted-foreground)]">Search by title or enter a DOI to add papers to your library.</p>
            </div>

            <AddPaperForm />
        </div>
    );
}
