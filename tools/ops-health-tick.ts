#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Ops health tick — the daily maintenance consolidation:
 *   1. integrity check (contract-validates public artifacts → integrity_checks)
 *   2. DOD cleanup (purge pending submissions older than N days)
 *   3. coverage snapshot (platform coverage → coverage_snapshots)
 *
 * Run manually or from any scheduler: bun run ops:health-tick [--db PATH]
 * Exit 1 when the integrity check fails.
 */

import { runIntegrityCheck } from '../lib/monitoring/integrity.ts';
import { DODVerifier } from '../lib/dod/verifier.ts';
import {
  ensurePlatformCoverageSchema,
  recordCoverageSnapshot,
} from '../lib/operations/platform-coverage.ts';
import { ensureCoverageAnalyticsSchema } from '../lib/operations/coverage-analytics.ts';
import { initSchema } from '../lib/operations/schema.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';

export type HealthTickResult = {
  integrity: { status: string; failures: number };
  dodCleaned: number;
  coverage: { total: number; covered: number; pct: number };
  timestamp: string;
};

function dbPathFromArgv(): string {
  const i = Bun.argv.indexOf('--db');
  return i >= 0 && Bun.argv[i + 1] ? Bun.argv[i + 1]! : DEFAULT_OPS_DB_PATH;
}

export async function runHealthTick(dbPath = DEFAULT_OPS_DB_PATH): Promise<HealthTickResult> {
  // 1. Integrity (records its own row into the same DB)
  const integrity = await runIntegrityCheck(dbPath);

  // 2. DOD cleanup (default 7-day pending purge) — auto-closed via Symbol.dispose
  let dodCleaned = 0;
  {
    using verifier = new DODVerifier(dbPath, {
      evidenceRoot: 'public/evidence',
      registryPath: 'public/registry/dod-registry.json',
    });
    dodCleaned = verifier.cleanupPending(7);
  }

  // 3. Coverage snapshot
  const db = openOperationsDb({ path: dbPath });
  initSchema(db);
  ensurePlatformCoverageSchema(db);
  ensureCoverageAnalyticsSchema(db);
  const summary = recordCoverageSnapshot(db);
  db.close();

  return {
    integrity: { status: integrity.status, failures: integrity.failures },
    dodCleaned,
    coverage: {
      total: summary.total,
      covered: summary.covered,
      pct: summary.pct,
    },
    timestamp: new Date().toISOString(),
  };
}

if (import.meta.main) {
  const result = await runHealthTick(dbPathFromArgv());
  console.log(`integrity: ${result.integrity.status} (${result.integrity.failures} failures)`);
  console.log(`dod cleanup: ${result.dodCleaned} stale pending removed`);
  console.log(
    `coverage: ${result.coverage.covered}/${result.coverage.total} platforms (${result.coverage.pct.toFixed(1)}%)`
  );
  if (result.integrity.status !== 'ok') process.exit(1);
}
