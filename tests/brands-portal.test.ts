import { describe, expect, test } from 'bun:test';

import { PORTAL_OVERFLOW_NAV, PORTAL_FOOTER_LINKS } from '../lib/portal/chrome-catalog.ts';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';
import {
  buildBrandDomainMap,
  chooseRelationship,
  filterRelationshipRows,
  parseBrandHash,
  patchBrandHash,
  relationshipLabel,
} from '../public/portal/brands/brands-board.js';

describe('brand keymap portal', () => {
  test('registry artifact exposes glossary, governance, and project adoption', async () => {
    const payload = await Bun.file('public/registry/brand-keymap.json').json();

    expect(payload).toMatchObject({
      schemaVersion: 1,
      kind: 'brand-keymap',
      path: '/registry/brand-keymap.json',
      summary: {
        brands: 57,
        domains: 9,
      },
      governance: {
        stagedGate: 'bun tools/branded-id-check.ts --staged --strict',
      },
    });
    expect(payload.brands).toHaveLength(57);
    expect(payload.brands.some((b: { name: string }) => b.name === 'HostId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'AccessDomainId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'PagesProjectId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'SurfaceStatusCode')).toBe(true);
    expect(payload.projects.length).toBeGreaterThan(0);
    expect(payload.projects.some(project => project.status === 'local-pattern')).toBe(true);
  });

  test('relationship artifact exposes graph-ready Bun, brand, project, and proof rows', async () => {
    const payload = await Bun.file('public/registry/bun-brand-map.json').json();

    expect(payload).toMatchObject({
      schemaVersion: 1,
      kind: 'bun-brand-map',
      path: '/registry/bun-brand-map.json',
      summary: {
        totalCanonicalBrands: 57,
        trackedProjects: 32,
        externalProjects: 3,
        newUndeclared: 0,
        catalogConflicts: 0,
      },
    });
    expect(payload.relationships.length).toBeGreaterThan(0);
    expect(
      payload.relationships.every(
        row =>
          row.id &&
          row.capabilityId &&
          row.api &&
          row.wrapper &&
          row.project &&
          row.policy &&
          row.evidenceState
      )
    ).toBe(true);
    expect(payload.capabilities).toContainEqual(
      expect.objectContaining({
        token: 'Bun.Image',
        versionIntroduced: '1.3.14',
      })
    );
  });

  test('shell and board load both registries through shared portal chrome', async () => {
    const [html, script, css] = await Promise.all([
      Bun.file('public/portal/brands/index.html').text(),
      Bun.file('public/portal/brands/brands-board.js').text(),
      Bun.file('public/portal/brands/brands.css').text(),
    ]);

    expect(html).toContain('Bun capability × FactoryWager brand map');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/components/footer.js');
    expect(html).toContain('/portal/brands/brands-board.js');
    expect(html).toContain('/portal/brands/brands.css');
    expect(html).not.toContain('<style>');
    expect(script).toContain("const BRAND_KEYMAP_URL = '/registry/brand-keymap.json'");
    expect(script).toContain("const BUN_BRAND_MAP_URL = '/registry/bun-brand-map.json'");
    expect(script).not.toContain("fetch('/api/health");
    expect(css).toContain('@media (max-width: 759px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('relationships are default and graph-table-detail regions are equivalent', async () => {
    const html = await Bun.file('public/portal/brands/index.html').text();

    expect(html).toContain('data-view="relationships"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="relationship-domain"');
    expect(html).toContain('id="relationship-project"');
    expect(html).toContain('id="relationship-policy"');
    expect(html).toContain('id="relationship-evidence"');
    expect(html).toContain('Canonical relationship table');
    expect(html).toContain('id="relationship-detail"');
    expect(html).toContain('id="relationship-graph"');
  });

  test('relationship filters compute against one domain map and normalized state', () => {
    const rows = [
      {
        id: 'image',
        api: 'Bun.Image',
        variant: 'image-processing',
        brand: 'EvidenceId',
        direction: 'evidence',
        wrapper: 'lib/dod/evidence.ts',
        consumer: 'lib/dod/evidence.ts',
        project: 'project-R-score',
        policy: 'production-approved',
        evidenceState: 'verified',
        proofs: ['release-features#terminal-methods'],
      },
      {
        id: 'cron',
        api: 'Bun.cron',
        variant: 'in-process',
        brand: null,
        direction: 'none',
        wrapper: 'lib/factory/monitoring.ts',
        consumer: null,
        project: 'project-R-score',
        policy: 'optional',
        evidenceState: 'declared-unproven',
        proofs: [],
      },
    ];
    const domains = buildBrandDomainMap([{ name: 'EvidenceId', domain: 'audit' }]);

    expect(
      filterRelationshipRows(
        rows,
        {
          query: 'image',
          domain: 'audit',
          project: 'project-R-score',
          policy: 'production-approved',
          evidence: 'verified',
        },
        domains
      )
    ).toEqual([rows[0]]);
    expect(relationshipLabel(rows[0])).toBe('Bun.Image · image-processing');
    expect(relationshipLabel({ api: 'Bun.Image', variant: null })).toBe('Bun.Image');
  });

  test('hash helpers preserve tenant query state and repair stale relationship selections', () => {
    const parsed = parseBrandHash(
      '#view=projects&q=image&domain=audit&project=project-R-score&selected=missing'
    );
    expect(parsed).toEqual({
      view: 'projects',
      query: 'image',
      domain: 'audit',
      project: 'project-R-score',
      policy: '',
      evidence: '',
      selected: 'missing',
    });
    expect(patchBrandHash('#view=projects&selected=missing', { selected: 'image' })).toBe(
      'view=projects&selected=image'
    );
    expect(
      chooseRelationship(
        [
          { id: 'image' },
          { id: 'cron' },
        ],
        'missing'
      )
    ).toEqual({ row: { id: 'image' }, usedFallback: true });
    expect(chooseRelationship([{ id: 'image' }], 'image')).toEqual({
      row: { id: 'image' },
      usedFallback: false,
    });
  });

  test('raw artifacts and adjacent portal surfaces cross-link the map', async () => {
    const [html, nav, tools, packages] = await Promise.all([
      Bun.file('public/portal/brands/index.html').text(),
      Bun.file('public/portal/nav-badges.js').text(),
      Bun.file('public/portal/tools/index.html').text(),
      Bun.file('public/portal/packages/packages-board.js').text(),
    ]);

    expect(html).toContain('/registry/bun-brand-map.json');
    expect(html).toContain('/registry/brand-keymap.json');
    expect(nav).toContain("href: '/portal/brands/'");
    expect(nav).toContain("source: '/registry/bun-brand-map.json'");
    expect(tools).toContain('/portal/brands/#view=relationships');
    expect(packages).toContain('/portal/brands/#view=relationships');
  });

  test('chrome and weave make the glossary discoverable', () => {
    expect(PORTAL_OVERFLOW_NAV).toContainEqual(
      expect.objectContaining({ id: 'brands', href: '/portal/brands/' })
    );
    expect(PORTAL_FOOTER_LINKS).toContainEqual(
      expect.objectContaining({ label: 'Brands', href: '/portal/brands/' })
    );
    expect(PORTAL_WEAVE_SURFACES).toContainEqual(
      expect.objectContaining({ id: 'brands', href: '/portal/brands/' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/brand-keymap.json' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/bun-brand-map.json' })
    );
  });
});
