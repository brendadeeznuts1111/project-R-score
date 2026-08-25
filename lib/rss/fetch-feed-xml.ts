// @see https://bun.com/docs/runtime/networking/fetch — fetch, streams, timeout

import {
  fetchWithRedirectPolicy,
  readBoundedBody,
  validateRemoteHttpsUrl,
} from './remote-fetch.ts';

export type FeedFetchOptions = {
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  allowedOrigins?: ReadonlySet<string>;
};

const XML_TYPES = new Set([
  'application/rss+xml',
  'application/atom+xml',
  'application/xml',
  'text/xml',
]);

export async function fetchFeedXml(
  fetcher: typeof fetch,
  input: string,
  options: FeedFetchOptions = {}
): Promise<string> {
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  const initialUrl = validateRemoteHttpsUrl(input, options.allowedOrigins, 'RSS feed');
  const headers = new Headers({
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
    'Accept-Encoding': 'identity',
    'User-Agent': 'Bun-Docs-RSS/1.0',
  });
  const { response } = await fetchWithRedirectPolicy(initialUrl, headers, {
    fetcher,
    maxBytes,
    maxRedirects: options.maxRedirects ?? 5,
    timeoutMs: options.timeoutMs ?? 15_000,
    label: 'RSS feed',
    allowedOrigins: options.allowedOrigins,
  });
  if (!response.ok) throw new Error(`RSS feed request failed: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  const type = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (!XML_TYPES.has(type) && !type.endsWith('+xml')) {
    throw new Error(`RSS feed is not XML: ${contentType || 'missing content-type'}`);
  }
  const bytes = await readBoundedBody(response, maxBytes, 'RSS feed');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
