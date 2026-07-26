/**
 * Seed narrative — pending deploy queue · readiness trend · instruction SLA · deal split audit.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · soft desk', () => {
  test('partners itemize Soft pending deployment queue', () => {
    const snap = buildDemoTocOpsFixture();
    const nov = partnerByCode(snap.partners, 'NOV');
    const pat = partnerByCode(snap.partners, 'PAT');

    expect(nov.softBalance.pendingDeploymentItems?.length).toBeGreaterThanOrEqual(1);
    expect(nov.softBalance.pendingDeploymentItems?.some(i => i.status === 'blocked')).toBe(true);
    expect(pat.softBalance.pendingDeployments.count).toBeGreaterThanOrEqual(0);
  });

  test('readiness trend and deal split audit populate', () => {
    const snap = buildDemoTocOpsFixture();
    const pat = partnerByCode(snap.partners, 'PAT');

    expect(pat.readinessTrend?.length).toBe(7);
    expect(pat.readinessTrend?.every(p => p.score > 0)).toBe(true);
    expect(pat.dealSplitAudit?.packagePct.partner).toBe(70);
    expect(pat.dealSplitAudit?.rows.length).toBeGreaterThanOrEqual(1);
  });

  test('instruction plays carry aging metadata', () => {
    const snap = buildDemoTocOpsFixture();
    const ash = partnerByCode(snap.partners, 'ASH');
    const pending = ash.recentPlays.filter(p => p.status === 'instruction');

    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.some(p => (p.instructionAgeMin ?? 0) > 60)).toBe(true);
    expect(pending.some(p => p.ackDueAt != null)).toBe(true);
  });

  test('ops-summary rollups include deploy · instruction · split counts', () => {
    const slice = tocOpsToSummarySlice(withTocMetrics(buildDemoTocOpsFixture()));
    expect(slice.pendingDeployItems).toBeGreaterThanOrEqual(1);
    expect(slice.playInstructionsStale).toBeGreaterThanOrEqual(1);
    expect(slice.dealSplitDrift).toBeGreaterThanOrEqual(0);
  });
});
