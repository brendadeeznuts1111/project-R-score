// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Registry integrity check — validates public artifacts against the portal
 * contracts (lib/registry/contracts.ts) and records the result into
 * `integrity_checks` so /monitoring shows a real "last check" row.
 *
 * Run: bun run integrity:check
 */

import { Database } from 'bun:sqlite';
import { validateDodRegistry, validateOpsSummary } from '../registry/contracts.ts';
import { recordIntegrityCheck } from './collect.ts';
import { DEFAULT_OPS_DB_PATH } from '../operations/db.ts';

export type IntegrityCheckResult = {
  status: 'ok' | 'failed';
  failures: number;
  timestamp: string;
  details: string[];
};

const ARTIFACTS = [
  { name: 'ops-summary', path: 'public/registry/ops-summary.json' },
  { name: 'dod-registry', path: 'public/registry/dod-registry.json' },
] as const;

/** Validate artifacts, record into the operations DB (what /api/monitoring reads). */
export async function runIntegrityCheck(
  dbPath = DEFAULT_OPS_DB_PATH
): Promise<IntegrityCheckResult> {
  const failures: string[] = [];

  for (const artifact of ARTIFACTS) {
    const file = Bun.file(artifact.path);
    if (!(await file.exists())) {
      failures.push(`${artifact.name}: missing (${artifact.path})`);
      continue;
    }
    try {
      const value = await file.json();
      const result =
        artifact.name === 'ops-summary' ? validateOpsSummary(value) : validateDodRegistry(value);
      failures.push(...result.errors);
    } catch (err) {
      failures.push(`${artifact.name}: invalid JSON (${err instanceof Error ? err.message : err})`);
    }
  }

  // registry.json index: exists + parses (shape owned by lib/factory)
  const index = Bun.file('public/registry/registry.json');
  if (!(await index.exists())) failures.push('registry-index: missing');
  else {
    try {
      await index.json();
    } catch {
      failures.push('registry-index: invalid JSON');
    }
  }

  const result: IntegrityCheckResult = {
    status: failures.length > 0 ? 'failed' : 'ok',
    failures: failures.length,
    timestamp: new Date().toISOString(),
    details: failures,
  };

  const db = new Database(dbPath);
  recordIntegrityCheck(db, {
    status: result.status,
    failures: result.failures,
    details: JSON.stringify(result.details),
  });
  db.close();
  return result;
}

if (import.meta.main) {
  const result = await runIntegrityCheck(Bun.argv[2]);
  console.log(
    `${result.status === 'ok' ? '✅' : '❌'} integrity ${result.status} · ${result.failures} failure(s) · ${result.timestamp}`
  );
  for (const d of result.details) console.log(`  - ${d}`);
  if (result.status !== 'ok') process.exit(1);
}
