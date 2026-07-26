/**
 * Seed narrative — FUND corridor · task timeline · rail utilization · drum gates.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · fund · rails · gates', () => {
  test('partners expose FUND corridor and task lifecycle timeline', () => {
    const snap = buildDemoTocOpsFixture();
    const nov = partnerByCode(snap.partners, 'NOV');
    const pat = partnerByCode(snap.partners, 'PAT');

    expect(nov.fundCorridor?.status).toBe('blocked');
    expect(nov.fundCorridor?.blockReason?.toLowerCase()).toContain('rail');
    expect(nov.taskTimeline?.some(e => e.event === 'blocked' && e.taskType === 'FUND')).toBe(true);

    expect(pat.fundCorridor?.status).toBe('funded');
    expect(pat.taskTimeline?.length).toBeGreaterThanOrEqual(2);
  });

  test('rails carry daily/monthly utilization vs limits', () => {
    const snap = buildDemoTocOpsFixture();
    const pat = partnerByCode(snap.partners, 'PAT');
    const highRail = pat.rails.find(r => r.confirmed && r.utilization)!;

    expect(highRail.utilization?.pctDaily).toBeGreaterThan(70);
    expect(highRail.utilization?.usedMonthly).toBeGreaterThan(0);
  });

  test('accounts expose capital location series and gate snapshots', () => {
    const snap = buildDemoTocOpsFixture();
    const ash = partnerByCode(snap.partners, 'ASH');
    const warmed = ash.accounts.find(a => a.status === 'WARMED')!;

    expect(warmed.capitalLocationSeries?.length).toBeGreaterThanOrEqual(2);
    expect(warmed.gateSnapshot?.gates.some(g => g.gateId === 'play_warmed' && g.ok)).toBe(true);

    const nov = partnerByCode(snap.partners, 'NOV');
    const newAcct = nov.accounts.find(a => a.status === 'New')!;
    expect(newAcct.gateSnapshot?.failed).toBeGreaterThanOrEqual(2);
  });

  test('ops-summary rollups include fund · rail · gate counts', () => {
    const slice = tocOpsToSummarySlice(withTocMetrics(buildDemoTocOpsFixture()));
    expect(slice.fundCorridorsBlocked).toBeGreaterThanOrEqual(1);
    expect(slice.railUtilHighCount).toBeGreaterThanOrEqual(1);
    expect(slice.accountGatesFailed).toBeGreaterThanOrEqual(3);
    expect(slice.capitalLocationMoves).toBeGreaterThanOrEqual(4);
  });
});
