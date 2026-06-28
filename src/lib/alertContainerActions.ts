// HIDDEN — only used by disabled features
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { normalizeTitle } from '@/lib/alerts';
import { analytics } from '@/lib/analytics';
import { saveEntryForUser } from '@/lib/globalEntryService';

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
  const metadataGlobalEntryId = typeof alertEntry.metadata?.globalEntryId === 'string'
    ? alertEntry.metadata.globalEntryId
    : null;

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

  let existingGlobalEntryId: string | null = metadataGlobalEntryId;
  if (!existingGlobalEntryId && doi) {
    const byDoi = await prisma.globalEntry.findUnique({
      where: { doi },
      select: { id: true },
    });
    existingGlobalEntryId = byDoi?.id ?? null;
  }
  if (!existingGlobalEntryId) {
    const byTitle = await prisma.globalEntry.findFirst({
      where: {
        normalizedTitle: normalizedAlertTitle,
      },
      select: { id: true },
    });
    existingGlobalEntryId = byTitle?.id ?? null;
  }

  const existingUserEntry = existingGlobalEntryId
    ? await prisma.userEntry.findUnique({
      where: {
        userId_globalEntryId: {
          userId,
          globalEntryId: existingGlobalEntryId,
        },
      },
      select: { id: true },
    })
    : null;

  let finalEntryId = existingEntryId;
  const createdNew = !existingEntryId;
  let finalGlobalEntryId = existingGlobalEntryId;
  let finalUserEntryId = existingUserEntry?.id ?? null;

  if (!finalUserEntryId) {
    const result = await saveEntryForUser(
      userId,
      {
        title: alertEntry.title,
        authors: alertEntry.authors,
        year: alertEntry.year,
        abstract: alertEntry.abstract,
        doi,
        url: alertEntry.url,
        source: 'SMART_ALERT',
        rawContentType: 'PAPER',
        metadata: alertEntry.metadata ?? null,
      },
      {
        readingStatus: 'UNREAD',
        addedVia: 'smart_alert',
        addedByQueryId: alertEntry.container.watchQueryId,
        collectionId: alertEntry.container.collectionId ?? undefined,
      }
    );

    finalGlobalEntryId = result.globalEntryId;
    finalUserEntryId = result.userEntryId;
  } else if (alertEntry.container.collectionId) {
    await prisma.userEntryCollection.create({
      data: {
        userEntryId: finalUserEntryId,
        collectionId: alertEntry.container.collectionId,
      },
    }).catch(() => {
      // Already linked
    });
  }

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

  if (finalGlobalEntryId) {
    await prisma.signal.create({
      data: {
        userId,
        type: 'ENTRY_SAVED',
        globalEntryId: finalGlobalEntryId,
        metadata: {
          source: 'SMART_ALERT',
          alertEntryId: alertEntry.id,
          userEntryId: finalUserEntryId,
        },
        isPublic: false,
      },
    }).catch(() => {
      // Non-fatal
    });
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
    entryId: finalUserEntryId ?? finalEntryId,
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
