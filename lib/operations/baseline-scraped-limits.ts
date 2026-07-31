// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Tier 4 public-scrape estimated baseline (offline fixture + optional live scrape).
 *
 * Lowest commercial priority. Shown as "Estimated" in the portal.
 * Default bake uses committed fixture payloads — no network required.
 * Sync path can overlay latest JSONL observations (artifacts/raw-limits/).
 *
 * @see docs/harness/tenants/partner-limits.md
 */

import { joinPath } from '../path-bun.ts';
import type { StateCode } from '../types/branded.ts';
import { makeBaselineSource, type BaselineSourceRecord } from './baseline-source-tiers.ts';
import type { LimitObservation } from './scrapers/limit-observation-wire.ts';
import {
  latestObservationsByCell,
  rawLimitsDir,
  readLimitObservations,
  RAW_LIMITS_DIR_REL,
} from './scrapers/raw-limits-store.ts';
import {
  SCRAPE_DEFAULT_JURISDICTION,
  SCRAPE_FIXTURE_MARKET_KEYS,
  SCRAPE_FIXTURE_SPORT_KEYS,
} from './scrapers/scrape-wire-taxonomy.ts';
// @see https://bun.com/docs/api/glob — Bun.Glob

/** Companion bake: merged fixture + latest JSONL (not the CI-stable opening baseline). */
export const SCRAPED_LIMITS_OBSERVED_PATH = '/registry/scraped-limits-observed.json';
export const SCRAPED_LIMITS_OBSERVED_KIND = 'scraped-limits-observed' as const;
export const SCRAPED_LIMITS_OBSERVED_SCHEMA_VERSION = 1 as const;

export type OpeningBetStructure = 'straight' | 'parlay';
export type OpeningMarketPhase = 'pregame' | 'live';

export type ScrapedLimitSeed = {
  sportsbook: string; // brand-ok — sportsbook slug
  sport: string;
  market: string;
  jurisdiction: StateCode;
  structure: OpeningBetStructure;
  phase: OpeningMarketPhase;
  openingMaxUsd: number | null;
  openingMinUsd?: number | null;
  dailyLimitUsd?: number | null;
  weeklyLimitUsd?: number | null;
  vipLimitUsd?: number | null;
  league?: string | null;
  eventType?: string | null;
  referenceUrl?: string | null;
  sourceRef: string;
};

export type ScrapedLimitRow = ScrapedLimitSeed & {
  source: BaselineSourceRecord;
};

/** Offline fixture — estimated public-API shaped limits (not live scrape output). */
const SCRAPE_BOOK_ANCHORS: Record<string, number> = {
  draftkings: 1_800,
  fanduel: 1_700,
  bet365: 1_500,
  espnbet: 1_200,
  betmgm: 1_100,
  caesars: 1_000,
  hardrock: 1_200,
  fanatics: 1_000,
  betrivers: 1_000,
  circa: 2_000,
};

function roundScrapedUsd(value: number): number {
  if (value < 25) return 25;
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 500) return Math.round(value / 25) * 25;
  return Math.round(value / 50) * 50;
}

/** Expand committed offline scrape fixture (CI-safe, no network). */
export function expandScrapedLimitSeeds(): ScrapedLimitSeed[] {
  const seeds: ScrapedLimitSeed[] = [];
  for (const [bookId, anchor] of Object.entries(SCRAPE_BOOK_ANCHORS)) {
    for (const sport of SCRAPE_FIXTURE_SPORT_KEYS) {
      for (const market of SCRAPE_FIXTURE_MARKET_KEYS) {
        for (const structure of ['straight', 'parlay'] as const) {
          for (const phase of ['pregame', 'live'] as const) {
            const sportMult = sport === 'basketball' ? 1 : 0.65;
            const marketMult = market === 'match_winner' ? 1 : 0.8;
            const structureMult = structure === 'straight' ? 1 : 0.22;
            const phaseMult = phase === 'pregame' ? 1 : 0.35;
            const max = roundScrapedUsd(
              anchor * sportMult * marketMult * structureMult * phaseMult
            );
            seeds.push({
              sportsbook: bookId,
              sport,
              market,
              jurisdiction: SCRAPE_DEFAULT_JURISDICTION,
              structure,
              phase,
              openingMaxUsd: max,
              openingMinUsd: 1,
              dailyLimitUsd: roundScrapedUsd(max * 6),
              weeklyLimitUsd: roundScrapedUsd(max * 20),
              vipLimitUsd: null,
              league: sport === 'basketball' ? 'nba' : 'mls',
              eventType: 'regular',
              referenceUrl: `internal:scrape-fixture/${bookId}/nj/${sport}`,
              sourceRef: `scrape:fixture/${bookId}-nj-${sport}-${market}-${structure}-${phase}`,
            });
          }
        }
      }
    }
  }
  return seeds;
}

export function projectScrapedLimits(
  seeds: readonly ScrapedLimitSeed[] = expandScrapedLimitSeeds(),
  extractedAt = '2026-07-28T00:00:00.000Z'
): ScrapedLimitRow[] {
  return seeds.map(seed => ({
    ...seed,
    source: makeBaselineSource(4, seed.sourceRef, {
      extractedAt,
      notes: 'Estimated from public-API fixture – may be stale',
    }),
  }));
}

export function scrapedSeedCellKey(
  seed: Pick<
    ScrapedLimitSeed,
    'sportsbook' | 'sport' | 'market' | 'jurisdiction' | 'structure' | 'phase'
  >
): string {
  return [
    seed.sportsbook,
    seed.sport,
    seed.market,
    seed.jurisdiction,
    seed.structure,
    seed.phase,
  ].join('\u001f');
}

/** Map one JSONL observation → Tier 4 seed (skips null opening max). */
export function observationToScrapedSeed(obs: LimitObservation): ScrapedLimitSeed | null {
  if (obs.openingMaxUsd == null || !Number.isFinite(obs.openingMaxUsd)) return null;
  return {
    sportsbook: obs.sportsbook,
    sport: obs.sport,
    market: obs.market,
    jurisdiction: obs.jurisdiction,
    structure: obs.structure,
    phase: obs.phase,
    openingMaxUsd: obs.openingMaxUsd,
    openingMinUsd: obs.openingMinUsd,
    dailyLimitUsd: obs.dailyLimitUsd,
    weeklyLimitUsd: obs.weeklyLimitUsd,
    vipLimitUsd: obs.vipLimitUsd,
    league: obs.league,
    eventType: obs.eventType,
    referenceUrl: obs.referenceUrl,
    sourceRef: obs.sourceRef,
  };
}

/** Sportsbook slugs that have a JSONL file under artifacts/raw-limits/. */
export async function listObservedScrapeBooks(root: string): Promise<string[]> {
  const dir = rawLimitsDir(root);
  const books: string[] = [];
  try {
    for await (const name of new Bun.Glob('*.jsonl').scan({ cwd: dir, onlyFiles: true })) {
      books.push(name.slice(0, -'.jsonl'.length));
    }
  } catch {
    return [];
  }
  return books.sort();
}

/** Latest observation per cell across JSONL books (no registry import — avoids cycle). */
export async function loadLatestObservedSeeds(root: string): Promise<ScrapedLimitSeed[]> {
  const seeds: ScrapedLimitSeed[] = [];
  for (const bookId of await listObservedScrapeBooks(root)) {
    const latest = latestObservationsByCell(await readLimitObservations(root, bookId));
    for (const obs of latest) {
      const seed = observationToScrapedSeed(obs);
      if (seed) seeds.push(seed);
    }
  }
  return seeds;
}

/**
 * Fixture seeds overlaid by latest JSONL observations (observed wins on cell key).
 * Cells only in JSONL are appended.
 */
export function mergeScrapedSeeds(
  fixture: readonly ScrapedLimitSeed[],
  observed: readonly ScrapedLimitSeed[]
): { seeds: ScrapedLimitSeed[]; overridden: number; appended: number } {
  const map = new Map<string, ScrapedLimitSeed>();
  for (const seed of fixture) map.set(scrapedSeedCellKey(seed), seed);
  let overridden = 0;
  let appended = 0;
  for (const seed of observed) {
    const key = scrapedSeedCellKey(seed);
    if (map.has(key)) {
      const prior = map.get(key)!;
      if (prior.openingMaxUsd !== seed.openingMaxUsd || prior.sourceRef !== seed.sourceRef) {
        overridden += 1;
      }
      map.set(key, seed);
    } else {
      appended += 1;
      map.set(key, seed);
    }
  }
  return { seeds: [...map.values()], overridden, appended };
}

export type SyncScrapedLimitsOptions = {
  /** Repo root for artifacts/raw-limits. When set with preferObservations, overlay JSONL. */
  root?: string;
  /** Overlay latest JSONL onto fixture (default false — CI-stable). */
  preferObservations?: boolean;
  extractedAt?: string;
};

export async function syncScrapedLimits(options: SyncScrapedLimitsOptions | string = {}) {
  // Back-compat: syncScrapedLimits(extractedAtIso)
  const opts: SyncScrapedLimitsOptions =
    typeof options === 'string' ? { extractedAt: options } : options;
  const extractedAt = opts.extractedAt ?? new Date().toISOString();
  const fixture = expandScrapedLimitSeeds();

  if (opts.preferObservations && opts.root) {
    const observed = await loadLatestObservedSeeds(opts.root);
    const { seeds, overridden, appended } = mergeScrapedSeeds(fixture, observed);
    const rows = projectScrapedLimits(seeds, extractedAt).map(row => ({
      ...row,
      source: makeBaselineSource(4, row.sourceRef, {
        extractedAt,
        notes:
          observed.length > 0
            ? 'Estimated from public scrape JSONL (latest per cell) with fixture fill'
            : 'Estimated from public-API fixture – may be stale',
      }),
    }));
    return {
      tier: 4 as const,
      confidence: 'medium' as const,
      count: rows.length,
      mode: (observed.length > 0 ? 'merged' : 'fixture') as 'merged' | 'fixture',
      observedCells: observed.length,
      overridden,
      appended,
      rows,
    };
  }

  const rows = projectScrapedLimits(fixture, extractedAt);
  return {
    tier: 4 as const,
    confidence: 'medium' as const,
    count: rows.length,
    mode: 'fixture' as const,
    observedCells: 0,
    overridden: 0,
    appended: 0,
    rows,
  };
}

export type ScrapedLimitsObservedArtifact = {
  schemaVersion: typeof SCRAPED_LIMITS_OBSERVED_SCHEMA_VERSION;
  kind: typeof SCRAPED_LIMITS_OBSERVED_KIND;
  path: typeof SCRAPED_LIMITS_OBSERVED_PATH;
  generatedAt: string;
  mode: 'fixture' | 'merged';
  summary: {
    fixtureRows: number;
    observedCells: number;
    overridden: number;
    appended: number;
    mergedRows: number;
    books: readonly string[];
    rawLimitsDir: string;
  };
  rows: ScrapedLimitRow[];
};

/** Build companion Tier 4 artifact (fixture ⊕ JSONL). Safe to write every sync. */
export async function buildScrapedLimitsObservedArtifact(
  root: string,
  now = new Date()
): Promise<ScrapedLimitsObservedArtifact> {
  const sync = await syncScrapedLimits({
    root,
    preferObservations: true,
    extractedAt: now.toISOString(),
  });
  return {
    schemaVersion: SCRAPED_LIMITS_OBSERVED_SCHEMA_VERSION,
    kind: SCRAPED_LIMITS_OBSERVED_KIND,
    path: SCRAPED_LIMITS_OBSERVED_PATH,
    generatedAt: now.toISOString(),
    mode: sync.mode,
    summary: {
      fixtureRows: expandScrapedLimitSeeds().length,
      observedCells: sync.observedCells,
      overridden: sync.overridden,
      appended: sync.appended,
      mergedRows: sync.count,
      books: await listObservedScrapeBooks(root),
      rawLimitsDir: joinPath(RAW_LIMITS_DIR_REL),
    },
    rows: sync.rows,
  };
}

export type ScrapedAttach = {
  scrapedMaxUsd: number;
  scrapedReferenceUrl: string | null;
  scrapedSource: BaselineSourceRecord;
  scrapedByJurisdiction: ReadonlyArray<{
    jurisdiction: StateCode;
    maxBetUsd: number;
    referenceUrl: string | null;
  }>;
};

export function attachScrapedEstimate(
  query: {
    sportsbook: string;
    sport: string;
    market: string;
    structure: OpeningBetStructure;
    phase: OpeningMarketPhase;
  },
  scraped: readonly ScrapedLimitRow[] = projectScrapedLimits()
): ScrapedAttach | null {
  const matches = scraped.filter(
    row =>
      row.sportsbook === query.sportsbook &&
      row.sport === query.sport &&
      row.market === query.market &&
      row.structure === query.structure &&
      row.phase === query.phase &&
      row.openingMaxUsd != null
  );
  if (matches.length === 0) return null;
  const byJurisdiction = matches.map(row => ({
    jurisdiction: row.jurisdiction,
    maxBetUsd: row.openingMaxUsd as number,
    referenceUrl: row.referenceUrl ?? null,
  }));
  const strictest = matches.reduce((best, row) =>
    (row.openingMaxUsd as number) < (best.openingMaxUsd as number) ? row : best
  );
  return {
    scrapedMaxUsd: strictest.openingMaxUsd as number,
    scrapedReferenceUrl: strictest.referenceUrl ?? null,
    scrapedSource: strictest.source,
    scrapedByJurisdiction: byJurisdiction,
  };
}
