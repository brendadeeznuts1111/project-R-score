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
        brands: 58,
        domains: 9,
      },
      governance: {
        stagedGate: 'bun tools/branded-id-check.ts --staged --strict',
      },
    });
    expect(payload.brands).toHaveLength(58);
    expect(payload.brands.some((b: { name: string }) => b.name === 'HostId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'AccessDomainId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'PagesProjectId')).toBe(true);
    expect(payload.brands.some((b: { name: string }) => b.name === 'SurfaceStatusCode')).toBe(true);
    expect(payload.projects.length).toBeGreaterThan(0);
    expect(payload.projects.some(project => project.status === 'local-pattern')).toBe(true);
  });

  test('shell and board load the keymap through shared portal chrome', async () => {
    const [html, script] = await Promise.all([
      Bun.file('public/portal/brands/index.html').text(),
      Bun.file('public/portal/brands/brands-board.js').text(),
    ]);

    expect(html).toContain('Branded domain-value keymap');
    expect(html).toContain('/portal/data.js');
    expect(html).toContain('/portal/topbar.js');
    expect(html).toContain('/portal/components/footer.js');
    expect(html).toContain('/portal/brands/brands-board.js');
    expect(script).toContain("const KEYMAP_URL = '/registry/brand-keymap.json'");
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
