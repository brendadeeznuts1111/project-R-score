#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/nodejs-compat#fetch — fetch
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bun-docs-releases.ts — Phase 0 + 2b: RSS release index & release blog scrape.
 *
 * Phase 0: Fetches https://bun.com/rss.xml (conditional GET via ETag / Last-Modified),
 * filters release-like posts, normalises versions, and writes:
 *   tools/bun-docs-feeds.json (rss section) + legacy tools/release-index.json during transition
 *
 * Phase 2b: Reads RSS index, fetches each post HTML (cached), parses
 * sections, exact-matches tokens against the catalog (+ config/pkg path aliases), and
 * writes:
 *   tools/.cache/bun-release-overlay.json
 *   reports/release-scrape-review.jsonl (unmatched token-like candidates)
 *
 * Run:
 *   bun tools/bun-docs-releases.ts index [--force]
 *   bun tools/bun-docs-releases.ts scrape [--force] [--limit=N]
 *
 * Consumed by tools/bun-docs-catalog.ts for BLOG population and SHIP/FIX/CHG overlay.
 */
import { resolvePath } from '../lib/path-bun';
import {
  expandBunMinorVersion,
  parseXmlElementList,
  parseXmlText,
  versionFromBunBlogUrl,
} from '../lib/docs/bun-blog-url.ts';
import {
  LEGACY_RELEASE_OVERLAY_ABS,
  RELEASE_OVERLAY_CACHE_ABS,
} from '../lib/docs/docs-artifact-paths.ts';

export const RSS_URL = 'https://bun.com/rss.xml';

const ROOT = import.meta.dir;
export const RELEASE_INDEX_PATH = resolvePath(ROOT, 'release-index.json');
const RSS_CACHE_DIR = resolvePath(ROOT, '.cache', 'bun-rss');
const CACHE_XML_PATH = resolvePath(RSS_CACHE_DIR, 'rss.xml');
const CACHE_META_PATH = resolvePath(RSS_CACHE_DIR, 'meta.json');

const VERSION_RE = /\bv?(\d+\.\d+(?:\.\d+)?)\b/i;

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

function parseReleaseRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isReleaseSemver(value: unknown): value is string {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
}

/** Validate the persisted RSS contract before it can supply release evidence. */
export function parseReleaseIndexFile(value: unknown, source = 'release index'): ReleaseIndexFile {
  const file = parseReleaseRecord(value);
  if (!file) throw new Error(`${source}: expected an object`);
  if (!isIsoTimestamp(file.generated)) throw new Error(`${source}: generated is not ISO-8601`);
  if (file.source !== RSS_URL)
    throw new Error(`${source}: unexpected source ${String(file.source)}`);
  if (!Array.isArray(file.entries)) throw new Error(`${source}: entries must be an array`);
  if (!Number.isSafeInteger(file.count) || file.count !== file.entries.length) {
    throw new Error(`${source}: count does not match entries.length`);
  }

  const versions = new Set<string>();
  const guids = new Set<string>();
  for (const [index, raw] of file.entries.entries()) {
    const entry = parseReleaseRecord(raw);
    const label = `${source}: entries[${index}]`;
    if (!entry) throw new Error(`${label} must be an object`);
    if (!isReleaseSemver(entry.version)) throw new Error(`${label}.version is not X.Y.Z`);
    if (typeof entry.title !== 'string' || !entry.title) throw new Error(`${label}.title is empty`);
    if (typeof entry.url !== 'string' || !entry.url.startsWith('https://bun.com/blog/bun-v')) {
      throw new Error(`${label}.url is not an official Bun release post`);
    }
    if (typeof entry.guid !== 'string' || !entry.guid) throw new Error(`${label}.guid is empty`);
    if (!isIsoTimestamp(entry.pubDate)) throw new Error(`${label}.pubDate is not ISO-8601`);
    if (normalizeReleaseVersion(entry.title, entry.url) !== entry.version) {
      throw new Error(`${label}: title/url version does not match ${entry.version}`);
    }
    if (versions.has(entry.version))
      throw new Error(`${source}: duplicate version ${entry.version}`);
    if (guids.has(entry.guid)) throw new Error(`${source}: duplicate guid ${entry.guid}`);
    versions.add(entry.version);
    guids.add(entry.guid);
  }
  return file as ReleaseIndexFile;
}

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
  return expandBunMinorVersion(cleanBunVersion(version));
}

export function isReleasePost(title: string, url: string): boolean {
  if (!/^Bun\s/i.test(title)) return false;
  return VERSION_RE.test(title) || /\/blog\/(?:release-notes\/)?bun-v/i.test(url);
}

/**
 * Prefer URL path version (incl. `/blog/release-notes/bun-vX.Y.Z`); else title.
 * Two-part versions become X.Y.0.
 */
export function normalizeReleaseVersion(title: string, url: string): string | null {
  const fromUrl = versionFromBunBlogUrl(url);
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

function releaseEntryFromFields(fields: {
  title: string;
  url: string;
  guid: string;
  pubRaw: string;
}): ReleaseEntry | null {
  const { title, url, guid, pubRaw } = fields;
  if (!isReleasePost(title, url)) return null;
  const version = normalizeReleaseVersion(title, url);
  if (!version) return null;
  if (!pubRaw || !Number.isFinite(Date.parse(pubRaw))) {
    throw new Error(`release ${version} has an invalid pubDate: ${pubRaw || '(missing)'}`);
  }
  return {
    version,
    title,
    url,
    guid: guid || url,
    pubDate: new Date(pubRaw).toISOString(),
  };
}

/** Prefer Bun.XML (RSS 2.0 object shape); regex fallback for odd fixtures. */
export function parseReleaseEntries(xml: string): ReleaseEntry[] {
  const fromDom = parseReleaseEntriesViaBunXml(xml);
  const entries = fromDom ?? parseReleaseEntriesViaRegex(xml);
  entries.sort((a, b) => (a.pubDate < b.pubDate ? -1 : a.pubDate > b.pubDate ? 1 : 0));
  return entries;
}

// @see https://bun.com/docs/runtime/xml — Bun.XML.parse
function parseReleaseEntriesViaBunXml(xml: string): ReleaseEntry[] | null {
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

  const out: ReleaseEntry[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const entry = releaseEntryFromFields({
      title: parseXmlText(item.title),
      url: parseXmlText(item.link),
      guid: parseXmlText(item.guid),
      pubRaw: parseXmlText(item.pubDate),
    });
    if (!entry || seen.has(entry.version)) continue;
    seen.add(entry.version);
    out.push(entry);
  }
  return out;
}

function parseReleaseEntriesViaRegex(xml: string): ReleaseEntry[] {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => m[1]!);
  const out: ReleaseEntry[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const entry = releaseEntryFromFields({
      title: tagText(block, 'title'),
      url: tagText(block, 'link'),
      guid: tagText(block, 'guid'),
      pubRaw: tagText(block, 'pubDate'),
    });
    if (!entry || seen.has(entry.version)) continue;
    seen.add(entry.version);
    out.push(entry);
  }
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
  const keep = resolvePath(dir, '.keep');
  if (!(await Bun.file(keep).exists())) await Bun.write(keep, '');
}

async function writeCache(xml: string, meta: CacheMeta): Promise<void> {
  await ensureDir(RSS_CACHE_DIR);
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

/** Conditional GET of the Bun RSS feed (304 + validators — not fetchPage; that helper rejects non-OK). */
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
    res = await fetch(RSS_URL, {
      headers,
      // Without a timeout, a stalled CDN leaves `docs:feeds refresh --rss-only` hung forever.
      signal: AbortSignal.timeout(20_000),
    });
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
  opts?: { etag?: string; lastModified?: string; writeFeeds?: boolean }
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
  // Callers that already own `writeFeedsPartial` (refreshFeeds) pass writeFeeds:false
  // to avoid a second full rewrite of bun-docs-feeds.json mid-refresh.
  if (opts?.writeFeeds === false) return payload;
  try {
    const { writeFeedsPartial } = await import('./bun-docs-feeds.ts');
    await writeFeedsPartial({ rss: payload });
  } catch {
    /* feeds module optional during partial installs */
  }
  return payload;
}

/** Fetch RSS (or use cache), parse, write release-index.json. */
export async function refreshReleaseIndex(opts?: {
  force?: boolean;
  writeFeeds?: boolean;
}): Promise<{ file: ReleaseIndexFile; map: Map<string, ReleaseEntry>; fetch: FetchRssResult }> {
  const fetchResult = await fetchRssXml(opts);
  const entries = parseReleaseEntries(fetchResult.xml);
  if (entries.length === 0) {
    throw new Error('RSS parse produced 0 release entries — feed malformed or filter too strict');
  }
  const file = await writeReleaseIndex(entries, {
    etag: fetchResult.etag,
    lastModified: fetchResult.lastModified,
    writeFeeds: opts?.writeFeeds,
  });
  return { file, map: buildReleaseMap(entries), fetch: fetchResult };
}

/** Load on-disk index; refresh from network if missing. */
export async function loadReleaseIndex(opts?: {
  refresh?: boolean;
  force?: boolean;
}): Promise<{ file: ReleaseIndexFile; map: Map<string, ReleaseEntry> }> {
  const needsRefresh =
    opts?.refresh ||
    opts?.force ||
    (!(await Bun.file(RELEASE_INDEX_PATH).exists()) &&
      !(await Bun.file(
        (await import('../lib/docs/docs-artifact-paths.ts')).DOCS_FEEDS_ABS
      ).exists()));
  if (needsRefresh) {
    const r = await refreshReleaseIndex({ force: opts?.force });
    return { file: r.file, map: r.map };
  }
  const { loadFeeds } = await import('./bun-docs-feeds.ts');
  const feeds = await loadFeeds();
  const file = parseReleaseIndexFile(feeds.rss, 'tools/bun-docs-feeds.json#rss');
  const entries = file.entries;
  if (entries.length === 0) {
    throw new Error('tools/bun-docs-feeds.json#rss has no releases; refresh the RSS feed');
  }
  return { file, map: buildReleaseMap(entries) };
}

// --- Phase 2b: release blog scrape ---

const SCRAPE_ALIASES_PATH = resolvePath(ROOT, 'bun-docs-scrape-aliases.json');

const CATALOG_PATH = resolvePath(ROOT, 'bun-docs-catalog.json');
const REVIEW_LOG = resolvePath(ROOT, '..', 'reports', 'release-scrape-review.jsonl');

export const RELEASE_OVERLAY_PATH = RELEASE_OVERLAY_CACHE_ABS;
/** @deprecated tracked overlay — legacy read fallback only */
export const LEGACY_RELEASE_OVERLAY_PATH = LEGACY_RELEASE_OVERLAY_ABS;
const BLOG_CACHE_DIR = resolvePath(ROOT, '.cache', 'bun-blog-posts');
const STATE_PATH = resolvePath(BLOG_CACHE_DIR, 'state.json');

export type ReleaseOverlayHit = {
  version: string;
  url: string;
  /** Official Bun RSS publication timestamp for this release post. */
  publishedAt?: string;
  section: string;
  /** Token-local excerpt that justified this event classification. */
  evidence?: string;
  kind: 'ship' | 'fix' | 'chg' | 'stabilize';
};

export type ReleaseOverlayEntry = {
  /** Canonical catalog token name */
  name: string;
  releasedIn?: string;
  fixedIn?: string;
  changedIn?: string;
  changeNote?: string;
  hits: ReleaseOverlayHit[];
};

export type ReleaseOverlayFile = {
  generated: string;
  postsProcessed: number;
  tokenCount: number;
  unmatchedLogged: number;
  entries: ReleaseOverlayEntry[];
};

type ScrapeState = {
  processedGuids: string[];
  lastGuid?: string;
  lastPubDate?: string;
};

type SectionKind = 'ship' | 'fix' | 'chg' | 'stabilize' | 'attest' | 'skip';

type ParsedSection = {
  heading: string;
  kind: SectionKind;
  html: string;
  level?: number;
  parentHeading?: string;
};

type CatalogRow = {
  name: string;
  type: string;
  aliases?: string[];
};

type TokenIndex = Map<string, string>;

function normalizeTokenKey(name: string): string {
  return name
    .trim()
    .replace(/^bun\./i, 'Bun.')
    .replace(/^--/, '--')
    .toLowerCase();
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const TOKEN_PATTERNS = [
  /\b(Bun\.[A-Za-z][\w.]*)\b/g,
  /\b(bun:[a-z][\w-]*)\b/g,
  /(--[a-zA-Z][\w-]+)/g,
  /\b(BUN_[A-Z][A-Z0-9_]*)\b/g,
] as const;

/** Headings that qualify as CHG sections (strict — not generic "Performance …" h2s). */
const CHG_HEADING_RE = /^(improvements?|changes?|breaking changes?|what'?s changed)\b/i;

/** Generic non-feature headings that should not create API history events. */
const SKIP_HEADING_RE = /^(upgraded|thanks|contributors|installing|release notes)/i;

const GENERIC_ATTEST_HEADING_RE =
  /^(?:\(body\)|what'?s new|changelog|full changelog|bun apis?(?:\s*&\s*standards)?|apis?\s*&\s*standards)$/i;
const EXPLICIT_SHIP_RE =
  /\b(?:new|add(?:s|ed)|introduc(?:e[ds]?|ing)|built[ -]in|first[ -]class|initial support|api for)\b/i;
const EXPLICIT_FIX_RE = /\b(?:bug ?fix(?:es)?|fixed|fixes|regression|crash fix)\b/i;
const EXPLICIT_CHANGE_RE =
  /\b(?:improv(?:e|ed|ement|ements)|faster|performance|updated?|upgrade[ds]?|changed?|breaking|supports?|options?|case-insensitive|strict|now (?:supports?|uses?|returns?|accepts?|respects?|includes?))\b/i;
const RETROSPECTIVE_RELEASE_RE =
  /\b(?:last (?:week|month|release)|recent release|previous release|previously|earlier|already|has existed|have existed)\b/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifySectionHeading(heading: string): SectionKind {
  const t = heading.toLowerCase().trim();
  if (!t) return 'skip';
  if (EXPLICIT_FIX_RE.test(t)) return 'fix';
  if (/stabiliz|graduat/.test(t)) return 'stabilize';
  if (GENERIC_ATTEST_HEADING_RE.test(t)) return 'attest';
  if (SKIP_HEADING_RE.test(t)) return 'skip';
  if (EXPLICIT_SHIP_RE.test(t)) return 'ship';
  if (CHG_HEADING_RE.test(t)) return 'chg';
  if (EXPLICIT_CHANGE_RE.test(t)) return 'chg';
  if (/^bun\.|^--|^bun:|\bapi\b|client for/i.test(heading)) return 'ship';
  return 'attest';
}

export function parseBlogSections(html: string): ParsedSection[] {
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
  const headings = [...article.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(match => ({
    start: match.index,
    end: match.index + match[0].length,
    level: Number(match[1]),
    heading: stripTags(match[2]!),
  }));
  const sections: ParsedSection[] = [];
  const stack: Array<{ level: number; heading: string; kind: SectionKind }> = [];

  for (let index = 0; index < headings.length; index++) {
    const current = headings[index]!;
    while (stack.at(-1) && stack.at(-1)!.level >= current.level) stack.pop();
    const parent = stack.at(-1);
    const ownKind = classifySectionHeading(current.heading);
    const explicitShip = EXPLICIT_SHIP_RE.test(current.heading);
    const kind =
      parent?.kind === 'fix' && !explicitShip
        ? 'fix'
        : parent?.kind === 'chg' && !explicitShip && ownKind !== 'fix'
          ? 'chg'
          : parent?.kind === 'stabilize' && ownKind === 'attest'
            ? 'stabilize'
            : parent?.kind === 'ship' && ownKind === 'attest'
              ? 'ship'
              : ownKind;
    const body = article.slice(current.end, headings[index + 1]?.start ?? article.length);
    stack.push({ level: current.level, heading: current.heading, kind });
    if (kind === 'skip') continue;
    sections.push({
      heading: current.heading,
      kind,
      html: body,
      level: current.level,
      ...(parent ? { parentHeading: parent.heading } : {}),
    });
  }

  if (sections.length === 0) {
    sections.push({ heading: '(body)', kind: 'attest', html: article });
  }
  return sections;
}

function classifyEvidenceText(text: string, fallback: SectionKind): SectionKind {
  if (EXPLICIT_FIX_RE.test(text)) return 'fix';
  if (/\b(?:stabiliz|graduat)/i.test(text)) return 'stabilize';
  if (EXPLICIT_SHIP_RE.test(text)) return 'ship';
  if (EXPLICIT_CHANGE_RE.test(text)) return 'chg';
  return fallback;
}

type EvidenceRegion = { text: string; html: string; kind: SectionKind };

/** Split broad release sections into local evidence regions before classifying tokens. */
export function extractEvidenceRegions(section: ParsedSection): EvidenceRegion[] {
  const regions: EvidenceRegion[] = [];
  const seen = new Set<string>();
  const add = (html: string, classify = true): void => {
    const text = stripTags(html);
    if (!text) return;
    const kind = classify ? classifyEvidenceText(text, section.kind) : section.kind;
    const key = `${kind}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    regions.push({ text, html, kind });
  };
  add(section.heading, false);
  for (const match of section.html.matchAll(/<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)) {
    add(match[1]!);
  }
  if (regions.length === 1) add(section.html);
  return regions;
}

function textMentionsToken(text: string, token: string): boolean {
  return tokenMentionPattern(token).test(text);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenMentionPattern(token: string): RegExp {
  return new RegExp(`${escapeRegExp(token)}(?![\\w.-])`, 'i');
}

function tokenIntroductionPattern(token: string): RegExp {
  const escaped = escapeRegExp(token);
  const end = String.raw`(?![\w.-])`;
  const notChildFeature = String.raw`(?!\s+(?:fields?|flags?|formats?|hooks?|matchers?|methods?|options?|properties)\b)`;
  return new RegExp(
    String.raw`(?:\b(?:new|add(?:s|ed)|introduc(?:e[ds]?|ing)|first[ -]class)\s+(?:the\s+)?${escaped}${end}${notChildFeature}(?!\s*\()|\b(?:introduc(?:e[ds]?|ing)|add(?:s|ed))\s+(?:a\s+|the\s+)?(?:built[ -]in\s+)?${escaped}${end}${notChildFeature}|\b(?:now includes|can now\b.{0,48}\busing)\s+(?:a\s+|the\s+)?built[ -]in\s+${escaped}${end}|\b${escaped}${end}\s*(?:\(\))?\s+(?:is|was|are|were)\s+(?:a\s+|the\s+)?(?:new|introduced|first[ -]class)\b)`,
    'i'
  );
}

function rejectedShipKind(sectionKind: SectionKind, evidenceText: string): SectionKind {
  if (sectionKind === 'fix' || sectionKind === 'chg' || sectionKind === 'stabilize') {
    return sectionKind;
  }
  return /\b(?:new|add(?:s|ed)|introduc(?:e[ds]?|ing))\b/i.test(evidenceText) ? 'chg' : 'attest';
}

/** Require token-local introduction language before promoting a ship event. */
export function isShipEvidence(
  candidate: string,
  canonicalName: string,
  evidenceText: string,
  sectionHeading: string
): boolean {
  const tokens = [...new Set([candidate, canonicalName])];
  if (!tokens.some(token => textMentionsToken(evidenceText, token))) return false;
  if (RETROSPECTIVE_RELEASE_RE.test(evidenceText)) return false;
  if (tokens.some(token => tokenIntroductionPattern(token).test(evidenceText))) return true;
  return tokens.some(token => tokenIntroductionPattern(token).test(sectionHeading));
}

export function extractTokenCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const re of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const raw = m[1]!.trim();
      if (raw.length < 3) continue;
      found.add(raw);
    }
  }
  return [...found];
}

/** bunfig path patterns for config-key entries, e.g. install.linker → [install].linker */
export function configKeyPatterns(name: string): RegExp[] {
  if (!name.includes('.')) {
    return [new RegExp(`\\[${escapeRe(name)}\\]`, 'i')];
  }
  const [section, ...rest] = name.split('.');
  const key = rest.join('.');
  return [
    new RegExp(`\\[${escapeRe(section!)}\\]\\.${escapeRe(key)}\\b`, 'i'),
    new RegExp(`\\[${escapeRe(section!)}\\]\\s+${escapeRe(key)}\\b`, 'i'),
    new RegExp(`\\b${escapeRe(section!)}\\.${escapeRe(key)}\\b`, 'i'),
  ];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractPathAliasMatches(text: string, rows: CatalogRow[]): string[] {
  const matched = new Set<string>();
  for (const e of rows) {
    if (e.type === 'config-key') {
      for (const re of configKeyPatterns(e.name)) {
        if (re.test(text)) {
          matched.add(e.name);
          break;
        }
      }
    } else if (e.type === 'package-json-key') {
      if (new RegExp(`\\b${escapeRe(e.name)}\\b`).test(text)) {
        matched.add(e.name);
      }
    }
  }
  return [...matched];
}

export async function loadCatalogRows(): Promise<CatalogRow[]> {
  if (!(await Bun.file(CATALOG_PATH).exists())) return [];
  const j = (await Bun.file(CATALOG_PATH).json()) as { entries?: CatalogRow[] };
  return j.entries ?? [];
}

export async function buildTokenIndex(): Promise<TokenIndex> {
  const rows = await loadCatalogRows();
  const index = new Map<string, string>();
  for (const e of rows) {
    index.set(normalizeTokenKey(e.name), e.name);
    for (const a of e.aliases ?? []) {
      index.set(normalizeTokenKey(a), e.name);
    }
  }
  return index;
}

export function matchCatalogToken(candidate: string, index: TokenIndex): string | undefined {
  const direct = index.get(normalizeTokenKey(candidate));
  if (direct) return direct;
  const noParens = candidate.replace(/\([^)]*\)/g, '').trim();
  if (noParens !== candidate) {
    const alt = index.get(normalizeTokenKey(noParens));
    if (alt) return alt;
  }
  return undefined;
}

let scrapeAliasCache: Record<string, string> | null = null;

export async function loadScrapeAliases(): Promise<Record<string, string>> {
  if (scrapeAliasCache) return scrapeAliasCache;
  try {
    const raw = (await Bun.file(SCRAPE_ALIASES_PATH).json()) as {
      aliases?: Record<string, string>;
    };
    scrapeAliasCache = raw.aliases ?? {};
  } catch {
    scrapeAliasCache = {};
  }
  return scrapeAliasCache;
}

export function matchCatalogTokenWithAliases(
  candidate: string,
  index: TokenIndex,
  aliases: Record<string, string>
): string | undefined {
  const direct = matchCatalogToken(candidate, index);
  if (direct) return direct;
  const mapped = aliases[candidate] ?? aliases[candidate.trim()];
  if (mapped) return matchCatalogToken(mapped, index) ?? mapped;
  return undefined;
}

function looksTokenLike(candidate: string): boolean {
  return (
    /^Bun\.[A-Za-z]/.test(candidate) ||
    /^--[a-zA-Z]/.test(candidate) ||
    /^bun:[a-z]/.test(candidate) ||
    /^BUN_[A-Z]/.test(candidate)
  );
}

async function appendReviewLog(
  rows: Array<{ version: string; url: string; section: string; candidate: string }>
): Promise<void> {
  if (rows.length === 0) return;
  const prev = (await Bun.file(REVIEW_LOG).exists()) ? await Bun.file(REVIEW_LOG).text() : '';
  const chunk =
    rows.map(r => JSON.stringify({ ts: new Date().toISOString(), ...r })).join('\n') + '\n';
  await Bun.write(REVIEW_LOG, prev + chunk);
}

function cachePathFor(url: string): string {
  const hash = new Bun.CryptoHasher('sha256').update(url).digest('hex').slice(0, 24);
  return resolvePath(BLOG_CACHE_DIR, `${hash}.html.json`);
}

type PostCache = {
  url: string;
  html: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: string;
};

async function ensureCacheDir(): Promise<void> {
  const keep = resolvePath(BLOG_CACHE_DIR, '.keep');
  if (!(await Bun.file(keep).exists())) await Bun.write(keep, '');
}

export async function fetchPostHtml(url: string, force?: boolean): Promise<string> {
  const cachePath = cachePathFor(url);
  let prev: PostCache | null = null;
  if (!force && (await Bun.file(cachePath).exists())) {
    try {
      prev = (await Bun.file(cachePath).json()) as PostCache;
    } catch {
      prev = null;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'text/html',
    'User-Agent': 'bun-docs-release-scrape/1.0',
  };
  if (!force && prev?.etag) headers['If-None-Match'] = prev.etag;
  if (!force && prev?.lastModified) headers['If-Modified-Since'] = prev.lastModified;

  try {
    const res = await fetch(url, { headers });
    if (res.status === 304 && prev) return prev.html;
    if (!res.ok) return prev?.html ?? '';
    const html = await res.text();
    await ensureCacheDir();
    await Bun.write(
      cachePath,
      `${JSON.stringify(
        {
          url,
          html,
          etag: res.headers.get('etag') ?? undefined,
          lastModified: res.headers.get('last-modified') ?? undefined,
          fetchedAt: new Date().toISOString(),
        } satisfies PostCache,
        null,
        2
      )}\n`
    );
    return html;
  } catch {
    return prev?.html ?? '';
  }
}

async function readState(): Promise<ScrapeState> {
  if (!(await Bun.file(STATE_PATH).exists())) return { processedGuids: [] };
  try {
    const raw = parseReleaseRecord(await Bun.file(STATE_PATH).json());
    if (!raw || !Array.isArray(raw.processedGuids)) {
      throw new Error('processedGuids must be an array');
    }
    if (!raw.processedGuids.every(guid => typeof guid === 'string' && guid.length > 0)) {
      throw new Error('processedGuids must contain non-empty strings');
    }
    if (new Set(raw.processedGuids).size !== raw.processedGuids.length) {
      throw new Error('processedGuids contains duplicates');
    }
    if (raw.lastGuid !== undefined && (typeof raw.lastGuid !== 'string' || !raw.lastGuid)) {
      throw new Error('lastGuid must be a non-empty string');
    }
    if (raw.lastPubDate !== undefined && !isIsoTimestamp(raw.lastPubDate)) {
      throw new Error('lastPubDate is not ISO-8601');
    }
    return raw as ScrapeState;
  } catch (error) {
    throw new Error(`${STATE_PATH}: unreadable release scrape state`, { cause: error });
  }
}

async function writeState(state: ScrapeState): Promise<void> {
  await ensureCacheDir();
  await Bun.write(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function upsertOverlay(
  map: Map<string, ReleaseOverlayEntry>,
  tokenName: string,
  release: ReleaseEntry,
  section: ParsedSection,
  evidence: string
): void {
  let entry = map.get(normalizeTokenKey(tokenName));
  if (!entry) {
    entry = { name: tokenName, hits: [] };
    map.set(normalizeTokenKey(tokenName), entry);
  }

  if (section.kind === 'skip' || section.kind === 'attest') return;
  const kind: 'ship' | 'fix' | 'chg' | 'stabilize' =
    section.kind === 'stabilize' ? 'stabilize' : section.kind;
  const hit: ReleaseOverlayHit = {
    version: release.version,
    url: release.url,
    publishedAt: release.pubDate,
    section: section.heading,
    evidence,
    kind,
  };
  if (
    !entry.hits.some(
      current =>
        current.version === hit.version &&
        current.url === hit.url &&
        current.publishedAt === hit.publishedAt &&
        current.section === hit.section &&
        current.evidence === hit.evidence &&
        current.kind === hit.kind
    )
  ) {
    entry.hits.push(hit);
  }

  const v = release.version;
  if (kind === 'ship') {
    if (!entry.releasedIn || compareSemver(v, entry.releasedIn) < 0) {
      entry.releasedIn = v;
    }
  } else if (kind === 'fix') {
    if (!entry.fixedIn || compareSemver(v, entry.fixedIn) > 0) {
      entry.fixedIn = v;
    }
  } else if (kind === 'chg' || kind === 'stabilize') {
    if (!entry.changedIn || compareSemver(v, entry.changedIn) > 0) {
      entry.changedIn = v;
    }
    if (kind === 'stabilize' && !entry.changeNote) {
      entry.changeNote = `Stabilized in Bun v${v}`;
    }
  }
}

export async function scrapeReleaseOverlay(opts?: {
  force?: boolean;
  limit?: number;
}): Promise<ReleaseOverlayFile> {
  const { file: indexFile } = await loadReleaseIndex({ refresh: false });
  const releases = [...indexFile.entries].sort((a, b) =>
    a.pubDate < b.pubDate ? -1 : a.pubDate > b.pubDate ? 1 : 0
  );
  const tokenIndex = await buildTokenIndex();
  const scrapeAliases = await loadScrapeAliases();
  const catalogRows = await loadCatalogRows();
  const pathRows = catalogRows.filter(
    e => e.type === 'config-key' || e.type === 'package-json-key'
  );
  const state = opts?.force ? { processedGuids: [] } : await readState();
  const processed = new Set(state.processedGuids);
  const overlay = await loadExistingOverlayMap(opts?.force);
  if (!opts?.force && processed.size > 0 && overlay.size === 0) {
    throw new Error(
      'release scrape state records processed posts but its overlay is missing or empty; rerun with --force'
    );
  }
  const reviewRows: Array<{ version: string; url: string; section: string; candidate: string }> =
    [];

  let postsProcessed = 0;
  const slice = opts?.limit ? releases.slice(-opts.limit) : releases;

  for (const release of slice) {
    if (!opts?.force && processed.has(release.guid)) continue;
    const html = await fetchPostHtml(release.url, opts?.force);
    if (!html) continue;
    const sections = parseBlogSections(html);
    for (const section of sections) {
      for (const region of extractEvidenceRegions(section)) {
        if (region.kind === 'skip' || region.kind === 'attest') continue;
        const candidates = [
          ...extractTokenCandidates(region.text),
          ...extractPathAliasMatches(region.text, pathRows),
        ];
        const seen = new Set<string>();
        for (const c of candidates) {
          if (seen.has(c)) continue;
          seen.add(c);
          const name =
            matchCatalogTokenWithAliases(c, tokenIndex, scrapeAliases) ??
            (pathRows.some(r => r.name === c) ? c : undefined);
          if (!name) {
            if (looksTokenLike(c)) {
              reviewRows.push({
                version: release.version,
                url: release.url,
                section: section.heading,
                candidate: c,
              });
            }
            continue;
          }
          const kind =
            region.kind === 'ship' && !isShipEvidence(c, name, region.text, section.heading)
              ? rejectedShipKind(section.kind, region.text)
              : region.kind;
          upsertOverlay(
            overlay,
            name,
            release,
            {
              ...section,
              kind,
              html: region.html,
            },
            region.text
          );
        }
      }
    }
    processed.add(release.guid);
    postsProcessed++;
    state.processedGuids = [...processed];
    state.lastGuid = release.guid;
    state.lastPubDate = release.pubDate;
  }

  await writeState(state);
  await appendReviewLog(reviewRows);

  const entries = [...overlay.values()].sort((a, b) => a.name.localeCompare(b.name));
  const file: ReleaseOverlayFile = {
    generated: new Date().toISOString(),
    postsProcessed,
    tokenCount: entries.length,
    unmatchedLogged: reviewRows.length,
    entries,
  };
  await Bun.write(RELEASE_OVERLAY_PATH, `${JSON.stringify(file, null, 2)}\n`);
  return file;
}

async function readOverlayFile(path: string): Promise<ReleaseOverlayFile | null> {
  const f = Bun.file(path);
  if (!(await f.exists())) return null;
  try {
    return parseReleaseOverlayFile(await f.json(), path);
  } catch (error) {
    throw new Error(`${path}: unreadable release overlay`, { cause: error });
  }
}

/** Validate the incremental overlay before prior evidence is merged into a new scrape. */
export function parseReleaseOverlayFile(
  value: unknown,
  source = 'release overlay'
): ReleaseOverlayFile {
  const file = parseReleaseRecord(value);
  if (!file) throw new Error(`${source}: expected an object`);
  if (!isIsoTimestamp(file.generated)) throw new Error(`${source}: generated is not ISO-8601`);
  if (!Array.isArray(file.entries)) throw new Error(`${source}: entries must be an array`);
  if (!Number.isSafeInteger(file.tokenCount) || file.tokenCount !== file.entries.length) {
    throw new Error(`${source}: tokenCount does not match entries.length`);
  }
  for (const key of ['postsProcessed', 'unmatchedLogged'] as const) {
    if (!Number.isSafeInteger(file[key]) || (file[key] as number) < 0) {
      throw new Error(`${source}: ${key} must be a non-negative safe integer`);
    }
  }

  const names = new Set<string>();
  for (const [entryIndex, rawEntry] of file.entries.entries()) {
    const entry = parseReleaseRecord(rawEntry);
    const label = `${source}: entries[${entryIndex}]`;
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) {
      throw new Error(`${label}.name is empty`);
    }
    const normalizedName = normalizeTokenKey(entry.name);
    if (names.has(normalizedName)) throw new Error(`${source}: duplicate token ${entry.name}`);
    names.add(normalizedName);
    if (!Array.isArray(entry.hits)) throw new Error(`${label}.hits must be an array`);
    for (const scalar of ['releasedIn', 'fixedIn', 'changedIn'] as const) {
      if (entry[scalar] !== undefined && !isReleaseSemver(entry[scalar])) {
        throw new Error(`${label}.${scalar} is not X.Y.Z`);
      }
    }
    for (const [hitIndex, rawHit] of entry.hits.entries()) {
      const hit = parseReleaseRecord(rawHit);
      const hitLabel = `${label}.hits[${hitIndex}]`;
      if (!hit || !isReleaseSemver(hit.version)) {
        throw new Error(`${hitLabel}.version is not X.Y.Z`);
      }
      if (
        typeof hit.url !== 'string' ||
        !hit.url.startsWith('https://bun.com/blog/bun-v') ||
        normalizeReleaseVersion('', hit.url) !== hit.version
      ) {
        throw new Error(`${hitLabel}.url does not match version ${hit.version}`);
      }
      if (!isIsoTimestamp(hit.publishedAt)) {
        throw new Error(`${hitLabel}.publishedAt is not ISO-8601`);
      }
      if (typeof hit.section !== 'string' || !hit.section.trim()) {
        throw new Error(`${hitLabel}.section is empty`);
      }
      if (!['ship', 'fix', 'chg', 'stabilize'].includes(String(hit.kind))) {
        throw new Error(`${hitLabel}.kind is invalid`);
      }
      if (
        hit.evidence !== undefined &&
        (typeof hit.evidence !== 'string' || !hit.evidence.trim())
      ) {
        throw new Error(`${hitLabel}.evidence is empty`);
      }
    }
  }
  return file as ReleaseOverlayFile;
}

export function releaseOverlayIndex(file: ReleaseOverlayFile): Map<string, ReleaseOverlayEntry> {
  return new Map(file.entries.map(e => [normalizeTokenKey(e.name), e]));
}

/** Load prior overlay for merge-on-incremental (empty when --force rebuild). */
export async function loadExistingOverlayMap(
  force?: boolean
): Promise<Map<string, ReleaseOverlayEntry>> {
  if (force) return new Map();
  for (const path of [RELEASE_OVERLAY_PATH, LEGACY_RELEASE_OVERLAY_PATH]) {
    const file = await readOverlayFile(path);
    if (file) return releaseOverlayIndex(file);
  }
  return new Map();
}

// --- CLI ---

async function runIndex(force: boolean): Promise<void> {
  const { file, fetch: fr } = await refreshReleaseIndex({ force });
  const newest = file.entries[file.entries.length - 1];
  const oldest = file.entries[0];
  console.info(
    `✅ release-index ${file.count} releases → tools/bun-docs-feeds.json (rss)` +
      (fr.notModified ? ' (304 not modified)' : fr.fromCache ? ' (from cache)' : ' (fetched)') +
      (file.etag ? ` etag=${file.etag}` : '')
  );
  if (oldest) console.info(`   oldest: ${oldest.version}  ${oldest.url}`);
  if (newest) console.info(`   newest: ${newest.version}  ${newest.url}`);
}

async function runScrape(force: boolean, limit?: number): Promise<void> {
  const file = await scrapeReleaseOverlay({
    force,
    limit,
  });
  const withShip = file.entries.filter(e => e.releasedIn).length;
  const withFix = file.entries.filter(e => e.fixedIn).length;
  const withChg = file.entries.filter(e => e.changedIn).length;
  console.info(
    `✅ release-overlay ${file.tokenCount} tokens from ${file.postsProcessed} posts → tools/.cache/bun-release-overlay.json` +
      `  ship=${withShip} fix=${withFix} chg=${withChg}` +
      (file.unmatchedLogged
        ? `  review=${file.unmatchedLogged} → reports/release-scrape-review.jsonl`
        : '')
  );
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('docs:release-index', Bun.argv.slice(2));
  const sub = args[0] === 'scrape' ? 'scrape' : 'index';
  const force = args.includes('--force');
  if (sub === 'scrape') {
    const limitArg = args.find(a => a.startsWith('--limit='));
    const limit = limitArg ? Number(limitArg.slice(8)) : undefined;
    await runScrape(force, Number.isFinite(limit) ? limit : undefined);
  } else {
    await runIndex(force);
  }
}

if (import.meta.main) {
  await main();
}
