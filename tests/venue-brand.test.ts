import { describe, expect, test } from 'bun:test';
import {
  MARKET_VENUES,
  VENUE_BRAND,
  fmtVenueBadge,
  fmtVenueLegend,
  parseMarketVenue,
  venueBrand,
  venueCssVars,
} from '../lib/venues/venue-brand.ts';

describe('venue-brand identity palette', () => {
  test('four market venues + unknown', () => {
    expect(MARKET_VENUES).toEqual(['kalshi', 'polymarket', 'pinnacle', 'betfair']);
    expect(VENUE_BRAND.unknown.short).toBe('??');
  });

  test('parseMarketVenue aliases', () => {
    expect(parseMarketVenue('PM')).toBe('polymarket');
    expect(parseMarketVenue('poly')).toBe('polymarket');
    expect(parseMarketVenue('KX')).toBe('kalshi');
    expect(parseMarketVenue('pinny')).toBe('pinnacle');
    expect(parseMarketVenue('bf')).toBe('betfair');
    expect(parseMarketVenue('')).toBe('unknown');
    expect(parseMarketVenue(null)).toBe('unknown');
  });

  test('venueBrand resolves text/border hex for dark Primer', () => {
    const poly = venueBrand('polymarket');
    expect(poly.text.toLowerCase()).toBe('#58a6ff');
    expect(poly.border.toLowerCase()).toBe('#2e5cff');
    expect(poly.short).toBe('PM');
  });

  test('fmtVenueBadge short and long include labels', () => {
    const short = fmtVenueBadge('kalshi', false);
    const long = fmtVenueBadge('kalshi', true);
    expect(short.includes('KX') || short.includes('Kalshi')).toBe(true);
    expect(long.includes('Kalshi')).toBe(true);
    expect(short.includes('●') || short.includes('KX')).toBe(true);
  });

  test('fmtVenueLegend lists all venues', () => {
    const legend = fmtVenueLegend();
    expect(legend.startsWith('Venues:')).toBe(true);
    for (const id of MARKET_VENUES) {
      expect(legend.includes(VENUE_BRAND[id].label)).toBe(true);
    }
  });

  test('venueCssVars naming', () => {
    expect(venueCssVars('polymarket').border).toBe('--venue-poly-border');
    expect(venueCssVars('kalshi').text).toBe('--venue-kalshi-text');
  });
});
