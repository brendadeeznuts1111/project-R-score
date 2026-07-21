// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write, BunFile.delete
// @see https://bun.com/docs/guides/read-file/exists — Bun.file().exists()
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
/**
 * Bun-native file helpers — only APIs documented at bun.com/docs/runtime/file-io
 * (and Glob at runtime/glob). No node:fs for file bodies; no shell; no node:path.
 *
 * Path join/resolve: re-exported from lib/path-bun (spine SSOT).
 */

export {
  basenamePath,
  dirnamePath,
  extnamePath,
  joinPath,
  normalizePath,
  resolvePath,
} from '../../lib/path-bun';

export type BunWriteData = string | Blob | ArrayBuffer | SharedArrayBuffer | Uint8Array | Response;

/** Lazy `Bun.file(path)` (optional MIME override). */
export function bunFile(path: string, type?: string): ReturnType<typeof Bun.file> {
  return type ? Bun.file(path, { type }) : Bun.file(path);
}

/** `Bun.file(path).size` — bytes (0 if missing). */
export function fileSize(path: string): number {
  return Bun.file(path).size;
}

/** MIME from `Bun.file(path).type`. */
export function fileType(path: string): string {
  return Bun.file(path).type;
}

/** `await Bun.file(path).exists()` */
export async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

/** Sync exists via `Bun.peek(Bun.file(path).exists())`. */
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

/** `await Bun.file(path).bytes()` → `Uint8Array` */
export async function readBytes(path: string): Promise<Uint8Array> {
  return Bun.file(path).bytes();
}

/** `await Bun.file(path).arrayBuffer()` */
export async function readArrayBuffer(path: string): Promise<ArrayBuffer> {
  return Bun.file(path).arrayBuffer();
}

/**
 * `await Bun.write(path, data)`
 * Creates intermediate path segments when `path` is nested.
 */
export async function writeFile(path: string, data: BunWriteData): Promise<number> {
  return Bun.write(path, data as Parameters<typeof Bun.write>[1]);
}

/** String payload convenience (most scripts). */
export async function writeText(path: string, content: string): Promise<number> {
  return Bun.write(path, content);
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** JSON.stringify + Bun.write (trailing newline when pretty). */
export async function writeJson(
  path: string,
  value: JsonValue,
  space: number | undefined = 2
): Promise<number> {
  const body =
    space === undefined || space === 0
      ? JSON.stringify(value)
      : `${JSON.stringify(value, null, space)}\n`;
  return Bun.write(path, body);
}

/**
 * Copy: `await Bun.write(Bun.file(to), Bun.file(from))`
 * @see https://bun.com/docs/runtime/file-io — “To copy a file…”
 */
export async function copyFile(from: string, to: string): Promise<number> {
  return Bun.write(Bun.file(to), Bun.file(from));
}

/** `await Bun.file(path).delete()` */
export async function deleteFile(path: string): Promise<void> {
  await Bun.file(path).delete();
}

/**
 * Sync glob scan — `new Bun.Glob(pattern).scanSync({ cwd, onlyFiles, dot })`
 * @see https://bun.com/docs/runtime/glob
 */
export function* scanFilesSync(
  pattern: string,
  options: { cwd?: string; dot?: boolean } = {}
): Generator<string> {
  const glob = new Bun.Glob(pattern);
  yield* glob.scanSync({
    cwd: options.cwd ?? process.cwd(),
    onlyFiles: true,
    dot: options.dot ?? false,
  });
}

/** Async glob scan — `for await (const f of glob.scan(...))`. */
export async function* scanFiles(
  pattern: string,
  options: { cwd?: string; dot?: boolean } = {}
): AsyncGenerator<string> {
  const glob = new Bun.Glob(pattern);
  for await (const f of glob.scan({
    cwd: options.cwd ?? process.cwd(),
    onlyFiles: true,
    dot: options.dot ?? false,
  })) {
    yield f;
  }
}

/** Collect sync glob matches into an array. */
export function listFilesSync(
  pattern: string,
  options: { cwd?: string; dot?: boolean } = {}
): string[] {
  return [...scanFilesSync(pattern, options)];
}

/**
 * Probe whether `path` is a readable directory via Glob.scanSync.
 * (Bun.file(path).exists() is for files — directories often report exists=false.)
 * @see https://bun.com/docs/runtime/glob — GlobScanOptions / scanSync
 */
export function isDirectorySync(path: string): boolean {
  try {
    // Throws ENOENT (missing) or ENOTDIR (regular file)
    new Bun.Glob('*').scanSync({ cwd: path, onlyFiles: false }).next();
    return true;
  } catch {
    return false;
  }
}

/** Alias: directory exists and is readable. */
export function dirExistsSync(path: string): boolean {
  return isDirectorySync(path);
}

/**
 * Direct children of a directory (files + dirs), relative names.
 * Uses `onlyFiles: false` so directories are included.
 * @see https://bun.com/docs/runtime/glob — GlobScanOptions.onlyFiles
 */
export function listEntriesSync(dir: string, options: { dot?: boolean } = {}): string[] {
  try {
    return [
      ...new Bun.Glob('*').scanSync({
        cwd: dir,
        onlyFiles: false,
        dot: options.dot ?? false,
      }),
    ];
  } catch {
    return [];
  }
}

/**
 * Ensure a directory exists by writing a zero-byte marker via Bun.write
 * (createPath defaults true — creates intermediate segments).
 * Prefer writing the real payload when possible; this is for empty dirs only.
 * @see https://bun.com/docs/runtime/file-io — Bun.write createPath
 */
export async function ensureDir(path: string): Promise<void> {
  if (isDirectorySync(path)) return;
  const marker = `${path.replace(/\/$/, '')}/.bun-keep`;
  await Bun.write(marker, '');
}
