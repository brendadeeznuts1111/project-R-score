/**
 * Scrape-wire domain color palette — closed hex SSOT for books, sports, leagues.
 *
 * Conversion / validation / roles: import from `scrape-wire-color-kernel.ts`
 * (only the kernel calls Bun.color).
 *
 * @see https://bun.com/docs/runtime/color#flexible-input
 * @see docs/harness/tenants/partner-limits.md
 */

/** Domain colors as hex strings. Bun.color() parses these directly. */
export const SCRAPE_WIRE_COLORS = {
  // ── Sportsbooks (US top-10 brand-aligned) ────────────────────────
  draftkings: '#2563EB', // DK blue
  fanduel: '#14934B', // FD green
  betmgm: '#C5A572', // MGM gold
  caesars: '#C9A227', // Caesars gold
  espnbet: '#DC2626', // ESPN red
  fanatics: '#1D4ED8', // Fanatics blue
  hardrock: '#D97706', // Hard Rock amber/gold
  bet365: '#FBBF24', // bet365 yellow
  betrivers: '#1E40AF', // BetRivers navy
  circa: '#0D9488', // Circa teal

  // ── Sports (stable hue per SPORT_KEYS; hex unique vs books/leagues) ─
  american_football: '#92400E', // brown / leather
  baseball: '#E11D48', // rose red (espnbet keeps #DC2626)
  basketball: '#EA580C', // orange
  hockey: '#0369A1', // ice blue
  soccer: '#16A34A', // pitch green
  tennis: '#CA8A04', // court gold
  golf: '#15803D', // fairway green
  mma: '#7F1D1D', // octagon crimson

  // ── Leagues (parent-sport hue, shifted; hex unique across palette) ─
  // basketball family
  nba: '#F97316',
  wnba: '#FB7185',
  ncaab: '#C2410C',
  // american_football family
  nfl: '#B45309',
  ncaaf: '#78350F',
  // baseball / hockey
  mlb: '#EF4444',
  nhl: '#0284C7',
  // soccer family
  mls: '#22C55E',
  epl: '#3F6212',
  uefa_champions_league: '#1E3A8A', // deep UEFA navy (fanatics keeps #1D4ED8)
  // tennis family
  atp: '#4169E1',
  wta: '#C71585',
  itf: '#A8A29E',
  atp_challenger: '#38BDF8',
  wta_125: '#E879F9',
  // golf / mma
  pga_tour: '#166534',
  dp_world_tour: '#4ADE80',
  ufc: '#991B1B',

  // ── Fallback ─────────────────────────────────────────────────────
  unknown: '#8B949E',
} as const;

export type ScrapeWireColorKey = keyof typeof SCRAPE_WIRE_COLORS;

export function isScrapeWireColorKey(value: string): value is ScrapeWireColorKey {
  return Object.hasOwn(SCRAPE_WIRE_COLORS, value);
}
