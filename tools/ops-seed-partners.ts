#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Seed partner profile bindings, platform accounts, and ops channel outbox.
 *
 *   bun run ops:seed:partners
 *   bun run ops:seed:partners -- --force
 *
 * @see lib/operations/partner-profile-seed.ts
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  exportCatalogSnapshot,
  seedPartnerProfilesDemo,
} from '../lib/operations/partner-profile-seed.ts';

const force = Bun.argv.includes('--force');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const db = openOperationsDb({ path: dbPath });
const result = await seedPartnerProfilesDemo(db, { force, ifEmpty: !force });
console.log(JSON.stringify({ dbPath, ...result }, null, 2));

if (result.seeded) {
  const catalog = await exportCatalogSnapshot(db);
  console.log(JSON.stringify({ catalog }, null, 2));
  console.log('\nNext: bun run ops:snapshot --no-routing  →  partners + channels on /portal/ops/');
}

db.close();
process.exit(result.seeded || !force ? 0 : 1);
