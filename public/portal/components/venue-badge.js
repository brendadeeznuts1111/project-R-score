/**
 * Venue badge helpers for static portal boards (tennis, desk, ops).
 * Identity colors only — not status semantics (use .tone-chip / .st-ok).
 *
 * @see /portal/venues.css
 * @see lib/venues/venue-brand.ts
 */

/** @typedef {'kalshi'|'polymarket'|'pinnacle'|'betfair'|'unknown'} MarketVenue */

const VENUE_META = {
  kalshi: { label: 'Kalshi', short: 'KX' },
  polymarket: { label: 'Polymarket', short: 'PM' },
  pinnacle: { label: 'Pinnacle', short: 'PN' },
  betfair: { label: 'Betfair', short: 'BF' },
  unknown: { label: 'Unknown', short: '??' },
};

const ALIASES = {
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
};

/**
 * @param {unknown} raw
 * @returns {MarketVenue}
 */
export function parseMarketVenue(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return 'unknown';
  const key = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return ALIASES[key] ?? ALIASES[raw.trim().toLowerCase()] ?? 'unknown';
}

/**
 * @param {MarketVenue|string} venue
 * @param {{ showLabel?: boolean, size?: 'sm'|'md', className?: string }} [opts]
 * @returns {string} HTML
 */
export function renderVenueBadge(venue, opts = {}) {
  const id = parseMarketVenue(venue);
  const meta = VENUE_META[id] ?? VENUE_META.unknown;
  const showLabel = opts.showLabel !== false;
  const size = opts.size === 'md' ? 'md' : 'sm';
  const extra = opts.className ? ` ${opts.className}` : '';
  const text = showLabel ? meta.label : meta.short;
  const esc = s =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return `<span class="venue-badge venue-badge--${id} venue-badge--${size}${extra}" title="${esc(meta.label)}"><span class="venue-badge__dot" aria-hidden="true"></span>${esc(text)}</span>`;
}

/** @returns {string} HTML legend */
export function renderVenueLegend() {
  const badges = ['kalshi', 'polymarket', 'pinnacle', 'betfair']
    .map(v => renderVenueBadge(v, { size: 'sm', showLabel: true }))
    .join('');
  return `<div class="venue-legend" role="group" aria-label="Venue legend"><span class="venue-legend__title">Venues</span>${badges}</div>`;
}

/**
 * Mount legend into a host element.
 * @param {ParentNode|null} host
 */
export function mountVenueLegend(host) {
  if (!host) return;
  host.innerHTML = renderVenueLegend();
}
