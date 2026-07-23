// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Monitoring tables — integrity_checks for registry health history.
 */
import type { Database } from 'bun:sqlite';

export function ensureMonitoringSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS integrity_checks (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      failures INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      details TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_integrity_ts ON integrity_checks(timestamp DESC);
  `);
}
