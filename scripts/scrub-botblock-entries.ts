/**
 * Find (and optionally repair) GlobalEntry rows whose title is actually a
 * bot-protection interstitial that a previous URL/DOI fetch scraped instead of
 * the real article ("Client Challenge", "Just a moment...", "Attention
 * Required!", etc.).
 *
 *   npx tsx scripts/scrub-botblock-entries.ts           # list only
 *   npx tsx scripts/scrub-botblock-entries.ts --blank   # null out the junk
 *                                                        # title/abstract so a
 *                                                        # manual re-add or
 *                                                        # re-fetch can fix it
 *
 * Run against the target database (reads DATABASE_URL from the environment).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOTBLOCK_PATTERNS = [
  'client challenge',
  'just a moment',
  'attention required',
  'access denied',
  'are you a robot',
  'checking your browser',
  'please verify you are a human',
  'security check',
  'one moment, please',
  'bot verification',
];

async function main() {
  const blank = process.argv.includes('--blank');

  const entries = await prisma.globalEntry.findMany({
    select: { id: true, title: true, doi: true, url: true, saveCount: true },
  });

  const hits = entries.filter((e) => {
    const t = (e.title || '').trim().toLowerCase();
    return BOTBLOCK_PATTERNS.some((p) => t === p || t.startsWith(p) || t.includes(p));
  });

  if (hits.length === 0) {
    console.log('No bot-block-titled GlobalEntry rows found.');
    return;
  }

  console.log(`Found ${hits.length} suspicious GlobalEntry row(s):\n`);
  for (const h of hits) {
    console.log(`  ${h.id}  saves=${h.saveCount}  doi=${h.doi ?? '-'}`);
    console.log(`    title: ${JSON.stringify(h.title)}`);
    console.log(`    url:   ${h.url ?? '-'}`);
  }

  if (!blank) {
    console.log('\nRe-run with --blank to null out these titles/abstracts.');
    return;
  }

  const ids = hits.map((h) => h.id);
  const res = await prisma.globalEntry.updateMany({
    where: { id: { in: ids } },
    data: { title: '', abstract: null, summary: null },
  });
  console.log(`\nBlanked ${res.count} row(s). Re-add them manually (with a DOI) to repopulate.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
