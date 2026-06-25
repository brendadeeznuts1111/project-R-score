/**
 * Database Connection Singleton
 *
 * Provides a single shared SQLite database connection using bun:sqlite.
 * Every connection enables:
 *   - PRAGMA foreign_keys = ON   (referential integrity)
 *   - PRAGMA journal_mode = WAL  (concurrent reads/writes)
 *
 * The singleton pattern ensures all parts of the application use the same
 * connection, preventing WAL mode conflicts and transaction deadlocks.
 */

import { Database } from "bun:sqlite";
import { logHealth } from "@utils/tableLogger";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_PATH = process.env.DB_PATH || "./data/sports-terminal.db";
const ENABLE_WAL = process.env.DB_WAL !== "false";
const ENABLE_FOREIGN_KEYS = process.env.DB_FOREIGN_KEYS !== "false";

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let dbInstance: Database | null = null;

/**
 * Get the shared database connection. Creates on first call.
 * All subsequent calls return the same instance.
 */
export function getDb(): Database {
  if (dbInstance) return dbInstance;

  dbInstance = new Database(DB_PATH, { create: true });

  if (ENABLE_FOREIGN_KEYS) {
    dbInstance.run("PRAGMA foreign_keys = ON");
  }

  if (ENABLE_WAL) {
    dbInstance.run("PRAGMA journal_mode = WAL");
  }

  // Performance pragmas for production workloads
  dbInstance.run("PRAGMA synchronous = NORMAL");
  dbInstance.run("PRAGMA temp_store = MEMORY");
  dbInstance.run("PRAGMA cache_size = -64000"); // 64MB page cache
  dbInstance.run("PRAGMA mmap_size = 268435456"); // 256MB memory-mapped I/O
  dbInstance.run("PRAGMA busy_timeout = 5000"); // 5s busy timeout

  const journalMode = dbInstance
    .query("PRAGMA journal_mode")
    .get() as { journal_mode: string };
  const foreignKeys = dbInstance
    .query("PRAGMA foreign_keys")
    .get() as { foreign_keys: number };

  logHealth({
    component: "Database",
    status: "connected",
    path: DB_PATH,
    walMode: journalMode?.journal_mode || "unknown",
    foreignKeys: foreignKeys?.foreign_keys === 1,
  });

  return dbInstance;
}

/**
 * Close the database connection. Used during graceful shutdown.
 * Idempotent — safe to call multiple times.
 */
export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      logHealth({
        component: "Database",
        status: "disconnected",
        path: DB_PATH,
      });
    } catch (err: any) {
      console.error(`[HealthCheck] Database close error: ${err.message}`);
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Check database health by running a simple query.
 * Returns true if the connection is alive.
 */
export function checkDbHealth(): boolean {
  try {
    const db = getDb();
    db.query("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a transaction with automatic rollback on error.
 * The callback receives the database instance and runs inside a transaction.
 */
export function transaction<T>(fn: (db: Database) => T): T {
  const db = getDb();
  db.run("BEGIN TRANSACTION");
  try {
    const result = fn(db);
    db.run("COMMIT");
    return result;
  } catch (err: any) {
    db.run("ROLLBACK");
    throw err;
  }
}

/**
 * Run database migrations. Finds all .sql files in the migrations directory
 * and executes them in numeric order.
 */
export async function runMigrations(direction: "up" | "down" = "up"): Promise<void> {
  const migrationsDir = new URL("../../migrations", import.meta.url);
  
  try {
    const entries = [...new Bun.Glob("*.sql").scanSync(migrationsDir.pathname)];
    const files = entries.sort();

    if (files.length === 0) {
      console.warn("[HealthCheck] No migration files found");
      return;
    }

    const db = getDb();

    // Create migrations tracking table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS __migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at INTEGER DEFAULT (strftime('%s','now')),
        direction TEXT DEFAULT 'up'
      )
    `);

    if (direction === "up") {
      for (const file of files) {
        const alreadyApplied = db
          .query("SELECT 1 FROM __migrations WHERE filename = ? AND direction = 'up'")
          .get(file);

        if (alreadyApplied) continue;

        const filepath = `${migrationsDir.pathname}/${file}`;
        const sql = await Bun.file(filepath).text();

        // Extract UP section
        const upMatch = sql.match(/--\s*UP\s*([\s\S]*?)(?=--\s*DOWN|$)/i);
        const upSql = upMatch ? upMatch[1].trim() : sql;

        db.run(upSql);
        db.run(
          "INSERT INTO __migrations (filename, direction) VALUES (?, 'up')",
          [file]
        );

        logHealth({
          component: "Migration",
          status: "applied",
          filename: file,
        });
      }
    } else {
      // Rollback: process in reverse
      for (const file of [...files].reverse()) {
        const filepath = `${migrationsDir.pathname}/${file}`;
        const sql = await Bun.file(filepath).text();

        const downMatch = sql.match(/--\s*DOWN\s*([\s\S]*)$/i);
        if (downMatch && downMatch[1].trim()) {
          db.run(downMatch[1].trim());
        }

        db.run(
          "DELETE FROM __migrations WHERE filename = ?",
          [file]
        );

        logHealth({
          component: "Migration",
          status: "rolled_back",
          filename: file,
        });
      }
    }
  } catch (err: any) {
    console.error(`[HealthCheck] Migration error: ${err.message}`);
    throw err;
  }
}

// Re-export Database type for convenience
export type { Database };
