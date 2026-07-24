#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Backfill partner_profile_bindings for existing tree_nodes.
 *
 *   bun scripts/backfill-partner-bindings.ts
 *   bun scripts/backfill-partner-bindings.ts --dry-run
 *   OPS_DB_PATH=data/operations.db bun scripts/backfill-partner-bindings.ts
 *
 * @see lib/operations/partner-profile-bridge.ts
 * @see docs/harness/tenants/ops-partner-bridge.md
 */
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  backfillPartnerBindings,
  DEFAULT_TEMPLATE_ID,
  queryPartnersSlice,
} from '../lib/operations/partner-profile-bridge.ts';

const dryRun = Bun.argv.includes('--dry-run');
const dbPath = Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH;

const db = openOperationsDb({ path: dbPath });
const result = backfillPartnerBindings(db, { dryRun });
const summary = queryPartnersSlice(db);

console.log(
  `${dryRun ? '[dry-run] ' : ''}partner bindings backfill · template=${DEFAULT_TEMPLATE_ID}`
);
console.log(`  scanned unbound: ${result.scanned}`);
console.log(`  ${dryRun ? 'would bind' : 'bound'}: ${result.bound}`);
console.log(`  total bound now: ${summary.bound}`);
console.log(`  still unbound: ${summary.unboundAgents}`);
console.log(`  byLifecycle: ${JSON.stringify(summary.byLifecycle)}`);

db.close();
process.exit(0);
