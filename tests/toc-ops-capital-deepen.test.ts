/**
 * Fourth-pass seed densification — capital / warm / Gate12 / expert ROI / buffer.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';

describe('toc-ops capital deepen', () => {
  test('accounts carry capital · warm · Gate12 ledgers', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    const ash001 = snap.partners
      .find(p => p.partnerCode === 'ASH')!
      .accounts.find(a => a.callSign === 'ASH-001')!;
    expect(ash001.capitalLedger!.length).toBeGreaterThanOrEqual(3);
    expect(ash001.warmCycles!.some(w => w.cycle === 2 && w.status === 'completed')).toBe(true);
    expect(ash001.gate12Ledger!.some(g => g.kind === 'mode_change' || g.kind === 'return')).toBe(
      true
    );

    const ash003 = snap.partners
      .find(p => p.partnerCode === 'ASH')!
      .accounts.find(a => a.callSign === 'ASH-003')!;
    expect(ash003.gate12Ledger!.some(g => g.mode === 'principal_recovery')).toBe(true);

    for (const p of snap.partners) {
      expect(p.healthPulse?.length).toBe(7);
    }
  });

  test('experts expose ROI + eligibility matrix', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    for (const e of snap.experts) {
      expect(e.profile?.roi).toBeTruthy();
      expect(e.profile!.roi!.plays30d).toBeGreaterThanOrEqual(0);
      expect(e.profile!.roi!.eligibility.length).toBeGreaterThanOrEqual(1);
    }
    const marcus = snap.experts.find(e => e.expertId === 'marcus')!;
    expect(marcus.profile!.roi!.byCallSign.length).toBeGreaterThanOrEqual(1);
  });

  test('buffer history + summary rollups bake', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    expect(baked.buffer.history?.length).toBe(7);
    expect(baked.summary.capitalMoves).toBeGreaterThanOrEqual(20);
    expect(baked.summary.gate12Events).toBeGreaterThanOrEqual(15);
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.capitalMoves).toBe(baked.summary.capitalMoves);
    expect(slice.bufferHistoryDays).toBe(7);
    expect(slice.warmCyclesOpen).toBeGreaterThanOrEqual(0);
  });
});
