import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const DEFAULT_DATABASE_PATH = resolve(import.meta.dir, '../..', 'shortcuts.db');

export function resolveDatabasePath(
  configuredPath: string | undefined = process.env.DATABASE_PATH,
  testWorkerIndex: string | undefined = process.env.BUN_TEST_WORKER_ID
): string {
  const configured = configuredPath?.trim();
  if (configured && configured.length > 0) return resolve(configured);

  const worker = testWorkerIndex?.trim();
  return worker && worker.length > 0
    ? resolve(tmpdir(), `factorywager-shortcut-registry-${process.pid}-${worker}.db`)
    : DEFAULT_DATABASE_PATH;
}

export function resolveBackupPath(filename: string): string {
  return resolve(dirname(resolveDatabasePath()), filename);
}
