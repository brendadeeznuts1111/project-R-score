// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Operations DB connection factory — WAL + busy_timeout + unified schema.
 *
 * Default path resolves to the repo root via import.meta.dir (not cwd) so
 * OS-level cron fires (launchd/crontab run without a working directory) open
 * the same database as interactive runs. Explicit opts.path always wins.
 */
import { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun.ts';
import { initSchema } from './schema.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

export const DEFAULT_OPS_DB_PATH = joinPath(REPO_ROOT, 'data', 'operations.db');

export type OpenOperationsDbOpts = {
  path?: string;
  /** Skip initSchema (tests that call initSchema manually). */
  skipInit?: boolean;
};

export function openOperationsDb(opts?: OpenOperationsDbOpts): Database {
  const path = opts?.path ?? DEFAULT_OPS_DB_PATH;
  const db = new Database(path, path === ':memory:' ? undefined : { create: true });
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');
  if (!opts?.skipInit) initSchema(db);
  return db;
}
