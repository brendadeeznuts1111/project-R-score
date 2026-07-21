// @see https://bun.com/docs/runtime/file-io — Bun.file destinations use path strings
/**
 * Bun-native path join/resolve without `node:path` / `path`.
 * Spine SSOT — scripts/lib/fs-bun re-exports these.
 */

/** Normalize `/./` and `/../` segments; preserve absolute roots. */
export function normalizePath(path: string): string {
  const isAbs = path.startsWith('/');
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(seg);
  }
  const body = out.join('/');
  if (isAbs) return `/${body}`;
  return body || '.';
}

/** Join path segments with `/`. */
export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(p => p != null && String(p) !== '').join('/'));
}

/**
 * Resolve like Node's path.resolve for common cases: empty → cwd;
 * later absolute segment replaces; otherwise join under cwd.
 */
export function resolvePath(...parts: string[]): string {
  if (parts.length === 0) return process.cwd();
  let resolved = '';
  for (const part of parts) {
    if (part == null || part === '') continue;
    if (part.startsWith('/')) {
      resolved = part;
      continue;
    }
    resolved = resolved ? joinPath(resolved, part) : joinPath(process.cwd(), part);
  }
  return resolved ? normalizePath(resolved) : process.cwd();
}

export function dirnamePath(p: string): string {
  return p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '/' : '.';
}

export function basenamePath(p: string): string {
  return p.split('/').filter(Boolean).pop() || p;
}

export function extnamePath(p: string): string {
  const base = basenamePath(p);
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i) : '';
}
