#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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
import { jsonOut } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:seed:dod', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const force = argv.includes('--force');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const result = await seedDodDemo({ dbPath, force, ifEmpty: !force });
jsonOut({ dbPath, ...result });

if (result.seeded) {
  console.log('\nNext: bun run ops:snapshot --no-routing  →  /registry/dod-queue.json');
}

process.exit(result.seeded || !force ? 0 : 1);
