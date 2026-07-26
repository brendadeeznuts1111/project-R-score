/**
 * Seed narrative — WD pipeline, exposure aging, ONB checklist, settlement calendar.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { DEMO_GENERATED_AT, partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · settlement & WD', () => {
  test('partners expose WD pipeline and exposure aging buckets', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const ash = partnerByCode(snap.partners, 'ASH');
    expect(ash.wdPipeline!.length).toBeGreaterThanOrEqual(1);
    expect(ash.wdPipeline!.some(w => w.status === 'blocked')).toBe(true);
    expect(ash.exposureAging).toBeTruthy();
    expect(
      ash.exposureAging!.bucket0_24h +
        ash.exposureAging!.bucket24_72h +
        ash.exposureAging!.bucket72hPlus
    ).toBeGreaterThan(0);

    const pat = partnerByCode(snap.partners, 'PAT');
    expect(pat.wdPipeline!.some(w => w.status === 'processing')).toBe(true);
  });

  test('NOV onboarding checklist lists blocked steps and settlement slots', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const nov = partnerByCode(snap.partners, 'NOV');
    expect(nov.onbChecklist!.length).toBeGreaterThanOrEqual(5);
    expect(nov.onbChecklist!.some(s => s.status === 'blocked')).toBe(true);
    expect(nov.settlementCalendar!.length).toBeGreaterThanOrEqual(1);
  });

  test('ops-summary rollups include WD queue, ONB pending, and settlement slots', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.wdBlockedTotal).toBeGreaterThanOrEqual(1);
    expect(slice.wdQueuedTotal).toBeGreaterThanOrEqual(0);
    expect(slice.onbChecklistPending).toBeGreaterThanOrEqual(2);
    expect(slice.settlementSlots7d).toBeGreaterThanOrEqual(3);
    expect(slice.exposureAging72hPlus).toBeGreaterThanOrEqual(0);
  });
});
