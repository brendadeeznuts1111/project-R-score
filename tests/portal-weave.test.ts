// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildPortalWeavePayload,
  PORTAL_WEAVE_ARTIFACTS,
  PORTAL_WEAVE_SURFACES,
  withStableLinkIds,
} from '../lib/http/portal-weave.ts';
import { PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_MD_SLUGS } from '../lib/http/llms-txt.ts';

describe('portal weave', () => {
  test('payload includes key surfaces and prediction report html path', () => {
    const p = buildPortalWeavePayload('2026-01-01T00:00:00.000Z');
    expect(p.generated).toBe('2026-01-01T00:00:00.000Z');
    expect(p.schemaVersion).toBe(2);
    expect(p.kind).toBe('portal-weave');
    expect(p.path).toBe('/registry/portal-weave.json');
    expect(p.summary.surfaces).toBe(p.surfaces.length);
    expect(p.related.bunBrandMap).toBe('/registry/bun-brand-map.json');
    expect(p.related.monorepoHealth).toBe('/registry/monorepo-health.json');
    expect(p.related.chrome).toBe('/registry/portal-chrome.json');
    expect(p.surfaces.length).toBeGreaterThan(8);
    expect(p.surfaces.every(s => s.id)).toBe(true);
    expect(p.wiki.some(w => w.label === 'Wiki index')).toBe(true);
    expect(p.components.length).toBeGreaterThan(5);
    expect(p.scripts.some(s => s.cmd.includes('reference:discover'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('public:discover'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('public:audit:verify'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:seed:toc'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('portal:chrome:bake'))).toBe(true);
    const pred = p.surfaces.find(s => s.label === 'Prediction report');
    expect(pred?.href).toBe('/registry/prediction/report/');
    expect(pred?.id).toBe('prediction-report');
  });

  test('artifact ids are semantic and independent of declaration order', () => {
    const forward = withStableLinkIds(PORTAL_WEAVE_ARTIFACTS, 'artifact');
    const reversed = withStableLinkIds([...PORTAL_WEAVE_ARTIFACTS].reverse(), 'artifact');
    const reversedByHref = new Map(reversed.map(link => [link.href, link.id]));

    for (const link of forward) {
      expect(reversedByHref.get(link.href)).toBe(link.id);
    }
    expect(forward.find(link => link.href === '/registry/bun-brand-map.json')?.id).toBe(
      'artifact-bun-brand-map'
    );
  });

  test('explicit stable link ids are preserved and generated collisions fail closed', () => {
    expect(
      withStableLinkIds(
        [{ id: 'existing-id', label: 'Existing', href: '/registry/existing.json' }],
        'artifact'
      )[0]?.id
    ).toBe('existing-id');
    expect(() =>
      withStableLinkIds(
        [
          { label: 'Same label', href: '/registry/one.json' },
          { label: 'Same label', href: '/registry/two.json' },
        ],
        'artifact'
      )
    ).toThrow('Duplicate portal weave id');
  });

  test('markdown slugs include dashboard and toc; llms parity', () => {
    expect(PORTAL_MARKDOWN_SLUGS).toContain('dashboard');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('toc');
    for (const slug of PORTAL_MD_SLUGS) {
      expect(PORTAL_MARKDOWN_SLUGS).toContain(slug);
    }
  });

  test('surfaces cover ops toc monitoring dod skills compliance', () => {
    const p = buildPortalWeavePayload();
    const hrefs = PORTAL_WEAVE_SURFACES.map(s => s.href);
    expect(hrefs).toContain('/portal/ops/');
    expect(hrefs).toContain('/portal/toc/');
    expect(hrefs).toContain('/monitoring/');
    expect(hrefs).toContain('/portal/dod/');
    expect(hrefs).toContain('/portal/skills/');
    expect(hrefs).toContain('/portal/compliance/');
    expect(hrefs).toContain('/portal/limits/');
    expect(hrefs).toContain('/portal/dashboard/');
    expect(hrefs).toContain('/portal/tools/');
    expect(hrefs).toContain('/portal/vault/');
    expect(hrefs).toContain('/portal/failures/');
    // unique ids / no duplicate env
    const ids = PORTAL_WEAVE_SURFACES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === 'env')).toHaveLength(1);
    const vault = PORTAL_WEAVE_SURFACES.find(s => s.id === 'vault');
    expect(vault?.group).toBe('secrets');
    expect(vault?.cli).toContain('vault health');
    const arts = PORTAL_WEAVE_ARTIFACTS.map(a => a.href);
    expect(arts).toContain('/registry/toc-ops.json');
    expect(arts).toContain('/registry/telegram-handshake.json');
    expect(arts).toContain('/registry/telegram-handshake-catalog.json');
    expect(arts).toContain('/registry/toc-ops-bake-proof.json');
    expect(arts).toContain('/registry/content-type-matrix.json');
    expect(arts).toContain('/registry/formdata-proof.json');
    expect(arts).toContain('/registry/package-info.json');
    expect(arts).toContain('/registry/seat-capital-desk.json');
    expect(arts).toContain('/registry/compliance-board.json');
    expect(arts).toContain('/registry/compliance-enhancements.json');
    expect(arts).toContain('/registry/compliance-shadow.json');
    expect(arts).toContain('/registry/limit-raises.json');
    expect(arts).toContain('/registry/verification-index.json');
    expect(arts).toContain('/registry/doc-index.json');
    expect(arts).toContain('/registry/bun-brand-map.json');
    expect(p.scripts.some(s => s.cmd.includes('docs:map:check'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('compliance:bake'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('compliance:verify'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:limits:demo'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:snapshot'))).toBe(true);
  });
});
