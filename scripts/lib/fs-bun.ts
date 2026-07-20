// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Shared Bun-native FS helpers for scripts (prefer over node:fs).
 *
 * Usage:
 *   import { fileExists, readText, readJson, writeText, ensureDir, resolvePath } from './lib/fs-bun';
 */

/** Absolute-ish resolve relative to cwd (or an absolute first segment). */
export function resolvePath(...parts: string[]): string {
  if (parts.length === 0) return process.cwd();
  let out = parts[0]!;
  if (!out.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(out)) {
    out = `${process.cwd()}/${out}`;
  }
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i]!;
    if (seg.startsWith('/') || /^[A-Za-z]:[\\/]/.test(seg)) {
      out = seg;
      continue;
    }
    out = `${out.replace(/\/+$/, '')}/${seg.replace(/^\/+/, '')}`;
  }
  // collapse . and ..
  const segs = out.split('/');
  const stack: string[] = [];
  for (const s of segs) {
    if (s === '' || s === '.') {
      if (s === '' && stack.length === 0) stack.push('');
      continue;
    }
    if (s === '..') {
      if (stack.length > 1) stack.pop();
      continue;
    }
    stack.push(s);
  }
  const joined = stack.join('/') || '/';
  return joined.startsWith('/') ? joined : `/${joined}`;
}

export async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

/** Sync existence check via Bun.peek (for CLI flags / early exits). */
export function fileExistsSync(path: string): boolean {
  return Bun.peek(Bun.file(path).exists()) === true;
}

export async function readText(path: string): Promise<string> {
  return Bun.file(path).text();
}

export function readTextSync(path: string): string {
  return Bun.peek(Bun.file(path).text()) as string;
}

export async function readJson<T = unknown>(path: string): Promise<T> {
  return (await Bun.file(path).json()) as T;
}

export function readJsonSync<T = unknown>(path: string): T {
  return Bun.peek(Bun.file(path).json()) as T;
}

export async function writeText(
  path: string,
  content: string | ArrayBuffer | Uint8Array
): Promise<number> {
  return Bun.write(path, content);
}

export function ensureDir(dir: string): void {
  Bun.spawnSync(['mkdir', '-p', dir], { stdout: 'ignore', stderr: 'ignore' });
}

export async function writeTextEnsureDir(
  path: string,
  content: string | ArrayBuffer | Uint8Array
): Promise<number> {
  const slash = path.lastIndexOf('/');
  if (slash > 0) ensureDir(path.slice(0, slash));
  return Bun.write(path, content);
}
