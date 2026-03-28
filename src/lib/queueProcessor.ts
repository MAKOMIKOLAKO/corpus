import { prisma } from './prismaWithRetry';

export async function processUserQueue(userId: string): Promise<void> {
  // 1. Find the oldest PENDING URL item for this user
  const pendingItem = await prisma.queueItem.findFirst({
    where: {
      userId,
      status: "PENDING",
      inputType: "URL"
    },
    orderBy: { createdAt: "asc" }
  });

  if (!pendingItem) return;

  // 2. Check if user already has a PROCESSING item
  const processingItem = await prisma.queueItem.findFirst({
    where: { userId, status: "PROCESSING" }
  });

  if (processingItem) return;

  // 3. Mark the item as PROCESSING
  const item = await prisma.queueItem.update({
    where: { id: pendingItem.id },
    data: { 
      status: "PROCESSING",
      startedAt: new Date()
    }
  });

  try {
    // 4. Process the URL
    const url = item.input;

    // a. Fetch the webpage with 10s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let html = '';
    try {
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Could not reach that URL (Status: ${response.status})`);
      html = await response.text();
      
      if (!html || html.length < 200) {
        // Check if we got blanked
        if (html.toLowerCase().includes('cloudflare') || html.toLowerCase().includes('bot') || html.length === 0) {
           throw new Error("This site blocked our automated extraction. Please add it manually or try a different link.");
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      await prisma.queueItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorMessage: err.name === 'AbortError' ? "Request timed out" : (err.message || "Could not reach that URL"),
          completedAt: new Date()
        }
      });
      // Recursive call for next item
      processUserQueue(userId).catch(console.error);
      return;
    }

    // b. Extract HTML content
    const meta: any = {};
    
    // Simple regex extraction for basic tags
    const getTag = (pattern: RegExp) => {
      const match = html.match(pattern);
      return match ? match[1].trim() : null;
    };

    meta.ogTitle = getTag(/property="og:title"\s+content="([^"]+)"/i) || getTag(/name="og:title"\s+content="([^"]+)"/i) || getTag(/content="([^"]+)"\s+property="og:title"/i);
    meta.ogDescription = getTag(/property="og:description"\s+content="([^"]+)"/i) || getTag(/name="og:description"\s+content="([^"]+)"/i) || getTag(/content="([^"]+)"\s+property="og:description"/i);
    meta.ogSiteName = getTag(/property="og:site_name"\s+content="([^"]+)"/i) || getTag(/name="og:site_name"\s+content="([^"]+)"/i);
    meta.description = getTag(/name="description"\s+content="([^"]+)"/i) || getTag(/content="([^"]+)"\s+name="description"/i);
    meta.author = getTag(/name="author"\s+content="([^"]+)"/i) || getTag(/content="([^"]+)"\s+name="author"/i);
    meta.articlePublishedAt = getTag(/property="article:published_time"\s+content="([^"]+)"/i);
    meta.titleTag = getTag(/<title>([^<]+)<\/title>/i);
    meta.doi = getTag(/name="citation_doi"\s+content="([^"]+)"/i);

    // Body text: strip all HTML tags, trim to 4000
    const bodyText = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);

    // c. Build Gemini prompt
    const promptText = `Extract structured metadata from the following webpage content.
Return ONLY a valid JSON object.
Structure:
{
  "title": "the article or page title",
  "authors": ["author names"],
  "year": number or null,
  "description": "2-3 sentence summary",
  "source": "website name",
  "contentType": "ARTICLE | BLOG | ESSAY | POLICY_REPORT | OTHER",
  "doi": "string or null"
}

URL: ${url}
Meta title: ${meta.ogTitle || meta.titleTag || ''}
Meta description: ${meta.ogDescription || meta.description || ''}
Body text preview: ${bodyText}`;

    // d. Call Gemini Flash via fetch
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
            response_mime_type: "application/json"
        }
      })
    });

    if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Gemini API error: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    let text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean up markdown fences
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let geminiResult: any;
    try {
      geminiResult = JSON.parse(text);
    } catch (e) {
      // Fallback to meta tags
      geminiResult = {
        title: meta.ogTitle || meta.titleTag || url,
        authors: meta.author ? [meta.author] : [],
        year: meta.articlePublishedAt ? new Date(meta.articlePublishedAt).getFullYear() : null,
        description: meta.ogDescription || meta.description || null,
        source: meta.ogSiteName || null,
        contentType: "ARTICLE",
        doi: meta.doi || null
      };
    }

    // e. Build entry payload
    const payload = {
      title: geminiResult.title || meta.ogTitle || meta.titleTag || url,
      authors: geminiResult.authors || (meta.author ? [meta.author] : []),
      year: geminiResult.year || (meta.articlePublishedAt ? new Date(meta.articlePublishedAt).getFullYear() : null),
      abstract: geminiResult.description || meta.ogDescription || meta.description || null,
      source: geminiResult.source || meta.ogSiteName || null,
      contentType: geminiResult.contentType || "ARTICLE",
      doi: geminiResult.doi || meta.doi || null,
      url: url,
      readingStatus: "UNREAD",
      notes: [],
      metadata: {}
    };

    // f. Create Entry
    let entry;
    try {
      entry = await prisma.entry.create({
        data: {
          title: payload.title,
          authors: payload.authors,
          year: payload.year,
          abstract: payload.abstract,
          source: payload.source,
          contentType: payload.contentType as any,
          doi: payload.doi,
          url: payload.url,
          readingStatus: "UNREAD",
          notes: payload.notes || [],
          userId
        }
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // If already exists, try to find it to link the queue item
        entry = await prisma.entry.findUnique({
          where: { url: payload.url }
        });
        if (!entry) throw new Error("Entry already exists but could not be retrieved");
      } else {
        throw err;
      }
    }

    // 5. On success
    await prisma.queueItem.update({
      where: { id: item.id },
      data: {
        status: "COMPLETED",
        result: payload as any,
        entryId: entry.id,
        completedAt: new Date()
      }
    });

  } catch (error: any) {
    // 6. On unhandled error
    console.error('Queue processing error:', error);
    await prisma.queueItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        errorMessage: error.message || "Processing failed",
        completedAt: new Date()
      }
    });
  } finally {
    // 7. Recursive call
    processUserQueue(userId).catch(console.error);
  }
}

export async function triggerQueueProcessing(userId: string): Promise<void> {
  processUserQueue(userId).catch(console.error);
}
