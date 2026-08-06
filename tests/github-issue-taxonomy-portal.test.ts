// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { PORTAL_HTML_ROUTES, PORTAL_MARKDOWN_SLUGS, PORTAL_TRAILING_SLASH_SOURCES } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_DASHBOARD_ROUTES } from '../lib/http/public-routes.ts';
import { PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';
import { PORTAL_MD_SLUGS, llmsTxtBody } from '../lib/http/llms-txt.ts';
import { portalMarkdownExists, portalMarkdownRaw } from '../lib/http/portal-markdown.ts';
import { PORTAL_FOOTER_LINKS, PORTAL_OVERFLOW_NAV } from '../lib/portal/chrome-catalog.ts';
import { PORTAL_PAGE_CONCEPT_DEFINITIONS } from '../lib/portal/page-concepts.ts';
import {
  canonicalArtifactBytes,
  evaluateIssueRegistryHealth,
  issueSearchUrl,
  validateIssueTaxonomy,
} from '../public/portal/issues/issues-board.js';

describe('GitHub issue taxonomy portal', () => {
  test('committed registry and bake manifest produce a healthy static view', async () => {
    const artifact = await Bun.file('public/registry/github-issue-taxonomy.json').json();
    const manifest = await Bun.file('public/registry/bake-manifest.json').json();
    const validation = validateIssueTaxonomy(artifact);
    const health = evaluateIssueRegistryHealth(artifact, manifest);

    expect(validation).toEqual({ ok: true, errors: [] });
    expect(health.ok).toBeTrue();
    expect(health.errors).toEqual([]);
    expect(health.checks.every(check => check.ok)).toBeTrue();
    expect(health.entry?.bytes).toBe(canonicalArtifactBytes(artifact));
    expect(artifact.dimensions.filter((row: { required: boolean }) => row.required)).toHaveLength(6);
  });

  test('missing, stale, and byte-drifted registry evidence degrades explicitly', async () => {
    const artifact = await Bun.file('public/registry/github-issue-taxonomy.json').json();
    const stale = structuredClone(artifact);
    stale.audit.sourceHash = 'stale';
    expect(validateIssueTaxonomy(stale).ok).toBeFalse();

    const missing = evaluateIssueRegistryHealth(artifact, null);
    expect(missing.ok).toBeFalse();
    expect(missing.errors).toContain('bake manifest is unavailable or malformed');

    const driftedManifest = {
      kind: 'registry-bake-manifest',
      entries: [{ path: '/registry/github-issue-taxonomy.json', bytes: 1 }],
    };
    const drifted = evaluateIssueRegistryHealth(artifact, driftedManifest);
    expect(drifted.ok).toBeFalse();
    expect(drifted.errors).toContain('bake manifest byte count does not match the taxonomy payload');
  });

  test('board is accessible, static-compatible, and never fetches GitHub', async () => {
    const [html, script, css, markdown] = await Promise.all([
      Bun.file('public/portal/issues/index.html').text(),
      Bun.file('public/portal/issues/issues-board.js').text(),
      Bun.file('public/portal/issues/issues.css').text(),
      Bun.file('public/portal/issues.md').text(),
    ]);

    expect(html).toContain('Issue meaning, ownership, and drift health');
    expect(html).toContain('data-glossary-concept="page.issueTaxonomy"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('/portal/issues/issues-board.js');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(script).toContain("ISSUE_TAXONOMY_URL = '/registry/github-issue-taxonomy.json'");
    expect(script).toContain("BAKE_MANIFEST_URL = '/registry/bake-manifest.json'");
    expect(script).toContain('Required');
    expect(script).toContain('Optional');
    expect(script).toContain('aria-hidden="true"');
    expect(script).not.toMatch(/fetchJsonResult\([^)]*github\.com/i);
    expect(script).not.toContain('api.github.com');
    expect(css).toContain('var(--issue-label-color)');
    expect(css).toContain('var(--tone-bad)');
    expect(css).not.toMatch(/:root\s*\{/);
    expect(markdown).toContain('portal.github_issue_taxonomy');
  });

  test('route, chrome, weave, and page concept expose the board', () => {
    expect(PORTAL_HTML_ROUTES).toContain('/portal/issues/');
    expect(PORTAL_TRAILING_SLASH_SOURCES).toContain('/portal/issues');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('issues');
    expect(PORTAL_MD_SLUGS).toContain('issues');
    expect(portalMarkdownExists('issues')).toBeTrue();
    expect(portalMarkdownRaw('issues')).toContain('portal.github_issue_taxonomy');
    expect(llmsTxtBody()).toContain('[Issues](portal/issues.md)');
    expect(PORTAL_DASHBOARD_ROUTES).toContainEqual(
      expect.objectContaining({ path: '/portal/issues/' })
    );
    expect(PORTAL_DASHBOARD_ROUTES).toContainEqual(
      expect.objectContaining({ path: '/registry/github-issue-taxonomy.json' })
    );
    expect(PORTAL_OVERFLOW_NAV).toContainEqual(
      expect.objectContaining({
        id: 'issues',
        href: '/portal/issues/',
        registryArtifact: '/registry/github-issue-taxonomy.json',
      })
    );
    expect(PORTAL_FOOTER_LINKS).toContainEqual({ label: 'Issues', href: '/portal/issues/' });
    expect(PORTAL_WEAVE_SURFACES).toContainEqual(
      expect.objectContaining({
        id: 'issues',
        href: '/portal/issues/',
        conceptId: 'portal.github_issue_taxonomy',
        relatedArtifactIds: ['github-issue-taxonomy'],
      })
    );
    expect(PORTAL_PAGE_CONCEPT_DEFINITIONS).toContainEqual(
      expect.objectContaining({ path: '/portal/issues/', id: 'page.issueTaxonomy' })
    );
  });

  test('GitHub issue links are navigation only and label-scoped', () => {
    const all = new URL(issueSearchUrl());
    const p0 = new URL(issueSearchUrl('p0'));
    expect(all.origin).toBe('https://github.com');
    expect(all.searchParams.get('q')).toBe('is:issue');
    expect(p0.searchParams.get('q')).toBe('is:issue label:"p0"');
  });
});
