#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** CLI: run operations reconciliation report. */
import { jsonOut } from '../lib/console-depth.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { runReconciliation } from '../lib/operations/reconciliation.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:reconcile', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const json = argv.includes('--json');
const db = openOperationsDb();
const report = runReconciliation(db);
db.close();

if (json) {
  jsonOut(report);
} else {
  console.log(
    `Reconciliation: ${report.ok ? 'OK' : 'MISMATCHES'} · agents=${report.agentsChecked} · issues=${report.mismatches.length}`
  );
  for (const m of report.mismatches) {
    console.log(`  [${m.kind}] ${m.detail}`);
  }
}

process.exit(report.ok ? 0 : 1);
