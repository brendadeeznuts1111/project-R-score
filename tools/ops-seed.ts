#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Seed demo operations data for portal / ops dashboard.
 *
 *   bun run ops:seed
 *   bun run ops:seed -- --force
 *   bun run ops:seed -- --summary
 *
 * @see lib/operations/ops-seed.ts
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { seedOperationsDemo } from '../lib/operations/ops-seed.ts';

const force = Bun.argv.includes('--force');
const showSummary = Bun.argv.includes('--summary');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const db = openOperationsDb({ path: dbPath });
const result = await seedOperationsDemo(db, { force, ifEmpty: !force });

console.log(JSON.stringify({ dbPath, ...result }, null, 2));

if (result.seeded) {
  console.log(
    '\nNext: bun run ops:snapshot --no-routing  →  deploy public/registry/ops-summary.json'
  );
}

if (showSummary) {
  const summary = buildOpsSummary(db, 'live');
  console.log('\n--- ops summary preview ---');
  console.log(
    JSON.stringify(
      {
        liquidity: summary.liquidity,
        experts: summary.experts.length,
        plays: summary.plays.length,
        experiments: summary.experiments.active,
        growth: summary.growth,
      },
      null,
      2
    )
  );
}

db.close();
process.exit(result.seeded || !force ? 0 : 1);
