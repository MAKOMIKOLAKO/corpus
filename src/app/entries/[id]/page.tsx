import type { Metadata } from "next";
import prisma from '@/lib/prisma';
import EntryDetailClient from '@/components/EntryDetailClient';
import { notFound } from 'next/navigation';
import { getCurrentUserId } from '@/lib/session';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

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
        notFound();
    }

    const userEntry = await prisma.userEntry.findFirst({
        where: { id: params.id, userId },
        select: userEntryWithGlobal
    });

    if (!userEntry) {
        notFound();
    }

    const entry = flattenUserEntry(userEntry);

    return (
        <div className="max-w-4xl mx-auto">
            <EntryDetailClient initialData={entry} />
        </div>
    );
}
