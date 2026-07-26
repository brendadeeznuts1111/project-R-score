/**
 * Sixth-pass seed densification — pending exposure, recycle, SLA, compliance, audit.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';

describe('toc-ops exposure deepen', () => {
  test('accounts carry pending exposure · recycle · compliance', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    const ash003 = snap.partners
      .find(p => p.partnerCode === 'ASH')!
      .accounts.find(a => a.callSign === 'ASH-003')!;
    expect(ash003.pendingExposure).toBeGreaterThan(0);
    expect(ash003.exposureJournal!.length).toBeGreaterThanOrEqual(1);
    expect(ash003.recycleCycles!.some(c => c.status === 'blocked')).toBe(true);

    const nov = snap.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.complianceFlags!.some(f => f.code === 'KYC_INCOMPLETE' || f.code === 'RAIL_UNCONFIRMED')).toBe(
      true
    );
  });

  test('partners expose SLA board · audit trail · net capital', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    for (const p of snap.partners) {
      expect(p.slaBoard).toBeTruthy();
      expect(p.auditTrail!.length).toBeGreaterThanOrEqual(3);
      expect(p.netCapital).toBeTruthy();
      expect(p.openTasks.some(t => t.status !== 'Completed' && t.ageMin != null)).toBe(true);
    }
  });

  test('ops-summary rollups include exposure · compliance · SLA', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.pendingExposureTotal).toBeGreaterThan(0);
    expect(slice.recycleCyclesOpen).toBeGreaterThanOrEqual(1);
    expect(slice.complianceOpen).toBeGreaterThanOrEqual(1);
    expect(slice.auditTrailRows).toBeGreaterThanOrEqual(10);
    expect(slice.slaBreaches7d).toBeGreaterThanOrEqual(1);
  });
});
