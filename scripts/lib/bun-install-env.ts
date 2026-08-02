// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { joinPath } from './fs-bun';
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env

/**
 * Default dirs skipped when scanning for literal `./~` Bun cache drift.
 * Matched by NAME at any depth (not root-anchored paths) so nested workspace
 * `node_modules`/`.git` and foreign worktree checkouts are pruned too —
 * each worktree checkout evicts its own tree via its own hook run.
 */
export const DEFAULT_TILDE_PRUNE = [
  'node_modules',
  '.git',
  'herdr-worktrees',
  '.codex-worktrees',
] as const;

export function resolveHome(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | undefined {
  return env.HOME ?? env.USERPROFILE;
}

export function defaultBunInstallCacheDir(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | undefined {
  const home = resolveHome(env);
  return home ? `${home}/.bun/install/cache` : undefined;
}

/** Absolute cache path; never returns a literal `~` prefix. */
export function resolveBunInstallCacheDir(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | undefined {
  const configured = env.BUN_INSTALL_CACHE_DIR;
  if (configured) {
    if (configured === '~' || configured.startsWith('~/')) {
      const home = resolveHome(env);
      return home ? configured.replace(/^~/, home) : undefined;
    }
    return configured;
  }
  return defaultBunInstallCacheDir(env);
}

export function applyBunInstallEnv(
  base: Record<string, string | undefined> = { ...Bun.env } as Record<string, string | undefined>
): Record<string, string | undefined> {
  const env = { ...base };
  const cacheDir = resolveBunInstallCacheDir(env);
  if (cacheDir) {
    env.BUN_INSTALL_CACHE_DIR = cacheDir;
  }
  if (env.BUN_INSTALL_GLOBAL_STORE == null) {
    env.BUN_INSTALL_GLOBAL_STORE = '1';
  }
  return env;
}

/** Paths under repo that are literal `~` dirs (Bun cache mis-expansion). */
export function findTildeCacheDirs(
  root: string,
  pruneDirNames: readonly string[] = DEFAULT_TILDE_PRUNE
): string[] {
  // Name-based prune (any depth): root-anchored `-path` only skipped the
  // top-level dir, so every nested workspace node_modules/.git was walked.
  const findArgs = [
    root,
    ...pruneDirNames.flatMap(name => ['-name', name, '-prune', '-o']),
    '-name',
    '~',
    '-type',
    'd',
    '-print',
  ];

  const found = Bun.spawnSync(['find', ...findArgs], { stdout: 'pipe' });
  if (found.exitCode !== 0) {
    return [];
  }

  return new TextDecoder()
    .decode(found.stdout)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

/** Staged/tracked paths that look like misplaced Bun tilde-cache dirs. */
export function isTildeCachePath(filePath: string): boolean {
  return /(^|\/)~(\/|$)/.test(filePath);
}

export function globalStoreLinksDir(cacheDir: string): string {
  return joinPath(cacheDir, 'links');
}
