const RSS_ACCEPT_HEADER = 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9,*/*;q=0.8';

function looksLikeFeedXml(content: string): boolean {
  const preview = content.slice(0, 4000).toLowerCase();
  return (
    preview.includes('<rss') ||
    preview.includes('<feed') ||
    preview.includes('<rdf:rdf')
  );
}

export async function validateRssFeedUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      headers: {
        Accept: RSS_ACCEPT_HEADER,
        'User-Agent': 'Corpus RSS Validator'
      },
      signal: controller.signal,
      redirect: 'follow'
    }).catch(() => null);

    if (headResponse?.ok) {
      const contentType = (headResponse.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('rss') || contentType.includes('atom') || contentType.includes('xml')) {
        return true;
      }
    }

    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: RSS_ACCEPT_HEADER,
        'User-Agent': 'Corpus RSS Validator'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    if (!getResponse.ok) {
      return false;
    }

    const contentType = (getResponse.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('rss') || contentType.includes('atom') || contentType.includes('xml')) {
      return true;
    }

    const body = await getResponse.text();
    return looksLikeFeedXml(body);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
