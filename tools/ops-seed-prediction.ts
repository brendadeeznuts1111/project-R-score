#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Seed demo coverage prediction data (platforms, snapshots, backtest rows).
 *
 *   bun run ops:seed:prediction
 *   bun run ops:seed:prediction -- --force
 *
 * @see lib/operations/prediction-seed.ts
 */
import { logDepth } from '../lib/console-depth.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { seedPredictionDemo } from '../lib/operations/prediction-seed.ts';

const force = Bun.argv.includes('--force');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const db = openOperationsDb({ path: dbPath });
const result = seedPredictionDemo(db, { force, ifEmpty: !force });

logDepth({ dbPath, ...result });

if (result.seeded) {
  console.log('\nNext: bun run ops:prediction report && bun run ops:snapshot --no-routing');
}

db.close();
process.exit(result.seeded || !force ? 0 : 1);
