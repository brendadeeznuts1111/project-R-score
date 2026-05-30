#!/usr/bin/env bun
/**
 * Migration Runner
 *
 * Usage:
 *   bun run db:migrate              # Apply all pending UP migrations
 *   bun run db:migrate --rollback   # Rollback all DOWN migrations
 *   bun run db:migrate --reset      # Rollback all, then re-apply
 *   bun run db:migrate --status     # Show migration status
 *
 * Migrations live in migrations/ at project root and follow strict naming:
 *   NNN-zone-description.sql  (e.g., 001-core-tables.sql)
 *
 * Each migration file must contain:
 *   -- UP
 *   CREATE TABLE IF NOT EXISTS ...
 *   -- DOWN
 *   DROP TABLE IF EXISTS ...
 */

import { getDb, closeDb, runMigrations } from "./index";

const args = process.argv.slice(2);
const isRollback = args.includes("--rollback");
const isReset = args.includes("--reset");
const isStatus = args.includes("--status");

async function showStatus(): Promise<void> {
  const db = getDb();

  // Ensure tracking table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER DEFAULT (strftime('%s','now')),
      direction TEXT DEFAULT 'up'
    )
  `);

  const applied = db
    .query("SELECT filename, applied_at, direction FROM __migrations ORDER BY filename")
    .all() as Array<{ filename: string; applied_at: number; direction: string }>;

  console.log("\n📊 Migration Status\n");
  console.log("─".repeat(70));

  if (applied.length === 0) {
    console.log("No migrations applied yet.");
  } else {
    for (const row of applied) {
      const date = new Date(row.applied_at * 1000).toISOString();
      console.log(`  ✅ ${row.filename}  (${row.direction})  ${date}`);
    }
  }

  console.log("─".repeat(70));
  console.log(`Total applied: ${applied.length}`);
  console.log();
}

async function main(): Promise<void> {
  try {
    if (isStatus) {
      await showStatus();
      closeDb();
      process.exit(0);
    }

    if (isReset) {
      console.log("🔄 Resetting database...");
      await runMigrations("down");
      await runMigrations("up");
      console.log("✅ Database reset complete.");
    } else if (isRollback) {
      console.log("⏪ Rolling back migrations...");
      await runMigrations("down");
      console.log("✅ Rollback complete.");
    } else {
      console.log("⏫ Applying migrations...");
      await runMigrations("up");
      console.log("✅ All migrations applied.");
    }

    closeDb();
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Migration failed: ${err.message}`);
    closeDb();
    process.exit(1);
  }
}

main();
