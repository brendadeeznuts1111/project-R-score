import { describe, expect, test } from 'bun:test';

import { PORTAL_OVERFLOW_NAV, PORTAL_FOOTER_LINKS } from '../lib/portal/chrome-catalog.ts';
import { PORTAL_WEAVE_ARTIFACTS, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';

describe('brand keymap portal', () => {
  test('registry artifact exposes glossary, governance, and project adoption', async () => {
    const payload = await Bun.file('public/registry/brand-keymap.json').json();

    expect(payload).toMatchObject({
      schemaVersion: 1,
      kind: 'brand-keymap',
      path: '/registry/brand-keymap.json',
      summary: {
        brands: 82,
        domains: 10,
      },
      sources: {
        colorKernel: 'public/portal/theme.jsonc',
        domainGlossary: 'public/registry/domain-glossary.json',
      },
      governance: {
        stagedGate: 'bun tools/branded-id-check.ts --staged --strict',
      },
    });
    expect(payload.brands).toHaveLength(82);
    expect(payload.brands.some((b: { name: string }) => b.name === 'OidcClientId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'DomId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'HostId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'AccessDomainId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'PagesProjectId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'SurfaceStatusCode')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'SportsbookId')).toBe(true);
    const sportsbook = payload.brands.find((b: { name: string }) => b.name === 'SportsbookId');
    expect(sportsbook?.glossaryConcepts).toContain('scrape.book');
    const stateCode = payload.brands.find((b: { name: string }) => b.name === 'StateCode');
    expect(stateCode?.glossaryConcepts).toContain('scrape.jurisdiction');
    expect(payload.domains.every((d: { color: string }) => /^#[0-9a-f]{6}$/i.test(d.color))).toBe(
      true
    );
    expect(payload.projects.length).toBeGreaterThan(0);
    expect(payload.projects.some(project => project.status === 'local-pattern')).toBe(true);
  });

  test('shell and board load the keymap through shared portal chrome', async () => {
    const [html, script, css] = await Promise.all([
      Bun.file('public/portal/brands/index.html').text(),
      Bun.file('public/portal/brands/brands-board.js').text(),
      Bun.file('public/portal/brands/brands.css').text(),
    ]);

    expect(html).toContain('Bun capability × FactoryWager brand map');
    expect(html).toContain('data-view="relationships"');
    expect(html).toContain('data-view="glossary"');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/components/footer.js');
    expect(html).toContain('/portal/brands/brands-board.js');
    expect(html).toContain('/portal/brands/brands.css');
    expect(html).toContain('/registry/bun-brand-map.json');
    expect(html).toContain('/registry/brand-keymap.json');
    expect(css).toContain('.brand-pill.domain');
    expect(css).toContain('--domain-color');
    expect(css).toContain('.brand-glossary-link');
    expect(css).toContain('var(--accent)');
    expect(script).toContain("const BRAND_KEYMAP_URL = '/registry/brand-keymap.json'");
    expect(script).toContain("const BUN_BRAND_MAP_URL = '/registry/bun-brand-map.json'");
    expect(script).toContain('domainPill');
    expect(script).toContain('glossaryLinks');
    expect(script).toContain('/portal/glossary/#glossary:');
    expect(script).not.toContain("fetch('/api/health");
  });

  test('chrome and weave make the glossary discoverable', () => {
    expect(PORTAL_OVERFLOW_NAV).toContainEqual(
      expect.objectContaining({ id: 'brands', href: '/portal/brands/' })
    );
    expect(PORTAL_FOOTER_LINKS).toContainEqual(
      expect.objectContaining({ label: 'Brands', href: '/portal/brands/' })
    );
    expect(PORTAL_WEAVE_SURFACES).toContainEqual(
      expect.objectContaining({
        id: 'brands',
        cli: expect.stringMatching(/brand-keymap[\s\S]*bun:brand-map/),
      })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/brand-keymap.json' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/bun-brand-map.json', purpose: 'shared' })
    );
  });

  test('board surfaces mapped and observed summary ratios', async () => {
    const script = await Bun.file('public/portal/brands/brands-board.js').text();
    expect(script).toContain('brands mapped');
    expect(script).toContain('matched / observed');
    expect(script).toContain('topUndeclaredApis');
    expect(script).toContain('mappedBrands');
  });

  test('wave-2 summary, unmapped filter, and evidence deep-links', async () => {
    const [script, html, css, alignment, ops] = await Promise.all([
      Bun.file('public/portal/brands/brands-board.js').text(),
      Bun.file('public/portal/brands/index.html').text(),
      Bun.file('public/portal/brands/brands.css').text(),
      Bun.file('public/portal/bun-brand-alignment.js').text(),
      Bun.file('public/portal/operations-dashboard.js').text(),
    ]);

    expect(script).toContain('legacy / new undeclared');
    expect(script).toContain('baselineUndeclared');
    expect(script).toContain('newUndeclared');
    expect(script).toContain("focusEvidence('observed-undeclared')");
    expect(script).toContain("focusEvidence('verified')");
    expect(script).toContain("status === 'unmapped'");
    expect(script).toContain('bunGraphBrandNames');
    expect(html).toContain('value="unmapped"');
    expect(html).toContain('Unmapped in Bun graph');
    expect(css).toContain('button.brand-stat');
    expect(css).toContain('.brand-stat.clickable');
    expect(css).toContain('attention-strong');
    expect(alignment).toContain('/portal/brands/#evidence=observed-undeclared');
    expect(alignment).not.toContain('attention view');
    expect(ops).toContain('/portal/brands/#evidence=observed-undeclared');
    expect(ops).not.toContain('attention view');
  });
});
