export interface FeedUrlNormalizationResult {
  storageUrl: string;
  comparisonUrl: string;
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function normalizeSearch(search: string): string {
  if (!search) {
    return '';
  }

  const params = new URLSearchParams(search);
  const sorted = new URLSearchParams();
  Array.from(params.keys())
    .sort()
    .forEach((key) => {
      const values = params.getAll(key);
      values.forEach((value) => sorted.append(key, value));
    });

  const serialized = sorted.toString();
  return serialized ? `?${serialized}` : '';
}

function normalizeHash(hash: string): string {
  return hash ? hash.trim() : '';
}

export function normalizeFeedUrlForStorage(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    const pathname = normalizePathname(url.pathname);
    const search = normalizeSearch(url.search);
    const hash = normalizeHash(url.hash);

    return `${url.protocol}//${hostname}${pathname}${search}${hash}`;
  } catch {
    return null;
  }
}

export function normalizeFeedUrlForComparison(input: string): string | null {
  const storageUrl = normalizeFeedUrlForStorage(input);
  if (!storageUrl) {
    return null;
  }

  try {
    const url = new URL(storageUrl);
    const comparisonHostname = url.hostname.replace(/^www\./i, '').toLowerCase();
    return `${url.protocol}//${comparisonHostname}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function normalizeFeedUrl(input: string): FeedUrlNormalizationResult | null {
  const storageUrl = normalizeFeedUrlForStorage(input);
  if (!storageUrl) {
    return null;
  }

  const comparisonUrl = normalizeFeedUrlForComparison(storageUrl);
  if (!comparisonUrl) {
    return null;
  }

  return {
    storageUrl,
    comparisonUrl
  };
}
