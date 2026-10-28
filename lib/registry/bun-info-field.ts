// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/pm/cli/info — bun info
/**
 * Resolve `bun info <pkg> <property>` with JSON fallback when Bun reports
 * "Property … not found" (e.g. react.dependencies is null in the manifest).
 */

import { planBunInfo, spawnRegistryCommandPlan } from './command-policy.ts';

/** Manifest object fields that are `{}` when absent, not errors. */
export const NULLABLE_OBJECT_FIELDS = new Set([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]);

/** String fields that are `""` when absent (npm view readme). */
export const NULLABLE_STRING_FIELDS = new Set(['readme', 'readmeFilename']);

export type Packument = Record<string, unknown>;

export type BunInfoCliArgs = {
  pkg: string;
  property?: string;
  json: boolean;
  registry?: string;
  /** Extra flags forwarded to `bun info` (e.g. --no-cache). */
  forwardFlags: string[];
};

export function parseBunInfoCli(argv: string[]): BunInfoCliArgs {
  const forwardFlags: string[] = [];
  let json = false;
  let registry: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--json') {
      json = true;
      continue;
    }
    if (a === '--registry' && argv[i + 1]) {
      if (registry !== undefined) throw new TypeError('--registry must be defined exactly once');
      registry = argv[++i];
      continue;
    }
    if (a.startsWith('--registry=')) {
      if (registry !== undefined) throw new TypeError('--registry must be defined exactly once');
      registry = a.slice('--registry='.length);
      continue;
    }
    if (a.startsWith('-')) {
      forwardFlags.push(a);
      if (!a.includes('=') && argv[i + 1] && !argv[i + 1]!.startsWith('-')) {
        forwardFlags.push(argv[++i]!);
      }
      continue;
    }
    positional.push(a);
  }

  const pkg = positional[0];
  if (!pkg) {
    throw new Error('Usage: bun-info <package> [property] [--json] [--registry=<url>]');
  }

  return {
    pkg,
    property: positional[1],
    json,
    registry,
    forwardFlags,
  };
}

function bunInfoPlan(
  pkg: string,
  cli: Pick<BunInfoCliArgs, 'registry' | 'forwardFlags'>,
  options: { property?: string; json?: boolean } = {}
) {
  const registry = cli.registry ?? 'https://registry.npmjs.org';
  const forwardFlags = cli.forwardFlags ?? [];
  const unexpected = forwardFlags.filter(flag => flag !== '--no-cache');
  if (unexpected.length > 0 || forwardFlags.filter(flag => flag === '--no-cache').length > 1) {
    throw new TypeError(
      `bun info flags are not allowed: ${unexpected.join(', ') || 'duplicate --no-cache'}`
    );
  }
  return planBunInfo({
    executable: process.execPath,
    cwd: process.cwd(),
    profile: 'development',
    registry: cli.registry ? { cli: registry } : { default: registry },
    grants: [
      {
        operation: 'metadata-read',
        origins: [new URL(registry).origin],
        access: 'read',
        reason: 'interactive bun-info metadata read',
      },
    ],
    packageName: pkg,
    field: options.property,
    json: options.json,
    noCache: forwardFlags.includes('--no-cache'),
    environment: { PATH: Bun.env.PATH, CI: Bun.env.CI },
  });
}

function spawnBunInfoPlan(plan: ReturnType<typeof bunInfoPlan>, inherit = false) {
  return spawnRegistryCommandPlan(plan, {
    stdout: inherit ? 'inherit' : 'pipe',
    stderr: inherit ? 'inherit' : 'pipe',
    stdin: 'ignore',
  });
}

export function normalizeNullableManifestFields(meta: Packument): Packument {
  const out = { ...meta };
  for (const key of NULLABLE_OBJECT_FIELDS) {
    if (out[key] == null) out[key] = {};
  }
  for (const key of NULLABLE_STRING_FIELDS) {
    if (out[key] == null) out[key] = '';
  }
  return out;
}

export function resolvePackumentField(meta: Packument, property: string): unknown {
  const parts = property.split('.');
  let cur: unknown = meta;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function formatBunInfoFieldValue(
  property: string,
  // eslint-disable-next-line harness/no-unknown-function-param -- wire JSON leaf from packument
  value: unknown
): string {
  const root = property.split('.')[0] ?? property;
  if (value === null || value === undefined) {
    if (NULLABLE_OBJECT_FIELDS.has(root)) return '{}';
    if (NULLABLE_STRING_FIELDS.has(root)) return '';
    throw new Error(`Property ${property} not found`);
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export async function fetchPackumentJson(
  pkg: string,
  cli: Pick<BunInfoCliArgs, 'registry' | 'forwardFlags'> = {}
): Promise<Packument> {
  const proc = spawnBunInfoPlan(bunInfoPlan(pkg, cli, { json: true }));
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    proc.stdout.text(),
    proc.stderr.text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `bun info ${pkg} --json failed (${exitCode})`);
  }
  return normalizeNullableManifestFields(JSON.parse(stdout) as Packument);
}

export type BunInfoFieldResult =
  { ok: true; value: string; source: 'native' | 'json-fallback' } | { ok: false; error: string };

/** Like `bun info pkg property`, but null deps → `{}`. */
export async function bunInfoField(
  pkg: string,
  property: string,
  cli: Pick<BunInfoCliArgs, 'registry' | 'forwardFlags'> = {}
): Promise<BunInfoFieldResult> {
  const proc = spawnBunInfoPlan(bunInfoPlan(pkg, cli, { property }));
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    proc.stdout.text(),
    proc.stderr.text(),
  ]);

  if (exitCode === 0) {
    return { ok: true, value: stdout.trimEnd(), source: 'native' };
  }

  const err = stderr.trim();
  if (!/Property .+ not found/i.test(err)) {
    return { ok: false, error: err || `bun info ${pkg} ${property} failed (${exitCode})` };
  }

  try {
    const meta = await fetchPackumentJson(pkg, cli);
    const value = resolvePackumentField(meta, property);
    return {
      ok: true,
      value: formatBunInfoFieldValue(property, value),
      source: 'json-fallback',
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function runBunInfoPretty(
  cli: Pick<BunInfoCliArgs, 'pkg' | 'registry' | 'forwardFlags'>
): Promise<number> {
  const proc = spawnBunInfoPlan(bunInfoPlan(cli.pkg, cli), true);
  return proc.exited;
}
