/**
 * State persistence (SQLite) for dashboard UI state.
 */

import { Database } from "bun:sqlite";
import { feature } from "bun:bundle";

const STATE_DB_PATH = `${process.env.HOME}/.cache/enterprise-dashboard/state.db`;

await Bun.write(`${process.env.HOME}/.cache/enterprise-dashboard/.gitkeep`, "");

const stateDb = new Database(STATE_DB_PATH);
stateDb.run(`
  CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

/**
 * Export stateDb for cleanup in graceful shutdown
 */
export { stateDb };

export function saveState(key: string, value: unknown, debug?: (label: string, data?: unknown) => void): void {
  if (debug) {
    debug("Saving state", { key, value });
  }
  stateDb
    .query("INSERT OR REPLACE INTO state (key, value, updated_at) VALUES (?, ?, unixepoch())")
    .run(key, JSON.stringify(value));
}

export function loadState<T>(key: string, defaultValue: T): T {
  const row = stateDb.query("SELECT value FROM state WHERE key = ?").get(key) as
    | { value: string }
    | null;
  if (row) {
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

export function closeStateDb(): void {
  stateDb.close();
}

/**
 * Setup resize handler for terminal width updates
 * Returns cleanup function for HMR safety
 */
export function setupResizeHandler(
  onResize: (boxWidth: number) => void,
  debug?: (label: string, data?: unknown) => void
): () => void {
  const handler = () => {
    const termWidth = process.stdout.columns || 80;
    const boxWidth = Math.max(58, Math.min(termWidth - 2, 118));
    onResize(boxWidth);
    if (debug) {
      debug("Terminal resized", { columns: process.stdout.columns, boxWidth });
    }
  };
  process.stdout.on("resize", handler);
  return () => {
    process.stdout.off("resize", handler);
  };
}
