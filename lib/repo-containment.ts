// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Realpath-aware repository path containment.
 *
 * Resolves paths through symlink parents even when the leaf does not exist yet
 * (e.g. `in-repo-symlink/missing-child` → outside the repo).
 */
import {
  basenamePath,
  dirnamePath,
  joinPath,
  normalizePath,
  relativePath,
  resolvePath,
} from './path-bun.ts';

/** Repo root from this module (`lib/` → parent). */
const DEFAULT_REPO_ROOT = joinPath(import.meta.dir, '..');

/** True for files (Bun.file) or dirs/symlinks (`test -e`). */
async function pathExists(abs: string): Promise<boolean> {
  if (await Bun.file(abs).exists()) return true;
  const proc = Bun.spawn(['test', '-e', abs], { stdout: 'ignore', stderr: 'ignore' });
  return (await proc.exited) === 0;
}

/** Realpath via `realpath(1)`; null when the path cannot be resolved. */
async function tryRealpath(abs: string): Promise<string | null> {
  const proc = Bun.spawn(['realpath', '--', abs], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  const resolved = stdout.trim();
  return exitCode === 0 && resolved ? normalizePath(resolved) : null;
}

/**
 * Resolve to an absolute real path. When `path` does not exist, walk up to the
 * nearest existing ancestor, realpath that, then rejoin the missing suffix.
 */
export async function resolveExistingRealPath(path: string): Promise<string> {
  const abs = normalizePath(resolvePath(path));
  if (await pathExists(abs)) {
    return (await tryRealpath(abs)) ?? abs;
  }

  const missing: string[] = [];
  let cursor = abs;
  while (cursor !== '/') {
    missing.unshift(basenamePath(cursor));
    const parent = dirnamePath(cursor);
    if (parent === cursor) break;
    cursor = parent;
    if (await pathExists(cursor)) {
      const realAncestor = (await tryRealpath(cursor)) ?? cursor;
      return normalizePath(joinPath(realAncestor, ...missing));
    }
  }

  return abs;
}

export type AssertPathInRepoOpts = {
  force?: boolean;
  repoRoot?: string;
  label: string;
};

/**
 * Resolve `path` (and repo root) via {@link resolveExistingRealPath}.
 * Without `force`, reject when the resolved path escapes the repository root.
 */
export async function assertPathInRepo(path: string, opts: AssertPathInRepoOpts): Promise<string> {
  const abs = await resolveExistingRealPath(path);
  if (opts.force) return abs;
  const root = await resolveExistingRealPath(opts.repoRoot ?? DEFAULT_REPO_ROOT);
  const rel = relativePath(root, abs);
  if (rel.startsWith('..') || rel === '..') {
    throw new Error(
      `${opts.label} must stay under the repository root (${root}); got ${abs}. Pass --force to override.`
    );
  }
  return abs;
}
