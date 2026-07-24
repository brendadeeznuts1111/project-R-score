/**
 * TOC Ops partner + agent profiles — phones, telegram, deals, CLV, liquidity.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';
import { attachProfiles, demoAgentProfile, demoPartnerProfile } from '../lib/toc-ops/profiles.ts';

describe('toc-ops profiles', () => {
  test('agent profiles include liquidity pool + CLV + telegram bot', () => {
    const marcus = demoAgentProfile('marcus')!;
    expect(marcus.liquidity.available).toBeGreaterThan(0);
    expect(marcus.liquidity.byMarket.length).toBeGreaterThanOrEqual(2);
    expect(marcus.clv.avgClvBps).toBeGreaterThan(0);
    expect(marcus.telegram.channelId).toContain('marcus');
    expect(marcus.bot?.username).toContain('Marcus');
    expect(marcus.style.aggression).toBe('balanced');

    const kai = demoAgentProfile('kai')!;
    expect(kai.wagerPlaces.some(w => w.venueId === 'kalshi')).toBe(true);
    expect(kai.wagerPlaces.some(w => w.venueId === 'polymarket')).toBe(true);
    expect(kai.deals[0]?.expertPct).toBe(25);
  });

  test('fixture partners carry phones · assets · deals · accounting · history', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(snap.profiles?.partnersWithProfile).toBe(3);
    expect(snap.profiles?.agentsWithProfile).toBe(3);
    expect(snap.profiles?.phonesActive).toBeGreaterThanOrEqual(5);
    expect(snap.profiles?.telegramLanes).toBeGreaterThanOrEqual(5);
    expect(snap.profiles?.expertLiquidityAvailable).toBeGreaterThan(50_000);
    expect(snap.profiles?.avgAgentClvBps).toBeGreaterThan(0);
    expect(snap.profiles?.openDeals).toBeGreaterThanOrEqual(6);

    const ash = snap.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.profile?.phones.length).toBeGreaterThanOrEqual(1);
    expect(ash.profile?.phones[0]?.dataPlan?.gbMonth).toBeGreaterThan(0);
    expect(ash.profile?.telegram.groupId).toBeTruthy();
    expect(ash.profile?.playChannels.some(c => c.kind === 'bot')).toBe(true);
    expect(ash.profile?.deals.length).toBeGreaterThanOrEqual(1);
    expect(ash.profile?.accounting.softPartner).toBe(ash.softBalance.byStakeholder.Partner);
    expect(ash.profile?.history.length).toBeGreaterThanOrEqual(6);
    expect(ash.profile?.payments.length).toBeGreaterThanOrEqual(4);
    expect(ash.profile?.commsLog?.length).toBeGreaterThanOrEqual(2);
    expect(ash.profile?.velocity?.plays7d).toBeGreaterThan(0);
    expect(ash.profile?.wagerPlaces.length).toBeGreaterThan(0);

    const pat = snap.partners.find(p => p.partnerCode === 'PAT')!;
    expect(pat.profile?.assets.some(a => a.kind === 'wallet')).toBe(true);
    expect(pat.profile?.bot?.status).toBe('live');
    expect(pat.profile?.payments.length).toBeGreaterThanOrEqual(5);
    expect(pat.recentPlays.length).toBeGreaterThanOrEqual(7);
    expect(pat.softBalance.recentEntries.filter(e => e.entryType === 'ProfitSplit').length).toBeGreaterThanOrEqual(
      12
    );

    const nov = snap.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.profile?.tier).toBe('T4');
    expect(nov.profile?.risk).toBe('orange');
    expect(nov.profile?.bot?.status).toBe('setup');
    expect(nov.profile?.commsLog?.some(c => c.channel === 'sms')).toBe(true);

    for (const e of snap.experts) {
      expect(e.profile?.liquidity.allocated).toBeGreaterThan(0);
      expect(e.profile?.clv.sampleN).toBeGreaterThan(0);
      expect(e.profile?.clv.byMarket?.length).toBeGreaterThanOrEqual(2);
      expect(e.profile?.clv.weeklySeriesBps?.length).toBeGreaterThanOrEqual(6);
      expect(e.profile?.releaseStats?.placementRate).toBeGreaterThan(0.5);
      expect(e.profile?.liquidity.openReservations?.length).toBeGreaterThanOrEqual(1);
      expect(e.profile?.payments.length).toBeGreaterThanOrEqual(3);
      expect(e.profile?.history.length).toBeGreaterThanOrEqual(4);
    }
  });

  test('ops-summary slice carries profile rollups', () => {
    const slice = tocOpsToSummarySlice(withTocMetrics(buildDemoTocOpsFixture()));
    expect(slice.profilePhones).toBeGreaterThanOrEqual(5);
    expect(slice.profileTelegramLanes).toBeGreaterThanOrEqual(5);
    expect(slice.expertLiquidityAvailable).toBeGreaterThan(50_000);
    expect(slice.avgAgentClvBps).toBeGreaterThan(0);
    expect(slice.openDeals).toBeGreaterThanOrEqual(6);
  });

  test('attachProfiles is idempotent on summary counts', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    const again = attachProfiles(snap.partners, snap.experts);
    expect(again.profiles.partnersWithProfile).toBe(snap.profiles?.partnersWithProfile);
    expect(again.profiles.expertLiquidityAvailable).toBe(snap.profiles?.expertLiquidityAvailable);
  });

  test('demoPartnerProfile mirrors soft balances', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    const pat = snap.partners.find(p => p.partnerCode === 'PAT')!;
    const rebuilt = demoPartnerProfile('PAT', { ...pat, profile: undefined });
    expect(rebuilt.accounting.softPartner).toBe(pat.softBalance.byStakeholder.Partner);
    expect(rebuilt.accounting.pendingDeploy).toBe(
      pat.softBalance.pendingDeployments.totalAmount
    );
  });
});
