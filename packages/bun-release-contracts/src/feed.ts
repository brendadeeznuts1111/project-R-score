// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/xml — Bun.XML.parse
// @see https://bun.com/rss.xml — Bun release-post feed
import { join, resolve } from 'node:path';
import {
  parseXmlElementList,
  parseRssPubDateToIso,
  parseXmlText,
  versionFromBunBlogUrl,
} from '../../../lib/docs/bun-blog-url.ts';
import { normalizeVersion } from './generator';

export type ReleaseFeedEntry = {
  version: string;
  title: string;
  url: string;
  /** Canonical ISO-8601 (`…Z`), matching docs feeds `pubDate`. */
  publishedAt: string;
};

export type FetchReleaseFeedOptions = {
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function decodeXml(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16))
    )
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
    .trim();
}

function elementText(xml: string, name: string): string {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(xml);
  return decodeXml(match?.[1] ?? '');
}

/** @deprecated Prefer `versionFromBunBlogUrl` from `lib/docs/bun-blog-url.ts`. */
export function versionFromBlogUrl(url: string): string | null {
  return versionFromBunBlogUrl(url);
}

function pushReleaseEntry(
  entries: ReleaseFeedEntry[],
  seen: Set<string>,
  fields: { title: string; url: string; pubRaw: string }
): void {
  const version = versionFromBunBlogUrl(fields.url);
  if (!version || !VERSION_PATTERN.test(version) || seen.has(version)) return;
  const publishedAt = parseRssPubDateToIso(fields.pubRaw);
  if (!publishedAt) {
    throw new Error(`release ${version} has an invalid pubDate: ${fields.pubRaw || '(missing)'}`);
  }
  seen.add(version);
  entries.push({
    version,
    title: fields.title || `Bun v${version}`,
    url: fields.url,
    publishedAt,
  });
}

function parseReleaseFeedViaBunXml(xml: string): ReleaseFeedEntry[] | null {
  let doc: unknown;
  try {
    doc = Bun.XML.parse(xml);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== 'object') return null;
  const root = doc as Record<string, unknown>;
  const rss = (root.rss ?? root) as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (!channel) return null;
  const items = parseXmlElementList(channel.item);
  if (items.length === 0) return null;

  const entries: ReleaseFeedEntry[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    pushReleaseEntry(entries, seen, {
      title: parseXmlText(item.title),
      url: parseXmlText(item.link),
      pubRaw: parseXmlText(item.pubDate),
    });
  }
  return entries;
}

function parseReleaseFeedViaRegex(xml: string): ReleaseFeedEntry[] {
  const entries: ReleaseFeedEntry[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = match[1]!;
    pushReleaseEntry(entries, seen, {
      title: elementText(item, 'title'),
      url: elementText(item, 'link'),
      pubRaw: elementText(item, 'pubDate'),
    });
  }
  return entries;
}

export function parseReleaseFeed(xml: string): ReleaseFeedEntry[] {
  const entries = parseReleaseFeedViaBunXml(xml) ?? parseReleaseFeedViaRegex(xml);
  if (entries.length === 0) {
    throw new Error('Bun release feed contained no vMAJOR.MINOR.PATCH blog entries');
  }
  return entries.sort((a, b) => compareReleaseVersions(b.version, a.version));
}

export async function fetchReleaseFeed(
  options: FetchReleaseFeedOptions
): Promise<ReleaseFeedEntry[]> {
  const response = await (options.fetchImpl ?? fetch)(options.url, {
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml',
      'user-agent': 'factorywager-bun-release-inventory/0.2',
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
  });
  if (!response.ok) throw new Error(`Failed to fetch ${options.url}: HTTP ${response.status}`);
  return parseReleaseFeed(await response.text());
}

export function compareReleaseVersions(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export function selectReleaseFeedEntries(
  entries: ReleaseFeedEntry[],
  options: { since?: string; limit?: number } = {}
): ReleaseFeedEntry[] {
  if (options.limit != null && (!Number.isSafeInteger(options.limit) || options.limit <= 0)) {
    throw new Error('release feed limit must be a positive integer');
  }
  const since = options.since == null ? undefined : normalizeVersion(options.since);
  const validatedEntries = entries.map(entry => {
    const version = normalizeVersion(entry.version);
    if (entry.version !== version) {
      throw new Error(`Release feed entry version must be canonical: ${entry.version}`);
    }
    return entry;
  });
  const newestFirst = validatedEntries.sort((a, b) => compareReleaseVersions(b.version, a.version));
  const filtered = since
    ? newestFirst.filter(entry => compareReleaseVersions(entry.version, since) >= 0)
    : newestFirst;
  return options.limit == null ? filtered : filtered.slice(0, options.limit);
}

export async function loadReleaseFeedSettings(
  repoRoot = resolve(import.meta.dir, '..', '..', '..')
): Promise<{ url: string; timeoutMs: number }> {
  const configPath = join(repoRoot, 'config', 'bun-channels.toml');
  const config = Bun.TOML.parse(await Bun.file(configPath).text()) as {
    sources?: { rss?: unknown };
    monitor?: { fetch_timeout_ms?: unknown };
  };
  const url = config.sources?.rss;
  const timeoutMs = config.monitor?.fetch_timeout_ms;
  if (typeof url !== 'string' || !URL.canParse(url)) {
    throw new Error(`Bun channel config has no valid sources.rss URL: ${configPath}`);
  }
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Bun channel config has no valid monitor.fetch_timeout_ms: ${configPath}`);
  }
  return { url, timeoutMs };
}
