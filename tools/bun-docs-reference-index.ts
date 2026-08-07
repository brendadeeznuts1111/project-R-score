#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/nodejs-compat#fetch — fetch
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bun-docs-reference-index.ts — Phase 0b: API reference index from bun.com/reference.
 *
 * Fetches https://bun.com/reference (conditional GET), extracts /reference/… links,
 * and writes tools/reference-index.json for docs coverage verification.
 *
 * Run:
 *   bun tools/bun-docs-reference-index.ts index [--force]
 */
import { bunReference } from '../lib/docs/bun-site-url.ts';
import { resolvePath } from '../lib/path-bun';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('docs:reference-index', Bun.argv.slice(2))
  : Bun.argv.slice(2);
export const REFERENCE_URL = 'https://bun.com/reference';

const ROOT = import.meta.dir;
export const REFERENCE_INDEX_PATH = resolvePath(ROOT, 'reference-index.json');
const CACHE_DIR = resolvePath(ROOT, '.cache', 'bun-reference');
const CACHE_HTML_PATH = resolvePath(CACHE_DIR, 'reference.html');
const CACHE_META_PATH = resolvePath(CACHE_DIR, 'meta.json');

export type ReferencePageEntry = {
  url: string;
  path: string;
  title?: string;
};

export type ReferenceIndexFile = {
  generated: string;
  source: string;
  etag?: string;
  lastModified?: string;
  count: number;
  moduleCount: number;
  modules: string[];
  pages: ReferencePageEntry[];
};

type CacheMeta = {
  etag?: string;
  lastModified?: string;
  fetchedAt?: string;
};

const HREF_RE = /href=["'](\/reference\/[^"'#?]+)["']/gi;

/** Normalize reference path (no leading slash, no trailing slash). */
export function normalizeReferencePath(path: string): string {
  return path
    .replace(/^\/reference\/?/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

/** Extract unique /reference/… links from HTML. */
export function parseReferenceLinks(html: string): ReferencePageEntry[] {
  const seen = new Set<string>();
  const pages: ReferencePageEntry[] = [];

  for (const m of html.matchAll(HREF_RE)) {
    const raw = m[1]!;
    const path = normalizeReferencePath(raw);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    pages.push({
      url: bunReference(path),
      path,
    });
  }

  pages.sort((a, b) => a.path.localeCompare(b.path));
  return pages;
}

/**
 * Derive module ids from reference paths (e.g. bun/sqlite → bun:sqlite, node/fs → node:fs).
 */
export function deriveReferenceModules(pages: ReferencePageEntry[]): string[] {
  const modules = new Set<string>();
  for (const p of pages) {
    const parts = p.path.split('/');
    if (
      parts.length >= 2 &&
      (parts[0] === 'bun' || parts[0] === 'node' || parts[0] === 'globals')
    ) {
      if (parts[0] === 'globals') {
        modules.add(`globals/${parts[1]}`);
        continue;
      }
      if (parts.length === 2) {
        modules.add(`${parts[0]}:${parts[1]}`);
      } else if (parts.length >= 3) {
        modules.add(`${parts[0]}:${parts[1]}`);
      }
    }
  }
  return [...modules].sort();
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

async function writeCache(html: string, meta: CacheMeta): Promise<void> {
  await ensureDir(CACHE_DIR);
  await Bun.write(CACHE_HTML_PATH, html);
  await Bun.write(
    CACHE_META_PATH,
    `${JSON.stringify({ ...meta, fetchedAt: new Date().toISOString() }, null, 2)}\n`
  );
}

export type FetchReferenceResult = {
  html: string;
  etag?: string;
  lastModified?: string;
  fromCache: boolean;
  notModified: boolean;
};

/** Conditional GET of bun.com/reference. */
export async function fetchReferenceHtml(opts?: {
  force?: boolean;
}): Promise<FetchReferenceResult> {
  const force = opts?.force ?? false;
  const meta = await readCacheMeta();
  const headers: Record<string, string> = {
    Accept: 'text/html, application/xhtml+xml, */*',
    'User-Agent': 'bun-docs-reference-index/1.0 (+https://bun.com/reference)',
  };
  if (!force && meta.etag) headers['If-None-Match'] = meta.etag;
  if (!force && meta.lastModified) headers['If-Modified-Since'] = meta.lastModified;

  let res: Response;
  try {
    res = await fetch(REFERENCE_URL, { headers });
  } catch (err) {
    if (await Bun.file(CACHE_HTML_PATH).exists()) {
      const html = await Bun.file(CACHE_HTML_PATH).text();
      return {
        html,
        etag: meta.etag,
        lastModified: meta.lastModified,
        fromCache: true,
        notModified: true,
      };
    }
    throw err;
  }

  if (res.status === 304 && (await Bun.file(CACHE_HTML_PATH).exists())) {
    const html = await Bun.file(CACHE_HTML_PATH).text();
    return {
      html,
      etag: res.headers.get('etag') ?? meta.etag,
      lastModified: res.headers.get('last-modified') ?? meta.lastModified,
      fromCache: true,
      notModified: true,
    };
  }

  if (!res.ok) {
    if (await Bun.file(CACHE_HTML_PATH).exists()) {
      const html = await Bun.file(CACHE_HTML_PATH).text();
      return { html, fromCache: true, notModified: true };
    }
    throw new Error(`reference fetch failed: ${res.status}`);
  }

  const html = await res.text();
  const etag = res.headers.get('etag') ?? undefined;
  const lastModified = res.headers.get('last-modified') ?? undefined;
  await writeCache(html, { etag, lastModified });
  return { html, etag, lastModified, fromCache: false, notModified: false };
}

export async function writeReferenceIndex(
  pages: ReferencePageEntry[],
  meta: { etag?: string; lastModified?: string }
): Promise<ReferenceIndexFile> {
  const modules = deriveReferenceModules(pages);
  const payload: ReferenceIndexFile = {
    generated: new Date().toISOString(),
    source: REFERENCE_URL,
    etag: meta.etag,
    lastModified: meta.lastModified,
    count: pages.length,
    moduleCount: modules.length,
    modules,
    pages,
  };
  await Bun.write(REFERENCE_INDEX_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  try {
    const { writeFeedsPartial } = await import('./bun-docs-feeds.ts');
    await writeFeedsPartial({ reference: payload });
  } catch {
    /* feeds module optional during partial installs */
  }
  return payload;
}

export async function refreshReferenceIndex(opts?: {
  force?: boolean;
}): Promise<{ file: ReferenceIndexFile; fetch: FetchReferenceResult }> {
  const fetchResult = await fetchReferenceHtml(opts);
  const pages = parseReferenceLinks(fetchResult.html);
  const file = await writeReferenceIndex(pages, {
    etag: fetchResult.etag,
    lastModified: fetchResult.lastModified,
  });
  return { file, fetch: fetchResult };
}

/** Load on-disk index; refresh from network if missing. */
export async function loadReferenceIndex(opts?: {
  refresh?: boolean;
  force?: boolean;
}): Promise<{ file: ReferenceIndexFile; urlSet: Set<string> }> {
  const { DOCS_FEEDS_ABS } = await import('../lib/docs/docs-artifact-paths.ts');
  const needsRefresh =
    opts?.refresh ||
    opts?.force ||
    (!(await Bun.file(REFERENCE_INDEX_PATH).exists()) &&
      !(await Bun.file(DOCS_FEEDS_ABS).exists()));
  if (needsRefresh) {
    const r = await refreshReferenceIndex({ force: opts?.force });
    return { file: r.file, urlSet: new Set(r.file.pages.map(p => p.url)) };
  }
  const { loadFeeds } = await import('./bun-docs-feeds.ts');
  const feeds = await loadFeeds();
  const file = feeds.reference;
  const pages = Array.isArray(file.pages) ? file.pages : [];
  return { file: { ...file, pages }, urlSet: new Set(pages.map(p => p.url)) };
}

/** Check whether a canonical reference URL is present in the index (exact or path prefix). */
export function referenceIndexHasUrl(
  url: string,
  urlSet: Set<string>,
  pages: ReferencePageEntry[]
): boolean {
  if (urlSet.has(url)) return true;
  let path: string;
  try {
    path = normalizeReferencePath(new URL(url).pathname);
  } catch {
    return false;
  }
  if (pages.some(p => p.path === path)) return true;
  return pages.some(p => path.startsWith(`${p.path}/`) || p.path.startsWith(`${path}/`));
}

async function main(): Promise<void> {
  const force = argv.includes('--force');
  const { file, fetch: fr } = await refreshReferenceIndex({ force });
  const cacheNote = fr.fromCache ? (fr.notModified ? ' (304/cache)' : ' (cache fallback)') : '';
  console.info(
    `✅ reference-index ${file.count} pages · ${file.moduleCount} modules → tools/bun-docs-feeds.json (reference)${cacheNote}`
  );
}

if (import.meta.main) {
  const cmd = Bun.argv[2];
  if (cmd === 'index' || !cmd) {
    await main();
  } else {
    console.error('Usage: bun tools/bun-docs-reference-index.ts index [--force]');
    process.exit(1);
  }
}
