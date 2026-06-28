// HIDDEN — only used by disabled features
import { PrismaClient } from '@prisma/client';

type FeedSeed = {
  name: string;
  url: string;
  category: string;
  description?: string;
  isActive?: boolean;
};

const DEFAULT_FEEDS: FeedSeed[] = [
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss', category: 'Research & Science News', description: 'Latest research and science reporting from Nature.' },
  { name: 'Science Magazine News', url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science', category: 'Research & Science News', description: 'News and research updates from Science.' },
  { name: 'Scientific American', url: 'https://www.scientificamerican.com/feed/', category: 'Research & Science News', description: 'Popular science and research analysis.' },
  { name: 'Science News', url: 'https://www.sciencenews.org/feed', category: 'Research & Science News', description: 'Independent science journalism and reporting.' },
  { name: 'Phys.org', url: 'https://phys.org/rss-feed/', category: 'Research & Science News', description: 'Daily science and technology news.' },
  { name: 'EurekAlert', url: 'https://www.eurekalert.org/rss.xml', category: 'Research & Science News', description: 'University and lab press releases from around the world.' },
  { name: 'PLOS Blogs', url: 'https://theplosblog.plos.org/feed/', category: 'Research & Science News', description: 'Editorials and commentary from PLOS.' },
  { name: 'arXiv General', url: 'https://rss.arxiv.org/rss/cs', category: 'Research & Science News', description: 'General arXiv computer science feed.' },
  { name: 'New Scientist', url: 'https://www.newscientist.com/subject/science/feed/', category: 'Research & Science News', description: 'Science and innovation coverage from New Scientist.', isActive: false },

  { name: 'BAIR Blog', url: 'http://bair.berkeley.edu/blog/feed.xml', category: 'AI & Machine Learning', description: 'Posts from Berkeley AI Research.' },
  { name: 'Google Research Blog', url: 'https://research.google/blog/rss/', category: 'AI & Machine Learning', description: 'Research announcements from Google Research.' },
  { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', category: 'AI & Machine Learning', description: 'Product and research updates from OpenAI.' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', category: 'AI & Machine Learning', description: 'Research and product updates from Google DeepMind.' },
  { name: 'Machine Learning Mastery', url: 'https://machinelearningmastery.com/blog/feed/', category: 'AI & Machine Learning', description: 'Practical ML tutorials and guidance.' },
  { name: 'Analytics Vidhya', url: 'https://www.analyticsvidhya.com/blog/feed/', category: 'AI & Machine Learning', description: 'Applied data science and ML tutorials.' },
  { name: 'KDnuggets', url: 'https://www.kdnuggets.com/feed', category: 'AI & Machine Learning', description: 'AI, ML, and data science news and articles.' },
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', category: 'AI & Machine Learning', description: 'Community-written data science and ML content.' },
  { name: 'NVIDIA Developer Blog', url: 'https://developer.nvidia.com/blog/feed/', category: 'AI & Machine Learning', description: 'AI, CUDA, and accelerated computing updates.' },
  { name: 'MIT News AI', url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml', category: 'AI & Machine Learning', description: 'AI-related news from MIT.' },

  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', category: 'Deep Tech & Research Labs', description: 'OpenAI research and product updates.' },
  { name: 'Anthropic', url: 'https://www.anthropic.com/news/rss.xml', category: 'Deep Tech & Research Labs', description: 'Anthropic announcements and research.', isActive: false },
  { name: 'DeepMind', url: 'https://deepmind.google/blog/rss.xml', category: 'Deep Tech & Research Labs', description: 'Google DeepMind research and engineering.' },
  { name: 'Allen Institute for AI', url: 'https://allenai.org/blog/rss.xml', category: 'Deep Tech & Research Labs', description: 'Research updates from AI2.', isActive: false },
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/', category: 'Deep Tech & Research Labs', description: 'Publications and projects from Microsoft Research.' },
  { name: 'Google AI Blog', url: 'https://ai.googleblog.com/feeds/posts/default', category: 'Deep Tech & Research Labs', description: 'Historical Google AI blog feed.' },
  { name: 'Stanford AI Lab', url: 'https://ai.stanford.edu/blog/feed.xml', category: 'Deep Tech & Research Labs', description: 'Stanford AI Lab updates.', isActive: false },
  { name: 'MIT CSAIL', url: 'https://www.csail.mit.edu/news/rss.xml', category: 'Deep Tech & Research Labs', description: 'News from MIT CSAIL.' },
  { name: 'Berkeley AI Research (BAIR)', url: 'http://bair.berkeley.edu/blog/feed.xml', category: 'Deep Tech & Research Labs', description: 'BAIR announcements and writeups.' },
  { name: 'Meta AI', url: 'https://ai.meta.com/blog/rss/', category: 'Deep Tech & Research Labs', description: 'Meta AI blog updates.', isActive: false },

  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tech News', description: 'Technology, science, and policy reporting.' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech News', description: 'Consumer tech and platform news.' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tech News', description: 'Startup and venture-backed technology news.' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'Tech News', description: 'Analysis of emerging technology impacts.' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Tech News', description: 'Technology culture and science reporting.' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', category: 'Tech News', description: 'Engineering and technology coverage from IEEE.' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'Tech News', description: 'Enterprise technology and AI industry news.' },
  { name: 'Semafor Technology', url: 'https://www.semafor.com/feeds/technology', category: 'Tech News', description: 'Technology reporting from Semafor.', isActive: false },
  { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', category: 'Tech News', description: 'Business and technology reporting from Bloomberg.', isActive: false },

  { name: 'The Lancet', url: 'https://www.thelancet.com/rssfeed/lancet_current.xml', category: 'Health & Medicine', description: 'Medical research and commentary from The Lancet.' },
  { name: 'NEJM', url: 'https://www.nejm.org/action/showFeed?jc=nejm&type=etoc&feed=rss', category: 'Health & Medicine', description: 'New England Journal of Medicine updates.' },
  { name: 'BMJ', url: 'https://www.bmj.com/rss/research.xml', category: 'Health & Medicine', description: 'BMJ research articles feed.' },
  { name: 'NIH News', url: 'https://www.nih.gov/news-events/news-releases/feed.xml', category: 'Health & Medicine', description: 'Official news releases from NIH.' },
  { name: 'CDC Newsroom', url: 'https://tools.cdc.gov/api/v2/resources/media/403372.rss', category: 'Health & Medicine', description: 'CDC newsroom updates.', isActive: false },
  { name: 'STAT News', url: 'https://www.statnews.com/feed/', category: 'Health & Medicine', description: 'Health, medicine, and biotech reporting.' },
  { name: 'MedPage Today', url: 'https://www.medpagetoday.com/rss', category: 'Health & Medicine', description: 'Medical news for clinicians.' },
  { name: 'Health Affairs', url: 'https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss', category: 'Health & Medicine', description: 'Health policy and systems research.' },
  { name: 'Nature Medicine', url: 'https://www.nature.com/nm.rss', category: 'Health & Medicine', description: 'Research and news from Nature Medicine.' },
  { name: 'WHO News', url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'Health & Medicine', description: 'World Health Organization news updates.' },

  { name: 'arXiv cs.AI', url: 'https://rss.arxiv.org/rss/cs.AI', category: 'Trending Papers', description: 'New AI papers from arXiv.' },
  { name: 'arXiv cs.LG', url: 'https://rss.arxiv.org/rss/cs.LG', category: 'Trending Papers', description: 'New machine learning papers from arXiv.' },
  { name: 'Papers With Code', url: 'https://paperswithcode.com/rss/latest', category: 'Trending Papers', description: 'Latest papers and code implementations.' },
  { name: 'Hugging Face Papers', url: 'https://huggingface.co/papers/rss', category: 'Trending Papers', description: 'Recent papers highlighted by Hugging Face.' },
  { name: 'Semantic Scholar', url: 'https://www.semanticscholar.org/feed.xml', category: 'Trending Papers', description: 'Research discovery updates from Semantic Scholar.', isActive: false },
  { name: 'bioRxiv', url: 'https://connect.biorxiv.org/biorxiv_xml.php?subject=all', category: 'Trending Papers', description: 'Preprints from bioRxiv.' },
  { name: 'medRxiv', url: 'https://connect.medrxiv.org/medrxiv_xml.php?subject=all', category: 'Trending Papers', description: 'Preprints from medRxiv.' },
  { name: 'Nature Latest Research', url: 'https://www.nature.com/nature.rss', category: 'Trending Papers', description: 'Latest papers and articles from Nature.' },
  { name: 'Science Advances', url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=sciadv', category: 'Trending Papers', description: 'Latest publications from Science Advances.' },

  { name: 'Council on Foreign Relations', url: 'https://www.cfr.org/rss-feeds', category: 'Global Affairs & Policy', description: 'Policy analysis and geopolitical coverage from CFR.' },
  { name: 'Brookings Institution', url: 'https://www.brookings.edu/feed/', category: 'Global Affairs & Policy', description: 'Policy research and analysis from Brookings.' },
  { name: 'Carnegie Endowment', url: 'https://carnegieendowment.org/rss', category: 'Global Affairs & Policy', description: 'International affairs analysis from Carnegie.' },
  { name: 'Foreign Affairs', url: 'https://www.foreignaffairs.com/rss.xml', category: 'Global Affairs & Policy', description: 'Essays and analysis on world affairs.' },
  { name: 'CSIS', url: 'https://www.csis.org/analysis/feed', category: 'Global Affairs & Policy', description: 'Center for Strategic and International Studies analysis.' },
  { name: 'Chatham House', url: 'https://www.chathamhouse.org/rss.xml', category: 'Global Affairs & Policy', description: 'International affairs and policy commentary.' },
  { name: 'The Economist', url: 'https://www.economist.com/international/rss.xml', category: 'Global Affairs & Policy', description: 'Global politics and economics coverage.' },
  { name: 'Reuters World News', url: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best', category: 'Global Affairs & Policy', description: 'Global breaking news from Reuters.' },
  { name: 'BBC World News', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'Global Affairs & Policy', description: 'World news coverage from BBC.' },
  { name: 'Le Monde', url: 'https://www.lemonde.fr/international/rss_full.xml', category: 'Global Affairs & Policy', description: 'International coverage from Le Monde.' },

  { name: 'Aeon', url: 'https://aeon.co/feed.rss', category: 'Ideas, Philosophy & Society', description: 'Long-form essays on ideas, culture, and philosophy.' },
  { name: 'Nautilus', url: 'https://nautil.us/feed/', category: 'Ideas, Philosophy & Society', description: 'Science and philosophy stories from Nautilus.' },
  { name: 'The Conversation', url: 'https://theconversation.com/us/articles.atom', category: 'Ideas, Philosophy & Society', description: 'Academic insight on current events and ideas.' },
  { name: '3 Quarks Daily', url: 'https://3quarksdaily.com/feed', category: 'Ideas, Philosophy & Society', description: 'Curated writing on science, philosophy, and culture.' },
  { name: 'Edge.org', url: 'https://www.edge.org/feed', category: 'Ideas, Philosophy & Society', description: 'Interviews and essays from leading thinkers.' },
  { name: 'Philosophy Now', url: 'https://philosophynow.org/rss', category: 'Ideas, Philosophy & Society', description: 'Accessible philosophy essays and features.' },
  { name: 'Longreads', url: 'https://longreads.com/feed/', category: 'Ideas, Philosophy & Society', description: 'Curated long-form journalism and essays.' },
  { name: 'New York Review of Books', url: 'https://www.nybooks.com/feed/', category: 'Ideas, Philosophy & Society', description: 'Book reviews and intellectual commentary.' },
  { name: 'Boston Review', url: 'https://www.bostonreview.net/feed/', category: 'Ideas, Philosophy & Society', description: 'Politics, culture, and ideas.' },
  { name: 'The Atlantic Ideas', url: 'https://www.theatlantic.com/feed/channel/ideas/', category: 'Ideas, Philosophy & Society', description: 'Ideas and essays from The Atlantic.' }
];

export async function seedDefaultFeeds(prismaClient: PrismaClient) {
  const db = prismaClient as any;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const byUrl = new Map<string, FeedSeed>();
  for (const feed of DEFAULT_FEEDS) {
    const existing = byUrl.get(feed.url);
    if (!existing) {
      byUrl.set(feed.url, feed);
      continue;
    }

    if (existing.isActive === false && feed.isActive !== false) {
      byUrl.set(feed.url, feed);
    } else {
      skipped += 1;
    }
  }

  for (const feed of Array.from(byUrl.values())) {
    const existing = await db.defaultFeed.findUnique({ where: { url: feed.url } });
    await db.defaultFeed.upsert({
      where: { url: feed.url },
      update: {
        name: feed.name,
        category: feed.category,
        description: feed.description ?? null,
        isActive: feed.isActive ?? true
      },
      create: {
        name: feed.name,
        url: feed.url,
        category: feed.category,
        description: feed.description ?? null,
        isActive: feed.isActive ?? true
      }
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { created, updated, skipped };
}
