#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/webview
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** CLI: scrape sportsbook balances and reconcile vs sb_accounts. */
import { openOperationsDb } from '../lib/operations/db.ts';
import { runBookReconciliation } from '../lib/operations/book-reconcile.ts';
import { jsonOut } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:book-reconcile', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const json = argv.includes('--json');
const live = argv.includes('--live');
const webview = argv.includes('--webview');

const db = openOperationsDb();
const result = await runBookReconciliation(db, { live, webview });
db.close();

if (json) {
  jsonOut(result);
} else {
  console.log(
    `Book reconcile: scrapes=${result.scrapes} updated=${result.updated} mismatches=${result.mismatches.length}`
  );
  for (const m of result.mismatches) {
    console.log(`  [${m.kind}] ${m.detail}`);
  }
}

process.exit(result.mismatches.length === 0 ? 0 : 1);
