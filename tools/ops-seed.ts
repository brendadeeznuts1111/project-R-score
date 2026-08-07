#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Seed demo operations data for portal / ops dashboard.
 *
 *   bun run ops:seed
 *   bun run ops:seed -- --force
 *   bun run ops:seed -- --summary
 *
 * @see lib/operations/ops-seed.ts
 */
import { logDepth } from '../lib/console-depth.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { seedOperationsDemo } from '../lib/operations/ops-seed.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:seed', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const force = argv.includes('--force');
const showSummary = argv.includes('--summary');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const db = openOperationsDb({ path: dbPath });
const result = await seedOperationsDemo(db, { force, ifEmpty: !force });

logDepth({ dbPath, ...result });

if (result.seeded) {
  console.log(
    '\nNext: bun run ops:snapshot --no-routing  →  deploy public/registry/ops-summary.json'
  );
}

if (showSummary) {
  const summary = buildOpsSummary(db, 'live');
  console.log('\n--- ops summary preview ---');
  logDepth({
    liquidity: summary.liquidity,
    experts: summary.experts.length,
    plays: summary.plays.length,
    experiments: summary.experiments.active,
    growth: summary.growth,
  });
}

db.close();
process.exit(result.seeded || !force ? 0 : 1);
