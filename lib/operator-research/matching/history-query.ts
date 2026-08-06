// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { getMarketTypeId } from '../normalization/market-classifier.ts';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

export type HistorySeriesPoint = {
  timestamp: number;
  bookmaker: string;
  host: string | null;
  tier: number;
  selection: string;
  oddsDecimal: number;
  oddsAmerican: number | null;
  bucket?: number;
};

/**
 * Time-series odds for charting. Optional bucketMs aggregates to avg price.
 */
export function queryOddsHistorySeries(
  opts: {
    eventId: number;
    market?: string;
    selection?: string;
    bucketMs?: number;
    limit?: number;
  },
  db: Database = openOddsDb()
): { eventId: number; market: string; points: HistorySeriesPoint[] } {
  ensureMatchingSchema(db);
  const market = opts.market ?? 'moneyline';
  const marketTypeId = getMarketTypeId(market, db);
  if (marketTypeId == null) {
    return { eventId: opts.eventId, market, points: [] };
  }

  const limit = Math.min(opts.limit ?? 500, 2000);
  const rows = opts.selection
    ? (db
        .query(
          `SELECT oh.timestamp, b.name AS bookmaker, b.host AS host, COALESCE(b.tier, 3) AS tier,
                    oh.selection, oh.odds_decimal AS oddsDecimal, oh.odds_american AS oddsAmerican
             FROM odds_history oh
             JOIN bookmaker_event_mapping bem ON bem.id = oh.bookmaker_event_mapping_id
             JOIN bookmakers b ON b.id = bem.bookmaker_id
             WHERE bem.event_id = ? AND oh.market_type_id = ? AND oh.selection = ?
             ORDER BY oh.timestamp ASC
             LIMIT ?`
        )
        .all(opts.eventId, marketTypeId, opts.selection, limit) as HistorySeriesPoint[])
    : (db
        .query(
          `SELECT oh.timestamp, b.name AS bookmaker, b.host AS host, COALESCE(b.tier, 3) AS tier,
                    oh.selection, oh.odds_decimal AS oddsDecimal, oh.odds_american AS oddsAmerican
             FROM odds_history oh
             JOIN bookmaker_event_mapping bem ON bem.id = oh.bookmaker_event_mapping_id
             JOIN bookmakers b ON b.id = bem.bookmaker_id
             WHERE bem.event_id = ? AND oh.market_type_id = ?
             ORDER BY oh.timestamp ASC
             LIMIT ?`
        )
        .all(opts.eventId, marketTypeId, limit) as HistorySeriesPoint[]);

  if (!opts.bucketMs || opts.bucketMs <= 0) {
    return { eventId: opts.eventId, market, points: rows };
  }

  // Bucket average per bookmaker+selection
  const buckets = new Map<string, { sum: number; n: number; sample: HistorySeriesPoint }>();
  for (const r of rows) {
    const bucket = Math.floor(r.timestamp / opts.bucketMs) * opts.bucketMs;
    const key = `${bucket}|${r.bookmaker}|${r.selection}`;
    const cur = buckets.get(key);
    if (!cur) {
      buckets.set(key, { sum: r.oddsDecimal, n: 1, sample: { ...r, bucket, timestamp: bucket } });
    } else {
      cur.sum += r.oddsDecimal;
      cur.n += 1;
      cur.sample.oddsDecimal = cur.sum / cur.n;
    }
  }
  const points = [...buckets.values()].map(v => v.sample).sort((a, b) => a.timestamp - b.timestamp);
  return { eventId: opts.eventId, market, points };
}
