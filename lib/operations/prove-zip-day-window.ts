// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Prove ZIP cluster day-window filtering (enriched_at path).
 * Shared by deep-audit scoreboard + compliance board bake.
 */
import { Database } from 'bun:sqlite';
import {
  ZipEnrichmentRepo,
  type ZipClusterStat,
  type ZipDayWindowMode,
} from '../zip-enrichment-repo.ts';
import type { Scope } from '../repository.ts';

export type ZipDayWindowProof = {
  ok: boolean;
  days: number;
  mode: ZipDayWindowMode;
  totalPlays: number;
  inWindowPlays: number;
  clusters: ZipClusterStat[];
  label: string;
};

const DEFAULT_SCOPE: Scope = {
  nodeId: 'partner-zip-window',
  country: 'US',
  sport: 'soccer',
  market: 'match_winner',
  state: 'NJ',
};

/**
 * In-memory fixture: half the rows recent, half older than `days`.
 * Expects mode `enriched` and in-window count = recent rows.
 */
export function proveZipDayWindow(opts?: {
  days?: number;
  recentCount?: number;
  staleCount?: number;
  scope?: Scope;
}): ZipDayWindowProof {
  const days = opts?.days ?? 90;
  const recentCount = opts?.recentCount ?? 4;
  const staleCount = opts?.staleCount ?? 6;
  const scope = opts?.scope ?? DEFAULT_SCOPE;
  const total = recentCount + staleCount;

  const db = new Database(':memory:');
  db.run(`
    CREATE TABLE play_analysis (
      play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
      line_at_bet REAL, side TEXT, won INT, rlm_flag INT
    );
    CREATE TABLE market_snapshots (
      play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
      bookmaker TEXT, snapshot_type TEXT, relative_time_sec INT, snapshot_data TEXT
    );
    CREATE TABLE play_zip_enrichment (
      play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
      zip_prefix TEXT, enriched_at TEXT
    );
  `);

  const recentIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - (days + 30) * 86_400_000).toISOString();
  const zips = ['084', '070', '071'] as const;

  for (let i = 0; i < total; i++) {
    const playId = `zw${i}`;
    const zip = zips[i % zips.length]!;
    const enrichedAt = i < recentCount ? recentIso : staleIso;
    const won = i % 2;
    db.run(
      `INSERT INTO play_analysis VALUES (?,?,?,?,?,?,?,?,?,?)`,
      playId,
      scope.nodeId,
      scope.country,
      scope.sport,
      scope.market,
      scope.state,
      2.0,
      'home',
      won,
      0
    );
    db.run(
      `INSERT INTO play_zip_enrichment VALUES (?,?,?,?,?,?,?,?)`,
      playId,
      scope.nodeId,
      scope.country,
      scope.sport,
      scope.market,
      scope.state,
      zip,
      enrichedAt
    );
    db.run(
      `INSERT INTO market_snapshots VALUES (?,?,?,?,?,?,?,?,?,?)`,
      playId,
      scope.nodeId,
      scope.country,
      scope.sport,
      scope.market,
      scope.state,
      'pinnacle',
      'line',
      300,
      JSON.stringify({ line: 2.1 })
    );
  }

  const zipRepo = new ZipEnrichmentRepo(db, scope);
  const mode = zipRepo.resolveDayWindowMode(days);
  const all = zipRepo.getClusterStats(0);
  const windowed = zipRepo.getClusterStats(days);
  const totalPlays = all.reduce((n, s) => n + s.total_plays, 0);
  const inWindowPlays = windowed.reduce((n, s) => n + s.total_plays, 0);
  db.close();

  const ok =
    mode === 'enriched' &&
    totalPlays === total &&
    inWindowPlays === recentCount &&
    inWindowPlays < totalPlays;

  return {
    ok,
    days,
    mode,
    totalPlays,
    inWindowPlays,
    clusters: windowed,
    label: ok
      ? `ZIP ${days}d window via enriched_at (${inWindowPlays}/${totalPlays} plays)`
      : `ZIP day-window not proven (mode=${mode}, in=${inWindowPlays}, total=${totalPlays})`,
  };
}
