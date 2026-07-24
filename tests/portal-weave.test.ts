import { describe, expect, test } from 'bun:test';
import { buildPortalWeavePayload, PORTAL_WEAVE_SURFACES } from '../lib/http/portal-weave.ts';

describe('portal-weave', () => {
  test('buildPortalWeavePayload stamps generated and includes dashboard', () => {
    const p = buildPortalWeavePayload('2026-07-24T00:00:00.000Z');
    expect(p.generated).toBe('2026-07-24T00:00:00.000Z');
    expect(p.surfaces.some(s => s.href === '/portal/dashboard/')).toBe(true);
    expect(p.artifacts.some(a => a.href === '/registry/ops-summary.json')).toBe(true);
    expect(p.scripts.length).toBeGreaterThan(0);
  });

  test('surface hrefs use trailing slash for portal dirs', () => {
    for (const s of PORTAL_WEAVE_SURFACES) {
      if (s.href.startsWith('/portal/') && !s.href.includes('.')) {
        expect(s.href.endsWith('/')).toBe(true);
      }
    }
  });
});
