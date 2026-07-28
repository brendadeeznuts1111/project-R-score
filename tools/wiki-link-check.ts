#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * wiki-link-check.ts — ensure GitHub Pages wiki markdown does not link to Jekyll-excluded trees.
 *
 * Rewrites relative links under lib/, projects/, config/, scripts/, tools/, dotfiles
 * to origin blob URLs; normalizes docs index paths for Jekyll directory indexes.
 *
 *   bun tools/wiki-link-check.ts
 *   bun tools/wiki-link-check.ts --fix
 *   bun tools/wiki-link-check.ts --json
 *
 * @see docs/platform-routing.md
 * @see _config.yml
 */
import { resolvePath } from '../lib/path-bun.ts';
import { CANONICAL_REMOTES } from '../lib/docs/repo-docs.ts';

const REPO = resolvePath(import.meta.dir, '..');
const BLOB = `${CANONICAL_REMOTES.origin.url}/blob/main`;

/** Root + docs entrypoints published on wiki.factory-wager.com */
export const WIKI_MARKDOWN_PATHS = [
  'README.md',
  'wiki-index.md',
  'registry-index.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/AGENTS.md',
  'docs/harness/README.md',
] as const;

const EXCLUDED_PREFIXES = [
  'lib/',
  'projects/',
  'config/',
  'scripts/',
  'tools/',
  'tests/',
  'packages/',
  '.agents/',
] as const;

const DOTFILE_PATHS = new Set(['.custom-instructions.md', '.env.example']);

const JEKYLL_INDEX_REWRITES: Record<string, string> = {
  'docs/README.md': 'docs/',
  'docs/harness/README.md': 'docs/harness/',
};

export function githubBlobUrl(repoRelativePath: string): string {
  const clean = repoRelativePath.replace(/^\//, '');
  return `${BLOB}/${clean}`;
}

export function resolveRepoRelativeHref(href: string, fromFile: string): string {
  const raw = href.split('#')[0]?.split('?')[0] ?? '';
  if (!raw || raw.startsWith('http')) return raw;
  const fromDir = fromFile.includes('/') ? fromFile.replace(/\/[^/]+$/, '') : '';
  const joined = fromDir ? `${fromDir}/${raw}` : raw;
  const parts = joined.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const p of parts) {
    if (p === '..') stack.pop();
    else if (p !== '.') stack.push(p);
  }
  return stack.join('/');
}

export function isWikiExcludedHref(href: string, fromFile = 'README.md'): boolean {
  const path = resolveRepoRelativeHref(href.split('#')[0]?.split('?')[0] ?? '', fromFile);
  if (!path) return false;
  if (DOTFILE_PATHS.has(path)) return true;
  return EXCLUDED_PREFIXES.some(p => path.startsWith(p));
}

export function fixWikiHref(href: string, fromFile = 'README.md'): string {
  if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
    return href;
  }
  const [pathPart, ...rest] = href.split('#');
  const anchor = rest.length ? `#${rest.join('#')}` : '';
  const queryIdx = pathPart.indexOf('?');
  const query = queryIdx >= 0 ? pathPart.slice(queryIdx) : '';
  const base = queryIdx >= 0 ? pathPart.slice(0, queryIdx) : pathPart;
  const repoRel = resolveRepoRelativeHref(base, fromFile);

  if (JEKYLL_INDEX_REWRITES[repoRel]) {
    const out = JEKYLL_INDEX_REWRITES[repoRel];
    return relinkFromFile(out, fromFile) + query + anchor;
  }
  if (isWikiExcludedHref(base + query, fromFile)) {
    return githubBlobUrl(repoRel) + query + anchor;
  }
  if (repoRel === 'README.md' && fromFile !== 'README.md') {
    return relinkFromFile('/', fromFile) + query + anchor;
  }
  return href;
}

/** Emit href relative to the markdown file being edited. */
function relinkFromFile(target: string, fromFile: string): string {
  if (target.startsWith('http') || target.startsWith('#') || target === '/') return target;
  const fromDir = fromFile.includes('/') ? fromFile.replace(/\/[^/]+$/, '') : '';
  if (!fromDir) return target;
  if (target.startsWith(`${fromDir}/`)) {
    return target.slice(fromDir.length + 1) || './';
  }
  if (fromDir.startsWith('docs/') && target.startsWith('docs/')) {
    return target.slice('docs/'.length);
  }
  return target;
}

export type WikiLinkIssue = {
  file: string;
  href: string;
  fixed: string;
  line?: number;
};

const LINK_RE = /(\[[^\]]*\]\()([^)]+)(\))/g;

export function scanWikiMarkdown(content: string, file: string): WikiLinkIssue[] {
  const issues: WikiLinkIssue[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const m of line.matchAll(LINK_RE)) {
      const href = m[2]!;
      const fixed = fixWikiHref(href, file);
      if (fixed !== href) {
        issues.push({ file, href, fixed, line: i + 1 });
      }
    }
  }
  return issues;
}

export function applyWikiLinkFixes(content: string, file = 'README.md'): string {
  return content.replace(LINK_RE, (_all, pre: string, href: string, post: string) => {
    return `${pre}${fixWikiHref(href, file)}${post}`;
  });
}

async function main(): Promise<void> {
  const fix = process.argv.includes('--fix');
  const json = process.argv.includes('--json');
  const allIssues: WikiLinkIssue[] = [];

  for (const rel of WIKI_MARKDOWN_PATHS) {
    const abs = resolvePath(REPO, rel);
    if (!(await Bun.file(abs).exists())) continue;
    let text = await Bun.file(abs).text();
    const issues = scanWikiMarkdown(text, rel);
    allIssues.push(...issues);
    if (fix && issues.length) {
      text = applyWikiLinkFixes(text, rel);
      await Bun.write(abs, text);
    }
  }

  if (json) {
    console.log(JSON.stringify({ issues: allIssues, count: allIssues.length }, null, 2));
  } else if (allIssues.length === 0) {
    console.log('✅ wiki-link-check: all wiki markdown links OK');
  } else {
    for (const i of allIssues) {
      console.log(`${i.file}:${i.line ?? '?'}  ${i.href}  →  ${i.fixed}`);
    }
    console.log(`\n${fix ? 'fixed' : 'found'} ${allIssues.length} wiki link(s)`);
    if (!fix) process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
