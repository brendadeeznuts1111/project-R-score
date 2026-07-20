#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/http/fetch — fetch
/**
 * generate-tokens-from-docs.ts — extract a typed, unified catalog from Bun docs.
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
 * Run: bun tools/generate-tokens-from-docs.ts
 * Outputs:
 *   - tools/bun-docs-token-supplement.json  (typed token entries for bun-docs-catalog.ts)
 *   - tools/bun-pm-tokens.json              (legacy nested format, kept for compatibility)
 */

const LLMS_URL = 'https://bun.com/docs/llms.txt';
const SUPPLEMENT_OUT = new URL('./bun-docs-token-supplement.json', import.meta.url).pathname;
const LEGACY_OUT = new URL('./bun-pm-tokens.json', import.meta.url).pathname;

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

type LegacyPageCatalog = {
  page: string;
  pageTitle: string;
  cliFlags: Record<string, string>;
  envVars: Record<string, string>;
  bunfigKeys: Record<string, string>;
  packageJsonKeys: Record<string, string>;
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

function canonicalPriority(pageUrl: string): number {
  const path = new URL(pageUrl).pathname;
  for (let i = 0; i < DOMAIN_PRIORITY.length; i++) {
    if (path.includes(`/docs/${DOMAIN_PRIORITY[i]}/`)) return DOMAIN_PRIORITY.length - i;
  }
  return 0;
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
  includeCliFlags: boolean,
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
            entries.push(makeEntry(t, baseUrl, currentAnchor, currentStability, currentDescription, pageTitle));
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
        entries.push(makeEntry(t, baseUrl, currentAnchor, currentStability, currentDescription, pageTitle));
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
      entries.push(makeEntry(t, baseUrl, currentAnchor, currentStability, currentDescription, pageTitle));
    }
  }
  flushCode();

  return entries;
}

function makeEntry(
  t: { name: string; type: TokenType; usage?: string },
  baseUrl: string,
  anchor: string,
  stability: Stability,
  description: string,
  source: string,
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

    const existingPriority = canonicalPriority(existing.canonicalPage);
    const newPriority = canonicalPriority(e.canonicalPage);

    if (newPriority > existingPriority) {
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

async function withConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

function buildLegacyCatalog(entries: CatalogEntry[]): Record<string, LegacyPageCatalog> {
  const pages = new Map<string, LegacyPageCatalog>();
  for (const e of entries) {
    if (!['cli-flag', 'env-var', 'bunfig-key', 'package-json-key'].includes(e.type)) continue;
    const pageUrl = `${e.canonicalPage}.md`;
    if (!pages.has(e.source)) {
      pages.set(e.source, {
        page: pageUrl,
        pageTitle: e.source,
        cliFlags: {},
        envVars: {},
        bunfigKeys: {},
        packageJsonKeys: {},
      });
    }
    const page = pages.get(e.source)!;
    const url = e.url;
    switch (e.type) {
      case 'cli-flag':
        page.cliFlags[e.name] = url;
        break;
      case 'env-var':
        page.envVars[e.name] = url;
        break;
      case 'bunfig-key':
        page.bunfigKeys[e.name] = url;
        break;
      case 'package-json-key':
        page.packageJsonKeys[e.name] = url;
        break;
    }
  }
  return Object.fromEntries(pages.entries());
}

async function main(): Promise<void> {
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
    const domain = pathname.replace(/^\/docs\//, '').replace(/\.md$/, '').split('/')[0];
    if (!DOMAINS.includes(domain)) continue;
    pages.push({ title, url });
  }

  console.info(`🔍 Scanning ${pages.length} docs pages for tokens...`);
  const pageResults = await withConcurrency(
    pages,
    8,
    async ({ title, url }) => {
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
    },
  );

  const allEntries = pageResults.flat();
  const merged = mergeEntries(allEntries);

  const supplement = merged.map(toSupplementEntry);
  await Bun.write(SUPPLEMENT_OUT, JSON.stringify(supplement, null, 2) + '\n');
  console.info(`\n✅ wrote token supplement → ${SUPPLEMENT_OUT} (${supplement.length} tokens)`);

  const legacy = buildLegacyCatalog(merged);
  await Bun.write(
    LEGACY_OUT,
    JSON.stringify(
      {
        _comment:
          'Legacy nested format (kept for compatibility). Prefer tools/bun-docs-catalog.json (built by bun-docs-catalog.ts).',
        ...legacy,
      },
      null,
      2,
    ) + '\n',
  );
  console.info(`✅ wrote legacy catalog → ${LEGACY_OUT} (${Object.keys(legacy).length} pages)`);
}

/** Map internal token kinds to the shared DocCatalogEntry schema used by bun-docs-catalog.ts. */
type SupplementEntry = {
  name: string;
  type: 'api' | 'cli-flag' | 'config' | 'concept';
  stability: 'stable' | 'experimental' | 'deprecated';
  description?: string;
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

function toSupplementEntry(e: CatalogEntry): SupplementEntry {
  let type: SupplementEntry['type'];
  switch (e.type) {
    case 'api':
      type = 'api';
      break;
    case 'cli-flag':
      type = 'cli-flag';
      break;
    case 'env-var':
    case 'bunfig-key':
    case 'package-json-key':
      type = 'config';
      break;
    case 'concept':
    default:
      type = 'concept';
  }
  const canonical = e.canonicalPage;
  const allPages = [canonical, ...e.allPages.filter(p => p !== canonical)];
  return {
    name: e.name,
    type,
    stability: e.stability,
    description: e.description,
    canonicalPage: canonical,
    anchor: e.anchor || undefined,
    allPages,
    section: sectionFromUrl(canonical),
  };
}

if (import.meta.main) {
  await main();
}
