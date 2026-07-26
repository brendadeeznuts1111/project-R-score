/**
 * Seed narrative — BIC handoffs · warm playbook · phone logistics · liquidity util.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · ops handoffs', () => {
  test('partners expose BIC handoff timeline on open tasks', () => {
    const snap = buildDemoTocOpsFixture();
    const ash = partnerByCode(snap.partners, 'ASH');
    const nov = partnerByCode(snap.partners, 'NOV');

    expect(ash.bicHandoffs?.length).toBeGreaterThanOrEqual(2);
    expect(ash.bicHandoffs?.some(h => h.from === 'Partner' && h.to === 'Ops')).toBe(true);
    expect(nov.bicHandoffs?.some(h => h.taskType === 'FUND' && h.from === 'System')).toBe(true);
  });

  test('accounts carry warm playbook SOP steps', () => {
    const snap = buildDemoTocOpsFixture();
    const pat = partnerByCode(snap.partners, 'PAT');
    const warmed = pat.accounts.find(a => a.status === 'WARMED')!;

    expect(warmed.warmPlaybook?.length).toBeGreaterThanOrEqual(5);
    expect(warmed.warmPlaybook?.every(s => s.stepId && s.label)).toBe(true);
    expect(warmed.warmPlaybook?.filter(s => s.status === 'done').length).toBeGreaterThanOrEqual(4);

    const nov = partnerByCode(snap.partners, 'NOV');
    const newAcct = nov.accounts.find(a => a.status === 'New')!;
    expect(newAcct.warmPlaybook?.some(s => s.status === 'blocked')).toBe(true);
  });

  test('partner phone log and expert liquidity utilization series populate', () => {
    const snap = buildDemoTocOpsFixture();
    const pat = partnerByCode(snap.partners, 'PAT');

    expect(pat.profile?.phoneLog?.length).toBeGreaterThanOrEqual(2);
    expect(pat.profile?.phoneLog?.some(e => e.event === 'assign')).toBe(true);

    const marcus = snap.experts.find(e => e.expertId === 'marcus')!;
    expect(marcus.profile?.liquidityUtilSeries?.length).toBe(7);
    expect(marcus.profile?.liquidityUtilSeries?.every(u => u.utilPct >= 0)).toBe(true);
  });

  test('ops-summary rollups include handoff and playbook counts', () => {
    const slice = tocOpsToSummarySlice(withTocMetrics(buildDemoTocOpsFixture()));
    expect(slice.bicHandoffsTotal).toBeGreaterThanOrEqual(6);
    expect(slice.warmPlaybookPending).toBeGreaterThanOrEqual(1);
    expect(slice.phoneLogEvents).toBeGreaterThanOrEqual(6);
    expect(slice.avgLiquidityUtilPct).toBeGreaterThan(30);
  });
});
