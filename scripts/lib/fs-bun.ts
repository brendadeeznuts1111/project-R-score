// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write; dirs via node:fs
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/runtime/nodejs-compat#node-fs — node:fs under Bun
/**
 * Thin helpers around Bun’s documented file I/O.
 *
 * From https://bun.com/docs/runtime/file-io:
 * - Prefer `Bun.file` / `Bun.write` for file read/write.
 * - Paths: use the `path` module (`Bun.write` destination notes).
 * - Directories (`mkdir` / `readdir`): use Bun’s `node:fs` implementation
 *   (not yet available on `Bun.file`).
 *
 * Do not invent shell `mkdir -p` or hand-rolled path resolvers here.
 */

import { dirname, resolve } from 'path';
import { mkdir } from 'node:fs/promises';

/** `path.resolve` — same module Bun’s file-io docs recommend for path manipulation. */
export function resolvePath(...parts: string[]): string {
  return resolve(...parts);
}

/** `Bun.file(path).exists()` — https://bun.com/docs/guides/read-file/exists */
export async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

/** Sync exists via `Bun.peek` on the same promise (CLI early exits). */
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

/** `await Bun.write(path, data)` */
export async function writeText(
  path: string,
  content: string | ArrayBuffer | Uint8Array
): Promise<number> {
  return Bun.write(path, content);
}

/**
 * Recursive mkdir — Bun file-io docs:
 * `import { mkdir } from "node:fs/promises"; await mkdir(dir, { recursive: true })`
 */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/** Write a file after ensuring its parent directory exists. */
export async function writeTextEnsureDir(
  path: string,
  content: string | ArrayBuffer | Uint8Array
): Promise<number> {
  await ensureDir(dirname(path));
  return Bun.write(path, content);
}
