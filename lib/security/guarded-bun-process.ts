// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @updated Bun.spawnSync · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawnSync · changed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.spawnSync · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawnSync · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawnSync · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawnSync · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.spawnSync · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @verified Bun.spawnSync · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Exact, default-deny authority for Bun child processes.
 *
 * Callers declare the executable, complete argv, cwd, and every environment
 * value the child may receive. The returned environment never inherits ambient
 * process state. Authority-bearing Bun controls are also evaluated by the
 * shared control-policy kernel before a process can start.
 */

import { resolvePath } from '../path-bun.ts';
import {
  bunAuthorityControlArgv,
  evaluateControlPolicy,
  type ControlCommand,
  type ControlGrant,
  type ControlProfile,
} from './control-policy.ts';

export interface BunChildAuthority {
  readonly executable: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, readonly string[]>>;
  readonly profile: ControlProfile;
  readonly command: ControlCommand;
  readonly controlGrants?: readonly ControlGrant[];
  readonly reason: string;
}

export interface GuardedBunChildInput {
  readonly authority: BunChildAuthority;
  readonly executable: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export interface PreparedBunChild {
  readonly cmd: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

export class BunChildAuthorityError extends Error {
  constructor(
    message: string,
    readonly code:
      'executable-denied' | 'argv-denied' | 'cwd-denied' | 'environment-denied' | 'control-denied'
  ) {
    super(message);
    this.name = 'BunChildAuthorityError';
  }
}

const AUTHORITY_ENVIRONMENT_RE =
  /^(?:BUN_OPTIONS|BUN_CONFIG_REGISTRY|BUN_INSTALL_REGISTRY|BUN_FEATURE_FLAG_.+|(?:HTTP|HTTPS|ALL|NO)_PROXY|(?:http|https|all|no)_proxy|NPM_CONFIG_(?:REGISTRY|PROXY|HTTPS_PROXY)|npm_config_(?:registry|proxy|https_proxy))$/;
const EVALUATED_AUTHORITY_ENVIRONMENT = new Set([
  'BUN_OPTIONS',
  'BUN_CONFIG_REGISTRY',
  'BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT',
  'BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT',
]);

function equalValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertCommandArgv(command: ControlCommand, argv: readonly string[]): void {
  if (command === 'runtime') return;
  if (argv[0] !== command) {
    throw new BunChildAuthorityError(
      `Declared ${command} authority requires argv to begin with ${command}`,
      'argv-denied'
    );
  }
}

/** Validate and sanitize a child launch without creating a process. */
export function prepareGuardedBunChild(input: GuardedBunChildInput): PreparedBunChild {
  const { authority } = input;
  if (!authority.reason.trim()) {
    throw new BunChildAuthorityError('Child authority requires a nonempty reason', 'argv-denied');
  }
  if (!authority.executable.startsWith('/') || input.executable !== authority.executable) {
    throw new BunChildAuthorityError(
      'Child executable is not exactly authorized',
      'executable-denied'
    );
  }
  if (!equalValues(input.argv, authority.argv)) {
    throw new BunChildAuthorityError('Child argv is not exactly authorized', 'argv-denied');
  }
  assertCommandArgv(authority.command, input.argv);

  const requestedCwd = resolvePath(input.cwd);
  const authorizedCwd = resolvePath(authority.cwd);
  if (requestedCwd !== authorizedCwd) {
    throw new BunChildAuthorityError('Child cwd is not exactly authorized', 'cwd-denied');
  }

  const sanitizedEnvironment: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.environment ?? {})) {
    if (value === undefined || (name === 'BUN_OPTIONS' && value.trim() === '')) continue;
    if (AUTHORITY_ENVIRONMENT_RE.test(name) && !EVALUATED_AUTHORITY_ENVIRONMENT.has(name)) {
      throw new BunChildAuthorityError(
        `Unsupported authority-bearing child environment value ${name}`,
        'environment-denied'
      );
    }
    const allowedValues = authority.environment[name];
    if (!allowedValues?.includes(value)) {
      const classification = AUTHORITY_ENVIRONMENT_RE.test(name) ? 'authority-bearing ' : '';
      throw new BunChildAuthorityError(
        `Undeclared ${classification}child environment value ${name}`,
        'environment-denied'
      );
    }
    sanitizedEnvironment[name] = value;
  }

  const evaluation = evaluateControlPolicy({
    profile: authority.profile,
    command: authority.command,
    argv: bunAuthorityControlArgv(input.argv, authority.command),
    environment: input.environment,
    grants: authority.controlGrants,
  });
  if (!evaluation.ok) {
    const summary = evaluation.rejected.map(item => `${item.spelling}: ${item.code}`).join(', ');
    throw new BunChildAuthorityError(`Bun child controls denied (${summary})`, 'control-denied');
  }

  return {
    cmd: [input.executable, ...input.argv],
    cwd: authorizedCwd,
    env: sanitizedEnvironment,
  };
}

export function spawnGuardedBunChild(
  input: GuardedBunChildInput,
  io: {
    readonly stdin?: 'ignore' | 'inherit' | 'pipe';
    readonly stdout?: 'ignore' | 'inherit' | 'pipe';
    readonly stderr?: 'ignore' | 'inherit' | 'pipe';
  } = {}
) {
  const prepared = prepareGuardedBunChild(input);
  return Bun.spawn([...prepared.cmd], {
    // guarded-spawn-reviewed — exact child authority primitive
    cwd: prepared.cwd,
    env: { ...prepared.env },
    stdin: io.stdin ?? 'ignore',
    stdout: io.stdout ?? 'pipe',
    stderr: io.stderr ?? 'pipe',
  });
}

export function spawnGuardedBunChildSync(
  input: GuardedBunChildInput,
  io: {
    readonly stdin?: 'ignore' | 'inherit' | 'pipe';
    readonly stdout?: 'ignore' | 'inherit' | 'pipe';
    readonly stderr?: 'ignore' | 'inherit' | 'pipe';
  } = {}
) {
  const prepared = prepareGuardedBunChild(input);
  return Bun.spawnSync([...prepared.cmd], {
    // guarded-spawn-reviewed — exact child authority primitive
    cwd: prepared.cwd,
    env: { ...prepared.env },
    stdin: io.stdin ?? 'ignore',
    stdout: io.stdout ?? 'pipe',
    stderr: io.stderr ?? 'pipe',
  });
}
