#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/sql
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** CLI: probe Postgres readiness and export SQLite DDL for migration. */
import { exportPostgresDdl, probePostgresOps } from '../lib/operations/postgres-bridge.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:postgres-probe', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const exportOnly = argv.includes('--export-ddl');
const probe = argv.includes('--probe') || !exportOnly;

if (exportOnly || argv.includes('--export-ddl')) {
  console.log(exportPostgresDdl());
}

if (probe) {
  const result = await probePostgresOps();
  if (result.ok) {
    console.log(`Postgres OK: ${result.version.slice(0, 60)}…`);
    process.exit(0);
  }
  console.log(`Postgres probe: ${result.reason}`);
  process.exit(exportOnly ? 0 : 1);
}
