/**
 * TOC return efficiency — R_P, CE, LE, buffer, ranked actions.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../lib/toc-ops/fixture.ts';
import { withTocMetrics } from '../../lib/toc-ops/export-snapshot.ts';
import {
  computeLimitFreshness,
  getTioeSnapshot,
  rankNextActions,
  resolveReturnCatalog,
} from '../../lib/toc-ops/return-efficiency.ts';
import { tocOpsToSummarySlice } from '../../lib/toc-ops/export-snapshot.ts';

describe('toc-ops · return-efficiency', () => {
  const generatedAt = '2026-07-24T00:00:00.000Z';
  const now = Date.parse(generatedAt);

  test('getTioeSnapshot is idempotent for fixed generatedAt', () => {
    const base = buildDemoTocOpsFixture(generatedAt);
    const a = getTioeSnapshot(base, now);
    const b = getTioeSnapshot(base, now);
    expect(a.returnEfficiency.avgRP).toBe(b.returnEfficiency.avgRP);
    expect(a.rankedActions.map(r => r.process)).toEqual(b.rankedActions.map(r => r.process));
    expect(a.buffer.settlementFloatRatio).toBe(b.buffer.settlementFloatRatio);
  });

  test('R_P(LIMIT) exceeds R_P(WARM) on demo fixture', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture(generatedAt));
    const limitAvg = snap.returnEfficiency?.processTypeAvgRP.LIMIT ?? 0;
    const warmAvg = snap.returnEfficiency?.processTypeAvgRP.WARM ?? 0;
    expect(limitAvg).toBeGreaterThan(warmAvg);
  });

  test('principal recovery WD outranks profit PLAY in rankedActions', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture(generatedAt));
    const actions = snap.rankedActions ?? [];
    const wdPrincipal = actions.find(
      a => a.process === 'WD' && a.reason.includes('principal_recovery')
    );
    const play = actions.find(a => a.process === 'PLAY');
    if (wdPrincipal && play) {
      expect(wdPrincipal.rank).toBeLessThan(play.rank);
    }
    expect(actions.some(a => a.process === 'WD' && a.callSign === 'PAT-002')).toBe(true);
  });

  test('settlementFloatRatio and throttle computed on bake', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture(generatedAt));
    expect(snap.buffer.settlementFloatRatio).toBeGreaterThan(0);
    expect(typeof snap.buffer.throttleOnboarding).toBe('boolean');
    expect(['static', 't_velocity']).toContain(snap.buffer.floatTargetSource);
  });

  test('limit freshness derived from checkedAt', () => {
    const fresh = computeLimitFreshness('2026-07-23T00:00:00.000Z', 7, now);
    const stale = computeLimitFreshness('2026-07-12T09:00:00.000Z', 7, now);
    expect(fresh).toBe('fresh');
    expect(stale).toBe('stale');
  });

  test('weightedScore baked on account scores', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture(generatedAt));
    const pat = snap.partners.find(p => p.partnerCode === 'PAT')!;
    const pat001 = pat.readiness.accountScores.find(s => s.callSign === 'PAT-001')!;
    expect(pat001.weightedScore).toBeGreaterThan(0);
    expect(pat001.playable).toBe(true);
  });

  test('summary slice carries return fields', () => {
    const snap = withTocMetrics(buildDemoTocOpsFixture(generatedAt));
    const slice = tocOpsToSummarySlice(snap);
    expect(slice.topRankedProcess).toBeTruthy();
    expect(slice.avgRP).not.toBeNull();
    expect(slice.settlementFloatRatio).not.toBeNull();
  });

  test('fixture includes LIMIT-EX-02 and WARM-EX-02', () => {
    const snap = buildDemoTocOpsFixture(generatedAt);
    const ash = snap.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.knownExceptions.some(e => e.id === 'LIMIT-EX-02')).toBe(true);
    expect(ash.knownExceptions.some(e => e.id === 'WARM-EX-02')).toBe(true);
    expect(ash.accounts.some(a => a.callSign === 'ASH-003' && a.status === 'Limited')).toBe(true);
  });

  test('rankNextActions respects process rank ordering', () => {
    const base = buildDemoTocOpsFixture(generatedAt);
    const catalog = resolveReturnCatalog(base);
    const tioe = getTioeSnapshot(base, now);
    const ranked = rankNextActions(
      base,
      tioe.partners,
      tioe.returnEfficiency.byProcess,
      tioe.returnEfficiency.byAsset,
      catalog,
      tioe.buffer
    );
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]!.rank).toBe(1);
  });
});
