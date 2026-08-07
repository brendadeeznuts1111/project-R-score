#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('tennis:board:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
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
import {
  buildAvatarIndexFromNames,
  scanWarehouseAvatars,
  toAvatarIndexDoc,
} from '../lib/tennis/avatar-index.ts';
import {
  collectLiveMatchesFromEventStore,
  loadLiveMatchesDoc,
  sampleLiveMatches,
} from '../lib/tennis/live-matches.ts';

const ROOT = joinPath(import.meta.dir, '..');
const OUT_DIR = joinPath(ROOT, 'public/registry/tennis');
const DEFAULT_DB = joinPath(ROOT, 'Kalshi-bot/research/cache/event-store.db');
const WAREHOUSE_AVATARS = joinPath(ROOT, 'warehouse/avatars');
const PUBLIC_AVATARS = joinPath(ROOT, 'public/avatars');

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

function collectProfileNames(dbPath: string): string[] {
  try {
    if (!Bun.file(dbPath).size) return [];
    const db = new Database(dbPath, { readonly: true });
    try {
      const has = db
        .query(`SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='player_profiles'`)
        .get() as { ok: number } | null;
      if (!has) return [];
      const rows = db
        .query(
          `SELECT player_name FROM player_profiles
           WHERE player_name IS NOT NULL AND player_name != ''
           ORDER BY appearances DESC LIMIT 200`
        )
        .all() as Array<{ player_name: string }>;
      return rows.map(r => r.player_name);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

async function maybeGenerateAvatars(): Promise<number> {
  if (argv.includes('--no-images')) return 0;
  try {
    const proc = Bun.spawn(
      [
        'bun',
        'scripts/images-generate.ts',
        '--template=avatar',
        `--source=${WAREHOUSE_AVATARS}`,
        `--out=${PUBLIC_AVATARS}`,
        '--size=128x128',
        '--format=webp',
      ],
      { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    await proc.exited;
    return proc.exitCode === 0 ? 1 : 0;
  } catch {
    return 0;
  }
}

async function main(): Promise<void> {
  const dbPath = argValue('--db') ?? DEFAULT_DB;
  const forceSample = argv.includes('--sample');
  const matchLimit = Number(argValue('--match-limit') ?? '12') || 12;

  let metrics: TennisBoardMetrics;
  if (forceSample) {
    metrics = sampleBoardMetrics();
  } else {
    metrics = collectFromEventStore(dbPath) ?? sampleBoardMetrics();
    if (metrics.source === 'sample') {
      metrics.note = `No event-store at ${dbPath.replace(`${ROOT}/`, '')} — sample fallback`;
    }
  }

  // Live matches + avatar index (clean mapping)
  const liveMatches = forceSample
    ? sampleLiveMatches(new Date(), matchLimit)
    : loadLiveMatchesDoc(dbPath, { limit: matchLimit });

  // Attach desk quality onto metrics for portal health strip.
  if (liveMatches.quality) {
    metrics = {
      ...metrics,
      desk: {
        scannedEvents: liveMatches.quality.scannedEvents,
        withBothMids: liveMatches.quality.withBothMids,
        withOneMid: liveMatches.quality.withOneMid,
        withNoMids: liveMatches.quality.withNoMids,
        listedWithBothMids: liveMatches.quality.listedWithBothMids,
        listedMissingMids: liveMatches.quality.listedMissingMids,
        coveragePct: liveMatches.quality.coveragePct,
        ...(liveMatches.quality.latestBookTs != null
          ? { latestBookTs: liveMatches.quality.latestBookTs }
          : {}),
        ...(liveMatches.quality.latestBookAt
          ? { latestBookAt: liveMatches.quality.latestBookAt }
          : {}),
      },
    };
  }

  const profileNames = forceSample
    ? liveMatches.matches.flatMap(m => [m.sideA.label, m.sideB.label])
    : [
        ...collectProfileNames(dbPath),
        ...liveMatches.matches.flatMap(m => [m.sideA.label, m.sideB.label]),
      ];

  const imagesOk = await maybeGenerateAvatars();
  const avatarIndex =
    profileNames.length > 0
      ? await buildAvatarIndexFromNames(profileNames)
      : await scanWarehouseAvatars();

  await Bun.write(joinPath(OUT_DIR, 'board-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
  await Bun.write(
    joinPath(OUT_DIR, 'mid-distribution.json'),
    `${JSON.stringify(toMidDistributionDoc(metrics), null, 2)}\n`
  );
  await Bun.write(
    joinPath(OUT_DIR, 'live-matches.json'),
    `${JSON.stringify(liveMatches, null, 2)}\n`
  );
  await Bun.write(
    joinPath(OUT_DIR, 'avatar-index.json'),
    `${JSON.stringify(toAvatarIndexDoc(avatarIndex), null, 2)}\n`
  );

  console.log(
    `tennis board bake → metrics=${metrics.source} mids=${metrics.midsUsable} series=${metrics.seriesVolume.length} markets=${metrics.markets}`
  );
  const q = liveMatches.quality;
  console.log(
    `  matches=${liveMatches.source} n=${liveMatches.matches.length}` +
      (q
        ? ` mid-ok=${q.listedWithBothMids}/${liveMatches.matches.length} store-full=${q.withBothMids}`
        : '') +
      ` · avatars=${avatarIndex.players.length} · images=${imagesOk ? 'ok' : 'skip'}`
  );
  console.log(`  ${OUT_DIR}/board-metrics.json`);
  console.log(`  ${OUT_DIR}/mid-distribution.json`);
  console.log(`  ${OUT_DIR}/live-matches.json`);
  console.log(`  ${OUT_DIR}/avatar-index.json`);
  if (argv.includes('--json')) {
    jsonOut({
      metrics,
      liveMatches,
      avatarIndex: toAvatarIndexDoc(avatarIndex),
    });
  }
}

if (import.meta.main) {
  await main();
}
