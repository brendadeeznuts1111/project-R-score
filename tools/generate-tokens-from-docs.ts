#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/http/fetch — fetch
/**
 * generate-tokens-from-docs.ts — token **supplement** for the catalog (not the SSOT).
 *
 * Prefer `bun run docs:refresh` / `tools/bun-docs-catalog.ts` for the unified catalog
 * (NOTE/SHIP/FIX/BLOG). This script only rebuilds the bulk extract that catalog merge
 * consumes as one input layer. Operate: docs/BUN_DOCS_OPERATE.md
 *
 * Reads bun.com/docs/llms.txt, fetches each relevant page's Markdown source (.md),
 * and extracts:
 *   - API names (Bun.serve, Bun.file, bun:sqlite, ...)
 *   - CLI flags (--filter, --outdir, ...)
 *   - environment variables (BUN_CONFIG_*, ...)
 *   - bunfig.toml keys ([install].linker, ...)
 *   - package.json keys (trustedDependencies, workspaces, ...)
 *   - concepts (workspaces, bytecode caching, ...)
 *
 * Each entry is tagged with type, stability, a short description, and a canonical
 * docs URL with anchor. Duplicates across pages are merged with the most
 * authoritative page winning (reference > runtime > bundler > test > guides > pm).
 *
 * Run (when docs change — optional; not part of default docs:refresh):
 *   bun tools/generate-tokens-from-docs.ts
 *   bun tools/generate-tokens-from-docs.ts --section=runtime
 *   bun tools/generate-tokens-from-docs.ts --version=1.4.0
 * Output:
 *   - tools/bun-docs-token-supplement.json  (merged by bun-docs-catalog.ts build)
 *
 * blogUrl comes from tools/release-index.json (RSS) when present — never synthetic.
 * Docs pages stay unversioned. commitHash is Bun.revision when building against the runtime.
 */

const LLMS_URL = 'https://bun.com/docs/llms.txt';
const SUPPLEMENT_OUT = new URL('./bun-docs-token-supplement.json', import.meta.url).pathname;

const DOMAINS = ['runtime', 'bundler', 'test', 'pm'];
const SKIP_TITLES = new Set(['Package Manager', 'Runtime', 'Bundler', 'Test Runner']);

const DOMAIN_PRIORITY = ['reference/bun', 'runtime', 'bundler', 'test', 'guides', 'pm'];

type TokenType = 'api' | 'cli-flag' | 'env-var' | 'bunfig-key' | 'package-json-key' | 'concept';
type Stability = 'stable' | 'experimental' | 'deprecated';

type CatalogEntry = {
  name: string;
  type: TokenType;
  stability: Stability;
  description?: string;
  usage?: string;
  canonicalPage: string;
  anchor: string;
  url: string;
  allPages: string[];
  source: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function canonicalUrl(pageUrl: string): string {
  return pageUrl.replace(/\.md$/, '');
}

/** Score how authoritative a page is for a given token. Higher = better canonical. */
function pageScore(type: TokenType, name: string, pageUrl: string): number {
  const path = new URL(pageUrl).pathname.toLowerCase();
  let score = 0;

  // Domain preference by token type.
  if (
    type === 'cli-flag' ||
    type === 'env-var' ||
    type === 'bunfig-key' ||
    type === 'package-json-key'
  ) {
    if (path.includes('/docs/pm/')) score += 200;
    if (path.includes('/docs/runtime/bunfig')) score += 50;
  } else if (type === 'api') {
    if (path.includes('/reference/')) score += 200;
    if (path.includes('/docs/runtime/')) score += 100;
  } else if (type === 'concept') {
    if (path.includes('/docs/guides/')) score += 100;
  }

  // General domain priority fallback.
  for (let i = 0; i < DOMAIN_PRIORITY.length; i++) {
    if (path.includes(`/docs/${DOMAIN_PRIORITY[i]}/`)) score += DOMAIN_PRIORITY.length - i;
  }

  // Token name or base appears in the path = more specific.
  const slug = slugify(name);
  if (slug && path.includes(slug)) score += 30;
  const base = name
    .replace(/^Bun\./, '')
    .replace(/^bun:/, '')
    .replace(/^--/, '')
    .toLowerCase();
  if (base && base !== slug && path.includes(base)) score += 20;

  return score;
}

function detectStability(heading: string, proseLine?: string): Stability {
  const hay = `${heading} ${proseLine ?? ''}`.toLowerCase();
  if (hay.includes('deprecated')) return 'deprecated';
  if (hay.includes('experimental')) return 'experimental';
  return 'stable';
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  // Stop at first sentence break, but allow common abbreviations roughly.
  const match = trimmed.match(/^([^.!?]{1,250}[.!?])(\s|$)/);
  const sentence = match ? match[1] : trimmed.slice(0, 200);
  return sentence.length > 200 ? sentence.slice(0, 197) + '...' : sentence;
}

function stripBackticks(text: string): string {
  return text.replace(/`/g, '');
}

const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'text', '']);

function isShellBlock(annotation: string): boolean {
  const lang = annotation.trim().split(/\s+/)[0] || '';
  return SHELL_LANGUAGES.has(lang);
}

function looksLikeCliContext(line: string): boolean {
  const lower = line.toLowerCase();
  return /\bbun\s/.test(lower) || /^\s*\$/.test(line) || /\bcli\s+flag/.test(lower);
}

/** Extract API names, CLI flags, env vars, and package.json keys from a line. */
function extractInlineTokens(
  line: string,
  includeCliFlags: boolean
): Array<{ name: string; type: TokenType; usage?: string }> {
  const found: Array<{ name: string; type: TokenType; usage?: string }> = [];
  const seen = new Set<string>();
  const add = (name: string, type: TokenType, usage?: string) => {
    const key = `${type}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ name, type, usage });
  };

  // CLI flags: --flag or --flag <value>
  if (includeCliFlags) {
    for (const m of line.matchAll(/(?<![\w-])--[a-z][a-z0-9-]*(?:\s+[<[{][^\]}]+[\]}]>)?/g)) {
      const full = m[0];
      const flag = full.split(/\s+/)[0]!;
      add(flag, 'cli-flag', full.length > flag.length ? full.trim() : undefined);
    }
  }

  // Env vars
  for (const m of line.matchAll(/\bBUN_[A-Z_][A-Z0-9_]*\b/g)) add(m[0], 'env-var');

  // Built-in module names
  for (const m of line.matchAll(/\bbun:[a-z][a-z0-9-]*\b/g)) add(m[0], 'api');

  // Bun.* API names
  for (const m of line.matchAll(/\bBun\.[A-Za-z][A-Za-z0-9_\.]*\b/g)) add(m[0], 'api');

  // Known package.json keys
  const packageJsonKeys = [
    'workspaces',
    'trustedDependencies',
    'patchedDependencies',
    'overrides',
    'resolutions',
  ];
  for (const key of packageJsonKeys) {
    if (new RegExp(`\\b${key}\\b`).test(line)) add(key, 'package-json-key');
  }

  return found;
}

/** Extract bunfig.toml keys from a Markdown code block annotated as TOML. */
function extractBunfigKeys(block: string, annotation: string): string[] {
  if (!/bunfig\.toml/.test(annotation)) return [];
  const keys: string[] = [];
  let section = '';
  for (const line of block.split('\n')) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1]!;
      continue;
    }
    const m = line.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*=/);
    if (m?.[1]) {
      keys.push(section ? `${section}.${m[1]}` : m[1]);
    }
  }
  return keys;
}

/**
 * Extract a short page-level description from the Markdown body.
 * Uses the first non-empty paragraph after the main `# ` heading, skipping
 * taglines and metadata lines. Falls back to empty string if none found.
 */
function extractPageDescription(markdown: string, pageTitle: string): string {
  const lines = markdown.split('\n');
  let foundH1 = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!foundH1) {
      if (/^#\s+/.test(line)) foundH1 = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip metadata / tagline / admonition lines
    if (/^(> |\[!|\*\*Note|\*\*Warning|Tagline:|Metadata:)/i.test(trimmed)) continue;
    // Skip if it's just a repeat of the page title
    if (stripBackticks(trimmed).toLowerCase() === stripBackticks(pageTitle).toLowerCase()) continue;
    // Skip headings and code fences
    if (/^#{1,6}\s+/.test(trimmed)) continue;
    if (/^```/.test(trimmed)) continue;
    return firstSentence(trimmed);
  }
  return '';
}

/** Parse one docs page's Markdown into raw catalog entries. */
function parsePage(markdown: string, pageTitle: string, pageUrl: string): CatalogEntry[] {
  const lines = markdown.split('\n');
  let currentAnchor = '';
  let currentSection = pageTitle;
  let currentStability: Stability = 'stable';
  let currentDescription = '';
  const entries: CatalogEntry[] = [];
  let inCode: string | null = null;
  let codeAnnotation = '';
  let codeBuffer: string[] = [];

  const baseUrl = canonicalUrl(pageUrl);
  const pageDescription = extractPageDescription(markdown, pageTitle);

  const flushCode = () => {
    if (!inCode || codeBuffer.length === 0) return;
    const block = codeBuffer.join('\n');
    codeBuffer = [];

    if (inCode === 'toml') {
      for (const key of extractBunfigKeys(block, codeAnnotation)) {
        entries.push({
          name: key,
          type: 'bunfig-key',
          stability: currentStability,
          description: currentDescription || undefined,
          canonicalPage: baseUrl,
          anchor: currentAnchor,
          url: `${baseUrl}#${currentAnchor}`,
          allPages: [],
          source: pageTitle,
        });
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.replace(/\r$/, '');

    const fence = line.match(/^```(.+)$/);
    if (fence) {
      if (inCode) {
        flushCode();
        inCode = null;
        codeAnnotation = '';
      } else {
        inCode = fence[1].trim().split(/\s+/)[0] || 'text';
        codeAnnotation = fence[1];
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      // Extract flags/env vars from shell/code blocks (skip TOML/JSON bodies).
      if (inCode !== 'toml' && inCode !== 'json') {
        const includeCli = isShellBlock(codeAnnotation);
        for (const t of extractInlineTokens(line, includeCli)) {
          if (t.type === 'cli-flag' || t.type === 'env-var') {
            entries.push(
              makeEntry(t, baseUrl, currentAnchor, currentStability, currentDescription, pageTitle)
            );
          }
        }
      }
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      currentSection = heading[2].trim();
      currentAnchor = slugify(stripBackticks(currentSection));
      currentStability = detectStability(currentSection);
      currentDescription = '';

      // API names directly in heading, e.g. `## Bun.serve` or `## bun:sqlite`
      const headingText = stripBackticks(currentSection);
      const apiMatch = headingText.match(/^(Bun\.[A-Za-z][A-Za-z0-9_\.]*|bun:[a-z][a-z0-9-]*)$/);
      if (apiMatch) {
        entries.push({
          name: apiMatch[1]!,
          type: 'api',
          stability: currentStability,
          canonicalPage: baseUrl,
          anchor: currentAnchor,
          url: `${baseUrl}#${currentAnchor}`,
          allPages: [],
          source: pageTitle,
        });
      }

      // Prose-based tokens and usage from heading text itself
      for (const t of extractInlineTokens(headingText, true)) {
        entries.push(
          makeEntry(t, baseUrl, currentAnchor, currentStability, currentDescription, pageTitle)
        );
      }
      continue;
    }

    // Collect first sentence after heading as description
    if (currentAnchor && !currentDescription && line.trim()) {
      const prose = line.trim();
      currentStability = detectStability(currentSection, prose);
      currentDescription = firstSentence(prose);
    }

    const includeCli = looksLikeCliContext(line);
    for (const t of extractInlineTokens(line, includeCli)) {
      entries.push(
        makeEntry(t, baseUrl, currentAnchor, currentStability, currentDescription, pageTitle)
      );
    }
  }
  flushCode();

  // Fall back to the page-level lead paragraph when a token lacks a section-specific sentence.
  if (pageDescription) {
    for (const e of entries) {
      if (!e.description) e.description = pageDescription;
    }
  }

  return entries;
}

function makeEntry(
  t: { name: string; type: TokenType; usage?: string },
  baseUrl: string,
  anchor: string,
  stability: Stability,
  description: string,
  source: string
): CatalogEntry {
  return {
    name: t.name,
    type: t.type,
    stability,
    description: description || undefined,
    usage: t.usage,
    canonicalPage: baseUrl,
    anchor,
    url: anchor ? `${baseUrl}#${anchor}` : baseUrl,
    allPages: [],
    source,
  };
}

/** Merge duplicate tokens across pages, preferring the most authoritative page. */
function mergeEntries(entries: CatalogEntry[]): CatalogEntry[] {
  const map = new Map<string, CatalogEntry>();
  for (const e of entries) {
    const key = `${e.type}:${e.name}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, e);
      continue;
    }

    const existingScore = pageScore(e.type, e.name, existing.canonicalPage);
    const newScore = pageScore(e.type, e.name, e.canonicalPage);

    if (newScore > existingScore) {
      e.allPages = [existing.canonicalPage, ...existing.allPages];
      map.set(key, e);
    } else {
      const other = e.canonicalPage;
      if (!existing.allPages.includes(other) && other !== existing.canonicalPage) {
        existing.allPages.push(other);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

type GeneratorArgs = {
  sections: string[];
  version: string;
  releaseUrl: string;
  blogUrl: string;
  commitHash?: string;
  versionPinned: boolean;
};

function normalizeBunVersion(version: string): string {
  return version
    .trim()
    .replace(/^bun-v/i, '')
    .replace(/^v/i, '');
}

const blogUrlCache = new Map<string, string | undefined>();

/** RSS-validated blog URL; empty when not in release-index (no synthetic URLs). */
async function resolveBlogUrl(version: string): Promise<string | undefined> {
  const v = normalizeBunVersion(version);
  if (blogUrlCache.has(v)) return blogUrlCache.get(v);

  const { loadReleaseIndex, lookupBlogUrl } = await import('./bun-docs-release-index.ts');
  const { map } = await loadReleaseIndex({ refresh: false });
  const resolved = lookupBlogUrl(v, map);
  blogUrlCache.set(v, resolved);
  return resolved;
}

function parseArgs(): GeneratorArgs {
  const argv = Bun.argv.slice(2);
  const sections = new Set<string>();
  let version: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--section=')) {
      for (const s of arg.slice(10).split(',')) {
        const section = s.trim();
        if (!DOMAINS.includes(section)) {
          console.error(`❌ unknown section "${section}". allowed: ${DOMAINS.join(', ')}`);
          process.exit(1);
        }
        sections.add(section);
      }
    } else if (arg.startsWith('--version=')) {
      version = normalizeBunVersion(arg.slice(10));
    } else if (arg === '--version' && argv[i + 1]) {
      version = normalizeBunVersion(argv[++i]!);
    }
  }
  // @see https://bun.com/docs/runtime/utils#bun-version
  const bunVersion = version ?? Bun.version;
  const versionPinned = bunVersion !== Bun.version;
  const releaseUrl = `https://github.com/oven-sh/bun/releases/tag/bun-v${bunVersion}`;
  // Runtime revision only when pin matches the binary we are running
  const rev = (Bun as { revision?: string }).revision;
  const commitHash = !versionPinned && rev ? rev.slice(0, 12) : undefined;
  return {
    sections: sections.size > 0 ? [...sections] : DOMAINS,
    version: bunVersion,
    releaseUrl,
    commitHash,
    versionPinned,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const { sections, version, releaseUrl, commitHash, versionPinned } = args;
  // Resolve the best blog URL with patch → minor → major fallback.
  const blogUrl = (await resolveBlogUrl(version)) ?? '';
  // @see https://bun.com/docs/runtime/http/fetch
  const llms = await (await fetch(LLMS_URL)).text();
  const pages: { title: string; url: string }[] = [];
  for (const line of llms.split('\n')) {
    const m = line.match(/^- \[(.+?)\]\((https:\/\/[^)]+)\)/);
    if (!m) continue;
    const title = m[1];
    const url = m[2];
    if (SKIP_TITLES.has(title)) continue;
    const pathname = new URL(url).pathname;
    const domain = pathname
      .replace(/^\/docs\//, '')
      .replace(/\.md$/, '')
      .split('/')[0];
    if (!sections.includes(domain)) continue;
    pages.push({ title, url });
  }

  console.info(
    `🔍 Scanning ${pages.length} ${sections.join('+')} docs pages for tokens` +
      ` (bunVersion=${version}${versionPinned ? ' pinned' : ''})...`
  );
  const pageResults = await withConcurrency(pages, 8, async ({ title, url }) => {
    try {
      // @see https://bun.com/docs/runtime/http/fetch
      const markdown = await fetch(url).then(r => r.text());
      const entries = parsePage(markdown, title, url);
      console.info(`  ${title}: ${entries.length} raw entries`);
      return entries;
    } catch (e) {
      console.error(`  ❌ ${title}: ${e}`);
      return [];
    }
  });

  const allEntries = pageResults.flat();
  const merged = mergeEntries(allEntries);

  const generated = new Date().toISOString();
  const entries = merged.map(e =>
    toSupplementEntry(e, { bunVersion: version, releaseUrl, blogUrl, commitHash, generated })
  );
  const payload = {
    generated,
    bunVersion: version,
    releaseUrl,
    ...(blogUrl ? { blogUrl } : {}),
    ...(commitHash ? { commitHash } : {}),
    docsRoot: 'https://bun.com/docs',
    versionPinned,
    note: 'docsUrl is unversioned latest; releaseUrl/blogUrl pin versioned release notes',
    count: entries.length,
    entries,
  };
  await Bun.write(SUPPLEMENT_OUT, JSON.stringify(payload, null, 2) + '\n');
  console.info(
    `\n✅ wrote token supplement → ${SUPPLEMENT_OUT} (${entries.length} tokens, Bun ${version})`
  );
  console.info(`   release ${releaseUrl}`);
  console.info(`   blog ${blogUrl || '(none in RSS)'}`);
  if (commitHash) console.info(`   commit ${commitHash}`);
}

/** Map internal token kinds to the shared DocCatalogEntry schema used by bun-docs-catalog.ts. */
type SupplementEntry = {
  name: string;
  type:
    | 'api'
    | 'cli-command'
    | 'cli-flag'
    | 'cli-option'
    | 'config-key'
    | 'package-json-key'
    | 'env-var'
    | 'concept'
    | 'guide'
    | 'blog'
    | 'reference'
    | 'error'
    | 'tutorial'
    | 'spec'
    | 'other';
  stability: 'stable' | 'experimental' | 'deprecated';
  description?: string;
  verifiedOn?: string;
  lastUpdated?: string;
  releaseUrl?: string;
  blogUrl?: string;
  docsUrl?: string;
  commitHash?: string;
  canonicalPage: string;
  anchor?: string;
  allPages: string[];
  section: 'runtime' | 'bundler' | 'test' | 'guides' | 'pm' | 'reference' | 'other';
};

function sectionFromUrl(pageUrl: string): SupplementEntry['section'] {
  const path = new URL(pageUrl).pathname;
  if (path.includes('/docs/runtime/')) return 'runtime';
  if (path.includes('/docs/bundler/')) return 'bundler';
  if (path.includes('/docs/test/')) return 'test';
  if (path.includes('/docs/guides/')) return 'guides';
  if (path.includes('/docs/pm/')) return 'pm';
  if (path.includes('/docs/reference/')) return 'reference';
  return 'other';
}

function docsUrlFor(page: string, anchor?: string): string {
  const base = page.replace(/\.md$/i, '');
  return anchor ? `${base}#${anchor}` : base;
}

function toSupplementEntry(
  e: CatalogEntry,
  pin: {
    bunVersion: string;
    releaseUrl: string;
    blogUrl?: string;
    commitHash?: string;
    generated: string;
  }
): SupplementEntry {
  let type: SupplementEntry['type'];
  switch (e.type) {
    case 'api':
      type = 'api';
      break;
    case 'cli-flag':
      type = 'cli-flag';
      break;
    case 'env-var':
      type = 'env-var';
      break;
    case 'bunfig-key':
      type = 'config-key';
      break;
    case 'package-json-key':
      type = 'package-json-key';
      break;
    case 'concept':
    default:
      type = 'concept';
  }
  const canonical = e.canonicalPage;
  const allPages = [canonical, ...e.allPages.filter(p => p !== canonical)];
  const anchor = e.anchor || undefined;
  return {
    name: e.name,
    type,
    stability: e.stability,
    description: e.description,
    verifiedOn: pin.bunVersion,
    lastUpdated: pin.generated,
    releaseUrl: pin.releaseUrl,
    ...(pin.blogUrl ? { blogUrl: pin.blogUrl } : {}),
    docsUrl: docsUrlFor(canonical, anchor),
    ...(pin.commitHash ? { commitHash: pin.commitHash } : {}),
    canonicalPage: canonical,
    anchor,
    allPages,
    section: sectionFromUrl(canonical),
  };
}

if (import.meta.main) {
  await main();
}
