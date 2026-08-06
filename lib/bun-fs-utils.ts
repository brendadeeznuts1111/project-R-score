// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write createPath
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob scanSync
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/runtime/file-io — Bun.mmap (sync file bytes)
/**
 * Sync Bun-native filesystem helpers for product code that cannot await.
 *
 * Prefer async `Bun.write` / `Bun.file` at call sites when possible. Use these
 * only for sync SQLite openers, boot-time JSON loads, and other constructors
 * that need I/O before the next statement runs.
 *
 * - Dirs: zero-byte marker via `Bun.write` settled with `Bun.peek` (no shell).
 * - Reads: `Bun.mmap` + decode (peek of pending `.text()`/`.json()` is not the
 *   payload — same rule as `scripts/lib/fs-bun`).
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

/** Sync text via mmap (peek of pending `Bun.file().text()` is not the string). */
export function readTextSync(path: string): string {
  return new TextDecoder().decode(Bun.mmap(path));
}

/** Sync JSON parse via mmap. Throws if missing or invalid JSON. */
export function readJsonSync<T = unknown>(path: string): T {
  return JSON.parse(readTextSync(path)) as T;
}
