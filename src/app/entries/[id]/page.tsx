import type { Metadata } from "next";
import prisma from '@/lib/prisma';
import EntryDetailClient from '@/components/EntryDetailClient';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function EntryDetailPage({ params }: { params: { id: string } }) {
    const entry = await prisma.entry.findUnique({
        where: { id: params.id }
    });

    if (!entry) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto">
            <EntryDetailClient initialData={entry} />
        </div>
    );
}
