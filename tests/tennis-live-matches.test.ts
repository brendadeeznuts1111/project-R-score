import { describe, expect, test } from 'bun:test';
import { isSafeAvatarId } from '../lib/images/avatar-response.ts';
import {
  DEFAULT_LIVE_MATCHES_DB,
  collectLiveMatchesFromEventStore,
  eventTickerFromMarketTicker,
  normalizePlayerSlug,
  sampleLiveMatches,
} from '../lib/tennis/live-matches.ts';

describe('tennis live-matches', () => {
  test('sampleLiveMatches has schemaVersion 1 and matches length > 0', () => {
    const doc = sampleLiveMatches();
    expect(doc.schemaVersion).toBe(1);
    expect(doc.kind).toBe('tennis-live-matches');
    expect(doc.source).toBe('sample');
    expect(doc.matches.length).toBeGreaterThan(0);
    expect(doc.limit).toBe(12);
  });

  test('slugs are safe', () => {
    const doc = sampleLiveMatches();
    for (const row of doc.matches) {
      expect(row.sideA.slug.length).toBeGreaterThan(0);
      expect(row.sideB.slug.length).toBeGreaterThan(0);
      expect(isSafeAvatarId(row.sideA.slug)).toBe(true);
      expect(isSafeAvatarId(row.sideB.slug)).toBe(true);
      // no path traversal / separators
      expect(row.sideA.slug).not.toMatch(/[\/\\]/);
      expect(row.sideB.slug).not.toMatch(/[\/\\]/);
    }
  });

  test('normalizePlayerSlug produces safe avatar ids', () => {
    expect(normalizePlayerSlug('Jannik Sinner')).toBe('jannik-sinner');
    expect(normalizePlayerSlug('Carlos Alcaraz')).toBe('carlos-alcaraz');
    expect(normalizePlayerSlug('José Álvarez')).toBe('jose-alvarez');
    expect(isSafeAvatarId(normalizePlayerSlug('  --Weird///Name!!  '))).toBe(true);
    expect(normalizePlayerSlug('')).toBe('player');
  });

  test('sample venues rotate and edge is midA - midB', () => {
    const doc = sampleLiveMatches();
    const venues = new Set(doc.matches.map(m => m.venue));
    expect(venues.has('kalshi')).toBe(true);
    expect(venues.size).toBeGreaterThan(1);
    for (const row of doc.matches) {
      if (row.sideA.midCents != null && row.sideB.midCents != null) {
        expect(row.edgeCents).toBe(row.sideA.midCents - row.sideB.midCents);
      }
    }
  });

  test('eventTickerFromMarketTicker strips side segment', () => {
    expect(eventTickerFromMarketTicker('KXATPMATCH-25JUL30SINNER-SINNER')).toBe(
      'KXATPMATCH-25JUL30SINNER',
    );
  });

  test('collectLiveMatchesFromEventStore is null or valid when db probed', () => {
    const doc = collectLiveMatchesFromEventStore(DEFAULT_LIVE_MATCHES_DB, { limit: 4 });
    if (doc == null) {
      expect(doc).toBeNull();
      return;
    }
    expect(doc.schemaVersion).toBe(1);
    expect(doc.kind).toBe('tennis-live-matches');
    expect(doc.source).toBe('event-store');
    expect(doc.matches.length).toBeLessThanOrEqual(4);
    for (const row of doc.matches) {
      expect(isSafeAvatarId(row.sideA.slug)).toBe(true);
      expect(isSafeAvatarId(row.sideB.slug)).toBe(true);
      expect(row.venue.length).toBeGreaterThan(0);
    }
  });
});
