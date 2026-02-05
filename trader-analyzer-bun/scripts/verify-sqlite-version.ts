#!/usr/bin/env bun
/**
 * @fileoverview SQLite Version Verification Script
 * @description Verifies SQLite 3.51.0 is available in Bun 1.3.3+
 * @module scripts/verify-sqlite-version
 */

import { Database } from "bun:sqlite";

/**
 * Verify SQLite version and display database statistics
 */
async function verifySQLiteVersion(): Promise<void> {
  console.log("🔍 Verifying SQLite version...\n");

  // Check Bun version
  const bunVersion = Bun.version;
  console.log(`✅ Bun version: ${bunVersion}`);

  // Check SQLite version
  const db = new Database(":memory:");
  try {
    const versionResult = db.query("SELECT sqlite_version() as version").get() as {
      version: string;
    };
    const sqliteVersion = versionResult.version;
    console.log(`✅ SQLite version: ${sqliteVersion}`);

    // Verify it's 3.51.0 or higher
    const [major, minor, patch] = sqliteVersion.split(".").map(Number);
    const isSupported = major > 3 || (major === 3 && minor > 50) || (major === 3 && minor === 50 && patch >= 51);

    if (isSupported) {
      console.log(`✅ SQLite 3.51.0+ features available\n`);
    } else {
      console.log(`⚠️  SQLite version ${sqliteVersion} detected. Bun 1.3.3+ includes SQLite 3.51.0.\n`);
    }

    // Display PRAGMA settings
    console.log("📊 Current PRAGMA settings:");
    const journalMode = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
    const synchronous = db.query("PRAGMA synchronous").get() as { synchronous: number };
    const foreignKeys = db.query("PRAGMA foreign_keys").get() as { foreign_keys: number };
    const cacheSize = db.query("PRAGMA cache_size").get() as { cache_size: number };

    console.log(`   journal_mode: ${journalMode.journal_mode}`);
    console.log(`   synchronous: ${synchronous.synchronous}`);
    console.log(`   foreign_keys: ${foreignKeys.foreign_keys}`);
    console.log(`   cache_size: ${cacheSize.cache_size} pages\n`);

    // Test WAL mode (note: in-memory databases use "memory" mode)
    console.log("🧪 Testing WAL mode...");
    db.exec("PRAGMA journal_mode = WAL");
    const walMode = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
    if (walMode.journal_mode === "wal") {
      console.log(`✅ WAL mode enabled successfully\n`);
    } else if (walMode.journal_mode === "memory") {
      console.log(`ℹ️  In-memory database uses "memory" journal mode (expected)\n`);
    } else {
      console.log(`⚠️  WAL mode not available (current: ${walMode.journal_mode})\n`);
    }

    // Performance test
    console.log("⚡ Performance test (1000 inserts)...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_perf (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT NOT NULL
      )
    `);

    const insertStmt = db.prepare("INSERT INTO test_perf (value) VALUES (?)");
    const start = Bun.nanoseconds();

    for (let i = 0; i < 1000; i++) {
      insertStmt.run(`value-${i}`);
    }

    const duration = Bun.nanoseconds() - start;
    const durationMs = duration / 1_000_000;
    const opsPerSec = Math.round((1000 / durationMs) * 1000);

    console.log(`   Duration: ${durationMs.toFixed(2)}ms`);
    console.log(`   Throughput: ~${opsPerSec.toLocaleString()} ops/sec\n`);

    // Cleanup
    db.exec("DROP TABLE IF EXISTS test_perf");
    db.close();

    console.log("✅ SQLite verification complete!");
  } catch (error) {
    console.error("❌ Error verifying SQLite:", error);
    db.close();
    process.exit(1);
  }
}

// Run verification
verifySQLiteVersion().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});
