// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { getOddsHistory } from './odds-history.ts';
import { ensureMatchingSchema } from './schema.ts';

export type LineMovement = {
  mappingId: number;
  marketTypeId: number;
  selection: string;
  from: number;
  to: number;
  priceChange: number;
  percentageChange: number;
  timeDeltaMs: number;
  direction: 'up' | 'down' | 'flat';
  previousTimestamp: number;
  latestTimestamp: number;
};

export function detectMovements(
  mappingId: number,
  marketTypeId: number,
  opts: { selection?: string; minAbsPct?: number } = {},
  db: Database = openOddsDb()
): LineMovement | null {
  ensureMatchingSchema(db);
  const selection = opts.selection;
  if (!selection) {
    // Pick the selection with the largest recent move
    const sels = db
      .query(
        `SELECT DISTINCT selection FROM odds_history
         WHERE bookmaker_event_mapping_id = ? AND market_type_id = ?
           AND selection IS NOT NULL`
      )
      .all(mappingId, marketTypeId) as { selection: string }[];
    let best: LineMovement | null = null;
    for (const s of sels) {
      const m = detectMovements(mappingId, marketTypeId, { ...opts, selection: s.selection }, db);
      if (!m) continue;
      if (!best || Math.abs(m.percentageChange) > Math.abs(best.percentageChange)) best = m;
    }
    return best;
  }

  const snapshots = getOddsHistory(mappingId, marketTypeId, { selection, limit: 5 }, db);
  if (snapshots.length < 2) return null;
  const latest = snapshots[0]!;
  const previous = snapshots[1]!;
  const priceChange = latest.oddsDecimal - previous.oddsDecimal;
  const percentageChange =
    previous.oddsDecimal !== 0 ? (priceChange / previous.oddsDecimal) * 100 : 0;
  const minAbs = opts.minAbsPct ?? 0;
  if (Math.abs(percentageChange) < minAbs && priceChange === 0) return null;

  const direction: LineMovement['direction'] =
    priceChange > 1e-9 ? 'up' : priceChange < -1e-9 ? 'down' : 'flat';

  return {
    mappingId,
    marketTypeId,
    selection,
    from: previous.oddsDecimal,
    to: latest.oddsDecimal,
    priceChange,
    percentageChange,
    timeDeltaMs: latest.timestamp - previous.timestamp,
    direction,
    previousTimestamp: previous.timestamp,
    latestTimestamp: latest.timestamp,
  };
}

/** Scan recent history for notable moves (default ≥ 2%). */
export function detectNotableMovements(
  opts: { sinceMs?: number; minAbsPct?: number; limit?: number } = {},
  db: Database = openOddsDb()
): LineMovement[] {
  ensureMatchingSchema(db);
  const since = opts.sinceMs ?? Date.now() - 60 * 60 * 1000;
  const minAbsPct = opts.minAbsPct ?? 2;
  const pairs = db
    .query(
      `SELECT DISTINCT bookmaker_event_mapping_id AS mappingId, market_type_id AS marketTypeId, selection
       FROM odds_history
       WHERE timestamp >= ? AND market_type_id IS NOT NULL AND selection IS NOT NULL`
    )
    .all(since) as { mappingId: number; marketTypeId: number; selection: string }[];

  const out: LineMovement[] = [];
  for (const p of pairs) {
    const m = detectMovements(
      p.mappingId,
      p.marketTypeId,
      { selection: p.selection, minAbsPct },
      db
    );
    if (m && Math.abs(m.percentageChange) >= minAbsPct) out.push(m);
  }
  out.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));
  return out.slice(0, opts.limit ?? 50);
}
