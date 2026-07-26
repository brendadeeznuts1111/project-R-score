/**
 * Seed narrative — MessageLog, rotor drift, experiment outcomes.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { DEMO_GENERATED_AT, DEMO_PARTNER_CODES, partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · channel & experiments', () => {
  test('each partner carries MessageLog, rotor series, and exception timeline', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    for (const code of DEMO_PARTNER_CODES) {
      const p = partnerByCode(snap.partners, code);
      expect(p.messageLog?.length).toBeGreaterThanOrEqual(3);
      expect(p.rotorSeries?.length).toBeGreaterThanOrEqual(1);
      expect(p.exceptionTimeline?.length).toBeGreaterThanOrEqual(1);
    }
    const ash = partnerByCode(snap.partners, 'ASH');
    expect(ash.messageLog?.some(m => m.slaBreached)).toBe(true);
    expect(ash.rotorSeries?.some(r => r.driftBps > 0)).toBe(true);
    const nov = partnerByCode(snap.partners, 'NOV');
    expect(nov.softBalance.recentEntries.some(e => e.entryType === 'CostOfPriming')).toBe(true);
  });

  test('experiments record outcome lift and keep/kill decision', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
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
