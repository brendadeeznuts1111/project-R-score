/**
 * Fifth-pass seed densification — Soft balance sheet, limits, rails, switchback, releases.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';

describe('toc-ops accounting deepen', () => {
  test('Soft balance sheet satisfies A = L + E', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    for (const p of snap.partners) {
      const sheet = p.softBalance.balanceSheet!;
      expect(sheet).toBeTruthy();
      expect(sheet.identityOk).toBe(true);
      expect(sheet.assets).toBe(sheet.liabilities + sheet.equity);
      expect(sheet.drill.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('limit history + rail confirm lifecycle', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    const ash = snap.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.accounts.every(a => (a.limitHistory?.length ?? 0) >= 1)).toBe(true);
    expect(ash.rails.some(r => (r.confirmHistory?.length ?? 0) >= 2)).toBe(true);
    const nov = snap.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.rails.some(r => r.confirmHistory?.some(h => h.action === 'expired'))).toBe(true);
  });

  test('switchback windows + expert release cards including defer', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
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
