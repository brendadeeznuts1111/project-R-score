// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — fetchPage
// @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPatternInit / CANONICAL_SOURCES
// tools/bun-docs-mcp-lib.ts — Index, search, and MDX helpers for bun-docs MCP
// Release lists use tools/release-index.json; general blog RSS stays live (full feed).

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import {
  extractArticleText,
  extractArticleTextFromResponse,
  extractSocialMetadataFromHtml,
  extractSocialMetadataFromResponse,
  fetchPage,
  stripUrlFragment,
} from '../lib/docs/blog-extract.ts';
import { canonicalizeBunBlogUrl } from '../lib/docs/bun-blog-url.ts';
import { parseRssChannelItems } from '../lib/docs/bun-rss.ts';
import {
  BunComSite,
  CANONICAL_SOURCES,
  bunBlog,
  bunDocs,
  hrefFromInit,
} from '../lib/docs/bun-site-url.ts';
import { joinPath } from '../lib/path-bun';

/** Docs root href (no trailing slash) — from CANONICAL_SOURCES parts. */
export const BUN_DOCS_BASE = hrefFromInit(CANONICAL_SOURCES.docs).replace(/\/$/, '');
export const DOCS_SUFFIX = 'bun-types/docs/';

export type Doc = { path: string; slug: string; title: string; desc: string; content?: string };
export type DocRootCandidate = { root: string; version: string };
export type SearchHit = {
  slug: string;
  title: string;
  desc: string;
  score: number;
  url: string;
  snippet: string;
};
export type IndexMeta = {
  docsVersion: string;
  docsRoot: string;
  docCount: number;
  runtimeVersion: string;
  stale: boolean;
  docsBaseUrl: string;
  blogBaseUrl: string;
  rssUrl: string;
};
export type QueryHit = { slug: string; line: number; text: string; context: string; url: string };
export type DocCategory = { category: string; count: number; examples: string[] };
export type ReleaseNote = { title: string; link: string; date: string; summary: string };
export type BlogPostSummary = ReleaseNote & { slug: string };
export type BlogPost = {
  title: string;
  slug: string;
  url: string;
  content: string;
  description?: string;
  image?: string;
};

/** Blog index href (no trailing slash) — from CANONICAL_SOURCES parts. */
export const BUN_BLOG_BASE = hrefFromInit(CANONICAL_SOURCES.blog).replace(/\/$/, '');
export const BUN_CHANGELOG_RSS = hrefFromInit({ ...BunComSite, pathname: '/rss.xml' });

export function buildDocUrl(slug: string): string {
  const path = slug.replace(/^\/+/, '').replace(/\.md$/i, '');
  return bunDocs(path);
}

export function buildBlogUrl(slug: string): string {
  return bunBlog(normalizeBlogSlug(slug));
}

export function parseFrontmatter(raw: string): { title: string; desc: string; body: string } {
  if (!raw.startsWith('---')) return { title: '', desc: '', body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { title: '', desc: '', body: raw };
  const fm = raw.slice(4, end);
  const body = raw.slice(end + 4).trim();
  let title = '';
  let desc = '';
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (!m) continue;
    if (m[1] === 'title') title = m[2];
    if (m[1] === 'description') desc = m[2];
  }
  return { title, desc, body };
}

export function cleanMdx(raw: string): string {
  let s = raw;
  s = s.replace(/\{%\s*[\s\S]*?%\}/g, '');
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  s = s.replace(/\s*\[!code[^\]]*\]/g, '');
  s = s.replace(/<[A-Z][a-zA-Z0-9]*[^>]*\/>/g, '');
  for (const tag of [
    'Note',
    'Warning',
    'Tip',
    'Callout',
    'Card',
    'CardGroup',
    'Tab',
    'Tabs',
    'Frame',
  ]) {
    s = s.replace(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'), (_, inner: string) =>
      inner.trim() ? `\n> ${inner.trim()}\n` : ''
    );
  }
  s = s.replace(/^<[^>]+>\s*$/gm, '');
  s = s.replace(/^<\/[^>]+>\s*$/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

export function extractSection(content: string, section?: string): string {
  if (!section?.trim()) return content;
  const q = section.toLowerCase();
  const parts = content.split(/^## /m);
  for (let i = 1; i < parts.length; i++) {
    const heading = parts[i].split('\n')[0] ?? '';
    if (heading.toLowerCase().includes(q)) return `## ${parts[i].trim()}`;
  }
  return content;
}

export function truncateLines(text: string, maxLines?: number): string {
  if (!maxLines || maxLines <= 0) return text;
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n') + `\n\n… (${lines.length - maxLines} more lines)`;
}

function normalizeDocsRoot(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.endsWith('/docs') ? `${trimmed}/` : `${trimmed}/`;
}

async function readPkgVersion(docsRoot: string): Promise<string> {
  const pkgPath = joinPath(docsRoot.replace(/\/$/, ''), '..', 'package.json');
  try {
    const pkg = (await Bun.file(pkgPath).json()) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function collectDocRootCandidates(workspaceRoot: string): Promise<DocRootCandidate[]> {
  const explicit = Bun.env.BUN_TYPES_DOCS?.trim();
  if (explicit) {
    const root = normalizeDocsRoot(explicit);
    return [{ root, version: await readPkgVersion(root) }];
  }

  const found = new Map<string, string>();
  const preferred = normalizeDocsRoot(joinPath(workspaceRoot, 'node_modules/bun-types/docs'));
  if (await Bun.file(joinPath(preferred, 'index.mdx')).exists()) {
    found.set(preferred, await readPkgVersion(preferred));
  }

  const glob = new Bun.Glob('**/bun-types/docs/**/*.mdx');
  for await (const path of glob.scan({ cwd: workspaceRoot, absolute: true })) {
    const idx = path.indexOf(DOCS_SUFFIX);
    if (idx === -1) continue;
    const root = path.slice(0, idx + DOCS_SUFFIX.length);
    if (!found.has(root)) found.set(root, await readPkgVersion(root));
  }

  return [...found.entries()].map(([root, version]) => ({ root, version }));
}

export function pickBestDocRoot(
  candidates: DocRootCandidate[],
  workspaceRoot: string
): DocRootCandidate | null {
  if (!candidates.length) return null;
  const preferred = normalizeDocsRoot(joinPath(workspaceRoot, 'node_modules/bun-types/docs'));
  const sorted = [...candidates].sort((a, b) => {
    const byVersion = Bun.semver.order(b.version, a.version);
    if (byVersion !== 0) return byVersion;
    if (a.root === preferred && b.root !== preferred) return -1;
    if (b.root === preferred && a.root !== preferred) return 1;
    return a.root.localeCompare(b.root);
  });
  return sorted[0] ?? null;
}

export async function loadDocsFromRoot(docsRoot: string): Promise<Doc[]> {
  const paths: string[] = [];
  const glob = new Bun.Glob('**/*.mdx');
  for await (const path of glob.scan({ cwd: docsRoot, absolute: true })) paths.push(path);

  const docs = await Promise.all(
    paths.map(async path => {
      const slug = path.slice(docsRoot.length).replace(/\.mdx$/, '');
      const raw = await Bun.file(path).text();
      const { title, desc } = parseFrontmatter(raw);
      return { path, slug, title, desc };
    })
  );

  docs.sort((a, b) => a.slug.localeCompare(b.slug));
  return docs;
}

const contentCache = new Map<string, string>();

export async function ensureDocContent(doc: Doc): Promise<string> {
  if (doc.content !== undefined) return doc.content;
  const cached = contentCache.get(doc.slug);
  if (cached !== undefined) {
    doc.content = cached;
    return cached;
  }
  const raw = await Bun.file(doc.path).text();
  const body = parseFrontmatter(raw).body;
  contentCache.set(doc.slug, body);
  doc.content = body;
  return body;
}

export async function warmDocContent(docs: Doc[]): Promise<void> {
  await Promise.all(docs.map(d => ensureDocContent(d)));
}

export function buildSlugMap(docs: Doc[]): Map<string, Doc> {
  return new Map(docs.map(d => [d.slug, d]));
}

export async function buildDocIndex(workspaceRoot: string): Promise<{
  docs: Doc[];
  docsRoot: string;
  docsVersion: string;
}> {
  const candidates = await collectDocRootCandidates(workspaceRoot);
  const picked = pickBestDocRoot(candidates, workspaceRoot);
  if (!picked) return { docs: [], docsRoot: '', docsVersion: '0.0.0' };

  const docs = await loadDocsFromRoot(picked.root);
  return { docs, docsRoot: picked.root, docsVersion: picked.version };
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

function makeSnippet(content: string, terms: string[], maxLen = 100): string {
  const lower = content.toLowerCase();
  let hit = -1;
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1 && (hit === -1 || i < hit)) hit = i;
  }
  const slice = hit === -1 ? content : content.slice(Math.max(0, hit - 40), hit + maxLen);
  const flat = slice.replace(/\s+/g, ' ').trim();
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
}

function extractCodeBlocks(content: string): string {
  const blocks: string[] = [];
  const re = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) blocks.push(m[0]);
  return blocks.join('\n');
}

export async function searchDocsAsync(
  docs: Doc[],
  query: string,
  limit = 8,
  category?: string,
  codeOnly = false
): Promise<SearchHit[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const phrase = query.toLowerCase().trim();
  const cat = category?.replace(/^\/+|\/+$/g, '').toLowerCase();
  const scored: { doc: Doc; score: number }[] = [];

  for (const doc of docs) {
    if (cat && !doc.slug.toLowerCase().startsWith(cat)) continue;

    let score = 0;
    const titleLow = doc.title.toLowerCase();
    const descLow = doc.desc.toLowerCase();
    const slugLow = doc.slug.toLowerCase();

    for (const term of terms) {
      if (titleLow.includes(term)) score += 10;
      if (slugLow.includes(term)) score += 6;
      if (descLow.includes(term)) score += 4;
    }

    if (score > 0) {
      scored.push({ doc, score });
      continue;
    }

    const content = await ensureDocContent(doc);
    const searchable = codeOnly ? extractCodeBlocks(content) : content;
    const contentLow = searchable.toLowerCase();
    if (!codeOnly && phrase.length > 2 && contentLow.includes(phrase)) score += 15;
    for (const term of terms) {
      score += Math.min(countOccurrences(contentLow, term), 5) * (codeOnly ? 3 : 1);
    }
    if (score > 0) scored.push({ doc, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  const results: SearchHit[] = [];

  for (const { doc, score } of top) {
    const content = await ensureDocContent(doc);
    const searchable = codeOnly ? extractCodeBlocks(content) : content;
    results.push({
      slug: doc.slug,
      title: doc.title,
      desc: doc.desc,
      score,
      url: buildDocUrl(doc.slug),
      snippet: makeSnippet(codeOnly ? searchable : cleanMdx(searchable).slice(0, 800), terms),
    });
  }

  return results;
}

/** @deprecated use searchDocsAsync */
export function searchDocs(
  docs: Doc[],
  query: string,
  limit = 10,
  category?: string,
  codeOnly = false
): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const phrase = query.toLowerCase().trim();
  const cat = category?.replace(/^\/+|\/+$/g, '').toLowerCase();
  const results: SearchHit[] = [];

  for (const doc of docs) {
    if (cat && !doc.slug.toLowerCase().startsWith(cat)) continue;
    const content = doc.content ?? '';
    const searchable = codeOnly ? extractCodeBlocks(content) : content;
    let score = 0;
    const titleLow = doc.title.toLowerCase();
    const descLow = doc.desc.toLowerCase();
    const slugLow = doc.slug.toLowerCase();
    const contentLow = searchable.toLowerCase();

    if (!codeOnly) {
      if (phrase.length > 2 && contentLow.includes(phrase)) score += 15;
      for (const term of terms) {
        if (titleLow.includes(term)) score += 10;
        if (slugLow.includes(term)) score += 6;
        if (descLow.includes(term)) score += 4;
      }
    }
    for (const term of terms) {
      score += Math.min(countOccurrences(contentLow, term), 5) * (codeOnly ? 3 : 1);
    }

    if (score <= 0) continue;
    results.push({
      slug: doc.slug,
      title: doc.title,
      desc: doc.desc,
      score,
      url: buildDocUrl(doc.slug),
      snippet: makeSnippet(searchable, terms),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function slugFromPath(docsRoot: string, filePath: string): string {
  return filePath.slice(docsRoot.length).replace(/\.mdx$/, '');
}

function formatContext(lines: string[], matchIdx: number, ctx: number): string {
  const start = Math.max(0, matchIdx - ctx);
  const end = Math.min(lines.length, matchIdx + ctx + 1);
  return lines
    .slice(start, end)
    .map((line, i) => {
      const n = start + i + 1;
      const prefix = start + i === matchIdx ? '>' : ' ';
      return `${prefix} ${n}| ${line}`;
    })
    .join('\n');
}

async function queryWithJs(
  docs: Doc[],
  pattern: string,
  contextLines: number,
  limit: number,
  category?: string
): Promise<QueryHit[]> {
  const re = new RegExp(pattern, 'i');
  const cat = category?.replace(/^\/+|\/+$/g, '').toLowerCase();
  const hits: QueryHit[] = [];

  for (const doc of docs) {
    if (cat && !doc.slug.toLowerCase().startsWith(cat)) continue;
    const lines = (await ensureDocContent(doc)).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i]!)) continue;
      hits.push({
        slug: doc.slug,
        line: i + 1,
        text: lines[i]!.trim(),
        context: formatContext(lines, i, contextLines),
        url: buildDocUrl(doc.slug),
      });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

export async function queryDocs(
  docs: Doc[],
  docsRoot: string,
  pattern: string,
  opts: { contextLines?: number; limit?: number; category?: string } = {}
): Promise<{ hits: QueryHit[]; engine: 'rg' | 'js' }> {
  const contextLines = opts.contextLines ?? 2;
  const limit = opts.limit ?? 20;
  const category = opts.category?.replace(/^\/+|\/+$/g, '');
  const rg = Bun.which('rg');

  if (rg && docsRoot) {
    const searchPath = category
      ? joinPath(docsRoot.replace(/\/$/, ''), category)
      : docsRoot.replace(/\/$/, '');
    const args = [
      rg,
      '--json',
      '-i',
      '-C',
      String(contextLines),
      '--glob',
      '*.mdx',
      pattern,
      searchPath,
    ];
    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    if (proc.exitCode === 0 || proc.exitCode === 1) {
      const hits: QueryHit[] = [];
      let current: QueryHit | null = null;
      const ctx: string[] = [];

      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line) as {
            type: string;
            data: { path?: { text?: string }; line_number?: number; lines?: { text?: string } };
          };
          if (row.type === 'begin' || row.type === 'end') continue;
          const path = row.data.path?.text ?? '';
          if (!path) continue;
          const slug = slugFromPath(docsRoot, path);
          if (category && !slug.startsWith(category)) continue;
          const lineNo = row.data.line_number ?? 0;
          const lineText = (row.data.lines?.text ?? '').replace(/\n$/, '').trim();

          if (row.type === 'match') {
            if (current) {
              current.context = ctx.join('\n');
              hits.push(current);
              if (hits.length >= limit) break;
            }
            current = { slug, line: lineNo, text: lineText, context: '', url: buildDocUrl(slug) };
            ctx.length = 0;
            ctx.push(`> ${lineNo}| ${lineText}`);
          } else if (row.type === 'context' && current?.slug === slug) {
            ctx.push(`  ${lineNo}| ${lineText}`);
          }
        } catch {
          /* skip */
        }
      }

      if (current && hits.length < limit) {
        current.context = ctx.join('\n');
        hits.push(current);
      }

      if (hits.length) return { hits, engine: 'rg' };
    }
  }

  return { hits: await queryWithJs(docs, pattern, contextLines, limit, category), engine: 'js' };
}

export function listCategories(docs: Doc[]): DocCategory[] {
  const map = new Map<string, { count: number; examples: string[] }>();
  for (const doc of docs) {
    const category = doc.slug.includes('/') ? (doc.slug.split('/')[0] ?? 'root') : 'root';
    const row = map.get(category) ?? { count: 0, examples: [] };
    row.count++;
    if (row.examples.length < 4) row.examples.push(doc.slug);
    map.set(category, row);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, count: v.count, examples: v.examples }))
    .sort((a, b) => b.count - a.count);
}

export function resolveDocSlug(
  slugMap: Map<string, Doc>,
  slugOrPath: string
): { slug: string; url: string; title: string; exists: boolean } {
  const normalized = slugOrPath.replace(/^\/+|\/+$/g, '').replace(/\.mdx$/, '');
  const doc = slugMap.get(normalized);
  return {
    slug: normalized,
    url: buildDocUrl(normalized),
    title: doc?.title ?? '',
    exists: !!doc,
  };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function cleanSummary(html: string, max = 400): string {
  return decodeHtmlEntities(
    html
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  ).slice(0, max);
}

export function parseRssItems(xml: string, limit = 50): ReleaseNote[] {
  return parseRssChannelItems(xml)
    .slice(0, limit)
    .map(item => ({
      title: decodeHtmlEntities(item.title),
      link: item.link,
      date: item.pubDate,
      summary: cleanSummary(item.description),
    }));
}

const RSS_CACHE_MS = 300_000;
let rssCache: { at: number; items: ReleaseNote[] } | null = null;

/** Live bun.com/rss.xml (all posts). Cached briefly. */
export async function fetchRssFeed(limit = 50): Promise<ReleaseNote[]> {
  const now = Date.now();
  if (rssCache && now - rssCache.at < RSS_CACHE_MS) return rssCache.items.slice(0, limit);

  // HTML Accept default overridden for RSS; HTTPS/timeout/ok via fetchPage.
  const res = await fetchPage(BUN_CHANGELOG_RSS, {
    timeoutMs: 20_000,
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
  });
  const items = parseRssItems(await res.text(), 100);
  rssCache = { at: now, items };
  return items.slice(0, limit);
}

/**
 * Versioned release posts only — shared with catalog Phase 0 (`tools/release-index.json`).
 * Falls back to live RSS filtered by release-like titles/URLs if the index is missing.
 */
export async function fetchReleaseNotes(limit = 5): Promise<ReleaseNote[]> {
  try {
    const { loadReleaseIndex } = await import('./bun-docs-releases.ts');
    const { file } = await loadReleaseIndex({ refresh: false });
    const items: ReleaseNote[] = [...file.entries]
      .sort((a, b) => (a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0))
      .map(e => ({
        title: e.title,
        link: e.url,
        date: e.pubDate,
        summary: `Bun v${e.version}`,
      }));
    if (items.length > 0) return items.slice(0, limit);
  } catch {
    /* fall through */
  }

  const live = await fetchRssFeed(Math.max(limit * 4, 40));
  return live
    .filter(item => /^Bun\s/i.test(item.title) && /\bv?\d+\.\d+/i.test(item.title))
    .slice(0, limit);
}

export function blogSlugFromLink(link: string): string {
  const canonical = canonicalizeBunBlogUrl(link);
  const source = canonical ?? link;
  try {
    const url = new URL(source);
    return url.pathname.replace(/^\/blog\/?/, '').replace(/\/$/, '');
  } catch {
    return source.replace(/^\/blog\/?/, '').replace(/\/$/, '');
  }
}

export function normalizeBlogSlug(slugOrUrl: string): string {
  const trimmed = slugOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return blogSlugFromLink(trimmed);
  }
  return trimmed.replace(/^\/blog\/?/, '').replace(/\/$/, '');
}

export async function fetchBlogPosts(limit = 8): Promise<BlogPostSummary[]> {
  const items = await fetchRssFeed(limit);
  return items
    .filter(item => item.link.includes('/blog/'))
    .map(item => ({ ...item, slug: blogSlugFromLink(item.link) }));
}

function stripBlogBoilerplate(text: string): string {
  if (!text.includes('To install Bun')) return text;
  const idx = text.search(/\n## (?!To install)/);
  return idx > 0 ? text.slice(idx + 1).trim() : text;
}

export function htmlArticleToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(
      /<pre[\s\S]*?<\/pre>/gi,
      block => `\n\`\`\`\n${block.replace(/<[^>]+>/g, '')}\n\`\`\`\n`
    )
    .replace(/<\/(p|div|h[1-6]|li|br|tr|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n${'#'.repeat(Number(n))} `)
    .replace(/<[^>]+>/g, '');
  s = decodeHtmlEntities(s);
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return stripBlogBoilerplate(s);
}

/**
 * Offline path: HTML → BlogPost via SocialMetadata + article text SSOT.
 * bun.com blog emits `name="og:*"` (not only `property=`).
 */
export async function parseBlogPostFromHtml(
  html: string,
  slug: string,
  pageUrl: string
): Promise<BlogPost> {
  const url = stripUrlFragment(pageUrl);
  const meta = await extractSocialMetadataFromHtml(html, url);
  const articleHtml = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  let content = articleHtml
    ? htmlArticleToText(articleHtml)
    : stripBlogBoilerplate(await extractArticleText(html));

  const title = (meta.title ?? (await extractArticleText(html)).split('\n')[0] ?? slug)
    .replace(/<[^>]+>/g, '')
    .trim()
    .replace(/\s*\|\s*Bun(?:\s+Blog)?\s*$/i, '');

  return {
    title: title || slug,
    slug,
    url,
    content,
    description: meta.description,
    image: meta.image,
  };
}

export async function fetchBlogPost(
  slugOrUrl: string,
  opts: { maxLines?: number } = {}
): Promise<BlogPost> {
  const slug = normalizeBlogSlug(slugOrUrl);
  const url = buildBlogUrl(slug);
  const cleaned = stripUrlFragment(url);
  // Live path: clone for meta, stream body into article rewriter (no prior .text()).
  const res = await fetchPage(url, { timeoutMs: 15_000 });
  const meta = await extractSocialMetadataFromResponse(res.clone(), cleaned);
  const content = await extractArticleTextFromResponse(res);
  const title = (meta.title ?? content.split('\n')[0] ?? slug)
    .replace(/<[^>]+>/g, '')
    .trim()
    .replace(/\s*\|\s*Bun(?:\s+Blog)?\s*$/i, '');

  const post: BlogPost = {
    title: title || slug,
    slug,
    url: cleaned,
    content: truncateLines(content, opts.maxLines),
    description: meta.description,
    image: meta.image,
  };
  return post;
}

export async function readDocPage(
  docs: Doc[],
  slug: string,
  opts: { section?: string; maxLines?: number; raw?: boolean; slugMap?: Map<string, Doc> } = {}
): Promise<{ title: string; desc: string; content: string; url: string } | null> {
  const doc = opts.slugMap?.get(slug) ?? docs.find(d => d.slug === slug);
  if (!doc) return null;

  let content = await ensureDocContent(doc);
  if (opts.section) content = extractSection(content, opts.section);
  if (!opts.raw) content = cleanMdx(content);
  content = truncateLines(content, opts.maxLines);

  return {
    title: doc.title,
    desc: doc.desc,
    content,
    url: buildDocUrl(doc.slug),
  };
}

export function listTopics(docs: Doc[]): { slug: string; title: string; url: string }[] {
  return docs.map(d => ({ slug: d.slug, title: d.title, url: buildDocUrl(d.slug) }));
}

export function getIndexMeta(docs: Doc[], docsRoot: string, docsVersion: string): IndexMeta {
  const runtimeVersion = Bun.version;
  const stale = Bun.semver.order(docsVersion, runtimeVersion) < 0;
  return {
    docsVersion,
    docsRoot,
    docCount: docs.length,
    runtimeVersion,
    stale,
    docsBaseUrl: BUN_DOCS_BASE,
    blogBaseUrl: BUN_BLOG_BASE,
    rssUrl: BUN_CHANGELOG_RSS,
  };
}
