/**
 * Third-pass seed densification — MessageLog, rotor, experiment outcomes.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { withTocMetrics, tocOpsToSummarySlice } from '../lib/toc-ops/export-snapshot.ts';

describe('toc-ops channel deepen', () => {
  test('partners carry MessageLog · rotor · exception timeline', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    for (const code of ['ASH', 'PAT', 'NOV'] as const) {
      const p = snap.partners.find(x => x.partnerCode === code)!;
      expect(p.messageLog?.length).toBeGreaterThanOrEqual(3);
      expect(p.rotorSeries?.length).toBeGreaterThanOrEqual(1);
      expect(p.exceptionTimeline?.length).toBeGreaterThanOrEqual(1);
    }
    const ash = snap.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.messageLog?.some(m => m.slaBreached)).toBe(true);
    expect(ash.rotorSeries?.some(r => r.driftBps > 0)).toBe(true);
    const nov = snap.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.softBalance.recentEntries.some(e => e.entryType === 'CostOfPriming')).toBe(true);
  });

  test('experiments expose outcome lift + decision', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(snap.experiments.every(e => e.outcome != null)).toBe(true);
    const completed = snap.experiments.find(e => e.status === 'completed')!;
    expect(completed.outcome?.decision).toMatch(/keep|kill/);
    expect(snap.summary.experimentOutcomes).toBe(3);
    expect(snap.summary.messageLogEntries).toBeGreaterThanOrEqual(12);
    expect(snap.summary.rotorSamples).toBeGreaterThanOrEqual(8);
  });

  test('ops-summary slice mirrors channel rollups', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.messageLogEntries).toBeGreaterThanOrEqual(12);
    expect(slice.experimentOutcomes).toBe(3);
    expect(slice.avgExperimentLiftPct).not.toBeNull();
    expect(slice.rotorSamples).toBeGreaterThanOrEqual(8);
  });
});
