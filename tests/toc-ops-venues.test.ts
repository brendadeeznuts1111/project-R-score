/**
 * TOC Ops account venue taxonomy — books, exchanges, crypto, PPH, legality.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { tocOpsToSummarySlice, withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';
import {
  demoVenueForCallSign,
  summarizeVenues,
  TOC_VENUE_CATALOG,
  TOC_VENUE_KINDS,
} from '../lib/toc-ops/venues.ts';

describe('toc-ops venues', () => {
  test('catalog covers sportsbook → exchange → crypto → PPH → kiosk', () => {
    expect(TOC_VENUE_KINDS).toContain('sportsbook');
    expect(TOC_VENUE_KINDS).toContain('exchange');
    expect(TOC_VENUE_KINDS).toContain('prediction_market');
    expect(TOC_VENUE_KINDS).toContain('crypto');
    expect(TOC_VENUE_KINDS).toContain('pph');
    expect(TOC_VENUE_KINDS).toContain('postup_credit');
    expect(TOC_VENUE_KINDS).toContain('casino');
    expect(TOC_VENUE_KINDS).toContain('kiosk');
    expect(TOC_VENUE_KINDS).toContain('in_person');
    expect(TOC_VENUE_CATALOG.venueIds).toContain('kalshi');
    expect(TOC_VENUE_CATALOG.venueIds).toContain('polymarket');
    expect(TOC_VENUE_CATALOG.sports).toContain('NFL');
    expect(TOC_VENUE_CATALOG.sports).toContain('Politics');
  });

  test('demo venues include Kalshi, Polymarket, PPH, post-up, kiosk, crypto', () => {
    expect(demoVenueForCallSign('PAT-002').venueId).toBe('kalshi');
    expect(demoVenueForCallSign('PAT-002').exchange?.clearing).toBe('cftc');
    expect(demoVenueForCallSign('PAT-003').venueId).toBe('polymarket');
    expect(demoVenueForCallSign('PAT-003').crypto?.assets).toContain('USDC');
    expect(demoVenueForCallSign('NOV-001').kind).toBe('pph');
    expect(demoVenueForCallSign('NOV-002').kind).toBe('postup_credit');
    expect(demoVenueForCallSign('ASH-002').kind).toBe('in_person');
    expect(demoVenueForCallSign('ASH-003').kind).toBe('casino');
  });

  test('fixture seeds venue on every account + rollup', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(snap.catalog.venues?.venueIds).toContain('kalshi');
    expect(snap.venues?.accountsWithVenue).toBeGreaterThanOrEqual(11);
    expect(snap.venues?.byVenueKind.sportsbook).toBeGreaterThanOrEqual(2);
    expect(snap.venues?.byVenueKind.exchange).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.prediction_market).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.crypto).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.pph).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.postup_credit).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.kiosk).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.casino).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.byVenueKind.in_person).toBeGreaterThanOrEqual(1);
    expect(snap.venues?.legalStatesCovered).toBeGreaterThanOrEqual(3);
    expect(snap.venues?.bySport.NFL).toBeGreaterThan(0);
    expect(snap.venues?.bySport.Politics).toBeGreaterThan(0);

    for (const p of snap.partners) {
      for (const a of p.accounts) {
        expect(a.venue?.venueId).toBeTruthy();
        expect(a.venue?.legalByState.length).toBeGreaterThan(0);
        expect(a.venue?.sports.length).toBeGreaterThan(0);
      }
    }

    const kalshi = snap.partners
      .flatMap(p => p.accounts)
      .find(a => a.venue?.venueId === 'kalshi');
    const poly = snap.partners
      .flatMap(p => p.accounts)
      .find(a => a.venue?.venueId === 'polymarket');
    expect(kalshi?.callSign).toBe('PAT-002');
    expect(poly?.callSign).toBe('PAT-003');
  });

  test('ops-summary slice carries venue rollups', () => {
    const slice = tocOpsToSummarySlice(withTocMetrics(buildDemoTocOpsFixture()));
    expect(slice.venueKinds).toBeGreaterThanOrEqual(8);
    expect(slice.venueExchanges).toBeGreaterThanOrEqual(2);
    expect(slice.venueCrypto).toBeGreaterThanOrEqual(1);
    expect(slice.venueCreditLines).toBeGreaterThanOrEqual(2);
    expect(slice.venueLegalStates).toBeGreaterThanOrEqual(3);
  });

  test('summarizeVenues is pure', () => {
    const snap = buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z');
    expect(summarizeVenues(snap.partners)).toEqual(summarizeVenues(snap.partners));
  });
});
