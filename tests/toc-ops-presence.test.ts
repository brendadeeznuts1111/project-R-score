/**
 * TOC Ops geo / network presence — types, demo seeds, rollup metrics.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import {
  demoHousePresence,
  demoPartnerPresence,
  haversineKm,
  summarizePresence,
} from '../lib/toc-ops/presence.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';

describe('toc-ops presence', () => {
  test('haversine Tampa→Miami is ~330 km class', () => {
    const house = demoHousePresence();
    const ash = demoPartnerPresence('ASH', house);
    const km = haversineKm(house.geo, ash.geo);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(420);
    expect(ash.metrics?.distanceKmFromHouse).toBeGreaterThan(300);
    expect(ash.metrics?.sameMetroAsHouse).toBe(false);
  });

  test('fixture seeds geo · zip · ipv4/ipv6 · dns · asn on partners/accounts/plays', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(snap.housePresence?.postal.zip).toBe('33602');
    expect(snap.housePresence?.network.ipv6).toBeTruthy();
    expect(snap.housePresence?.network.dns?.aaaa?.length).toBeGreaterThan(0);

    expect(snap.presence?.partnersWithGeo).toBe(3);
    expect(snap.presence?.accountsWithGeo).toBeGreaterThanOrEqual(11);
    expect(snap.presence?.uniqueZips).toBeGreaterThanOrEqual(3);
    expect(snap.presence?.ipv6Count).toBeGreaterThanOrEqual(11);
    expect(snap.presence?.dnsResolved).toBeGreaterThanOrEqual(11);
    expect(snap.presence?.uniqueAsns).toBeGreaterThanOrEqual(3);
    expect(snap.presence?.byCountry.US).toBeGreaterThan(0);
    expect(snap.presence?.vpnSuspected).toBeGreaterThanOrEqual(1);

    const ash = snap.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.presence?.postal.city).toBe('Miami Beach');
    expect(ash.presence?.network.ipv4).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    expect(ash.accounts.every(a => a.presence?.network.ipv6)).toBe(true);
    expect(ash.recentPlays.some(p => p.placement?.ipv4 && p.placement?.postal?.zip)).toBe(true);

    const nov = snap.partners.find(p => p.partnerCode === 'NOV')!;
    expect(nov.presence?.network.vpnSuspected).toBe(true);
    expect(nov.presence?.network.connectionType).toBe('mobile');
  });

  test('ops-summary slice carries presence rollups after bake', () => {
    const baked = withTocMetrics(buildDemoTocOpsFixture());
    const slice = tocOpsToSummarySlice(baked);
    expect(slice.presencePartners).toBe(3);
    expect(slice.presenceUniqueZips).toBeGreaterThanOrEqual(3);
    expect(slice.presenceIpv6).toBeGreaterThanOrEqual(11);
    expect(slice.presenceDnsResolved).toBeGreaterThanOrEqual(11);
    expect(slice.presenceAvgDistanceKm).toBeGreaterThan(0);
  });

  test('summarizePresence is pure for fixed partners', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    const a = summarizePresence(snap.partners, snap.housePresence);
    const b = summarizePresence(snap.partners, snap.housePresence);
    expect(a).toEqual(b);
  });
});
