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
        brands: 61,
        domains: 9,
      },
      sources: {
        colorKernel: 'public/portal/theme.jsonc',
        domainGlossary: 'public/registry/domain-glossary.json',
      },
      governance: {
        stagedGate: 'bun tools/branded-id-check.ts --staged --strict',
      },
    });
    expect(payload.brands).toHaveLength(61);
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
      expect.objectContaining({ id: 'brands', href: '/portal/brands/' })
    );
    expect(PORTAL_WEAVE_ARTIFACTS).toContainEqual(
      expect.objectContaining({ href: '/registry/brand-keymap.json' })
    );
  });
});
