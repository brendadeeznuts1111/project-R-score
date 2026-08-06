#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Keep the human wiki index aligned with the committed portal and harness
 * tenant inventories.
 *
 *   bun tools/wiki-index-coverage.ts
 *   bun tools/wiki-index-coverage.ts --json
 */
import { jsonOut } from '../lib/console-depth.ts';
import { resolvePath } from '../lib/path-bun.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from '../lib/portal/page-concepts.ts';
import { resolveRepoRelativeHref } from './wiki-link-check.ts';

const REPO = resolvePath(import.meta.dir, '..');
const WIKI_INDEX = 'wiki-index.md';
const PORTAL_HOST = 'score.factory-wager.com';

export type WikiIndexCoverageIssue = {
  kind: 'broken-registry' | 'missing-portal' | 'missing-tenant' | 'stale-summary';
  target: string;
};

export type WikiIndexCoverageResult = {
  portalTotal: number;
  registryTotal: number;
  tenantTotal: number;
  issues: WikiIndexCoverageIssue[];
};

const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

export function collectMarkdownHrefs(content: string): string[] {
  return [...content.matchAll(MARKDOWN_LINK_RE)].map(match => match[1]!.trim());
}

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

export function portalPathFromHref(href: string): string | undefined {
  if (!href.startsWith('http://') && !href.startsWith('https://')) return undefined;
  try {
    const url = new URL(href);
    if (url.hostname !== PORTAL_HOST || !url.pathname.startsWith('/portal/')) return undefined;
    return withTrailingSlash(url.pathname);
  } catch {
    return undefined;
  }
}

export function registryPathFromHref(href: string): string | undefined {
  if (!href.startsWith('http://') && !href.startsWith('https://')) return undefined;
  try {
    const url = new URL(href);
    if (
      url.hostname !== PORTAL_HOST ||
      !url.pathname.startsWith('/registry/') ||
      !url.pathname.endsWith('.json')
    ) {
      return undefined;
    }
    return `public${decodeURIComponent(url.pathname)}`;
  } catch {
    return undefined;
  }
}

export function scanWikiIndexCoverage(
  content: string,
  portalPaths: readonly string[],
  tenantPaths: readonly string[],
  registryPaths: readonly string[]
): WikiIndexCoverageResult {
  const hrefs = collectMarkdownHrefs(content);
  const livePortalPaths = new Set(
    hrefs.map(portalPathFromHref).filter((path): path is string => path != null)
  );
  const repoPaths = new Set(
    hrefs
      .filter(href => !href.startsWith('http://') && !href.startsWith('https://'))
      .map(href => resolveRepoRelativeHref(href, WIKI_INDEX))
  );
  const linkedRegistryPaths = new Set(
    hrefs.map(registryPathFromHref).filter((path): path is string => path != null)
  );
  const availableRegistryPaths = new Set(registryPaths);
  const issues: WikiIndexCoverageIssue[] = [];

  for (const path of portalPaths) {
    const canonical = withTrailingSlash(path);
    if (!livePortalPaths.has(canonical)) issues.push({ kind: 'missing-portal', target: canonical });
  }
  for (const path of tenantPaths) {
    if (!repoPaths.has(path)) issues.push({ kind: 'missing-tenant', target: path });
  }
  for (const path of linkedRegistryPaths) {
    if (!availableRegistryPaths.has(path)) issues.push({ kind: 'broken-registry', target: path });
  }

  const portalSummary = `| Portal pages | ${portalPaths.length}/${portalPaths.length} |`;
  const tenantSummary = `| Harness tenants | ${tenantPaths.length}/${tenantPaths.length} |`;
  const portalSummaryPattern = new RegExp(
    `^\\|\\s*Portal pages\\s*\\|\\s*${portalPaths.length}/${portalPaths.length}\\s*\\|`,
    'm'
  );
  const tenantSummaryPattern = new RegExp(
    `^\\|\\s*Harness tenants\\s*\\|\\s*${tenantPaths.length}/${tenantPaths.length}\\s*\\|`,
    'm'
  );
  if (!portalSummaryPattern.test(content)) {
    issues.push({ kind: 'stale-summary', target: portalSummary });
  }
  if (!tenantSummaryPattern.test(content)) {
    issues.push({ kind: 'stale-summary', target: tenantSummary });
  }

  return {
    portalTotal: portalPaths.length,
    registryTotal: linkedRegistryPaths.size,
    tenantTotal: tenantPaths.length,
    issues,
  };
}

export function trackedTenantPaths(root = REPO): string[] {
  return [...new Bun.Glob('docs/harness/tenants/*.md').scanSync({ cwd: root, onlyFiles: true })]
    .map(path => path.replaceAll('\\', '/'))
    .sort();
}

export function registryArtifactPaths(root = REPO): string[] {
  return [...new Bun.Glob('public/registry/**/*.json').scanSync({ cwd: root, onlyFiles: true })]
    .map(path => path.replaceAll('\\', '/'))
    .sort();
}

async function main(): Promise<void> {
  const json = Bun.argv.includes('--json');
  const content = await Bun.file(resolvePath(REPO, WIKI_INDEX)).text();
  const portalPaths = PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => page.path);
  const tenantPaths = trackedTenantPaths();
  const registryPaths = registryArtifactPaths();
  const result = scanWikiIndexCoverage(content, portalPaths, tenantPaths, registryPaths);

  if (json) {
    jsonOut(result);
  } else if (result.issues.length === 0) {
    console.log(
      `✅ wiki-index coverage: ${result.portalTotal}/${result.portalTotal} portal pages · ${result.tenantTotal}/${result.tenantTotal} harness tenants · ${result.registryTotal} registry links present`
    );
  } else {
    console.error(`❌ wiki-index coverage: ${result.issues.length} issue(s)`);
    for (const issue of result.issues) console.error(`  ${issue.kind}: ${issue.target}`);
  }

  if (result.issues.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
