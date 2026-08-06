// @see https://bun.com/docs/test — Bun test runner
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from '../lib/portal/page-concepts.ts';
import {
  portalPathFromHref,
  registryArtifactPaths,
  registryPathFromHref,
  scanWikiIndexCoverage,
  trackedTenantPaths,
} from '../tools/wiki-index-coverage.ts';
import { scanWikiMarkdown } from '../tools/wiki-link-check.ts';

const REPO = resolvePath(import.meta.dir, '..');

describe('wiki-index coverage', () => {
  test('covers every committed portal page and harness tenant', async () => {
    const content = await Bun.file(resolvePath(REPO, 'wiki-index.md')).text();
    const result = scanWikiIndexCoverage(
      content,
      PORTAL_PAGE_CONCEPT_DEFINITIONS.map(page => page.path),
      trackedTenantPaths(REPO),
      registryArtifactPaths(REPO)
    );

    expect(result.issues).toEqual([]);
    expect(scanWikiMarkdown(content, 'wiki-index.md')).toEqual([]);
  });

  test('reports missing inventory links and stale totals', () => {
    const result = scanWikiIndexCoverage(
      '[Home](https://score.factory-wager.com/portal/) [missing](https://score.factory-wager.com/registry/missing.json)',
      ['/portal/', '/portal/ops/'],
      ['docs/harness/tenants/ci-core.md'],
      ['public/registry/ops-summary.json']
    );

    expect(result.issues).toContainEqual({ kind: 'missing-portal', target: '/portal/ops/' });
    expect(result.issues).toContainEqual({
      kind: 'missing-tenant',
      target: 'docs/harness/tenants/ci-core.md',
    });
    expect(result.issues).toContainEqual({
      kind: 'broken-registry',
      target: 'public/registry/missing.json',
    });
    expect(result.issues.filter(issue => issue.kind === 'stale-summary')).toHaveLength(2);
  });

  test('normalizes live portal and registry URLs and ignores other hosts', () => {
    expect(portalPathFromHref('https://score.factory-wager.com/portal/ops')).toBe(
      '/portal/ops/'
    );
    expect(
      registryPathFromHref('https://score.factory-wager.com/registry/tennis/agent-auth.json')
    ).toBe('public/registry/tennis/agent-auth.json');
    expect(portalPathFromHref('https://wiki.factory-wager.com/portal/ops/')).toBeUndefined();
    expect(registryPathFromHref('https://score.factory-wager.com/registry/')).toBeUndefined();
  });
});
