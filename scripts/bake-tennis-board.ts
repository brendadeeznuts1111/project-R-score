#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake tennis desk metrics for portal board.
 *
 * Reads Kalshi-bot event-store (book_ticks + markets) when present;
 * otherwise writes sample payload (source: sample).
 *
 *   bun run tennis:board:bake
 *   bun scripts/bake-tennis-board.ts --db path/to/event-store.db
 *
 * @see lib/tennis/board-metrics.ts
 * @see public/portal/tennis/
 */
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { jsonOut } from '../lib/console-depth.ts';
import {
  bucketMidCents,
  formatVolume,
  humanizeSeries,
  midFromStoredBook,
  sampleBoardMetrics,
  toMidDistributionDoc,
  type SeriesVolumeRow,
  type TennisBoardMetrics,
  type VenueCountRow,
} from '../lib/tennis/board-metrics.ts';

const ROOT = join(import.meta.dir, '..');
const OUT_DIR = join(ROOT, 'public/registry/tennis');
const DEFAULT_DB = join(ROOT, 'Kalshi-bot/research/cache/event-store.db');

function argValue(flag: string): string | undefined {
  const i = Bun.argv.indexOf(flag);
  if (i >= 0 && Bun.argv[i + 1]) return Bun.argv[i + 1];
  return undefined;
}

function collectFromEventStore(dbPath: string): TennisBoardMetrics | null {
  const file = Bun.file(dbPath);
  if (!file.size) return null;

  let db: Database;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch {
    return null;
  }

  try {
    const hasTicks = db
      .query(`SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='book_ticks'`)
      .get() as { ok: number } | null;
    if (!hasTicks) return null;

    const tickRows = db
      .query(
        `SELECT bt.ticker, bt.levels_json
         FROM book_ticks bt
         WHERE bt.id IN (
           SELECT MAX(id) FROM book_ticks WHERE ticker IS NOT NULL GROUP BY ticker
         )`
      )
      .all() as Array<{ ticker: string; levels_json: string }>;

    const mids: number[] = [];
    for (const row of tickRows) {
      try {
        const book = JSON.parse(row.levels_json) as {
          bids?: Array<{ priceCents?: number }>;
          asks?: Array<{ priceCents?: number }>;
          crossed?: boolean;
        };
        const mid = midFromStoredBook(book);
        if (mid != null) mids.push(mid);
      } catch {
        /* skip bad tick */
      }
    }

    const seriesRows = db
      .query(
        `SELECT series,
                COUNT(*) AS markets,
                COALESCE(SUM(CAST(volume_24h_fp AS REAL)), 0) AS vol24
         FROM markets
         GROUP BY series
         ORDER BY vol24 DESC`
      )
      .all() as Array<{ series: string; markets: number; vol24: number }>;

    const seriesVolume: SeriesVolumeRow[] = seriesRows
      .filter(r => r.series)
      .map(r => ({
        series: r.series,
        label: humanizeSeries(r.series),
        markets: r.markets,
        volume24h: r.vol24,
        display: formatVolume(r.vol24),
      }));

    const venueRows = db
      .query(`SELECT venue, COUNT(*) AS c FROM markets GROUP BY venue ORDER BY c DESC`)
      .all() as Array<{ venue: string; c: number }>;

    const venues: VenueCountRow[] = venueRows.map(r => ({
      venue: String(r.venue || 'unknown').toLowerCase(),
      count: r.c,
    }));

    const marketCount = db.query(`SELECT COUNT(*) AS c FROM markets`).get() as { c: number };

    const source: TennisBoardMetrics['source'] =
      mids.length > 0 || seriesVolume.length > 0 ? 'event-store' : 'partial';

    return {
      schemaVersion: 1,
      kind: 'tennis-board-metrics',
      generatedAt: new Date().toISOString(),
      source,
      eventStorePath: dbPath.replace(`${ROOT}/`, ''),
      bookTicksLatest: tickRows.length,
      midsUsable: mids.length,
      markets: marketCount?.c ?? 0,
      buckets: bucketMidCents(mids),
      seriesVolume,
      venues,
      note:
        mids.length === 0
          ? 'Event store present but no usable mids (crossed/one-sided books)'
          : `Live from event-store · ${tickRows.length} latest books · ${mids.length} mids`,
    };
  } finally {
    db.close();
  }
}

async function main(): Promise<void> {
  const dbPath = argValue('--db') ?? DEFAULT_DB;
  const forceSample = Bun.argv.includes('--sample');

  let metrics: TennisBoardMetrics;
  if (forceSample) {
    metrics = sampleBoardMetrics();
  } else {
    metrics = collectFromEventStore(dbPath) ?? sampleBoardMetrics();
    if (metrics.source === 'sample') {
      metrics.note = `No event-store at ${dbPath.replace(`${ROOT}/`, '')} — sample fallback`;
    }
  }

  await Bun.write(join(OUT_DIR, 'board-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
  await Bun.write(
    join(OUT_DIR, 'mid-distribution.json'),
    `${JSON.stringify(toMidDistributionDoc(metrics), null, 2)}\n`
  );

  console.log(
    `tennis board bake → source=${metrics.source} mids=${metrics.midsUsable} series=${metrics.seriesVolume.length} markets=${metrics.markets}`
  );
  console.log(`  ${OUT_DIR}/board-metrics.json`);
  console.log(`  ${OUT_DIR}/mid-distribution.json`);
  if (Bun.argv.includes('--json')) {
    jsonOut(metrics);
  }
}

if (import.meta.main) {
  await main();
}
