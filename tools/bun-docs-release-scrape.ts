#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/http/fetch — fetch
/**
 * bun-docs-release-scrape.ts — Phase 2b: release blog posts → SHIP/FIX/CHG overlay.
 *
 * Reads tools/release-index.json, fetches each post HTML (cached), parses sections,
 * exact-matches tokens against the catalog (+ config/pkg path aliases), writes:
 *   tools/bun-docs-release-overlay.json
 *   reports/release-scrape-review.jsonl (unmatched token-like candidates)
 *
 * Run:
 *   bun tools/bun-docs-release-scrape.ts
 *   bun tools/bun-docs-release-scrape.ts --force
 *   bun tools/bun-docs-release-scrape.ts --limit=5
 */
import { resolve } from 'node:path';
import {
  RELEASE_INDEX_PATH,
  type ReleaseEntry,
  type ReleaseIndexFile,
} from './bun-docs-release-index.ts';

const SCRAPE_ALIASES_PATH = resolve(import.meta.dir, 'bun-docs-scrape-aliases.json');

const CATALOG_PATH = resolve(import.meta.dir, 'bun-docs-catalog.json');
const REVIEW_LOG = resolve(import.meta.dir, '..', 'reports', 'release-scrape-review.jsonl');

export const RELEASE_OVERLAY_PATH = resolve(import.meta.dir, 'bun-docs-release-overlay.json');
const CACHE_DIR = resolve(import.meta.dir, '.cache', 'bun-blog-posts');
const STATE_PATH = resolve(CACHE_DIR, 'state.json');

export type ReleaseOverlayHit = {
  version: string;
  url: string;
  section: string;
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

type SectionKind = 'ship' | 'fix' | 'chg' | 'stabilize' | 'skip';

type ParsedSection = {
  heading: string;
  kind: SectionKind;
  html: string;
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

/** Headings that qualify as CHG sections (strict — not generic “Performance …” h2s). */
const CHG_HEADING_RE = /^(improvements?|changes?|breaking changes?|what'?s changed)\b/i;

/** Generic infra/perf h2s — skip rather than SHIP/CHG noise. */
const SKIP_HEADING_RE =
  /^(upgraded|updated|performance|memory|faster|reduced|smaller|cross-language|thanks|contributors|installing|release notes)/i;

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
  if (/^bug\s*fix|^bugfixes|^fixed\b/.test(t)) return 'fix';
  if (/stabiliz|graduat/.test(t)) return 'stabilize';
  if (CHG_HEADING_RE.test(t)) return 'chg';
  if (/new feature|^added\b/.test(t)) return 'ship';
  if (SKIP_HEADING_RE.test(t)) return 'skip';
  if (/^bun\.|^--|support in|built-in|\bapi\b|client for/i.test(heading)) return 'ship';
  return 'ship';
}

export function parseBlogSections(html: string): ParsedSection[] {
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html;
  const parts = article.split(/<h2\b[^>]*>/i);
  const sections: ParsedSection[] = [];

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]!;
    const close = chunk.indexOf('</h2>');
    if (close < 0) continue;
    const heading = stripTags(chunk.slice(0, close));
    const body = chunk.slice(close + 5);
    const kind = classifySectionHeading(heading);
    if (kind === 'skip') continue;
    sections.push({ heading, kind, html: body });
  }

  if (sections.length === 0) {
    sections.push({ heading: '(body)', kind: 'ship', html: article });
  }
  return sections;
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

function extractListItemText(section: ParsedSection): string[] {
  return [...section.html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => stripTags(m[1]!));
}

export function extractTokensFromSection(section: ParsedSection): string[] {
  const fromHeading = extractTokenCandidates(section.heading.split('—')[0]!);
  const fromCode = [...section.html.matchAll(/<code[^>]*>([^<]+)<\/code>/gi)]
    .map(m => decodeEntities(m[1]!.trim()))
    .flatMap(s => extractTokenCandidates(s));
  const fromLi = extractListItemText(section).flatMap(s => extractTokenCandidates(s));
  const fromBody = extractTokenCandidates(stripTags(section.html));
  return [...new Set([...fromHeading, ...fromCode, ...fromLi, ...fromBody])];
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
  return resolve(CACHE_DIR, `${hash}.html.json`);
}

type PostCache = {
  url: string;
  html: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: string;
};

async function ensureCacheDir(): Promise<void> {
  const keep = resolve(CACHE_DIR, '.keep');
  if (!(await Bun.file(keep).exists())) await Bun.write(keep, '');
}

async function fetchPostHtml(url: string, force?: boolean): Promise<string> {
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
    return (await Bun.file(STATE_PATH).json()) as ScrapeState;
  } catch {
    return { processedGuids: [] };
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
  section: ParsedSection
): void {
  let entry = map.get(normalizeTokenKey(tokenName));
  if (!entry) {
    entry = { name: tokenName, hits: [] };
    map.set(normalizeTokenKey(tokenName), entry);
  }

  const kind = section.kind === 'stabilize' ? 'stabilize' : section.kind;
  entry.hits.push({
    version: release.version,
    url: release.url,
    section: section.heading,
    kind,
  });

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
  const indexFile = (await Bun.file(RELEASE_INDEX_PATH).json()) as ReleaseIndexFile;
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
      const sectionText = stripTags(section.html);
      const candidates = [
        ...extractTokensFromSection(section),
        ...extractPathAliasMatches(sectionText, pathRows),
        ...extractListItemText(section).flatMap(li => extractPathAliasMatches(li, pathRows)),
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
        upsertOverlay(overlay, name, release, section);
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

export function releaseOverlayIndex(file: ReleaseOverlayFile): Map<string, ReleaseOverlayEntry> {
  return new Map(file.entries.map(e => [normalizeTokenKey(e.name), e]));
}

/** Load prior overlay for merge-on-incremental (empty when --force rebuild). */
export async function loadExistingOverlayMap(
  force?: boolean
): Promise<Map<string, ReleaseOverlayEntry>> {
  if (force) return new Map();
  if (!(await Bun.file(RELEASE_OVERLAY_PATH).exists())) return new Map();
  try {
    const file = (await Bun.file(RELEASE_OVERLAY_PATH).json()) as ReleaseOverlayFile;
    return releaseOverlayIndex(file);
  } catch {
    return new Map();
  }
}

async function main(): Promise<void> {
  const force = Bun.argv.includes('--force');
  const limitArg = Bun.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice(8)) : undefined;
  const file = await scrapeReleaseOverlay({
    force,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  const withShip = file.entries.filter(e => e.releasedIn).length;
  const withFix = file.entries.filter(e => e.fixedIn).length;
  const withChg = file.entries.filter(e => e.changedIn).length;
  console.info(
    `✅ release-overlay ${file.tokenCount} tokens from ${file.postsProcessed} posts → tools/bun-docs-release-overlay.json` +
      `  ship=${withShip} fix=${withFix} chg=${withChg}` +
      (file.unmatchedLogged
        ? `  review=${file.unmatchedLogged} → reports/release-scrape-review.jsonl`
        : '')
  );
}

if (import.meta.main) {
  await main();
}
