#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Seed demo DOD review queue (flagged/pending/verified/rejected).
 *
 *   bun run ops:seed:dod
 *   bun run ops:seed:dod -- --force
 *
 * @see lib/operations/dod-seed.ts
 */
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { seedDodDemo } from '../lib/operations/dod-seed.ts';

const force = Bun.argv.includes('--force');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const result = await seedDodDemo({ dbPath, force, ifEmpty: !force });
console.log(JSON.stringify({ dbPath, ...result }, null, 2));

if (result.seeded) {
  console.log('\nNext: bun run ops:snapshot --no-routing  →  /registry/dod-queue.json');
}

process.exit(result.seeded || !force ? 0 : 1);
