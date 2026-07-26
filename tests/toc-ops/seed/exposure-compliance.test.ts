/**
 * Seed narrative — pending exposure, recycle, SLA board, compliance, audit trail.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { DEMO_GENERATED_AT, partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · exposure & compliance', () => {
  test('accounts track pending exposure, recycle cycles, and compliance flags', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const ash = partnerByCode(snap.partners, 'ASH');
    const ash003 = ash.accounts.find(a => a.callSign === 'ASH-003')!;
    expect(ash003.pendingExposure).toBeGreaterThan(0);
    expect(ash003.exposureJournal!.length).toBeGreaterThanOrEqual(1);
    expect(ash003.recycleCycles!.some(c => c.status === 'blocked')).toBe(true);

    const nov = partnerByCode(snap.partners, 'NOV');
    expect(
      nov.complianceFlags!.some(f => f.code === 'KYC_INCOMPLETE' || f.code === 'RAIL_UNCONFIRMED')
    ).toBe(true);
  });

  test('partners expose SLA board, audit trail, and net capital position', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    for (const p of snap.partners) {
      expect(p.slaBoard).toBeTruthy();
      expect(p.auditTrail!.length).toBeGreaterThanOrEqual(3);
      expect(p.netCapital).toBeTruthy();
      expect(p.openTasks.some(t => t.status !== 'Completed' && t.ageMin != null)).toBe(true);
    }
  });

  test('ops-summary rollups include exposure, compliance, and SLA metrics', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.pendingExposureTotal).toBeGreaterThan(0);
    expect(slice.recycleCyclesOpen).toBeGreaterThanOrEqual(1);
    expect(slice.complianceOpen).toBeGreaterThanOrEqual(1);
    expect(slice.auditTrailRows).toBeGreaterThanOrEqual(10);
    expect(slice.slaBreaches7d).toBeGreaterThanOrEqual(1);
  });
});
