/**
 * Seed narrative — per-Drum constraint focus, exception resolution, play settlement, bot audit.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { DEMO_GENERATED_AT, partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · constraint & ops desk', () => {
  test('accounts carry constraint focus aligned to partner narrative', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const nov = partnerByCode(snap.partners, 'NOV');
    expect(nov.accounts.every(a => a.constraint?.focus === 'rope')).toBe(true);

    const ash = partnerByCode(snap.partners, 'ASH');
    const ash003 = ash.accounts.find(a => a.callSign === 'ASH-003')!;
    expect(ash003.constraint?.focus).toBe('elevate');

    const pat = partnerByCode(snap.partners, 'PAT');
    expect(pat.accounts.some(a => a.constraint?.focus === 'drum')).toBe(true);
  });

  test('partners expose exception resolution desk and play settlement queue', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    for (const p of snap.partners) {
      expect(p.exceptionResolution!.length).toBeGreaterThanOrEqual(2);
      expect(p.profile?.botCommandLog!.length).toBeGreaterThanOrEqual(2);
    }
    const ash = partnerByCode(snap.partners, 'ASH');
    expect(ash.exceptionResolution!.some(r => r.status === 'assigned')).toBe(true);
    expect(ash.playSettlementQueue!.length).toBeGreaterThanOrEqual(1);
    expect(ash.profile?.botCommandLog!.some(c => c.outcome === 'denied')).toBe(true);
  });

  test('ops-summary rollups include constraint, settlement, and bot command counts', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.constraintRopeCount).toBeGreaterThanOrEqual(1);
    expect(slice.playSettlementPending).toBeGreaterThanOrEqual(3);
    expect(slice.exceptionResolutionOpen).toBeGreaterThanOrEqual(4);
    expect(slice.botCommands24h).toBeGreaterThanOrEqual(6);
  });
});
