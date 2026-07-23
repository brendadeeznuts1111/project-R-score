#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/webview
/** CLI: scrape sportsbook balances and reconcile vs sb_accounts. */
import { openOperationsDb } from '../lib/operations/db.ts';
import { runBookReconciliation } from '../lib/operations/book-reconcile.ts';

const json = Bun.argv.includes('--json');
const live = Bun.argv.includes('--live');
const webview = Bun.argv.includes('--webview');

const db = openOperationsDb();
const result = await runBookReconciliation(db, { live, webview });
db.close();

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(
    `Book reconcile: scrapes=${result.scrapes} updated=${result.updated} mismatches=${result.mismatches.length}`
  );
  for (const m of result.mismatches) {
    console.log(`  [${m.kind}] ${m.detail}`);
  }
}

process.exit(result.mismatches.length === 0 ? 0 : 1);
