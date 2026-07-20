// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/guides/read-file/exists — Bun.file().exists()
/**
 * Thin wrappers around Bun’s documented file I/O only.
 *
 * Source of truth: https://bun.com/docs/runtime/file-io
 * - Read/write files with `Bun.file` / `Bun.write` (not node:fs for file bodies).
 * - Path strings: Bun docs say use the `path` module with `Bun.write` destinations.
 * - `Bun.write` creates intermediate directories when writing a nested path
 *   (verified on this runtime; no shell `mkdir` / no hand-rolled resolvers).
 *
 * For pure directory listing when needed, Bun documents `readdir` from
 * `node:fs/promises` — keep that at call sites, not as a fake Bun API here.
 */

import { resolve } from 'path';

/** `path.resolve` — path manipulation as noted under Bun.write destinations. */
export function resolvePath(...parts: string[]): string {
  return resolve(...parts);
}

/** `await Bun.file(path).exists()` */
export async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

/** Sync exists: `Bun.peek(Bun.file(path).exists())` */
export function fileExistsSync(path: string): boolean {
  return Bun.peek(Bun.file(path).exists()) === true;
}

/** `await Bun.file(path).text()` */
export async function readText(path: string): Promise<string> {
  return Bun.file(path).text();
}

export function readTextSync(path: string): string {
  return Bun.peek(Bun.file(path).text()) as string;
}

/** `await Bun.file(path).json()` */
export async function readJson<T = unknown>(path: string): Promise<T> {
  return (await Bun.file(path).json()) as T;
}

export function readJsonSync<T = unknown>(path: string): T {
  return Bun.peek(Bun.file(path).json()) as T;
}

/** `await Bun.write(path, data)` — creates parent path segments as needed. */
export async function writeText(
  path: string,
  content: string | ArrayBuffer | Uint8Array
): Promise<number> {
  return Bun.write(path, content);
}

/**
 * @deprecated Prefer `writeText` / `Bun.write` (parents are created for you).
 * Kept so call sites that only “ensure dir before write” can drop the mkdir step.
 */
export async function ensureDir(_dir: string): Promise<void> {
  /* no-op: Bun.write creates intermediate directories */
}

/** Same as `writeText` — name kept for call-site clarity. */
export async function writeTextEnsureDir(
  path: string,
  content: string | ArrayBuffer | Uint8Array
): Promise<number> {
  return Bun.write(path, content);
}
