#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sql
/** CLI: probe Postgres readiness and export SQLite DDL for migration. */
import { exportPostgresDdl, probePostgresOps } from '../lib/operations/postgres-bridge.ts';

const exportOnly = Bun.argv.includes('--export-ddl');
const probe = Bun.argv.includes('--probe') || !exportOnly;

if (exportOnly || Bun.argv.includes('--export-ddl')) {
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
