// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Operations DB connection factory — WAL + busy_timeout + unified schema.
 *
 * Default path resolves to the repo root via import.meta.dir (not cwd) so
 * OS-level cron fires (launchd/crontab run without a working directory) open
 * the same database as interactive runs. Explicit opts.path always wins.
 */
import { Database } from 'bun:sqlite';
import { dirnamePath, joinPath } from '../path-bun.ts';
import { initSchema } from './schema.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

export const DEFAULT_OPS_DB_PATH = joinPath(REPO_ROOT, 'data', 'operations.db');

export type OpenOperationsDbOpts = {
  path?: string;
  /** Skip initSchema (tests that call initSchema manually). */
  skipInit?: boolean;
};

/** SQLite creates a database file, but not a missing parent directory. */
export function ensureOperationsDbParent(path: string): void {
  if (path === ':memory:' || path.startsWith('file:')) return;
  const parent = dirnamePath(path);
  if (!parent || parent === '.') return;
  const result = Bun.spawnSync(['mkdir', '-p', parent], { stdout: 'ignore', stderr: 'pipe' });
  if (!result.success) {
    throw new Error(
      `Unable to create operations DB parent ${parent}: ${result.stderr.toString().trim()}`
    );
  }
}

export function openOperationsDb(opts?: OpenOperationsDbOpts): Database {
  const path = opts?.path ?? DEFAULT_OPS_DB_PATH;
  ensureOperationsDbParent(path);
  const db = new Database(path, path === ':memory:' ? undefined : { create: true });
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');
  if (!opts?.skipInit) initSchema(db);
  return db;
}
