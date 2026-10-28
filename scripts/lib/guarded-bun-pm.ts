import { resolveBunExecutable } from '../../lib/bun-executable.ts';
import { resolvePath } from '../../lib/path-bun.ts';
import {
  prepareGuardedBunChild,
  spawnGuardedBunChildSync,
  type BunChildAuthority,
  type PreparedBunChild,
} from '../../lib/security/guarded-bun-process.ts';

const ROOT = resolvePath(import.meta.dir, '../..');

const LOCAL_PM_COMMANDS = {
  'pm\0bin': 'read the repository-local executable directory',
  'pm\0bin\0-g': 'read the Bun global executable directory',
  'pm\0cache': 'read the Bun package cache location',
  'pm\0cache\0rm': 'remove the explicitly configured Bun package cache',
  'pm\0hash': 'calculate the repository lockfile hash',
  'pm\0hash-print': 'read the stored repository lockfile hash',
  'pm\0ls\0--trusted': 'list trusted repository dependencies',
  'pm\0pkg\0get\0name\0version\0private': 'read fixed repository package metadata',
  'pm\0untrusted': 'list repository dependencies with blocked lifecycle scripts',
} as const;

export type GuardedLocalPmArgv =
  | readonly ['pm', 'bin']
  | readonly ['pm', 'bin', '-g']
  | readonly ['pm', 'cache']
  | readonly ['pm', 'cache', 'rm']
  | readonly ['pm', 'hash']
  | readonly ['pm', 'hash-print']
  | readonly ['pm', 'ls', '--trusted']
  | readonly ['pm', 'pkg', 'get', 'name', 'version', 'private']
  | readonly ['pm', 'untrusted'];

export type GuardedLocalPmEnvironment = Readonly<
  Partial<Record<'BUN_INSTALL_CACHE_DIR' | 'BUN_INSTALL_GLOBAL_STORE' | 'HOME', string>>
>;

function authorityFor(
  argv: readonly string[],
  cwd: string,
  environment: GuardedLocalPmEnvironment
): BunChildAuthority {
  const resolvedCwd = resolvePath(cwd);
  if (resolvedCwd !== ROOT) {
    throw new TypeError(`Local Bun PM authority is restricted to ${ROOT}`);
  }
  const reason = LOCAL_PM_COMMANDS[argv.join('\0') as keyof typeof LOCAL_PM_COMMANDS];
  if (!reason) throw new TypeError(`Unreviewed local Bun PM argv: ${argv.join(' ')}`);
  const executable = resolveBunExecutable();
  return {
    executable,
    argv,
    cwd: ROOT,
    environment: Object.fromEntries(
      Object.entries(environment).map(([name, value]) => [name, value ? [value] : []])
    ),
    profile: 'offline',
    command: 'runtime',
    reason,
  };
}

/** Validate a fixed, local-only `bun pm` probe without starting the child. */
export function prepareGuardedLocalBunPm(
  argv: GuardedLocalPmArgv,
  environment: GuardedLocalPmEnvironment = {},
  cwd = ROOT
): PreparedBunChild {
  const executable = resolveBunExecutable();
  const authority = authorityFor(argv, cwd, environment);
  return prepareGuardedBunChild({ authority, executable, argv, cwd, environment });
}

/** Execute one reviewed local-only `bun pm` probe with no ambient environment. */
export function runGuardedLocalBunPm(
  argv: GuardedLocalPmArgv,
  environment: GuardedLocalPmEnvironment = {},
  cwd = ROOT
) {
  const executable = resolveBunExecutable();
  const authority = authorityFor(argv, cwd, environment);
  return spawnGuardedBunChildSync(
    // guarded-process-consumer-reviewed owner=bun-pm-health executable=verified-bun args=fixed-local-pm-allowlist cwd=repository-root env=three-name-allowlist stdio=pipe network=denied offline=required flags=control-policy defaultDeny=true reason="Local cache and health probes permit nine exact bun pm argv vectors and cannot inherit registry, proxy, preload, or experimental controls."
    { authority, executable, argv, cwd, environment },
    { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' }
  );
}
