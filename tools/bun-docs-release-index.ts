#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/nodejs-compat#fetch — fetch
/**
 * bun-docs-release-index.ts — Phase 0: RSS → version → blog URL map.
 *
 * Fetches https://bun.com/rss.xml (conditional GET via ETag / Last-Modified),
 * filters release-like posts, normalises versions, and writes:
 *   tools/release-index.json
 *
 * Run:
 *   bun tools/bun-docs-release-index.ts
 *   bun tools/bun-docs-release-index.ts --force   # ignore validators, re-fetch
 *
 * Consumed by tools/bun-docs-catalog.ts for BLOG population.
 */
import { resolve } from 'node:path';

export const RSS_URL = 'https://bun.com/rss.xml';

const ROOT = import.meta.dir;
export const RELEASE_INDEX_PATH = resolve(ROOT, 'release-index.json');
const CACHE_DIR = resolve(ROOT, '.cache', 'bun-rss');
const CACHE_XML_PATH = resolve(CACHE_DIR, 'rss.xml');
const CACHE_META_PATH = resolve(CACHE_DIR, 'meta.json');

const VERSION_RE = /\bv?(\d+\.\d+(?:\.\d+)?)\b/i;
const URL_VERSION_RE = /\/blog\/bun-v(\d+\.\d+\.\d+)/i;

export type ReleaseEntry = {
  /** Canonical semver, e.g. "1.3.14" or "1.3.0" for minor posts */
  version: string;
  title: string;
  url: string;
  guid: string;
  /** ISO-8601 */
  pubDate: string;
};

export type ReleaseIndexFile = {
  generated: string;
  source: string;
  etag?: string;
  lastModified?: string;
  count: number;
  entries: ReleaseEntry[];
};

type CacheMeta = {
  etag?: string;
  lastModified?: string;
  fetchedAt?: string;
};

/** Strip bun-v / v / pre-release suffix → "1.4.0" */
export function cleanBunVersion(version: string): string {
  return version
    .trim()
    .replace(/^bun-v/i, '')
    .replace(/^v/i, '')
    .split('-')[0]!
    .split('+')[0]!;
}

/** Expand "1.3" → "1.3.0"; leave "1.3.14" alone. */
export function expandMinorVersion(version: string): string {
  const v = cleanBunVersion(version);
  const parts = v.split('.');
  if (parts.length === 2 && parts.every(p => /^\d+$/.test(p))) {
    return `${parts[0]}.${parts[1]}.0`;
  }
  return v;
}

export function isReleasePost(title: string, url: string): boolean {
  if (!/^Bun\s/i.test(title)) return false;
  return VERSION_RE.test(title) || /\/blog\/bun-v/i.test(url);
}

/**
 * Prefer URL path version; else title. Two-part versions become X.Y.0.
 */
export function normalizeReleaseVersion(title: string, url: string): string | null {
  const fromUrl = url.match(URL_VERSION_RE)?.[1];
  if (fromUrl) return fromUrl;
  const m = title.match(VERSION_RE);
  if (!m) return null;
  return expandMinorVersion(m[1]!);
}

function tagText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return m[1]!
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parseReleaseEntries(xml: string): ReleaseEntry[] {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => m[1]!);
  const out: ReleaseEntry[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const title = tagText(block, 'title');
    const url = tagText(block, 'link');
    const guid = tagText(block, 'guid') || url;
    const pubRaw = tagText(block, 'pubDate');
    if (!isReleasePost(title, url)) continue;
    const version = normalizeReleaseVersion(title, url);
    if (!version) continue;
    if (seen.has(version)) continue; // keep first (newest) occurrence
    seen.add(version);
    const pubDate = pubRaw ? new Date(pubRaw).toISOString() : '';
    out.push({ version, title, url, guid, pubDate });
  }

  out.sort((a, b) => (a.pubDate < b.pubDate ? -1 : a.pubDate > b.pubDate ? 1 : 0));
  return out;
}

/**
 * Build lookup map: normalized version → entry.
 * Also registers short minor keys ("1.3") when version is "1.3.0".
 */
export function buildReleaseMap(entries: ReleaseEntry[]): Map<string, ReleaseEntry> {
  const map = new Map<string, ReleaseEntry>();
  for (const e of entries) {
    map.set(e.version, e);
    const parts = e.version.split('.');
    if (parts.length === 3 && parts[2] === '0') {
      const short = `${parts[0]}.${parts[1]}`;
      if (!map.has(short)) map.set(short, e);
    }
  }
  return map;
}

/**
 * Look up blog URL for a Bun version.
 * Exact (pre-release stripped) → then minor X.Y.0. Never walks to a major.
 */
export function lookupBlogUrl(version: string, map: Map<string, ReleaseEntry>): string | undefined {
  const clean = cleanBunVersion(version);
  const exact = map.get(clean);
  if (exact) return exact.url;

  const parts = clean.split('.');
  if (parts.length >= 2 && parts.every(p => /^\d+$/.test(p))) {
    const minor = `${parts[0]}.${parts[1]}.0`;
    const minorEntry = map.get(minor) ?? map.get(`${parts[0]}.${parts[1]}`);
    if (minorEntry) return minorEntry.url;
  }
  return undefined;
}

async function readCacheMeta(): Promise<CacheMeta> {
  if (!(await Bun.file(CACHE_META_PATH).exists())) return {};
  try {
    return (await Bun.file(CACHE_META_PATH).json()) as CacheMeta;
  } catch {
    return {};
  }
}

async function ensureDir(dir: string): Promise<void> {
  const keep = resolve(dir, '.keep');
  if (!(await Bun.file(keep).exists())) await Bun.write(keep, '');
}

async function writeCache(xml: string, meta: CacheMeta): Promise<void> {
  await ensureDir(CACHE_DIR);
  await Bun.write(CACHE_XML_PATH, xml);
  await Bun.write(
    CACHE_META_PATH,
    `${JSON.stringify({ ...meta, fetchedAt: new Date().toISOString() }, null, 2)}\n`
  );
}

export type FetchRssResult = {
  xml: string;
  etag?: string;
  lastModified?: string;
  fromCache: boolean;
  notModified: boolean;
};

/** Conditional GET of the Bun RSS feed. */
export async function fetchRssXml(opts?: { force?: boolean }): Promise<FetchRssResult> {
  const force = opts?.force ?? false;
  const meta = await readCacheMeta();
  const headers: Record<string, string> = {
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
    'User-Agent': 'bun-docs-release-index/1.0 (+https://bun.com/rss.xml)',
  };
  if (!force && meta.etag) headers['If-None-Match'] = meta.etag;
  if (!force && meta.lastModified) headers['If-Modified-Since'] = meta.lastModified;

  let res: Response;
  try {
    res = await fetch(RSS_URL, { headers });
  } catch (err) {
    if (await Bun.file(CACHE_XML_PATH).exists()) {
      const xml = await Bun.file(CACHE_XML_PATH).text();
      return {
        xml,
        etag: meta.etag,
        lastModified: meta.lastModified,
        fromCache: true,
        notModified: false,
      };
    }
    throw err;
  }

  if (res.status === 304 && (await Bun.file(CACHE_XML_PATH).exists())) {
    const xml = await Bun.file(CACHE_XML_PATH).text();
    return {
      xml,
      etag: meta.etag,
      lastModified: meta.lastModified,
      fromCache: true,
      notModified: true,
    };
  }

  if (!res.ok) {
    if (await Bun.file(CACHE_XML_PATH).exists()) {
      const xml = await Bun.file(CACHE_XML_PATH).text();
      console.warn(`warn: RSS HTTP ${res.status}; using cached XML`);
      return {
        xml,
        etag: meta.etag,
        lastModified: meta.lastModified,
        fromCache: true,
        notModified: false,
      };
    }
    throw new Error(`RSS fetch failed: HTTP ${res.status} ${RSS_URL}`);
  }

  const xml = await res.text();
  const etag = res.headers.get('etag') ?? undefined;
  const lastModified = res.headers.get('last-modified') ?? undefined;
  await writeCache(xml, { etag, lastModified });
  return { xml, etag, lastModified, fromCache: false, notModified: false };
}

export async function writeReleaseIndex(
  entries: ReleaseEntry[],
  opts?: { etag?: string; lastModified?: string }
): Promise<ReleaseIndexFile> {
  const payload: ReleaseIndexFile = {
    generated: new Date().toISOString(),
    source: RSS_URL,
    ...(opts?.etag ? { etag: opts.etag } : {}),
    ...(opts?.lastModified ? { lastModified: opts.lastModified } : {}),
    count: entries.length,
    entries,
  };
  await Bun.write(RELEASE_INDEX_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

/** Fetch RSS (or use cache), parse, write release-index.json. */
export async function refreshReleaseIndex(opts?: {
  force?: boolean;
}): Promise<{ file: ReleaseIndexFile; map: Map<string, ReleaseEntry>; fetch: FetchRssResult }> {
  const fetchResult = await fetchRssXml(opts);
  const entries = parseReleaseEntries(fetchResult.xml);
  if (entries.length === 0) {
    throw new Error('RSS parse produced 0 release entries — feed malformed or filter too strict');
  }
  const file = await writeReleaseIndex(entries, {
    etag: fetchResult.etag,
    lastModified: fetchResult.lastModified,
  });
  return { file, map: buildReleaseMap(entries), fetch: fetchResult };
}

/** Load on-disk index; refresh from network if missing. */
export async function loadReleaseIndex(opts?: {
  refresh?: boolean;
  force?: boolean;
}): Promise<{ file: ReleaseIndexFile; map: Map<string, ReleaseEntry> }> {
  const needsRefresh =
    opts?.refresh || opts?.force || !(await Bun.file(RELEASE_INDEX_PATH).exists());
  if (needsRefresh) {
    const r = await refreshReleaseIndex({ force: opts?.force });
    return { file: r.file, map: r.map };
  }
  const file = (await Bun.file(RELEASE_INDEX_PATH).json()) as ReleaseIndexFile;
  const entries = Array.isArray(file.entries) ? file.entries : [];
  return { file, map: buildReleaseMap(entries) };
}

async function main(): Promise<void> {
  const force = Bun.argv.includes('--force');
  const { file, fetch: fr } = await refreshReleaseIndex({ force });
  const newest = file.entries[file.entries.length - 1];
  const oldest = file.entries[0];
  console.info(
    `✅ release-index ${file.count} releases → tools/release-index.json` +
      (fr.notModified ? ' (304 not modified)' : fr.fromCache ? ' (from cache)' : ' (fetched)') +
      (file.etag ? ` etag=${file.etag}` : '')
  );
  if (oldest) console.info(`   oldest: ${oldest.version}  ${oldest.url}`);
  if (newest) console.info(`   newest: ${newest.version}  ${newest.url}`);
}

if (import.meta.main) {
  await main();
}
