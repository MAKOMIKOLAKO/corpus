import EntryDetailClient from '@/components/EntryDetailClient';
import { getCurrentUserId } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export const dynamic = 'force-dynamic';

export default async function EntryDetailPage({ params }: { params: { id: string } }) {
    const userId = await getCurrentUserId();
    if (!userId) {
        redirect('/login');
    }

    return (
        <div className="max-w-4xl mx-auto">
            <EntryDetailClient userEntryId={params.id} />
        </div>
    );
}
