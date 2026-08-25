import { resolvePath as resolve } from '../../lib/path-bun';
import {
  fetchWithRedirectPolicy,
  readBoundedBody,
  validateRemoteHttpsUrl,
} from '../../lib/rss/remote-fetch.ts';
import {
  BUN_14_MARKDOWN_URL,
  BUN_14_SOURCE_URL,
  MAX_SOURCE_BYTES,
  REPO_ROOT,
} from './constants.ts';
import { fail } from './errors.ts';
import type { CliOptions, SourceDocuments } from './types.ts';

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const officialUrl = validateRemoteHttpsUrl(url, new Set(['https://bun.com']), 'Bun source');
  const { response } = await fetchWithRedirectPolicy(
    officialUrl,
    new Headers({ 'Accept-Encoding': 'identity' }),
    {
      fetcher: fetch,
      maxBytes: MAX_SOURCE_BYTES,
      maxRedirects: 5,
      timeoutMs,
      label: 'Bun source',
      allowedOrigins: new Set(['https://bun.com']),
    }
  ).catch(error => {
    fail(`fetch failed for ${url}: ${String(error)}`);
  });
  if (!response.ok) fail(`fetch failed for ${url}: HTTP ${response.status}`);
  const bytes = await readBoundedBody(response, MAX_SOURCE_BYTES, 'Bun source');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export async function loadSourceDocuments(options: CliOptions): Promise<SourceDocuments> {
  const htmlSource = options.htmlPath ? resolve(REPO_ROOT, options.htmlPath) : BUN_14_SOURCE_URL;
  const markdownSource = options.markdownPath
    ? resolve(REPO_ROOT, options.markdownPath)
    : BUN_14_MARKDOWN_URL;
  // @see https://bun.com/docs/runtime/file-io — Bun.file
  const [html, markdown] = await Promise.all([
    options.htmlPath ? Bun.file(htmlSource).text() : fetchText(htmlSource, options.timeoutMs),
    options.markdownPath
      ? Bun.file(markdownSource).text()
      : fetchText(markdownSource, options.timeoutMs),
  ]);
  if (!html.includes('<html') || !html.includes('bun-v1.4')) {
    fail(`HTML source ${htmlSource} is not the official Bun 1.4 page`);
  }
  if (!markdown.includes('lazyVideo') || !markdown.includes('/images/blog/bun-1.4/')) {
    fail(`Markdown source ${markdownSource} is not the official Bun 1.4 page`);
  }
  return { html, markdown, htmlSource, markdownSource };
}
