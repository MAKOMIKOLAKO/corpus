import AddEntryForm from '@/components/AddEntryForm';

export default function AddPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Add New Entry</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Fetch metadata from a DOI or URL, or manually enter details.</p>
            </div>

            <AddEntryForm />
        </div>
    );
}
