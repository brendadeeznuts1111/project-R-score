// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
import { joinPath } from '../../path-bun.ts';
import type { Database } from 'bun:sqlite';
import { ROOT } from '../paths.ts';
import { openOddsDb } from '../odds/odds-store.ts';
import { detectMovements } from './line-movement.ts';
import { ensureMatchingSchema } from './schema.ts';

export type TierWeights = {
  weights: Record<number, number>;
  smartMoney: {
    minTier1MovePct: number;
    minLagMs: number;
    scoreThreshold: number;
  };
};

let cached: TierWeights | null = null;

export async function loadTierWeights(): Promise<TierWeights> {
  if (cached) return cached;
  const path = joinPath(ROOT, 'config/operator-research/tier-weights.toml');
  const raw = Bun.TOML.parse(await Bun.file(path).text()) as {
    weights?: Record<string, number>;
    smart_money?: {
      min_tier1_move_pct?: number;
      min_lag_ms?: number;
      score_threshold?: number;
    };
  };
  const weights: Record<number, number> = { 1: 1, 2: 0.55, 3: 0.25 };
  for (const [k, v] of Object.entries(raw.weights ?? {})) {
    weights[Number(k)] = Number(v);
  }
  cached = {
    weights,
    smartMoney: {
      minTier1MovePct: raw.smart_money?.min_tier1_move_pct ?? 1.5,
      minLagMs: raw.smart_money?.min_lag_ms ?? 5000,
      scoreThreshold: raw.smart_money?.score_threshold ?? 0.6,
    },
  };
  return cached;
}

export type SmartMoneySignal = {
  eventId: number;
  mappingId: number;
  marketTypeId: number;
  selection: string;
  bookmaker: string;
  tier: number;
  movePct: number;
  direction: 'up' | 'down' | 'flat';
  score: number;
  details: string;
};

/**
 * Weight line moves by bookmaker tier. Tier-1 moves score highest ("smart money").
 */
export async function detectSmartMoney(
  opts: { sinceMs?: number; limit?: number } = {},
  db: Database = openOddsDb()
): Promise<SmartMoneySignal[]> {
  ensureMatchingSchema(db);
  const cfg = await loadTierWeights();
  const since = opts.sinceMs ?? 1;
  const pairs = db
    .query(
      `SELECT DISTINCT
         bem.event_id AS eventId,
         oh.bookmaker_event_mapping_id AS mappingId,
         oh.market_type_id AS marketTypeId,
         oh.selection AS selection,
         b.name AS bookmaker,
         COALESCE(b.tier, 3) AS tier
       FROM odds_history oh
       JOIN bookmaker_event_mapping bem ON bem.id = oh.bookmaker_event_mapping_id
       JOIN bookmakers b ON b.id = bem.bookmaker_id
       WHERE oh.timestamp >= ? AND oh.market_type_id IS NOT NULL AND oh.selection IS NOT NULL
         AND COALESCE(b.tier, 3) = 1`
    )
    .all(since) as {
    eventId: number;
    mappingId: number;
    marketTypeId: number;
    selection: string;
    bookmaker: string;
    tier: number;
  }[];

  const out: SmartMoneySignal[] = [];
  for (const p of pairs) {
    const move = detectMovements(
      p.mappingId,
      p.marketTypeId,
      { selection: p.selection, minAbsPct: cfg.smartMoney.minTier1MovePct },
      db
    );
    if (!move) continue;
    const weight = cfg.weights[p.tier] ?? 0.25;
    const score = Math.min(1, (Math.abs(move.percentageChange) / 10) * weight);
    if (
      score < cfg.smartMoney.scoreThreshold &&
      Math.abs(move.percentageChange) < cfg.smartMoney.minTier1MovePct
    ) {
      continue;
    }
    out.push({
      eventId: p.eventId,
      mappingId: p.mappingId,
      marketTypeId: p.marketTypeId,
      selection: p.selection,
      bookmaker: p.bookmaker,
      tier: p.tier,
      movePct: move.percentageChange,
      direction: move.direction,
      score,
      details: `Tier-${p.tier} ${p.bookmaker} ${move.direction} ${move.percentageChange.toFixed(2)}% on ${p.selection}`,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, opts.limit ?? 50);
}

/** Score a single movement with tier weight. */
export function scoreMovementByTier(
  movePct: number,
  tier: number,
  weights: Record<number, number>
): number {
  const w = weights[tier] ?? 0.25;
  return Math.min(1, (Math.abs(movePct) / 10) * w);
}
