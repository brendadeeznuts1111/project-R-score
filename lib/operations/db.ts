// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Operations DB connection factory — WAL + busy_timeout + unified schema.
 */
import { Database } from 'bun:sqlite';
import { initSchema } from './schema.ts';

export const DEFAULT_OPS_DB_PATH = 'data/operations.db';

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
