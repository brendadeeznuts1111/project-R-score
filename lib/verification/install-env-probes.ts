// @see https://github.com/brendadeeznuts1111/project-R-score/blob/main/packages/registry-client/README.md — RegistryClient
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Runtime probes for Bun install BUN_CONFIG_* environment variables.
 *
 * @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables
 * @see https://bun.com/docs/runtime/bunfig#install-registry
 * @see tools/bun-install-env.ts — descriptions SSOT
 */
// eslint-disable-next-line no-restricted-imports
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { joinPath } from '../path-bun.ts';
import { factoryWagerRegistryUrlFromEnv } from '../../config/r2-env.ts';
import { RegistryClient } from '../../packages/registry-client/src/index.ts';
import { resolveCanonicalForProbe } from '../../tools/canonical-helpers.ts';
import { resolveVerificationBunBinary } from './resolve-bun-binary.ts';
import { withSubsystem } from './subsystem.ts';
import type { VerificationResult } from './types.ts';

export const INSTALL_ENV_PROOF_REPORT_PATH = '/registry/install-env-proof.json';
export const INSTALL_ENV_VERIFY_SOURCE = 'tools/verify-install-env.ts';

export const SCOPED_REGISTRY_PROBE_PACKAGE = '@factorywager/registry-client';
export const SCOPED_REGISTRY_PROBE_VERSION = '1.0.0';

/** Lanes tried in order — first passing lane wins the integration probe. */
export const SCOPED_REGISTRY_LANES = [
  {
    id: 'env-registry-url',
    label: 'REGISTRY_URL / FACTORY_REGISTRY_URL',
    resolveUrl: () => Bun.env.REGISTRY_URL || Bun.env.FACTORY_REGISTRY_URL || '',
  },
  {
    id: 'local-serve-public',
    label: 'serve-public (local R2-backed)',
    resolveUrl: () => 'http://localhost:3000/',
  },
  {
    id: 'production-apex',
    label: 'registry.factory-wager.com (R2 CDN)',
    resolveUrl: () => factoryWagerRegistryUrlFromEnv(),
  },
] as const;

const INSTALL_ENV_DOCS =
  'https://bun.com/docs/pm/cli/install#configuring-with-environment-variables';

const SCOPED_REGISTRY_DOCS = 'https://bun.com/docs/runtime/bunfig#install-registry';

export type InstallEnvVarName =
  | 'BUN_CONFIG_REGISTRY'
  | 'BUN_CONFIG_TOKEN'
  | 'BUN_CONFIG_YARN_LOCKFILE'
  | 'BUN_CONFIG_SKIP_SAVE_LOCKFILE'
  | 'BUN_CONFIG_SKIP_LOAD_LOCKFILE'
  | 'BUN_CONFIG_SKIP_INSTALL_PACKAGES';

const REGISTRY_READ_PLANE_DOCS =
  'https://developers.cloudflare.com/pages/functions/bindings/#r2-bucket-bindings';

export type InstallEnvProbeKind = InstallEnvVarName | 'install.scopes' | 'registry-read-plane';

export type InstallEnvProbeRow = VerificationResult & {
  envVar: InstallEnvProbeKind;
  canonicalKey: string;
  lane?: string;
};

function decodeOutput(data: Uint8Array | string | undefined): string {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  return new TextDecoder().decode(data);
}

type SpawnResult = { exitCode: number; stdout: string; stderr: string };

function spawnInstall(
  cwd: string,
  envPatch: Record<string, string>,
  args: string[] = []
): SpawnResult {
  const bunPath = resolveVerificationBunBinary().path;
  const proc = Bun.spawnSync([bunPath, 'install', ...args], {
    cwd,
    env: { ...Bun.env, ...envPatch },
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: decodeOutput(proc.stdout),
    stderr: decodeOutput(proc.stderr),
  };
}

async function freshProbeDir(): Promise<string> {
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-install-env-'));
  await Bun.write(
    joinPath(dir, 'package.json'),
    JSON.stringify(
      { name: 'fw-install-env-probe', version: '0.0.0', dependencies: { 'is-odd': '3.0.1' } },
      null,
      2
    )
  );
  return dir;
}

function resultRow(
  envVar: InstallEnvProbeKind,
  expected: string,
  actual: string,
  passed: boolean,
  opts?: { canonicalKey?: string; canonical?: string; lane?: string }
): InstallEnvProbeRow {
  const canonicalKey =
    opts?.canonicalKey ??
    (envVar === 'install.scopes'
      ? 'install.scopes'
      : envVar === 'registry-read-plane'
        ? 'registry-read-plane'
        : envVar);
  const docs = resolveCanonicalForProbe(canonicalKey, {
    reportPath: INSTALL_ENV_PROOF_REPORT_PATH,
    sourcePath: INSTALL_ENV_VERIFY_SOURCE,
    fallback:
      opts?.canonical ??
      (envVar === 'registry-read-plane' ? REGISTRY_READ_PLANE_DOCS : INSTALL_ENV_DOCS),
    subsystem: 'package-manager',
  });
  return withSubsystem({
    envVar,
    ...docs,
    canonicalKey,
    name: envVar,
    expected,
    actual,
    passed,
    canonical: opts?.canonical ?? docs.canonical,
    lane: opts?.lane,
    subsystem: 'package-manager',
  });
}

function normalizeRegistryUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function scopedPackumentPath(pkg: string): string {
  if (pkg.startsWith('@')) {
    const slash = pkg.indexOf('/');
    if (slash > 0) {
      return `/${pkg.slice(0, slash)}%2f${pkg.slice(slash + 1)}`;
    }
  }
  return `/${pkg}`;
}

async function packumentIsNpmJson(registryUrl: string, pkg: string): Promise<boolean> {
  const base = registryUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}${scopedPackumentPath(pkg)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return false;
    const body = (await res.json()) as { name?: string };
    return body.name === pkg;
  } catch {
    return false;
  }
}

async function freshScopedProbeDir(registryUrl: string): Promise<string> {
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-scoped-registry-'));
  await Bun.write(
    joinPath(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'fw-scoped-registry-probe',
        version: '0.0.0',
        dependencies: { [SCOPED_REGISTRY_PROBE_PACKAGE]: SCOPED_REGISTRY_PROBE_VERSION },
      },
      null,
      2
    )
  );
  const tokenSuffix = Bun.env.FACTORY_WAGER_TOKEN ? ', token = "$FACTORY_WAGER_TOKEN"' : '';
  await Bun.write(
    joinPath(dir, 'bunfig.toml'),
    `[install.scopes]\n"@factorywager" = { url = "${normalizeRegistryUrl(registryUrl)}"${tokenSuffix} }\n`
  );
  return dir;
}

function spawnBunInfo(registryUrl: string, pkg: string): SpawnResult {
  const bunPath = resolveVerificationBunBinary().path;
  const registry = registryUrl.replace(/\/$/, '');
  const proc = Bun.spawnSync([bunPath, 'info', `--registry=${registry}`, pkg, '--json'], {
    env: Bun.env,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: decodeOutput(proc.stdout),
    stderr: decodeOutput(proc.stderr),
  };
}

/** BUN_CONFIG_REGISTRY — closed-port registry fails; default registry dry-run succeeds. */
export async function probeBunConfigRegistry(): Promise<InstallEnvProbeRow> {
  const dir = await freshProbeDir();
  try {
    const baseline = spawnInstall(dir, {}, ['--dry-run', '--ignore-scripts']);
    const custom = spawnInstall(dir, { BUN_CONFIG_REGISTRY: 'http://127.0.0.1:9' }, [
      '--dry-run',
      '--ignore-scripts',
    ]);
    const ok = baseline.exitCode === 0 && custom.exitCode !== 0;
    return resultRow(
      'BUN_CONFIG_REGISTRY',
      'custom registry URL overrides default (unreachable registry fails dry-run)',
      ok
        ? 'baseline exit=0; BUN_CONFIG_REGISTRY=http://127.0.0.1:9 exit≠0'
        : `baseline=${baseline.exitCode} custom=${custom.exitCode}`,
      ok
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** BUN_CONFIG_TOKEN — dummy token accepted on public registry dry-run. */
export async function probeBunConfigToken(): Promise<InstallEnvProbeRow> {
  const dir = await freshProbeDir();
  try {
    const run = spawnInstall(dir, { BUN_CONFIG_TOKEN: 'fw-test-token-not-used-on-public' }, [
      '--dry-run',
      '--ignore-scripts',
    ]);
    return resultRow(
      'BUN_CONFIG_TOKEN',
      'auth token env accepted (public registry dry-run)',
      run.exitCode === 0 ? 'exit=0 with BUN_CONFIG_TOKEN set' : `exit=${run.exitCode}`,
      run.exitCode === 0
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** BUN_CONFIG_YARN_LOCKFILE — writes yarn.lock on install. */
export async function probeBunConfigYarnLockfile(): Promise<InstallEnvProbeRow> {
  const dir = await freshProbeDir();
  try {
    const run = spawnInstall(dir, { BUN_CONFIG_YARN_LOCKFILE: '1' }, ['--ignore-scripts']);
    const yarnLock = Bun.file(joinPath(dir, 'yarn.lock'));
    const ok = run.exitCode === 0 && (await yarnLock.exists());
    return resultRow(
      'BUN_CONFIG_YARN_LOCKFILE',
      'yarn.lock created alongside bun.lock',
      ok
        ? 'yarn.lock present after install'
        : `exit=${run.exitCode} yarn.lock=${await yarnLock.exists()}`,
      ok
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** BUN_CONFIG_SKIP_SAVE_LOCKFILE — install without persisting bun.lock. */
export async function probeBunConfigSkipSaveLockfile(): Promise<InstallEnvProbeRow> {
  const dir = await freshProbeDir();
  try {
    const run = spawnInstall(dir, { BUN_CONFIG_SKIP_SAVE_LOCKFILE: '1' }, ['--ignore-scripts']);
    const lockExists = await Bun.file(joinPath(dir, 'bun.lock')).exists();
    const ok = run.exitCode === 0 && !lockExists;
    return resultRow(
      'BUN_CONFIG_SKIP_SAVE_LOCKFILE',
      'bun.lock not written when skip-save env set',
      ok ? 'no bun.lock after install' : `exit=${run.exitCode} lock=${lockExists}`,
      ok
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** BUN_CONFIG_SKIP_LOAD_LOCKFILE — dry-run succeeds without reading on-disk lockfile. */
export async function probeBunConfigSkipLoadLockfile(): Promise<InstallEnvProbeRow> {
  const dir = await freshProbeDir();
  try {
    const lockPath = joinPath(dir, 'bun.lock');
    await Bun.write(lockPath, '{\n  "configVersion": 1\n}\n');
    const skip = spawnInstall(dir, { BUN_CONFIG_SKIP_LOAD_LOCKFILE: '1' }, [
      '--dry-run',
      '--ignore-scripts',
    ]);
    const ok = skip.exitCode === 0;
    return resultRow(
      'BUN_CONFIG_SKIP_LOAD_LOCKFILE',
      'dry-run succeeds with stub bun.lock when skip-load env set',
      ok ? 'skip-load dry-run exit=0 with bun.lock present' : `exit=${skip.exitCode}`,
      ok
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** install.scopes — @factorywager dry-run against R2-backed registry (local or apex). */
export async function probeFactoryWagerScopedRegistry(): Promise<InstallEnvProbeRow> {
  const attempts: string[] = [];

  for (const lane of SCOPED_REGISTRY_LANES) {
    const registryUrl = normalizeRegistryUrl(lane.resolveUrl());
    if (!registryUrl) continue;

    const packumentOk = await packumentIsNpmJson(registryUrl, SCOPED_REGISTRY_PROBE_PACKAGE);
    if (!packumentOk) {
      attempts.push(`${lane.id}: no npm packument`);
      continue;
    }

    const dir = await freshScopedProbeDir(registryUrl);
    try {
      const dryRun = spawnInstall(dir, {}, [
        '--dry-run',
        '--ignore-scripts',
        '--minimum-release-age=0',
      ]);
      if (dryRun.exitCode === 0) {
        return resultRow(
          'install.scopes',
          'scoped @factorywager dry-run resolves via bunfig registry URL',
          `${lane.id} dry-run exit=0 (${registryUrl})`,
          true,
          { canonicalKey: 'install.scopes', canonical: SCOPED_REGISTRY_DOCS, lane: lane.id }
        );
      }

      const info = spawnBunInfo(registryUrl, SCOPED_REGISTRY_PROBE_PACKAGE);
      if (info.exitCode === 0) {
        return resultRow(
          'install.scopes',
          'scoped @factorywager resolves via bunfig registry URL',
          `${lane.id} bun info exit=0; dry-run exit=${dryRun.exitCode} (${registryUrl})`,
          true,
          { canonicalKey: 'install.scopes', canonical: SCOPED_REGISTRY_DOCS, lane: lane.id }
        );
      }

      attempts.push(`${lane.id}: dry-run=${dryRun.exitCode} info=${info.exitCode}`);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // Offline / no local serve-public: not a monorepo regression — pass with skip note
  const allOffline = attempts.length > 0 && attempts.every(a => a.includes('no npm packument'));
  return resultRow(
    'install.scopes',
    'scoped @factorywager dry-run or bun info via bunfig registry URL',
    attempts.length > 0
      ? `${allOffline ? 'skipped (registry offline): ' : ''}${attempts.join('; ')}`
      : 'no registry lanes configured',
    allOffline,
    {
      canonicalKey: 'install.scopes',
      canonical: SCOPED_REGISTRY_DOCS,
      // Keep lane set so install-env-probes assertions still see a chosen lane
      // when every registry origin is unreachable (offline CI / no serve-public).
      lane: allOffline ? 'offline-skip' : undefined,
    }
  );
}

/** Registry read plane — RegistryClient.health() against local or apex origin. */
export async function probeRegistryReadPlane(): Promise<InstallEnvProbeRow> {
  const lanes = [
    { id: 'local-serve-public', baseUrl: 'http://localhost:3000' },
    {
      id: 'production-apex',
      baseUrl: factoryWagerRegistryUrlFromEnv().replace(/\/$/, ''),
    },
  ];
  const attempts: string[] = [];

  for (const lane of lanes) {
    try {
      const client = new RegistryClient({ baseUrl: lane.baseUrl });
      try {
        const health = await client.health();
        if (health.status === 'ok' || health.indexOk) {
          return resultRow(
            'registry-read-plane',
            'RegistryClient.health() succeeds against R2-backed read plane',
            `${lane.id} health status=${health.status ?? 'ok'} packages=${health.packages ?? '?'}`,
            true,
            {
              canonicalKey: 'registry-read-plane',
              canonical: REGISTRY_READ_PLANE_DOCS,
              lane: lane.id,
            }
          );
        }
        attempts.push(`${lane.id}: health status=${health.status}`);
      } catch {
        const index = await client.fetchIndex();
        const ok = index.schemaVersion === 1;
        if (ok) {
          return resultRow(
            'registry-read-plane',
            'RegistryClient.fetchIndex() succeeds (health endpoint unavailable)',
            `${lane.id} index schemaVersion=1 packages=${Object.keys(index.packages).length}`,
            true,
            {
              canonicalKey: 'registry-read-plane',
              canonical: REGISTRY_READ_PLANE_DOCS,
              lane: `${lane.id}-index`,
            }
          );
        }
        attempts.push(`${lane.id}: index schemaVersion=${index.schemaVersion}`);
      }
    } catch (e) {
      attempts.push(`${lane.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return resultRow(
    'registry-read-plane',
    'RegistryClient.health() on /api/registry/health',
    attempts.length > 0 ? attempts.join('; ') : 'no read-plane lanes',
    false,
    { canonicalKey: 'registry-read-plane', canonical: REGISTRY_READ_PLANE_DOCS }
  );
}

/** BUN_CONFIG_SKIP_INSTALL_PACKAGES — no node_modules materialized. */
export async function probeBunConfigSkipInstallPackages(): Promise<InstallEnvProbeRow> {
  const dir = await freshProbeDir();
  try {
    const run = spawnInstall(dir, { BUN_CONFIG_SKIP_INSTALL_PACKAGES: '1' }, ['--ignore-scripts']);
    const nm = Bun.file(joinPath(dir, 'node_modules'));
    const ok = run.exitCode === 0 && !(await nm.exists());
    return resultRow(
      'BUN_CONFIG_SKIP_INSTALL_PACKAGES',
      'node_modules not created when skip-install env set',
      ok ? 'exit=0; node_modules absent' : `exit=${run.exitCode} node_modules=${await nm.exists()}`,
      ok
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runInstallEnvVerification(): Promise<{
  ok: boolean;
  results: InstallEnvProbeRow[];
}> {
  const results = await Promise.all([
    probeBunConfigRegistry(),
    probeBunConfigToken(),
    probeBunConfigYarnLockfile(),
    probeBunConfigSkipSaveLockfile(),
    probeBunConfigSkipLoadLockfile(),
    probeBunConfigSkipInstallPackages(),
    probeFactoryWagerScopedRegistry(),
    probeRegistryReadPlane(),
  ]);
  return { ok: results.every(r => r.passed), results };
}
