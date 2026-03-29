import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { normalizeTitle } from '@/lib/alerts';
import { analytics } from '@/lib/analytics';

type AlertEntryRecord = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  url: string | null;
  metadata: Record<string, any> | null;
  container: {
    id: string;
    userId: string;
    collectionId: string | null;
    watchQueryId: string;
  };
};

async function findAlertEntryForUser(userId: string, containerId: string, entryId: string): Promise<AlertEntryRecord | null> {
  const db = prisma as any;
  return db.alertEntry.findFirst({
    where: {
      id: entryId,
      containerId,
      container: { userId },
    },
    include: {
      container: {
        select: {
          id: true,
          userId: true,
          collectionId: true,
          watchQueryId: true,
        },
      },
    },
  });
}

export async function approveAlertEntry(userId: string, containerId: string, entryId: string) {
  const db = prisma as any;
  const alertEntry = await findAlertEntryForUser(userId, containerId, entryId);
  if (!alertEntry) {
    throw new Error('Alert entry not found');
  }

  if (alertEntry.status !== 'PENDING') {
    return { status: alertEntry.status, entryId: null };
  }

  const doi = alertEntry.metadata?.doi ?? null;
  const normalizedAlertTitle = normalizeTitle(alertEntry.title);

  const existingEntries = await prisma.entry.findMany({
    where: { userId },
    select: { id: true, title: true, doi: true },
  });

  let existingEntryId: string | null = null;
  if (doi) {
    const byDoi = existingEntries.find((entry) => entry.doi === doi);
    existingEntryId = byDoi?.id ?? null;
  }
  if (!existingEntryId) {
    const byTitle = existingEntries.find((entry) => normalizeTitle(entry.title) === normalizedAlertTitle);
    existingEntryId = byTitle?.id ?? null;
  }

  let finalEntryId = existingEntryId;
  const createdNew = !existingEntryId;

  if (!finalEntryId) {
    const created = await prisma.entry.create({
      data: {
        title: alertEntry.title,
        authors: alertEntry.authors,
        year: alertEntry.year,
        abstract: alertEntry.abstract,
        doi,
        url: alertEntry.url,
        source: 'SMART_ALERT',
        contentType: 'PAPER',
        readingStatus: 'UNREAD',
        notes: [] as Prisma.InputJsonValue,
        metadata: alertEntry.metadata as Prisma.InputJsonValue,
        userId,
        addedByQueryId: alertEntry.container.watchQueryId,
      },
      select: { id: true, contentType: true },
    });

    finalEntryId = created.id;

    await prisma.user.update({
      where: { id: userId },
      data: { entriesCount: { increment: 1 } },
    });

    await prisma.signal.create({
      data: {
        userId,
        type: 'ENTRY_SAVED',
        entryId: created.id,
        metadata: {
          source: 'SMART_ALERT',
          alertEntryId: alertEntry.id,
        },
      },
    });

    await analytics.entrySaved(userId, created.id, created.contentType);
  }

  if (finalEntryId && alertEntry.container.collectionId) {
    const existingCollectionLink = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId: finalEntryId,
          collectionId: alertEntry.container.collectionId,
        },
      },
      select: { id: true },
    });

    if (!existingCollectionLink) {
      await prisma.entryCollection.create({
        data: {
          entryId: finalEntryId,
          collectionId: alertEntry.container.collectionId,
        },
      });
    }
  }

  await db.alertEntry.update({
    where: { id: alertEntry.id },
    data: { status: 'APPROVED' },
  });

  return {
    status: 'APPROVED' as const,
    entryId: finalEntryId,
    createdNew,
  };
}

export async function rejectAlertEntry(userId: string, containerId: string, entryId: string) {
  const db = prisma as any;
  const alertEntry = await findAlertEntryForUser(userId, containerId, entryId);
  if (!alertEntry) {
    throw new Error('Alert entry not found');
  }

  if (alertEntry.status !== 'PENDING') {
    return { status: alertEntry.status };
  }

  await db.alertEntry.update({
    where: { id: alertEntry.id },
    data: { status: 'REJECTED' },
  });

  return { status: 'REJECTED' as const };
}
