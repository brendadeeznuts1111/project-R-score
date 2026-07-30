/**
 * Market venue brand identity — not status semantics.
 *
 * Status tones (ok/warn/bad) stay on theme tokens: --green / --yellow / --red.
 * Venue colors identify book/exchange on dark Primer surfaces (border + text + 8% tint).
 *
 * @see public/portal/venues.css
 * @see docs/portal-foundation.md (tone contract vs venue identity)
 * @see https://bun.com/docs/runtime/color — Bun.color(..., "ansi")
 */

export type MarketVenue = 'kalshi' | 'polymarket' | 'pinnacle' | 'betfair' | 'unknown';

export type VenueBrandMeta = {
  readonly id: MarketVenue;
  readonly label: string;
  readonly short: string;
  /** Brand / border hex (dark-safe). */
  readonly border: string;
  /** Lighter text hex for dark backgrounds. */
  readonly text: string;
  /** Soft fill — 8% brand over transparent. */
  readonly bg: string;
};

/**
 * Primer-compatible venue brand map.
 * Usage: border + text (+ optional 8% bg). No solid fills as primary surface.
 */
export const VENUE_BRAND: Readonly<Record<MarketVenue, VenueBrandMeta>> = {
  kalshi: {
    id: 'kalshi',
    label: 'Kalshi',
    short: 'KX',
    border: '#7DD3FC',
    text: '#A5D6FF',
    bg: 'rgba(125, 211, 252, 0.08)',
  },
  polymarket: {
    id: 'polymarket',
    label: 'Polymarket',
    short: 'PM',
    border: '#2E5CFF',
    text: '#58A6FF',
    bg: 'rgba(46, 92, 255, 0.08)',
  },
  pinnacle: {
    id: 'pinnacle',
    label: 'Pinnacle',
    short: 'PN',
    border: '#1A73E8',
    text: '#79C0FF',
    bg: 'rgba(26, 115, 232, 0.08)',
  },
  betfair: {
    id: 'betfair',
    label: 'Betfair',
    short: 'BF',
    border: '#F5B942',
    text: '#E3B341',
    bg: 'rgba(245, 185, 66, 0.08)',
  },
  unknown: {
    id: 'unknown',
    label: 'Unknown',
    short: '??',
    border: '#30363d',
    text: '#8b949e',
    bg: 'rgba(139, 148, 158, 0.08)',
  },
} as const;

export const MARKET_VENUES: readonly MarketVenue[] = [
  'kalshi',
  'polymarket',
  'pinnacle',
  'betfair',
] as const;

const VENUE_ALIASES: Record<string, MarketVenue> = {
  kalshi: 'kalshi',
  kx: 'kalshi',
  polymarket: 'polymarket',
  poly: 'polymarket',
  pm: 'polymarket',
  pinnacle: 'pinnacle',
  pinny: 'pinnacle',
  pn: 'pinnacle',
  betfair: 'betfair',
  bf: 'betfair',
  exchange: 'betfair',
};

/** Parse wire / marketSource string → MarketVenue. */
export function parseMarketVenue(raw: unknown): MarketVenue {
  if (typeof raw !== 'string' || !raw.trim()) return 'unknown';
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  return VENUE_ALIASES[key] ?? VENUE_ALIASES[raw.trim().toLowerCase()] ?? 'unknown';
}

export function venueBrand(venue: MarketVenue | string): VenueBrandMeta {
  if (typeof venue === 'string' && venue in VENUE_BRAND) {
    return VENUE_BRAND[venue as MarketVenue];
  }
  return VENUE_BRAND[parseMarketVenue(venue)];
}

const ANSI_RESET = '\x1b[0m';

function ansiPaint(text: string, hex: string): string {
  if (typeof Bun !== 'undefined' && typeof Bun.color === 'function') {
    const open = Bun.color(hex, 'ansi') || '';
    if (open) return `${open}${text}${ANSI_RESET}`;
  }
  return text;
}

/**
 * ANSI venue badge for desk CLI (e.g. tennis cross-market rows).
 * @example fmtVenueBadge('polymarket', false) → "● PM"
 */
export function fmtVenueBadge(venue: MarketVenue | string, showLabel = true): string {
  const v = venueBrand(venue);
  const label = showLabel ? v.label : v.short;
  const dot = ansiPaint('●', v.border);
  const text = ansiPaint(label, v.text);
  return `${dot} ${text}`;
}

/** One-line venue legend for TTY headers. */
export function fmtVenueLegend(): string {
  return 'Venues: ' + MARKET_VENUES.map(id => fmtVenueBadge(id, true)).join('  ');
}

/** CSS custom-property names for a venue (portal / web). */
export function venueCssVars(venue: MarketVenue): {
  border: string;
  text: string;
  bg: string;
} {
  const slug = venue === 'polymarket' ? 'poly' : venue;
  return {
    border: `--venue-${slug}-border`,
    text: `--venue-${slug}-text`,
    bg: `--venue-${slug}-bg`,
  };
}
