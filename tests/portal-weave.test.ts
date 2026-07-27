// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildPortalWeavePayload,
  PORTAL_WEAVE_ARTIFACTS,
  PORTAL_WEAVE_SURFACES,
} from '../lib/http/portal-weave.ts';
import { PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';
import { PORTAL_MD_SLUGS } from '../lib/http/llms-txt.ts';

describe('portal weave', () => {
  test('payload includes key surfaces and prediction report html path', () => {
    const p = buildPortalWeavePayload('2026-01-01T00:00:00.000Z');
    expect(p.generated).toBe('2026-01-01T00:00:00.000Z');
    expect(p.surfaces.length).toBeGreaterThan(8);
    expect(p.scripts.some(s => s.cmd.includes('reference:discover'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('public:discover'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('public:audit:verify'))).toBe(true);
    expect(p.scripts.some(s => s.cmd.includes('ops:seed:toc'))).toBe(true);
    const pred = p.surfaces.find(s => s.label === 'Prediction report');
    expect(pred?.href).toBe('/registry/prediction/report/');
  });

  test('markdown slugs include dashboard and toc; llms parity', () => {
    expect(PORTAL_MARKDOWN_SLUGS).toContain('dashboard');
    expect(PORTAL_MARKDOWN_SLUGS).toContain('toc');
    for (const slug of PORTAL_MD_SLUGS) {
      expect(PORTAL_MARKDOWN_SLUGS).toContain(slug);
    }
  });

  test('surfaces cover ops toc monitoring dod skills', () => {
    const hrefs = PORTAL_WEAVE_SURFACES.map(s => s.href);
    expect(hrefs).toContain('/portal/ops/');
    expect(hrefs).toContain('/portal/toc/');
    expect(hrefs).toContain('/monitoring/');
    expect(hrefs).toContain('/portal/dod/');
    expect(hrefs).toContain('/portal/skills/');
    const arts = PORTAL_WEAVE_ARTIFACTS.map(a => a.href);
    expect(arts).toContain('/registry/toc-ops.json');
    expect(arts).toContain('/registry/telegram-handshake.json');
    expect(arts).toContain('/registry/telegram-handshake-catalog.json');
    expect(arts).toContain('/registry/toc-ops-bake-proof.json');
    expect(arts).toContain('/registry/content-type-matrix.json');
    expect(arts).toContain('/registry/formdata-proof.json');
    expect(arts).toContain('/registry/package-info.json');
    expect(arts).toContain('/registry/seat-capital-desk.json');
  });
});
