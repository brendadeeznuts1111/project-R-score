// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/guides/util/which-path-to-executable-bin — which PATH
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/guides/util/main — Bun.main absolute path
// @see https://bun.com/docs/guides/util/version — Bun.version / revision
// @see https://bun.com/docs/guides/util/detect-bun — process.versions.bun
/**
 * Bun Utilities guides — executable / entrypoint / runtime provenance.
 *
 * Shared by Soft bake nested spawn (`soft:accounting:from-ct`) and any CLI
 * that must resolve an absolute `bun` argv0 (never bare `"bun"`).
 */
import { bunDocs } from './docs/bun-site-url.ts';

export const BUN_WHICH_DOCS = bunDocs('runtime/utils', 'bun-which');
export const BUN_MAIN_DOCS = bunDocs('runtime/utils', 'bun-main');
export const BUN_VERSION_DOCS = bunDocs('runtime/utils', 'bun-version');
export const GUIDE_WHICH = 'https://bun.com/docs/guides/util/which-path-to-executable-bin';
export const GUIDE_ENTRYPOINT = 'https://bun.com/docs/guides/util/entrypoint';
export const GUIDE_MAIN = 'https://bun.com/docs/guides/util/main';
export const GUIDE_VERSION = 'https://bun.com/docs/guides/util/version';
export const GUIDE_DETECT_BUN = 'https://bun.com/docs/guides/util/detect-bun';

/** PATH-keyed cache for {@link resolveBunExecutable} (tests may clear). */
const bunExecutableCache = new Map<string, string>();

/** Clear Bun.which cache (tests). */
export function clearBunExecutableCache(): void {
  bunExecutableCache.clear();
}

/**
 * Absolute bun binary for nested spawn.
 * Uses Bun.which with an explicit PATH from Bun.env (docs: which PATH option).
 * Falls back to process.execPath when which misses (PATH empty / not installed as `bun`).
 * Bare `"bun"` + missing cwd surfaces as posix_spawn ENOENT — never return bare name.
 */
export function resolveBunExecutable(opts: { PATH?: string } = {}): string {
  const PATH = opts.PATH ?? Bun.env.PATH;
  const cacheKey = PATH === undefined ? '\0default' : PATH;
  const hit = bunExecutableCache.get(cacheKey);
  if (hit) return hit;

  const found =
    PATH === undefined ? Bun.which('bun') : PATH === '' ? null : Bun.which('bun', { PATH });
  const resolved = (found ?? process.execPath).trim();
  if (!resolved) {
    throw new Error(
      'Could not resolve bun executable (Bun.which returned null and process.execPath is empty)'
    );
  }
  bunExecutableCache.set(cacheKey, resolved);
  return resolved;
}

/**
 * True when `meta` is the process entrypoint (`import.meta.main` guide).
 * Pass the **caller's** `import.meta` — a default would bind to this lib module.
 * Equivalent to `meta.path === Bun.main` when that file was launched directly.
 */
export function isModuleEntrypoint(meta: ImportMeta): boolean {
  return meta.main === true;
}

/** Absolute path to the process entrypoint (`Bun.main` guide). */
export function entrypointPath(): string {
  return Bun.main;
}

/**
 * Detect Bun runtime (`detect-bun` guide).
 * Prefer `process.versions.bun` — works without `@types/bun` at the call site.
 */
export function isRunningUnderBun(): boolean {
  return typeof process.versions.bun === 'string' && process.versions.bun.length > 0;
}

export type BunRuntimeProvenance = {
  bunVersion: string;
  bunRevision: string;
  bunExecutable: string;
  bunMain: string;
};

/** Version + which + main fingerprint for `--json` / TTY provenance. */
export function bunRuntimeProvenance(opts: { PATH?: string } = {}): BunRuntimeProvenance {
  return {
    bunVersion: Bun.version,
    bunRevision: Bun.revision.slice(0, 8),
    bunExecutable: resolveBunExecutable(opts),
    bunMain: Bun.main,
  };
}

/**
 * Absolute bun + args for `Bun.spawn` — never bare `"bun"`.
 * Pair with `env: { ...Bun.env }` at the spawn site.
 */
export function bunSpawnArgs(args: string[], opts?: { PATH?: string }): string[] {
  return [resolveBunExecutable(opts), ...args];
}
