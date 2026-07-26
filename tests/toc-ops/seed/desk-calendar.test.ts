/**
 * Seed narrative — Soft/play calendar, desk scorecards, agent book matrix.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../../../lib/toc-ops/fixture.ts';
import { withTocMetrics } from '../../../lib/toc-ops/export-snapshot.ts';
import { DEMO_GENERATED_AT, partnerByCode } from '../_helpers.ts';

describe('toc-ops · seed · desk & calendar', () => {
  test('partners gain denser Soft entries and recent plays', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const soft = snap.partners.reduce((n, p) => n + p.softBalance.recentEntries.length, 0);
    const plays = snap.partners.reduce((n, p) => n + p.recentPlays.length, 0);
    expect(soft).toBeGreaterThanOrEqual(40);
    expect(plays).toBeGreaterThanOrEqual(18);

    const ash = partnerByCode(snap.partners, 'ASH');
    expect(ash.profile?.deskScorecard?.trustScore).toBeGreaterThan(0.7);
    expect(ash.profile?.softDailyT?.some(d => d.t > 0)).toBe(true);
    expect(ash.bottlenecks.some(b => b.resolvedAt != null)).toBe(true);
    expect(ash.recentPlays.some(p => p.playId.includes('deep'))).toBe(true);

    const pat = partnerByCode(snap.partners, 'PAT');
    expect(pat.recentPlays.some(p => p.market === 'Tennis' && p.status === 'settled')).toBe(true);
    expect(pat.recentPlays.some(p => p.market === 'Crypto')).toBe(true);
  });

  test('agents expose book permissions and CLV daily series', () => {
    const snap = buildDemoTocOpsFixture(DEMO_GENERATED_AT);
    const marcus = snap.experts.find(e => e.expertId === 'marcus')!;
    expect(marcus.profile?.bookPermissions?.some(b => b.venueId === 'fanduel' && !b.allowed)).toBe(
      true
    );
    expect(marcus.profile?.clvDailyBps?.length).toBeGreaterThanOrEqual(14);
    expect(marcus.profile?.exposureLadder?.[2]?.cap).toBeGreaterThan(0);
  });

  test('bake preserves positive throughput T after desk densification', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    expect(baked.enforcement?.throughput.T).toBeGreaterThan(4000);
    expect(baked.profiles?.phonesActive).toBeGreaterThanOrEqual(5);
  });
});
