import { describe, expect, test } from 'bun:test';
import {
  COMMITTED_DOCS_ARTIFACTS,
  DOCS_CATALOG,
  DOCS_FEEDS,
  DOCS_INDEX,
  LEGACY_RELEASE_INDEX,
  RELEASE_OVERLAY_CACHE,
  TOKEN_SUPPLEMENT_CACHE,
  docsCommitLanePaths,
  isUnderToolsDir,
  resolveDocsArtifactPath,
  toolsDir,
} from '../lib/docs/docs-artifact-paths.ts';

describe('docs-artifact-paths', () => {
  test('committed paths resolve under tools/', () => {
    for (const rel of [DOCS_INDEX, DOCS_CATALOG, DOCS_FEEDS]) {
      const abs = resolveDocsArtifactPath(rel);
      expect(isUnderToolsDir(abs)).toBe(true);
      expect(abs.endsWith(rel.replace('tools/', ''))).toBe(true);
    }
  });

  test('cache paths resolve under tools/.cache/', () => {
    for (const rel of [RELEASE_OVERLAY_CACHE, TOKEN_SUPPLEMENT_CACHE]) {
      const abs = resolveDocsArtifactPath(rel);
      expect(abs.includes('/tools/.cache/')).toBe(true);
    }
  });

  test('legacy release index resolves under tools/', () => {
    const abs = resolveDocsArtifactPath(LEGACY_RELEASE_INDEX);
    expect(abs.startsWith(toolsDir())).toBe(true);
  });

  test('commit lane paths cover committed artifacts', () => {
    const fast = docsCommitLanePaths('fast');
    const feeds = docsCommitLanePaths('feeds');
    expect(fast).toContain(DOCS_INDEX);
    expect(fast).toContain(DOCS_CATALOG);
    expect(feeds).toEqual([DOCS_FEEDS]);
    for (const rel of COMMITTED_DOCS_ARTIFACTS) {
      expect([...fast, ...feeds]).toContain(rel);
    }
  });

  test('legacy split indexes are not present after migration', async () => {
    // Fully migrated off tools/ root (now cache-only or deleted).
    // tools/release-index.json remains a transitional write target for
    // bun-docs-releases / MCP until feeds-only consumers land — not asserted absent.
    const legacyRemoved = [
      'tools/reference-index.json',
      'tools/bun-docs-release-overlay.json',
      'tools/bun-docs-token-supplement.json',
    ];
    for (const rel of legacyRemoved) {
      expect(await Bun.file(resolveDocsArtifactPath(rel)).exists()).toBe(false);
    }
    expect(await Bun.file(resolveDocsArtifactPath(DOCS_FEEDS)).exists()).toBe(true);
  });
});
