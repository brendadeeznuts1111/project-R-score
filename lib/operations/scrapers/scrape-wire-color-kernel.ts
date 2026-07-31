/**
 * Bun-native scrape-wire color kernel — validate palette, cache deterministic
 * formats, expose typed getters for books / sports / leagues.
 *
 * Bun.color returns null for invalid input (does not throw) — we fail hard
 * at module load so no invalid palette ships.
 *
 * Does not import scrape-wire-taxonomy (bake imports this module).
 *
 * @see https://bun.com/docs/runtime/color#flexible-input
 * @see https://bun.com/docs/runtime/color#output-formats
 * @see docs/harness/tenants/partner-limits.md
 */
import {
  LEAGUE_KEYS,
  SPORT_KEYS,
  type LeagueKey,
  type SportKey,
} from '../sports-competition-catalog.ts';
import {
  SCRAPE_WIRE_COLORS,
  isScrapeWireColorKey,
  type ScrapeWireColorKey,
} from './scrape-wire-palette.ts';

export type { ScrapeWireColorKey };
export { SCRAPE_WIRE_COLORS, isScrapeWireColorKey };

/** Book keys with palette entries — must stay in lockstep with SCRAPE_BOOK_KEYS. */
export const SCRAPE_WIRE_BOOK_COLOR_KEYS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
  'espnbet',
  'fanatics',
  'hardrock',
  'bet365',
  'betrivers',
  'circa',
] as const satisfies readonly ScrapeWireColorKey[];

export type ScrapeWireBookColorKey = (typeof SCRAPE_WIRE_BOOK_COLOR_KEYS)[number];

export type ScrapeWireRGB = { r: number; g: number; b: number };

export type ScrapeWireForegroundCss = '#000000' | '#ffffff';

export type ScrapeWireResolvedColor = {
  key: ScrapeWireColorKey;
  css: string;
  hex: string;
  foregroundCss: ScrapeWireForegroundCss;
  number: number;
  rgb: ScrapeWireRGB;
};

/** Baked registry color wire (taxonomy / portal chips). */
export type ScrapeWireColorWire = {
  colorKey: ScrapeWireColorKey;
  hex: string;
  css: string;
};

type DeterministicFormat = 'css' | 'HEX' | 'number' | '{rgb}' | 'ansi-16m';

const DETERMINISTIC_FORMATS = [
  'css',
  'HEX',
  'number',
  '{rgb}',
  'ansi-16m',
] as const satisfies readonly DeterministicFormat[];

// Validate palette on module load — Bun.color returns null for bad input.
for (const [key, value] of Object.entries(SCRAPE_WIRE_COLORS)) {
  const hex = Bun.color(value, 'HEX');
  if (typeof hex !== 'string' || !hex) {
    throw new Error(`Invalid scrape-wire color for "${key}": ${value}`);
  }
}

type FormatCache = {
  css: Record<ScrapeWireColorKey, string>;
  HEX: Record<ScrapeWireColorKey, string>;
  number: Record<ScrapeWireColorKey, number>;
  '{rgb}': Record<ScrapeWireColorKey, ScrapeWireRGB>;
  'ansi-16m': Record<ScrapeWireColorKey, string>;
};

function buildCache(): FormatCache {
  const keys = Object.keys(SCRAPE_WIRE_COLORS) as ScrapeWireColorKey[];
  const cache = {} as FormatCache;
  for (const format of DETERMINISTIC_FORMATS) {
    const row = {} as Record<ScrapeWireColorKey, unknown>;
    for (const key of keys) {
      // bun-types may lag on object formats (`{rgb}`); runtime accepts them.
      const converted = Bun.color(SCRAPE_WIRE_COLORS[key], format as 'css');
      if (converted == null) {
        throw new Error(`Bun.color failed for "${key}" format "${format}"`);
      }
      row[key] = converted;
    }
    (cache as Record<string, unknown>)[format] = row;
  }
  return cache;
}

const cache = buildCache();

function srgbLuminance(rgb: ScrapeWireRGB): number {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

function contrastRatio(a: number, b: number): number {
  const [L, d] = a > b ? [a, b] : [b, a];
  return (L + 0.05) / (d + 0.05);
}

function pickForeground(rgb: ScrapeWireRGB): ScrapeWireForegroundCss {
  const bg = srgbLuminance(rgb);
  const vsBlack = contrastRatio(bg, 0);
  const vsWhite = contrastRatio(bg, 1);
  return vsBlack >= vsWhite ? '#000000' : '#ffffff';
}

const foregroundCache = {} as Record<ScrapeWireColorKey, ScrapeWireForegroundCss>;
for (const key of Object.keys(SCRAPE_WIRE_COLORS) as ScrapeWireColorKey[]) {
  foregroundCache[key] = pickForeground(cache['{rgb}'][key]);
}

// ── Semantic roles ──────────────────────────────────────────────────

type RoleLeaf = ScrapeWireColorKey;
type RoleGroup = Readonly<Record<string, RoleLeaf>>;

function identityRoles<const K extends string>(
  keys: readonly K[]
): Readonly<Record<K, K & ScrapeWireColorKey>> {
  return Object.fromEntries(keys.map(k => [k, k])) as Readonly<Record<K, K & ScrapeWireColorKey>>;
}

export const SCRAPE_WIRE_COLOR_ROLES = {
  book: identityRoles(SCRAPE_WIRE_BOOK_COLOR_KEYS),
  sport: identityRoles(SPORT_KEYS),
  league: identityRoles(LEAGUE_KEYS),
  status: {
    unknown: 'unknown',
  },
} as const satisfies Readonly<Record<string, RoleGroup>>;

for (const [group, leaves] of Object.entries(SCRAPE_WIRE_COLOR_ROLES)) {
  for (const [leaf, key] of Object.entries(leaves)) {
    if (!isScrapeWireColorKey(key)) {
      throw new Error(`SCRAPE_WIRE_COLOR_ROLES.${group}.${leaf} = "${key}" is not a ColorKey`);
    }
  }
}

export type ScrapeWireColorRolePath =
  | `book.${ScrapeWireBookColorKey}`
  | `sport.${SportKey}`
  | `league.${LeagueKey}`
  | 'status.unknown';

export function roleColor(path: ScrapeWireColorRolePath): ScrapeWireColorKey {
  const [group, leaf] = path.split('.') as [keyof typeof SCRAPE_WIRE_COLOR_ROLES, string];
  const g = SCRAPE_WIRE_COLOR_ROLES[group] as RoleGroup | undefined;
  const key = g?.[leaf];
  if (!key) throw new Error(`Unknown scrape-wire color role: ${path}`);
  return key;
}

export function bookColorKey(book: ScrapeWireBookColorKey): ScrapeWireColorKey {
  return roleColor(`book.${book}`);
}

export function sportColorKey(sport: SportKey): ScrapeWireColorKey {
  return roleColor(`sport.${sport}`);
}

export function leagueColorKey(league: LeagueKey): ScrapeWireColorKey {
  return roleColor(`league.${league}`);
}

export function cssColor(key: ScrapeWireColorKey): string {
  return cache.css[key];
}

export function hexColor(key: ScrapeWireColorKey): string {
  return cache.HEX[key];
}

export function colorNumber(key: ScrapeWireColorKey): number {
  return cache.number[key];
}

export function rgbChannels(key: ScrapeWireColorKey): ScrapeWireRGB {
  return cache['{rgb}'][key];
}

export function ansi16mColor(key: ScrapeWireColorKey): string {
  return cache['ansi-16m'][key];
}

/** Environment-sensitive ANSI — Bun.color returns "" when colors are disabled. */
export function ansiColor(key: ScrapeWireColorKey): string {
  return (Bun.color(SCRAPE_WIRE_COLORS[key], 'ansi') as string | null) || '';
}

export function foregroundCss(key: ScrapeWireColorKey): ScrapeWireForegroundCss {
  return foregroundCache[key];
}

export function resolveColor(key: ScrapeWireColorKey): ScrapeWireResolvedColor {
  return {
    key,
    css: cssColor(key),
    hex: hexColor(key),
    foregroundCss: foregroundCss(key),
    number: colorNumber(key),
    rgb: rgbChannels(key),
  };
}

/** CSS custom property name for a palette key (`--color-draftkings`). */
export function cssVar(key: ScrapeWireColorKey): string {
  return `--color-${key}`;
}

/** Registry / portal wire blob for a palette key. */
export function colorWire(key: ScrapeWireColorKey): ScrapeWireColorWire {
  return {
    colorKey: key,
    hex: hexColor(key),
    css: cssColor(key),
  };
}

export function bookColorWire(book: ScrapeWireBookColorKey): ScrapeWireColorWire {
  return colorWire(bookColorKey(book));
}

export function sportColorWire(sport: SportKey): ScrapeWireColorWire {
  return colorWire(sportColorKey(sport));
}

export function leagueColorWire(league: LeagueKey): ScrapeWireColorWire {
  return colorWire(leagueColorKey(league));
}

/** Assert every book / sport / league registry key has a role + valid HEX. */
export function assertScrapeWireColorCoverage(): void {
  for (const book of SCRAPE_WIRE_BOOK_COLOR_KEYS) {
    const hex = hexColor(bookColorKey(book));
    if (!hex.startsWith('#')) throw new Error(`book.${book} missing HEX`);
  }
  for (const sport of SPORT_KEYS) {
    const hex = hexColor(sportColorKey(sport));
    if (!hex.startsWith('#')) throw new Error(`sport.${sport} missing HEX`);
  }
  for (const league of LEAGUE_KEYS) {
    const hex = hexColor(leagueColorKey(league));
    if (!hex.startsWith('#')) throw new Error(`league.${league} missing HEX`);
  }
}

/** Run coverage check at import so drift fails early. */
assertScrapeWireColorCoverage();
