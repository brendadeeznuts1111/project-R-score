// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write createPath
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob scanSync
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
/**
 * Sync Bun-native filesystem helpers for product code that cannot await.
 *
 * Prefer async `Bun.write` / `Bun.file` at call sites when possible. Use these
 * only for sync SQLite openers and other constructors that need a parent dir
 * before the next statement runs.
 *
 * Strategy: write a zero-byte marker via `Bun.write` (creates intermediate
 * segments) and settle with `Bun.peek` — no `node:fs`, no shell `mkdir`.
 * Same pattern as `lib/docs/smart-symbol-index.ts`.
 */

import { dirnamePath } from './path-bun.ts';

/**
 * Probe whether `path` is a readable directory via Glob.scanSync.
 * (Bun.file(path).exists() is for files — directories often report exists=false.)
 */
export function isDirectorySync(path: string): boolean {
  try {
    new Bun.Glob('*').scanSync({ cwd: path, onlyFiles: false }).next();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists (sync). Idempotent.
 * Writes `${dir}/.bun-keep` when the directory is missing.
 */
export function ensureDirSync(dir: string): void {
  if (!dir || dir === '.' || dir === '/') return;
  if (isDirectorySync(dir)) return;
  const marker = `${dir.replace(/\/$/, '')}/.bun-keep`;
  Bun.peek(Bun.write(marker, ''));
}

/** Ensure the parent directory of a file path exists (sync). */
export function ensureParentDirSync(filePath: string): void {
  ensureDirSync(dirnamePath(filePath));
}
