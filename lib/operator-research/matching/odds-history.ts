// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

export type OddsHistoryInsert = {
  mappingId: number;
  marketTypeId: number | null;
  selection: string;
  oddsDecimal: number;
  oddsAmerican: number;
  oddsHandicap?: number | null;
  timestamp: number;
  session: 'pregame' | 'live';
  rawPayload?: unknown;
};

export function appendOddsHistory(row: OddsHistoryInsert, db: Database = openOddsDb()): number {
  ensureMatchingSchema(db);
  db.query(
    `INSERT INTO odds_history (
      bookmaker_event_mapping_id, market_type_id, selection,
      odds_decimal, odds_american, odds_handicap,
      timestamp, session, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.mappingId,
    row.marketTypeId,
    row.selection,
    row.oddsDecimal,
    row.oddsAmerican,
    row.oddsHandicap ?? null,
    row.timestamp,
    row.session,
    row.rawPayload != null ? JSON.stringify(row.rawPayload) : null
  );
  return (db.query(`SELECT last_insert_rowid() AS id`).get() as { id: number }).id;
}

export type HistoryPoint = {
  id: number;
  timestamp: number;
  oddsDecimal: number;
  oddsAmerican: number | null;
  oddsHandicap: number | null;
  selection: string | null;
  session: string | null;
};

export function getOddsHistory(
  mappingId: number,
  marketTypeId: number | null,
  opts: { selection?: string; limit?: number } = {},
  db: Database = openOddsDb()
): HistoryPoint[] {
  ensureMatchingSchema(db);
  const limit = Math.min(opts.limit ?? 20, 200);
  if (opts.selection && marketTypeId != null) {
    return db
      .query(
        `SELECT id, timestamp, odds_decimal AS oddsDecimal, odds_american AS oddsAmerican,
                odds_handicap AS oddsHandicap, selection, session
         FROM odds_history
         WHERE bookmaker_event_mapping_id = ? AND market_type_id = ? AND selection = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(mappingId, marketTypeId, opts.selection, limit) as HistoryPoint[];
  }
  if (marketTypeId != null) {
    return db
      .query(
        `SELECT id, timestamp, odds_decimal AS oddsDecimal, odds_american AS oddsAmerican,
                odds_handicap AS oddsHandicap, selection, session
         FROM odds_history
         WHERE bookmaker_event_mapping_id = ? AND market_type_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(mappingId, marketTypeId, limit) as HistoryPoint[];
  }
  return db
    .query(
      `SELECT id, timestamp, odds_decimal AS oddsDecimal, odds_american AS oddsAmerican,
              odds_handicap AS oddsHandicap, selection, session
       FROM odds_history
       WHERE bookmaker_event_mapping_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(mappingId, limit) as HistoryPoint[];
}
