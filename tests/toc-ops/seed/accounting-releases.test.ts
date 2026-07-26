/**
 * Seed narrative — Soft A=L+E sheet, limit/rail lifecycle, switchback, release cards.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { DEMO_GENERATED_AT, partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · accounting & releases', () => {
  test('Soft balance sheet satisfies A = L + E on every partner', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    for (const p of snap.partners) {
      const sheet = p.softBalance.balanceSheet!;
      expect(sheet).toBeTruthy();
      expect(sheet.identityOk).toBe(true);
      expect(sheet.assets).toBe(sheet.liabilities + sheet.equity);
      expect(sheet.drill.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('limit refresh and rail confirm histories are populated', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const ash = partnerByCode(snap.partners, 'ASH');
    expect(ash.accounts.every(a => (a.limitHistory?.length ?? 0) >= 1)).toBe(true);
    expect(ash.rails.some(r => (r.confirmHistory?.length ?? 0) >= 2)).toBe(true);
    const nov = partnerByCode(snap.partners, 'NOV');
    expect(nov.rails.some(r => r.confirmHistory?.some(h => h.action === 'expired'))).toBe(true);
  });

  test('switchback windows and deferred release cards roll up to ops-summary', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    expect(snap.experiments.every(e => (e.switchbackWindows?.length ?? 0) >= 1)).toBe(true);
    const marcus = snap.experts.find(e => e.expertId === 'marcus')!;
    expect(marcus.profile?.releaseCards?.length).toBeGreaterThanOrEqual(1);
    expect(marcus.profile?.releaseCards?.some(c => c.status === 'deferred')).toBe(true);

    const baked = withTocMetrics(snap);
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.balanceSheetsOk).toBe(3);
    expect(slice.limitRefreshes).toBeGreaterThanOrEqual(10);
    expect(slice.railConfirmEvents).toBeGreaterThanOrEqual(6);
    expect(slice.switchbackWindows).toBeGreaterThanOrEqual(6);
    expect(slice.releaseCards).toBeGreaterThanOrEqual(3);
    expect(slice.deferredPlays).toBeGreaterThanOrEqual(1);
  });
});
