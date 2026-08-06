// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file / BunFile.type
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { basenamePath, extnamePath, joinPath, normalizePath, resolvePath } from '../../path-bun.ts';
import { guessContentType } from '../../http/content-type.ts';

export type BunFileRespondOpts = {
  /** Override MIME (also passed to Bun.file when set). */
  type?: string;
  /** Extra / override response headers (Content-Type wins over file.type if set). */
  headers?: Record<string, string>;
  cacheControl?: string;
  status?: number;
  /** Content-Disposition filename (attachment). */
  downloadAs?: string;
};

/**
 * Prefer BunFile.type (extension-derived MIME). Fall back to path guess, then octet-stream.
 */
export function mimeFromBunFile(file: Bun.BunFile, pathHint?: string): string {
  const t = file.type?.trim();
  if (t && t !== 'application/octet-stream') return t;
  if (pathHint) return guessContentType(pathHint);
  return 'application/octet-stream';
}

/** Open a BunFile with optional explicit MIME override. */
export function openBunFile(path: string, type?: string): Bun.BunFile {
  return type ? Bun.file(path, { type }) : Bun.file(path);
}

/**
 * Stream a disk file via Bun.file with Content-Type from file.type.
 * Returns 404 JSON when missing.
 */
export async function respondBunFile(
  path: string,
  opts: BunFileRespondOpts = {}
): Promise<Response> {
  const file = openBunFile(path, opts.type);
  if (!(await file.exists())) {
    return Response.json({ error: 'not found', path: basenamePath(path) }, { status: 404 });
  }

  const contentType =
    opts.headers?.['content-type'] ?? opts.headers?.['Content-Type'] ?? mimeFromBunFile(file, path);

  const headers = new Headers({
    'content-type': contentType,
    'cache-control': opts.cacheControl ?? 'no-store',
    'last-modified': new Date(file.lastModified).toUTCString(),
    'x-bun-file-type': file.type,
  });

  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      if (k.toLowerCase() === 'content-type') continue;
      headers.set(k, v);
    }
  }

  if (opts.downloadAs) {
    headers.set(
      'content-disposition',
      `attachment; filename="${opts.downloadAs.replace(/"/g, '')}"`
    );
  }

  return new Response(file, { status: opts.status ?? 200, headers });
}

/**
 * Write bytes/string to disk with Bun.write, then serve via Bun.file + MIME.
 */
export async function writeAndRespondBunFile(
  path: string,
  data: string | Blob | ArrayBuffer | Uint8Array,
  opts: BunFileRespondOpts = {}
): Promise<Response> {
  const type = opts.type ?? guessContentType(path);
  await Bun.write(path, data);
  return respondBunFile(path, { ...opts, type });
}

/**
 * Resolve a URL path under a public root (path-traversal safe).
 * Returns absolute path or null if outside root / empty.
 */
export function resolveUnderRoot(rootDir: string, urlPath: string): string | null {
  const cleaned = urlPath.replace(/^\/+/, '').replaceAll('\0', '');
  if (!cleaned || cleaned.includes('..')) return null;
  const absRoot = resolvePath(rootDir);
  const abs = normalizePath(joinPath(absRoot, cleaned));
  if (abs !== absRoot && !abs.startsWith(`${absRoot}/`)) return null;
  return abs;
}

/** MIME + size metadata for diagnostics (does not read file body). */
export async function bunFileMeta(path: string): Promise<{
  path: string;
  exists: boolean;
  type: string;
  size: number;
  ext: string;
} | null> {
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) return null;
  return {
    path,
    exists: true,
    type: mimeFromBunFile(file, path),
    size: file.size,
    ext: extnamePath(path),
  };
}
