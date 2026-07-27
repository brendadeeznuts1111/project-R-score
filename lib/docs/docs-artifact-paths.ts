/**
 * Docs operate artifact paths — repo-relative SSOT + absolute resolvers.
 *
 * @see docs/BUN_DOCS_OPERATE.md
 * @see lib/docs/repo-docs.ts CANONICAL_TOOLS
 */
import { resolvePath } from '../path-bun';

const REPO_ROOT = resolvePath(import.meta.dir, '../..');
const TOOLS_DIR = resolvePath(REPO_ROOT, 'tools');

/** Committed daily SSOT */
export const DOCS_INDEX = 'tools/bun-docs-index.json';
export const DOCS_CATALOG = 'tools/bun-docs-catalog.json';

/** Committed feed lane (RSS + API reference) */
export const DOCS_FEEDS = 'tools/bun-docs-feeds.json';

/** Build-only caches (gitignored) */
export const RELEASE_OVERLAY_CACHE = 'tools/.cache/bun-release-overlay.json';
export const TOKEN_SUPPLEMENT_CACHE = 'tools/.cache/bun-token-supplement.json';

/** Legacy tracked paths — read fallback until migration rebake */
export const LEGACY_RELEASE_INDEX = 'tools/release-index.json';
export const LEGACY_REFERENCE_INDEX = 'tools/reference-index.json';
export const LEGACY_RELEASE_OVERLAY = 'tools/bun-docs-release-overlay.json';
export const LEGACY_TOKEN_SUPPLEMENT = 'tools/bun-docs-token-supplement.json';

/** Artifacts expected in git after dedup migration */
export const COMMITTED_DOCS_ARTIFACTS = [DOCS_INDEX, DOCS_CATALOG, DOCS_FEEDS] as const;

/** Build caches — never commit (tools/.cache/ is gitignored) */
export const CACHE_DOCS_ARTIFACTS = [RELEASE_OVERLAY_CACHE, TOKEN_SUPPLEMENT_CACHE] as const;

export type DocsCommitLane = 'fast' | 'feeds' | 'proof';

/** Repo-relative paths typically committed per refresh tier. */
export function docsCommitLanePaths(lane: DocsCommitLane): readonly string[] {
  switch (lane) {
    case 'fast':
      return [DOCS_INDEX, DOCS_CATALOG];
    case 'feeds':
      return [DOCS_FEEDS];
    case 'proof':
      return ['public/registry/docs-coverage-proof.json', 'public/registry/doc-index.json'];
  }
}

export function repoRoot(): string {
  return REPO_ROOT;
}

export function toolsDir(): string {
  return TOOLS_DIR;
}

/** Resolve a repo-relative docs artifact path to absolute. */
export function resolveDocsArtifactPath(repoRelative: string): string {
  return resolvePath(REPO_ROOT, repoRelative);
}

export const DOCS_INDEX_ABS = resolveDocsArtifactPath(DOCS_INDEX);
export const DOCS_CATALOG_ABS = resolveDocsArtifactPath(DOCS_CATALOG);
export const DOCS_FEEDS_ABS = resolveDocsArtifactPath(DOCS_FEEDS);
export const RELEASE_OVERLAY_CACHE_ABS = resolveDocsArtifactPath(RELEASE_OVERLAY_CACHE);
export const TOKEN_SUPPLEMENT_CACHE_ABS = resolveDocsArtifactPath(TOKEN_SUPPLEMENT_CACHE);
export const LEGACY_RELEASE_INDEX_ABS = resolveDocsArtifactPath(LEGACY_RELEASE_INDEX);
export const LEGACY_REFERENCE_INDEX_ABS = resolveDocsArtifactPath(LEGACY_REFERENCE_INDEX);
export const LEGACY_RELEASE_OVERLAY_ABS = resolveDocsArtifactPath(LEGACY_RELEASE_OVERLAY);
export const LEGACY_TOKEN_SUPPLEMENT_ABS = resolveDocsArtifactPath(LEGACY_TOKEN_SUPPLEMENT);

/** True when path is under tools/ (repo-relative or absolute). */
export function isUnderToolsDir(absPath: string): boolean {
  const normalized = absPath.replace(/\\/g, '/');
  const tools = TOOLS_DIR.replace(/\\/g, '/');
  return normalized.startsWith(`${tools}/`) || normalized === tools;
}
