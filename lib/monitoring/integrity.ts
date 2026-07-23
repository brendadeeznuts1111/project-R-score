// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Registry integrity check — validates public artifacts against the portal
 * contracts (lib/registry/contracts.ts) and records the result into
 * `integrity_checks` so /monitoring shows a real "last check" row.
 *
 * DB SSOT: `openOperationsDb` / `OPS_DB_PATH` / `DEFAULT_OPS_DB_PATH`
 * (`data/operations.db`) — same DB as live `/api/monitoring`. Never
 * `data/registry.db`.
 *
 * Run: bun run integrity:check
 */

import { validateDodRegistry, validateOpsSummary } from '../registry/contracts.ts';
import { openOperationsDb, DEFAULT_OPS_DB_PATH } from '../operations/db.ts';
import { recordIntegrityCheck } from './collect.ts';

export type IntegrityCheckResult = {
  status: 'ok' | 'failed';
  failures: number;
  timestamp: string;
  details: string[];
  dbPath: string;
};

const ARTIFACTS = [
  { name: 'ops-summary', path: 'public/registry/ops-summary.json' },
  { name: 'dod-registry', path: 'public/registry/dod-registry.json' },
] as const;

function resolveOpsDbPath(override?: string): string {
  const path = (override || Bun.env.OPS_DB_PATH || DEFAULT_OPS_DB_PATH).trim();
  return path || DEFAULT_OPS_DB_PATH;
}

/** Validate artifacts, record into the operations DB (what /api/monitoring reads). */
export async function runIntegrityCheck(dbPath?: string): Promise<IntegrityCheckResult> {
  const resolvedPath = resolveOpsDbPath(dbPath);
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
    dbPath: resolvedPath,
  };

  const db = openOperationsDb({ path: resolvedPath });
  try {
    recordIntegrityCheck(db, {
      status: result.status,
      failures: result.failures,
      details: JSON.stringify(result.details),
    });
  } finally {
    db.close();
  }
  return result;
}

if (import.meta.main) {
  const result = await runIntegrityCheck(Bun.argv[2]);
  console.log(
    `${result.status === 'ok' ? '✅' : '❌'} integrity ${result.status} · ${result.failures} failure(s) · ${result.timestamp}`
  );
  console.log(`  db: ${result.dbPath}`);
  for (const d of result.details) console.log(`  - ${d}`);
  if (result.status !== 'ok') process.exit(1);
}
