// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

export type BookUpdate = {
  bookmaker: string;
  host: string | null;
  tier: number;
  timestamp: number;
  oddsDecimal: number;
  selection: string | null;
  mappingId: number;
};

export type DelayRow = {
  bookmaker: string;
  host: string | null;
  tier: number;
  price: number;
  delayMs: number;
  comparedTo: string;
  selection: string | null;
};

/**
 * Compare latest update timestamps across books for one canonical event + market.
 * Earliest book is the "leader"; others report lag in ms.
 */
export function detectDelays(
  eventId: number,
  marketTypeId: number,
  opts: { selection?: string } = {},
  db: Database = openOddsDb()
): DelayRow[] | null {
  ensureMatchingSchema(db);

  const rows = opts.selection
    ? (db
        .query(
          `SELECT b.name AS bookmaker, b.host AS host, COALESCE(b.tier, 3) AS tier,
                    oh.timestamp, oh.odds_decimal AS oddsDecimal, oh.selection,
                    bem.id AS mappingId
             FROM odds_history oh
             JOIN bookmaker_event_mapping bem ON oh.bookmaker_event_mapping_id = bem.id
             JOIN bookmakers b ON bem.bookmaker_id = b.id
             WHERE bem.event_id = ? AND oh.market_type_id = ? AND oh.selection = ?
             ORDER BY oh.timestamp DESC`
        )
        .all(eventId, marketTypeId, opts.selection) as BookUpdate[])
    : (db
        .query(
          `SELECT b.name AS bookmaker, b.host AS host, COALESCE(b.tier, 3) AS tier,
                    oh.timestamp, oh.odds_decimal AS oddsDecimal, oh.selection,
                    bem.id AS mappingId
             FROM odds_history oh
             JOIN bookmaker_event_mapping bem ON oh.bookmaker_event_mapping_id = bem.id
             JOIN bookmakers b ON bem.bookmaker_id = b.id
             WHERE bem.event_id = ? AND oh.market_type_id = ?
             ORDER BY oh.timestamp DESC`
        )
        .all(eventId, marketTypeId) as BookUpdate[]);

  if (rows.length === 0) return null;

  // Latest observation per book (rows are DESC by timestamp).
  const latestPerBook = new Map<string, BookUpdate>();
  for (const row of rows) {
    if (!latestPerBook.has(row.bookmaker)) {
      latestPerBook.set(row.bookmaker, row);
    }
  }

  // For each book, walk older history to find when they first hit the current price
  // (start of the latest price streak) — that's the move time for delay ranking.
  const moveTimePerBook: BookUpdate[] = [];
  for (const latest of latestPerBook.values()) {
    const streakStart = db
      .query(
        `SELECT MIN(timestamp) AS ts FROM odds_history
         WHERE bookmaker_event_mapping_id = ?
           AND market_type_id = ?
           AND (? IS NULL OR selection = ?)
           AND ABS(odds_decimal - ?) < 1e-9
           AND timestamp >= COALESCE((
             SELECT MAX(timestamp) FROM odds_history
             WHERE bookmaker_event_mapping_id = ?
               AND market_type_id = ?
               AND (? IS NULL OR selection = ?)
               AND ABS(odds_decimal - ?) >= 1e-9
           ), 0)`
      )
      .get(
        latest.mappingId,
        marketTypeId,
        opts.selection ?? null,
        opts.selection ?? null,
        latest.oddsDecimal,
        latest.mappingId,
        marketTypeId,
        opts.selection ?? null,
        opts.selection ?? null,
        latest.oddsDecimal
      ) as { ts: number | null };

    moveTimePerBook.push({
      ...latest,
      timestamp: streakStart.ts ?? latest.timestamp,
    });
  }

  const sorted = moveTimePerBook.sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 2) return null;

  const first = sorted[0]!;
  return sorted.slice(1).map(row => ({
    bookmaker: row.bookmaker,
    host: row.host,
    tier: row.tier,
    price: row.oddsDecimal,
    delayMs: row.timestamp - first.timestamp,
    comparedTo: first.bookmaker,
    selection: row.selection,
  }));
}

export type TierComparisonRow = {
  tier: number;
  bookmaker: string;
  host: string | null;
  oddsDecimal: number;
  timestamp: number;
  selection: string | null;
};

/** Latest price per book for an event/market, ordered by tier then book. */
export function compareTiers(
  eventId: number,
  marketTypeId: number,
  opts: { selection?: string } = {},
  db: Database = openOddsDb()
): TierComparisonRow[] {
  ensureMatchingSchema(db);

  const latest = opts.selection
    ? (db
        .query(
          `SELECT b.name AS bookmaker, b.host AS host, COALESCE(b.tier, 3) AS tier,
                    oh.timestamp, oh.odds_decimal AS oddsDecimal, oh.selection
             FROM odds_history oh
             JOIN bookmaker_event_mapping bem ON oh.bookmaker_event_mapping_id = bem.id
             JOIN bookmakers b ON bem.bookmaker_id = b.id
             WHERE bem.event_id = ? AND oh.market_type_id = ? AND oh.selection = ?
             ORDER BY oh.timestamp DESC`
        )
        .all(eventId, marketTypeId, opts.selection) as TierComparisonRow[])
    : (db
        .query(
          `SELECT b.name AS bookmaker, b.host AS host, COALESCE(b.tier, 3) AS tier,
                    oh.timestamp, oh.odds_decimal AS oddsDecimal, oh.selection
             FROM odds_history oh
             JOIN bookmaker_event_mapping bem ON oh.bookmaker_event_mapping_id = bem.id
             JOIN bookmakers b ON bem.bookmaker_id = b.id
             WHERE bem.event_id = ? AND oh.market_type_id = ?
             ORDER BY oh.timestamp DESC`
        )
        .all(eventId, marketTypeId) as TierComparisonRow[]);

  const byBook = new Map<string, TierComparisonRow>();
  for (const row of latest) {
    if (!byBook.has(row.bookmaker)) byBook.set(row.bookmaker, row);
  }
  return [...byBook.values()].sort(
    (a, b) => a.tier - b.tier || a.bookmaker.localeCompare(b.bookmaker)
  );
}
