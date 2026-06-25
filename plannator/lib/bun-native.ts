/**
 * Bun-native I/O helpers with exact signatures.
 *
 * These wrap Bun APIs to provide typed, documented boundaries for project code.
 * Prefer them over ad-hoc `node:fs` / `node:crypto` / `Buffer` usage.
 */

import { join } from "node:path";

/**
 * Read a small text file.
 * Exact signature: (path: string) => Promise<string>
 */
export async function readText(path: string): Promise<string> {
  return Bun.file(path).text();
}

/**
 * Read and parse JSON from a file.
 * Exact signature: <T>(path: string) => Promise<T>
 */
export async function readJson<T>(path: string): Promise<T> {
  return Bun.file(path).json() as Promise<T>;
}

/**
 * Write text to a file.
 * Exact signature: (path: string, content: string) => Promise<number>
 */
export async function writeText(path: string, content: string): Promise<number> {
  return Bun.write(path, content);
}

/**
 * Write bytes to a file.
 * Exact signature: (path: string, content: Uint8Array) => Promise<number>
 */
export async function writeBytes(path: string, content: Uint8Array): Promise<number> {
  return Bun.write(path, content);
}

/**
 * Check if a file exists and is non-empty.
 * Exact signature: (path: string) => Promise<boolean>
 */
export async function fileExists(path: string): Promise<boolean> {
  const file = Bun.file(path);
  const exists = await file.exists();
  return exists && (await file.size) > 0;
}

/**
 * Compute SHA256 hex digest of a string.
 * Exact signature: (input: string) => string
 */
export function hashSha256(input: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(input);
  return hasher.digest("hex");
}

/**
 * List files matching a glob under a directory.
 * Exact signature: (cwd: string, pattern: string) => AsyncIterable<string>
 */
export async function* globFiles(
  cwd: string,
  pattern: string
): AsyncIterable<string> {
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan(cwd)) {
    yield join(cwd, file);
  }
}

/**
 * Create a gzip-compressed archive from a file map.
 * Exact signature: (files: Record<string, string | Blob | Bun.ArrayBufferView | ArrayBufferLike>, level?: number) => Promise<Uint8Array<ArrayBuffer>>
 *
 * Defaults to compression level 9 for JSON-heavy manifests (10–20% smaller than level 6
 * at negligible CPU cost for sub-2 MB payloads). Requires Bun >= 1.3.13 (Bun.Archive).
 * Throws ArchiveNotSupportedError if unavailable.
 */
export async function archiveFiles(
  files: Record<string, string | Blob | Bun.ArrayBufferView | ArrayBufferLike>,
  level = 9
): Promise<Uint8Array<ArrayBuffer>> {
  const Archive = (Bun as typeof Bun & { Archive?: typeof Bun.Archive }).Archive;
  if (!Archive) {
    throw new ArchiveNotSupportedError();
  }
  const archive = new Archive(files as Bun.ArchiveInput, { compress: "gzip", level });
  return archive.bytes();
}

/**
 * Extract an archive to a directory.
 * Exact signature: (archiveBytes: Uint8Array, dest: string, glob?: string | readonly string[]) => Promise<number>
 *
 * Requires Bun >= 1.3.13 (Bun.Archive). Throws ArchiveNotSupportedError if unavailable.
 */
export async function extractArchive(
  archiveBytes: Uint8Array,
  dest: string,
  glob?: string | readonly string[]
): Promise<number> {
  const Archive = (Bun as typeof Bun & { Archive?: typeof Bun.Archive }).Archive;
  if (!Archive) {
    throw new ArchiveNotSupportedError();
  }
  const archive = new Archive(archiveBytes);
  return archive.extract(dest, { glob });
}

/**
 * List files in an archive in memory without extracting to disk.
 * Exact signature: (archiveBytes: Uint8Array, glob?: string | readonly string[]) => Promise<Map<string, File>>
 *
 * Docs: `archive.files(glob?)` returns `Map<string, File>` without disk I/O.
 * Perfect for dry-runs that only need manifest.json + files.json.
 */
export async function listArchiveFiles(
  archiveBytes: Uint8Array,
  glob?: string | readonly string[]
): Promise<Map<string, File>> {
  const Archive = (Bun as typeof Bun & { Archive?: typeof Bun.Archive }).Archive;
  if (!Archive) {
    throw new ArchiveNotSupportedError();
  }
  const archive = new Archive(archiveBytes);
  return archive.files(glob);
}

/**
 * Read a text file from an archive in memory.
 * Exact signature: (archiveBytes: Uint8Array, name: string) => Promise<string | undefined>
 */
export async function readArchiveFileText(
  archiveBytes: Uint8Array,
  name: string
): Promise<string | undefined> {
  const files = await listArchiveFiles(archiveBytes);
  const file = files.get(name);
  return file ? file.text() : undefined;
}

export class ArchiveNotSupportedError extends Error {
  constructor() {
    super("Bun.Archive is not available in this Bun version");
  }
}

/**
 * Format rows as a table using Bun.inspect.table.
 * Exact signature: <T extends Record<string, unknown>>(rows: T[], options?: Bun.InspectOptions) => string
 */
export function inspectTable<T extends Record<string, unknown>>(
  rows: T[],
  colors = true
): string {
  return Bun.inspect.table(rows, { colors });
}
