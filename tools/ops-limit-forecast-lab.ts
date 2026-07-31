#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Build the read-only Limits Forecast Lab artifact.
 *
 *   bun run ops:limits:lab
 *   bun run ops:limits:lab:json
 */
import { Database } from 'bun:sqlite';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  buildLimitForecastLab,
  type LimitSnapshotSample,
} from '../lib/prediction/limit-forecast-lab.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';

const DEFAULT_OUTPUT = 'public/registry/limit-forecast-lab.json';

type WireLimitSnapshot = {
  node_id: string; // brand-ok — parsed at the SQLite boundary
  sportsbook: string;
  sport_id: string; // brand-ok — source wire key, not an entity identity
  market_id: string; // brand-ok — source wire key, not an entity identity
  bet_type: string;
  max_wager: number;
  recorded_at: number;
};

function optionValue(args: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find(argument => argument.startsWith(prefix))?.slice(prefix.length);
}

function loadSnapshots(path: string): LimitSnapshotSample[] {
  const db = new Database(path, { readonly: true });
  try {
    const rows = db
      .query(
        `SELECT node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at
         FROM partner_account_limits
         ORDER BY recorded_at, id`
      )
      .all() as WireLimitSnapshot[];
    return rows.map(row => ({
      nodeId: asTreeNodeId(row.node_id),
      sportsbook: row.sportsbook,
      sportKey: row.sport_id,
      marketKey: row.market_id,
      phase: row.bet_type,
      maxWager: row.max_wager,
      recordedAt: row.recorded_at,
    }));
  } finally {
    db.close();
  }
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const databasePath = optionValue(args, 'db') ?? DEFAULT_OPS_DB_PATH;
  const outputPath = optionValue(args, 'out') ?? DEFAULT_OUTPUT;
  const benchmarkIterations = Math.max(1, Number(optionValue(args, 'bench') ?? '1'));
  const write = !args.includes('--no-write');
  const json = args.includes('--json');
  const snapshots = loadSnapshots(databasePath);

  const started = performance.now();
  let payload = buildLimitForecastLab(snapshots);
  for (let iteration = 1; iteration < benchmarkIterations; iteration++) {
    payload = buildLimitForecastLab(snapshots, payload.generatedAt);
  }
  const elapsedMs = performance.now() - started;

  if (write) {
    await Bun.write(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  const result = {
    ...payload,
    benchmark: {
      iterations: benchmarkIterations,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      averageMs: Number((elapsedMs / benchmarkIterations).toFixed(6)),
    },
    output: write ? outputPath : null,
  };

  if (json) {
    jsonOut(result);
    return;
  }

  logTable(
    [
      { metric: 'snapshots', value: payload.dataset.snapshots },
      { metric: 'transitions', value: payload.dataset.transitions },
      { metric: 'sportsbooks', value: payload.dataset.sportsbooks },
      { metric: 'global_rate', value: `${(payload.model.globalRate * 100).toFixed(1)}%` },
      { metric: 'support', value: payload.dataset.support },
      { metric: 'forecast_eligible', value: payload.dataset.forecastEligible },
      { metric: 'average_ms', value: result.benchmark.averageMs },
    ],
    ['metric', 'value'],
    { colors: true }
  );
  console.log(
    write
      ? `Limits Forecast Lab artifact: ${outputPath}`
      : 'Limits Forecast Lab completed without writing an artifact.'
  );
}

if (import.meta.main) await main();
