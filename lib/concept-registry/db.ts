// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Concept Registry DB open — WAL + busy_timeout; parent dir created for file paths.
 */
import { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun.ts';
import { ensureConceptRegistrySchema } from './schema.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

export const DEFAULT_CONCEPT_REGISTRY_DB_PATH = joinPath(REPO_ROOT, 'data', 'concept-registry.db');

export type OpenConceptRegistryDbOpts = {
  path?: string;
  skipInit?: boolean;
};

function ensureParentDir(filePath: string): void {
  if (filePath === ':memory:') return;
  const slash = filePath.lastIndexOf('/');
  if (slash <= 0) return;
  Bun.spawnSync(['mkdir', '-p', filePath.slice(0, slash)], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
}

export function openConceptRegistryDb(opts?: OpenConceptRegistryDbOpts): Database {
  const path =
    opts?.path ??
    (typeof Bun.env.CONCEPT_REGISTRY_DB_PATH === 'string' &&
    Bun.env.CONCEPT_REGISTRY_DB_PATH.trim() !== ''
      ? Bun.env.CONCEPT_REGISTRY_DB_PATH.trim()
      : DEFAULT_CONCEPT_REGISTRY_DB_PATH);
  ensureParentDir(path);
  const db = new Database(path, path === ':memory:' ? undefined : { create: true });
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');
  db.run('PRAGMA foreign_keys = ON');
  if (!opts?.skipInit) ensureConceptRegistrySchema(db);
  return db;
}
