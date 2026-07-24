// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/pm/cli/info — bun info
/**
 * Resolve `bun info <pkg> <property>` with JSON fallback when Bun reports
 * "Property … not found" (e.g. react.dependencies is null in the manifest).
 */

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
      registry = argv[++i];
      continue;
    }
    if (a.startsWith('--registry=')) {
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

export function bunInfoSpawnArgs(
  cli: Pick<BunInfoCliArgs, 'registry' | 'forwardFlags'>,
  ...rest: string[]
): string[] {
  const args = ['bun', 'info'];
  if (cli.registry) args.push(`--registry=${cli.registry}`);
  args.push(...(cli.forwardFlags ?? []), ...rest);
  return args;
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
  const proc = Bun.spawn(bunInfoSpawnArgs(cli, pkg, '--json'), {
    stdout: 'pipe',
    stderr: 'pipe',
  });
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
  | { ok: true; value: string; source: 'native' | 'json-fallback' }
  | { ok: false; error: string };

/** Like `bun info pkg property`, but null deps → `{}`. */
export async function bunInfoField(
  pkg: string,
  property: string,
  cli: Pick<BunInfoCliArgs, 'registry' | 'forwardFlags'> = {}
): Promise<BunInfoFieldResult> {
  const proc = Bun.spawn(bunInfoSpawnArgs(cli, pkg, property), {
    stdout: 'pipe',
    stderr: 'pipe',
  });
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
  const proc = Bun.spawn(bunInfoSpawnArgs(cli, cli.pkg), {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc.exited;
}
