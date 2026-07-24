// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildPortalWeavePayload,
  PORTAL_WEAVE_SURFACES,
} from '../lib/http/portal-weave.ts';
import { PORTAL_MARKDOWN_SLUGS } from '../lib/http/portal-route-manifest.ts';

describe('portal weave', () => {
  test('payload includes key surfaces and prediction report html path', () => {
    const p = buildPortalWeavePayload('2026-01-01T00:00:00.000Z');
    expect(p.generated).toBe('2026-01-01T00:00:00.000Z');
    expect(p.surfaces.length).toBeGreaterThan(8);
    expect(p.scripts.some(s => s.cmd.includes('reference:discover'))).toBe(true);
    const pred = p.surfaces.find(s => s.label === 'Prediction report');
    expect(pred?.href).toBe('/registry/prediction/report.html');
  });

  test('markdown slugs include dashboard', () => {
    expect(PORTAL_MARKDOWN_SLUGS).toContain('dashboard');
  });

  test('surfaces cover ops monitoring dod skills', () => {
    const hrefs = PORTAL_WEAVE_SURFACES.map(s => s.href);
    expect(hrefs).toContain('/portal/ops/');
    expect(hrefs).toContain('/monitoring/');
    expect(hrefs).toContain('/portal/dod/');
    expect(hrefs).toContain('/portal/skills/');
  });
});
