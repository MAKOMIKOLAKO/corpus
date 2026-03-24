import AddEntryForm from '@/components/AddEntryForm';

export default function AddPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">add new entry</h2>
                <p className="text-sm text-[var(--muted-foreground)]">fetch metadata from a doi or url, or manually enter details.</p>
            </div>

            <AddEntryForm />
        </div>
    );
}
