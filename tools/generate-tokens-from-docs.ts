#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
/**
 * generate-tokens-from-docs.ts — extract CLI tokens from Bun docs pages.
 *
 * Reads bun.com/docs/llms.txt, fetches each package-manager page's Markdown
 * source (.md), and extracts:
 *   - CLI flags (--filter, --linker, ...)
 *   - environment variables (BUN_CONFIG_*, ...)
 *   - bunfig.toml keys ([install].linker, ...)
 *   - package.json keys (trustedDependencies, workspaces, ...)
 *
 * Each token is mapped to the nearest preceding Markdown heading anchor so
 * agents get deep links directly to the relevant section.
 *
 * Note: this is a heuristic generator. Generated catalogs should be reviewed
 * before becoming authoritative; some tokens may map to the first prose mention
 * rather than their dedicated section.
 *
 * Run: bun tools/generate-tokens-from-docs.ts
 * Output: tools/bun-pm-tokens.json
 */

const LLMS_URL = 'https://bun.com/docs/llms.txt';
const OUT = new URL('./bun-pm-tokens.json', import.meta.url).pathname;

/** Domains to scan (initially package manager). */
const DOMAINS = ['pm/cli', 'pm'];

/** Page groups we do not want to scan for tokens (meta/landing pages). */
const SKIP_TITLES = new Set(['Package Manager']);

type TokenKind = 'cli-flag' | 'env-var' | 'bunfig-key' | 'package-json-key';
type TokenEntry = { token: string; kind: TokenKind; anchor: string; section: string };
type PageCatalog = {
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

/** Extract clean tokens from a single line of Markdown text. */
function extractTokens(line: string): Array<Omit<TokenEntry, 'anchor' | 'section'>> {
  const found: Array<Omit<TokenEntry, 'anchor' | 'section'>> = [];
  const seen = new Set<string>();
  const add = (token: string, kind: TokenKind) => {
    const key = `${kind}:${token}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ token, kind });
  };

  for (const m of line.matchAll(/(?<![\w-])--[a-z][a-z0-9-]*\b/g)) add(m[0], 'cli-flag');
  for (const m of line.matchAll(/\bBUN_[A-Z_][A-Z0-9_]*\b/g)) add(m[0], 'env-var');

  const packageJsonKeys = [
    'workspaces',
    'trustedDependencies',
    'overrides',
    'resolutions',
    'patchedDependencies',
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
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*=/);
    if (m?.[1]) keys.push(m[1]);
  }
  return keys;
}

/** Parse one docs page's Markdown into a token catalog. */
function parsePage(markdown: string, pageTitle: string, pageUrl: string): PageCatalog {
  const lines = markdown.split('\n');
  let currentAnchor = '';
  let currentSection = pageTitle;
  const tokens: TokenEntry[] = [];
  let inCode: string | null = null;
  let codeAnnotation = '';
  let codeBuffer: string[] = [];

  const flushCode = () => {
    if (!inCode || codeBuffer.length === 0) return;
    const block = codeBuffer.join('\n');
    codeBuffer = [];

    // bunfig keys from TOML blocks annotated with bunfig.toml
    if (inCode === 'toml') {
      for (const key of extractBunfigKeys(block, codeAnnotation)) {
        tokens.push({ token: key, kind: 'bunfig-key', anchor: currentAnchor, section: currentSection });
      }
    }
  };

  for (const raw of lines) {
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
      // Extract CLI flags/env vars from shell/code blocks too (not TOML/JSON bodies).
      if (inCode !== 'toml' && inCode !== 'json') {
        for (const t of extractTokens(line)) {
          if (t.kind === 'cli-flag' || t.kind === 'env-var') {
            tokens.push({ ...t, anchor: currentAnchor, section: currentSection });
          }
        }
      }
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      currentSection = heading[2].trim();
      currentAnchor = slugify(currentSection);
      continue;
    }

    for (const t of extractTokens(line)) {
      tokens.push({ ...t, anchor: currentAnchor, section: currentSection });
    }
  }
  flushCode();

  const cliFlags: Record<string, string> = {};
  const envVars: Record<string, string> = {};
  const bunfigKeys: Record<string, string> = {};
  const packageJsonKeys: Record<string, string> = {};

  for (const t of tokens) {
    const url = currentAnchor ? `${pageUrl.replace(/\.md$/, '')}#${t.anchor}` : pageUrl;
    switch (t.kind) {
      case 'cli-flag':
        if (!cliFlags[t.token]) cliFlags[t.token] = url;
        break;
      case 'env-var':
        if (!envVars[t.token]) envVars[t.token] = url;
        break;
      case 'bunfig-key':
        if (!bunfigKeys[t.token]) bunfigKeys[t.token] = url;
        break;
      case 'package-json-key':
        if (!packageJsonKeys[t.token]) packageJsonKeys[t.token] = url;
        break;
    }
  }

  return { page: pageUrl, pageTitle, cliFlags, envVars, bunfigKeys, packageJsonKeys };
}

async function main(): Promise<void> {
  const llms = await (await fetch(LLMS_URL)).text();
  const pages: { title: string; url: string }[] = [];
  for (const line of llms.split('\n')) {
    const m = line.match(/^- \[(.+?)\]\((https:\/\/[^)]+)\)/);
    if (!m) continue;
    const title = m[1];
    const url = m[2];
    if (SKIP_TITLES.has(title)) continue;
    const domain = new URL(url).pathname.replace(/^\/docs\//, '').replace(/\.md$/, '');
    const dir = domain.split('/').slice(0, 2).join('/');
    if (!DOMAINS.some(d => dir === d || domain.startsWith(d + '/'))) continue;
    pages.push({ title, url });
  }

  console.info(`🔍 Scanning ${pages.length} package-manager pages for tokens...`);
  const catalogs: PageCatalog[] = [];
  for (const { title, url } of pages) {
    try {
      const markdown = await fetch(url).then(r => r.text());
      const catalog = parsePage(markdown, title, url);
      const tokenCount =
        Object.keys(catalog.cliFlags).length +
        Object.keys(catalog.envVars).length +
        Object.keys(catalog.bunfigKeys).length +
        Object.keys(catalog.packageJsonKeys).length;
      console.info(`  ${title}: ${tokenCount} tokens`);
      catalogs.push(catalog);
    } catch (e) {
      console.error(`  ❌ ${title}: ${e}`);
    }
  }

  const merged = Object.fromEntries(catalogs.map(c => [c.pageTitle, c]));
  await Bun.write(OUT, JSON.stringify(merged, null, 2) + '\n');
  console.info(`\n✅ wrote ${catalogs.length} page catalogs → ${OUT}`);
}

if (import.meta.main) {
  await main();
}
