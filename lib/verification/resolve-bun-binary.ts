// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Resolve the `bun` binary for verification spawns — runtime execPath first, then Bun.which.
 *
 * @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
 * @see docs/UNIFIED.md — install verify toolchain
 */

export type BunBinaryResolutionSource = 'runtime' | 'which' | 'bun-install';

export type ResolvedVerificationBunBinary = {
  path: string;
  source: BunBinaryResolutionSource;
  runtimeVersion: string;
  spawnedVersion?: string;
  matchesRuntime: boolean;
};

export type ResolveVerificationBunBinaryOptions = {
  /** Prefer process.execPath over PATH (default true). */
  preferRuntime?: boolean;
  envPath?: string;
  /** Skip module cache (for tests). */
  fresh?: boolean;
};

let cached: ResolvedVerificationBunBinary | undefined;

function normalizeVersion(version: string): string {
  return version.trim().split(/[\s+]/)[0] ?? version.trim();
}

function readSpawnedVersion(bunPath: string): string | undefined {
  try {
    const proc = Bun.spawnSync([bunPath, '--version'], {
      stdout: 'pipe',
      stderr: 'ignore',
      stdin: 'ignore',
    });
    if (proc.exitCode !== 0) return undefined;
    return normalizeVersion(new TextDecoder().decode(proc.stdout));
  } catch {
    return undefined;
  }
}

function pathExists(path: string): boolean {
  if (!path) return false;
  try {
    return (
      Bun.spawnSync(['test', '-e', path], { stdout: 'ignore', stderr: 'ignore' }).exitCode === 0
    );
  } catch {
    return false;
  }
}

function resolveExecPath(): string | null {
  try {
    const execPath = process.execPath;
    if (!execPath || !pathExists(execPath)) return null;
    return execPath;
  } catch {
    return process.execPath || null;
  }
}

function resolveBunInstallPath(): string | null {
  const candidates = [
    Bun.env.BUN_INSTALL ? `${Bun.env.BUN_INSTALL}/bin/bun` : '',
    Bun.env.HOME ? `${Bun.env.HOME}/.bun/bin/bun` : '',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (pathExists(candidate)) return candidate;
  }
  return null;
}

/** Resolve absolute path to `bun` for verification child processes. */
export function resolveVerificationBunBinary(
  options: ResolveVerificationBunBinaryOptions = {}
): ResolvedVerificationBunBinary {
  const preferRuntime = options.preferRuntime !== false;
  if (cached && !options.fresh && !options.envPath && preferRuntime) {
    return cached;
  }

  const runtimeVersion = Bun.version;
  let path: string | null = null;
  let source: BunBinaryResolutionSource = 'which';

  if (preferRuntime) {
    path = resolveExecPath();
    if (path) source = 'runtime';
  }

  if (!path) {
    path = Bun.which('bun', { PATH: options.envPath ?? Bun.env.PATH });
    if (path) source = 'which';
  }

  if (!path) {
    path = resolveBunInstallPath();
    if (path) source = 'bun-install';
  }

  if (!path) {
    throw new Error(
      'resolveVerificationBunBinary: no bun executable found (runtime execPath, Bun.which, BUN_INSTALL)'
    );
  }

  const spawnedVersion = readSpawnedVersion(path);
  const matchesRuntime =
    spawnedVersion != null && normalizeVersion(spawnedVersion) === normalizeVersion(runtimeVersion);

  const result: ResolvedVerificationBunBinary = {
    path,
    source,
    runtimeVersion,
    spawnedVersion,
    matchesRuntime,
  };

  if (!options.fresh && !options.envPath && preferRuntime) {
    cached = result;
  }
  return result;
}

/** Compact note suffix for aspect rows and proof JSON. */
export function formatSpawnedBunNote(resolved: ResolvedVerificationBunBinary): string {
  const base = resolved.path.split('/').pop() ?? resolved.path;
  const mismatch = resolved.matchesRuntime ? '' : ' · runtime/cli MISMATCH';
  return `spawned=${base} source=${resolved.source} runtime=${resolved.runtimeVersion}${
    resolved.spawnedVersion ? ` cli=${resolved.spawnedVersion}` : ''
  }${mismatch}`;
}

/** Reset module cache (tests). */
export function clearVerificationBunBinaryCache(): void {
  cached = undefined;
}
