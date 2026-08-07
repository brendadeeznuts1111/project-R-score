#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Seed partner profile bindings, platform accounts, and ops channel outbox.
 *
 *   bun run ops:seed:partners
 *   bun run ops:seed:partners -- --force
 *
 * @see lib/operations/partner-profile-seed.ts
 */
import { logDepth } from '../lib/console-depth.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:seed:all', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  exportCatalogSnapshot,
  seedPartnerProfilesDemo,
} from '../lib/operations/partner-profile-seed.ts';

const force = argv.includes('--force');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const db = openOperationsDb({ path: dbPath });
const result = await seedPartnerProfilesDemo(db, { force, ifEmpty: !force });
logDepth({ dbPath, ...result });

if (result.seeded) {
  const catalog = await exportCatalogSnapshot(db);
  logDepth({ catalog });
  console.log('\nNext: bun run ops:snapshot --no-routing  →  partners + channels on /portal/ops/');
}

db.close();
process.exit(result.seeded || !force ? 0 : 1);
