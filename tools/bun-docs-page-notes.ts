#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/http/fetch — fetch
/**
 * bun-docs-page-notes.ts — Phase 1 NOTE helpers: extract descriptions from doc HTML.
 *
 * Priority:
 *   1. First non-empty <p> after <h1> (skip feedback/chrome crumbs)
 *   2. <meta name="description">
 *   3. empty string
 *
 * Caches extracted notes under tools/.cache/bun-docs-notes/ by URL hash.
 */
import { resolve } from 'node:path';

const CACHE_DIR = resolve(import.meta.dir, '.cache', 'bun-docs-notes');

const SKIP_PARAGRAPH_RE =
  /^(was this page helpful|on this page|edit on github|copy page|table of contents)\b/i;

type NoteCacheEntry = {
  url: string;
  note: string;
  etag?: string;
  lastModified?: string;
  fetchedAt: string;
};

function cachePathFor(url: string): string {
  const hash = new Bun.CryptoHasher('sha256').update(url).digest('hex').slice(0, 24);
  return resolve(CACHE_DIR, `${hash}.json`);
}

async function ensureCacheDir(): Promise<void> {
  const keep = resolve(CACHE_DIR, '.keep');
  if (!(await Bun.file(keep).exists())) await Bun.write(keep, '');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trim, collapse whitespace; drop trailing period on single-word taglines. */
export function normalizeNote(text: string): string {
  let s = text.replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length < 60 && /^[A-Z][^.!?]*\.$/.test(s) && !s.includes(' ')) {
    s = s.slice(0, -1);
  }
  return s;
}

/** First non-empty paragraph from Bun docs markdown source. */
export function extractNoteFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  let pastTitle = false;
  for (const line of lines) {
    if (/^#\s/.test(line)) {
      pastTitle = true;
      continue;
    }
    if (!pastTitle) continue;
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('```') || t.startsWith('|')) continue;
    if (t.startsWith('- ') || t.startsWith('* ')) continue;
    const note = normalizeNote(t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
    if (note.length >= 12) return note;
  }
  return '';
}

export function extractNoteFromHtml(html: string): string {
  const meta =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)?.[1];

  const afterH1 = html.split(/<\/h1>/i)[1] ?? html;
  const paragraphs = [...afterH1.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const m of paragraphs) {
    const text = normalizeNote(stripTags(m[1]!));
    if (!text || text.length < 12) continue;
    if (SKIP_PARAGRAPH_RE.test(text)) continue;
    return text;
  }

  if (meta) return normalizeNote(decodeEntities(meta));
  return '';
}

async function readCachedNote(url: string): Promise<NoteCacheEntry | null> {
  const path = cachePathFor(url);
  if (!(await Bun.file(path).exists())) return null;
  try {
    return (await Bun.file(path).json()) as NoteCacheEntry;
  } catch {
    return null;
  }
}

async function writeCachedNote(entry: NoteCacheEntry): Promise<void> {
  await ensureCacheDir();
  await Bun.write(cachePathFor(entry.url), `${JSON.stringify(entry, null, 2)}\n`);
}

export async function fetchPageNote(url: string, opts?: { force?: boolean }): Promise<string> {
  const pageUrl = url.replace(/#.*$/, '').replace(/\.md$/, '');
  if (!opts?.force) {
    const cached = await readCachedNote(pageUrl);
    if (cached && typeof cached.note === 'string') return cached.note;
  }

  const prev = await readCachedNote(pageUrl);
  const headers: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'bun-docs-page-notes/1.0',
  };
  if (!opts?.force && prev?.etag) headers['If-None-Match'] = prev.etag;
  if (!opts?.force && prev?.lastModified) headers['If-Modified-Since'] = prev.lastModified;

  let res: Response;
  try {
    res = await fetch(pageUrl, { headers });
  } catch {
    return prev?.note ?? '';
  }

  if (res.status === 304 && prev) return prev.note;
  if (!res.ok) return prev?.note ?? '';

  const html = await res.text();
  const note = extractNoteFromHtml(html);
  await writeCachedNote({
    url: pageUrl,
    note,
    etag: res.headers.get('etag') ?? undefined,
    lastModified: res.headers.get('last-modified') ?? undefined,
    fetchedAt: new Date().toISOString(),
  });
  return note;
}

/** Fetch notes for unique page URLs (concurrency-limited). */
export async function fetchPageNotes(
  urls: string[],
  opts?: { force?: boolean; concurrency?: number }
): Promise<Map<string, string>> {
  const unique = [...new Set(urls.map(u => u.replace(/#.*$/, '').replace(/\.md$/, '')))];
  const concurrency = opts?.concurrency ?? 8;
  const out = new Map<string, string>();
  let i = 0;

  async function worker(): Promise<void> {
    while (i < unique.length) {
      const idx = i++;
      const url = unique[idx]!;
      out.set(url, await fetchPageNote(url, opts));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return out;
}
