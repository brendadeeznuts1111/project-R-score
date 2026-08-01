// @see https://bun.com/docs/runtime/utils#bun-fileurltopath — Bun.fileURLToPath
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
// @see https://bun.com/docs/guides/util/file-url-to-path — file URL → path
// @see https://bun.com/docs/guides/util/path-to-file-url — path → file URL
/**
 * Bun Utilities guides — file:// ↔ absolute path.
 *
 * Prefer these over `node:url` fileURLToPath / pathToFileURL in harness code.
 */

export const GUIDE_FILE_URL_TO_PATH = 'https://bun.com/docs/guides/util/file-url-to-path';
export const GUIDE_PATH_TO_FILE_URL = 'https://bun.com/docs/guides/util/path-to-file-url';

/** `file://` URL (string or URL) → absolute filesystem path. */
export function fileURLToPath(fileUrl: string | URL): string {
  return Bun.fileURLToPath(fileUrl);
}

/** Absolute path → `file://` URL (`URL` object; use `.href` for string). */
export function pathToFileURL(absolutePath: string): URL {
  return Bun.pathToFileURL(absolutePath);
}

/** Absolute path of a module (`import.meta.path` guide). Pass caller's `import.meta`. */
export function modulePath(meta: ImportMeta): string {
  return meta.path;
}

/** Directory of a module (`import.meta.dir` guide). Pass caller's `import.meta`. */
export function moduleDir(meta: ImportMeta): string {
  return meta.dir;
}

/** Basename of a module (`import.meta.file` guide). Pass caller's `import.meta`. */
export function moduleFile(meta: ImportMeta): string {
  return meta.file;
}
