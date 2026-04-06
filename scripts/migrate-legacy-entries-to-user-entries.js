const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

try {
  require('dotenv').config();
} catch {
  // If dotenv isn't installed, script can still run when env vars are provided by shell.
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    userId: null,
    limit: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (/^--limit=\d+$/.test(token)) {
      const parsed = parseInt(token.split('=')[1], 10);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token === '--user-id') {
      args.userId = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (token === '--limit') {
      const raw = argv[i + 1];
      const parsed = raw ? parseInt(raw, 10) : NaN;
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      i += 1;
      continue;
    }
    if (/^\d+$/.test(token)) {
      const parsed = parseInt(token, 10);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : args.limit;
    }
  }

  return args;
}

function normalizeTitle(title) {
  if (!title) return null;
  return String(title)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function normalizeFirstAuthor(authors) {
  if (!Array.isArray(authors) || authors.length === 0) return null;
  const first = authors[0];
  if (!first) return null;
  const parts = String(first).split(/[,\s]+/).filter(Boolean);
  const last = parts[parts.length - 1];
  return last ? last.toLowerCase().replace(/[^\w]/g, '') : null;
}

function normalizeDoi(doi) {
  if (!doi) return null;
  return String(doi)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim()
    .toLowerCase();
}

function normalizeIsbn(isbnValues) {
  if (!Array.isArray(isbnValues) || isbnValues.length === 0) return null;
  const first = isbnValues[0];
  if (!first) return null;
  return String(first).replace(/[-\s]/g, '').trim() || null;
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url));
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'via', 'fbclid', 'gclid', 'mc_cid', 'mc_eid',
      'si', 'feature',
    ];
    trackingParams.forEach((p) => u.searchParams.delete(p));

    const path = u.pathname.replace(/\/$/, '') || '/';
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return null;
  }
}

function generateContentHash({ doi, isbn, normalizedTitle, normalizedFirstAuthor, publicationYear, canonicalUrl }) {
  let key = null;

  if (doi) {
    key = `doi:${doi}`;
  } else if (isbn) {
    key = `isbn:${isbn}`;
  } else if (normalizedTitle && normalizedFirstAuthor) {
    key = `title:${normalizedTitle}|author:${normalizedFirstAuthor}|year:${publicationYear ?? 'unknown'}`;
  } else if (canonicalUrl) {
    key = `url:${canonicalUrl}`;
  }

  if (!key) return null;
  return crypto.createHash('sha256').update(key).digest('hex');
}

function normalizeRawContentType(contentType) {
  const allowed = new Set(['PAPER', 'BOOK', 'ARTICLE', 'BLOG', 'ESSAY', 'POLICY_REPORT', 'OTHER']);
  const value = contentType ? String(contentType).toUpperCase() : 'OTHER';
  return allowed.has(value) ? value : 'OTHER';
}

async function findOrCreateGlobalEntry(prisma, legacyEntry, dryRun) {
  const doi = normalizeDoi(legacyEntry.doi);
  const isbn = normalizeIsbn(legacyEntry.isbn13);
  const normalizedTitle = normalizeTitle(legacyEntry.title);
  const normalizedFirstAuthor = normalizeFirstAuthor(legacyEntry.authors || []);
  const publicationYear = legacyEntry.year ?? null;
  const canonicalUrl = normalizeUrl(legacyEntry.url);
  const contentHash = generateContentHash({ doi, isbn, normalizedTitle, normalizedFirstAuthor, publicationYear, canonicalUrl });

  if (doi) {
    const found = await prisma.globalEntry.findUnique({ where: { doi }, select: { id: true } });
    if (found) return { id: found.id, created: false };
  }

  if (isbn) {
    const found = await prisma.globalEntry.findUnique({ where: { isbn }, select: { id: true } });
    if (found) return { id: found.id, created: false };
  }

  if (contentHash) {
    const found = await prisma.globalEntry.findUnique({ where: { contentHash }, select: { id: true } });
    if (found) return { id: found.id, created: false };
  }

  if (canonicalUrl) {
    const found = await prisma.globalEntry.findUnique({ where: { canonicalUrl }, select: { id: true } });
    if (found) return { id: found.id, created: false };
  }

  if (dryRun) {
    return { id: null, created: true };
  }

  const created = await prisma.globalEntry.create({
    data: {
      doi,
      isbn,
      normalizedTitle,
      normalizedFirstAuthor,
      publicationYear,
      canonicalUrl,
      contentHash,
      title: legacyEntry.title,
      authors: Array.isArray(legacyEntry.authors) ? legacyEntry.authors : [],
      year: legacyEntry.year ?? null,
      abstract: legacyEntry.abstract ?? null,
      summary: legacyEntry.summary ?? null,
      source: legacyEntry.source ? String(legacyEntry.source) : null,
      url: legacyEntry.url ?? null,
      rawContentType: normalizeRawContentType(legacyEntry.contentType),
      metadata: legacyEntry.metadata ?? undefined,
      addedVia: 'legacy_migration',
      saveCount: 0,
      createdAt: legacyEntry.createdAt,
      updatedAt: legacyEntry.createdAt,
    },
    select: { id: true },
  });

  return { id: created.id, created: true };
}

async function migrateLegacyEntry(prisma, legacyEntry, dryRun) {
  const summary = {
    migrated: false,
    skipped: false,
    reason: null,
    createdGlobal: false,
    createdUserEntry: false,
    linkedCollections: 0,
  };

  if (!legacyEntry.userId) {
    summary.skipped = true;
    summary.reason = 'missing_user';
    return summary;
  }

  const globalResult = await findOrCreateGlobalEntry(prisma, legacyEntry, dryRun);
  summary.createdGlobal = globalResult.created;

  if (!globalResult.id && dryRun) {
    summary.createdUserEntry = true;
    summary.linkedCollections = legacyEntry.collections.length;
    summary.migrated = true;
    return summary;
  }

  const existingUserEntry = await prisma.userEntry.findUnique({
    where: {
      userId_globalEntryId: {
        userId: legacyEntry.userId,
        globalEntryId: globalResult.id,
      },
    },
    select: { id: true },
  });

  let userEntryId = existingUserEntry?.id || null;

  if (!userEntryId) {
    if (!dryRun) {
      const createdUserEntry = await prisma.userEntry.create({
        data: {
          userId: legacyEntry.userId,
          globalEntryId: globalResult.id,
          readingStatus: legacyEntry.readingStatus,
          addedVia: 'legacy_migration',
          createdAt: legacyEntry.createdAt,
          updatedAt: legacyEntry.createdAt,
        },
        select: { id: true },
      });
      userEntryId = createdUserEntry.id;

      await prisma.globalEntry.update({
        where: { id: globalResult.id },
        data: { saveCount: { increment: 1 } },
      });

      await prisma.user.update({
        where: { id: legacyEntry.userId },
        data: { entriesCount: { increment: 1 } },
      });
    }

    summary.createdUserEntry = true;
  }

  if (legacyEntry.collections.length > 0) {
    if (!dryRun && userEntryId) {
      await prisma.userEntryCollection.createMany({
        data: legacyEntry.collections.map((c) => ({
          userEntryId,
          collectionId: c.collectionId,
          addedAt: c.addedAt,
        })),
        skipDuplicates: true,
      });
    }
    summary.linkedCollections = legacyEntry.collections.length;
  }

  summary.migrated = true;
  return summary;
}

async function main() {
  const prisma = new PrismaClient();
  const args = parseArgs(process.argv.slice(2));

  try {
    const where = {
      userId: args.userId || { not: null },
    };

    const legacyEntries = await prisma.entry.findMany({
      where,
      include: {
        collections: {
          select: {
            collectionId: true,
            addedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: args.limit || undefined,
    });

    const stats = {
      scanned: legacyEntries.length,
      migrated: 0,
      skipped: 0,
      createdGlobal: 0,
      createdUserEntry: 0,
      linkedCollections: 0,
      errors: 0,
    };

    console.log('--- Legacy Entry Migration ---');
    console.log(`dryRun: ${args.dryRun}`);
    console.log(`userId filter: ${args.userId || '(all users with legacy entries)'}`);
    console.log(`limit: ${args.limit || '(none)'}`);
    console.log(`entries to process: ${legacyEntries.length}`);

    for (const legacyEntry of legacyEntries) {
      try {
        const result = await migrateLegacyEntry(prisma, legacyEntry, args.dryRun);
        if (result.migrated) stats.migrated += 1;
        if (result.skipped) stats.skipped += 1;
        if (result.createdGlobal) stats.createdGlobal += 1;
        if (result.createdUserEntry) stats.createdUserEntry += 1;
        stats.linkedCollections += result.linkedCollections;
      } catch (error) {
        stats.errors += 1;
        console.error(`[migrate] failed for legacy entry ${legacyEntry.id}:`, error);
      }
    }

    console.log('--- Migration Summary ---');
    console.log(`scanned: ${stats.scanned}`);
    console.log(`migrated: ${stats.migrated}`);
    console.log(`skipped: ${stats.skipped}`);
    console.log(`created global entries: ${stats.createdGlobal}`);
    console.log(`created user entries: ${stats.createdUserEntry}`);
    console.log(`linked collections: ${stats.linkedCollections}`);
    console.log(`errors: ${stats.errors}`);

    if (args.dryRun) {
      console.log('Dry run only. No database records were modified.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
