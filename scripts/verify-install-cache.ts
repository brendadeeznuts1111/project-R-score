#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/pm/isolated-installs — linker = isolated
// @see https://bun.com/docs/pm/global-store — globalStore + absolute cache.dir
/**
 * Verify Bun install cache + global virtual store alignment.
 * Policy table SSOT: lib/install/machine-bunfig-policy.ts
 * https://bun.sh/docs/pm/global-cache
 * https://bun.sh/docs/pm/global-store
 * @see docs/UNIFIED.md
 */
import {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_EXPECTED_GLOBAL_STORE,
  MACHINE_EXPECTED_LINKER,
} from '../lib/install/machine-bunfig-policy.ts';
import {
  applyBunInstallEnv,
  findTildeCacheDirs,
  globalStoreLinksDir,
  resolveBunInstallCacheDir,
} from './lib/bun-install-env.ts';
import {
  formatPolicySource,
  isAbsoluteCachePath,
  readMachineBunfig,
  readProjectBunfig,
  resolveEffectiveInstallPolicy,
} from './lib/machine-bunfig.ts';

// Re-export SSOT so tests prove install:verify ≡ machine-bunfig-policy (same refs).
export {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_EXPECTED_GLOBAL_STORE,
  MACHINE_EXPECTED_LINKER,
} from '../lib/install/machine-bunfig-policy.ts';

const ROOT = `${import.meta.dir}/..`;
const strict = Bun.argv.includes('--strict');
const quiet = Bun.argv.includes('--quiet');
const dryRun = Bun.argv.includes('--dry-run');
const json = Bun.argv.includes('--json');

/** Human label for the forbidden install-env pair (SSOT order). */
const FORBIDDEN_INSTALL_ENV_LABEL = FORBIDDEN_INSTALL_ENV_VARS.join(' / ');

type Check = { ok: boolean; label: string; detail?: string };

function envInstallPolicyOk(env: ReturnType<typeof applyBunInstallEnv>): boolean {
  const cache = env.BUN_INSTALL_CACHE_DIR ?? '';
  const absolute = cache.length > 0 && !cache.startsWith('~/') && cache !== '~';
  return absolute && env.BUN_INSTALL_GLOBAL_STORE === '1';
}

async function checkBunfig(): Promise<Check> {
  const [project, machine] = await Promise.all([readProjectBunfig(ROOT), readMachineBunfig()]);
  const policy = resolveEffectiveInstallPolicy(project, machine);
  const env = applyBunInstallEnv();

  const linkerOk = policy.linker === MACHINE_EXPECTED_LINKER;
  const storeOk = policy.globalStore === MACHINE_EXPECTED_GLOBAL_STORE;
  const policyOk = linkerOk && storeOk;
  const envPolicyOk = envInstallPolicyOk(env);
  const envFallback = !machine.bunfigPath && envPolicyOk;
  const ok = policyOk || envFallback;

  const parts: string[] = [];
  parts.push(`linker=${policy.linker ?? 'unset'} (${formatPolicySource('linker', policy)})`);
  parts.push(
    `globalStore=${String(policy.globalStore)} (${formatPolicySource('globalStore', policy)})`
  );
  if (policy.cacheDir) {
    parts.push(
      `cache=${isAbsoluteCachePath(policy.cacheDir) ? policy.cacheDir : policy.cacheDir + ' (non-absolute)'}`
    );
  }
  if (envFallback) {
    const ephemeral = isEphemeralCiInstallEnv();
    parts.push(
      ephemeral
        ? `policy via ${FORBIDDEN_INSTALL_ENV_LABEL} (ephemeral CI)`
        : `policy via ${FORBIDDEN_INSTALL_ENV_LABEL} env`
    );
  }

  if (!machine.bunfigPath && !envPolicyOk) {
    return {
      ok: false,
      label: 'install policy',
      detail: 'missing ~/.bunfig.toml machine defaults',
    };
  }

  return {
    ok,
    label: 'install policy',
    detail: parts.join('; '),
  };
}

function checkEnvDefaults(): Check {
  const env = applyBunInstallEnv();
  const cache = env.BUN_INSTALL_CACHE_DIR ?? '';
  const store = env.BUN_INSTALL_GLOBAL_STORE;
  const absolute = cache.length > 0 && !cache.startsWith('~/') && cache !== '~';
  if (!absolute || store !== '1') {
    return {
      ok: false,
      label: 'install env',
      detail: `cache=${cache || '(unset)'}, globalStore=${store ?? '(unset)'} (${FORBIDDEN_INSTALL_ENV_LABEL})`,
    };
  }
  return {
    ok: true,
    label: 'install env',
    detail: `cache absolute, globalStore=1 (${FORBIDDEN_INSTALL_ENV_LABEL})`,
  };
}

/**
 * Shell must not set install cache/store env (machine bunfig owns them).
 * Ephemeral CI (GHA setup-factory-bun / with-bun-cache-env) may set them — allowed.
 * Same rule as doctor bunfig-no-install-env-overrides / audit:bunfig.
 */
function checkShellInstallEnv(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Check {
  const forbiddenEnv = FORBIDDEN_INSTALL_ENV_VARS.filter(k => {
    const v = env[k];
    return typeof v === 'string' && v.trim().length > 0;
  });
  const ephemeralCi = isEphemeralCiInstallEnv(env);
  if (forbiddenEnv.length === 0) {
    return { ok: true, label: 'install shell env', detail: `no ${FORBIDDEN_INSTALL_ENV_LABEL}` };
  }
  if (ephemeralCi) {
    return {
      ok: true,
      label: 'install shell env',
      detail: `ephemeral CI allow ${forbiddenEnv.join(', ')}`,
    };
  }
  return {
    ok: false,
    label: 'install shell env',
    detail: `forbidden set: ${forbiddenEnv.join(', ')} — use ~/.bunfig.toml`,
  };
}

function checkCacheDir(): Check {
  const cacheDir = resolveBunInstallCacheDir(applyBunInstallEnv());
  if (!cacheDir) {
    return {
      ok: false,
      label: 'cache dir',
      detail: `could not resolve ${FORBIDDEN_INSTALL_ENV_VARS[0]}`,
    };
  }
  if (cacheDir.includes('/~/') || cacheDir.endsWith('/~')) {
    return { ok: false, label: 'cache dir', detail: `literal tilde in path: ${cacheDir}` };
  }
  if (Bun.spawnSync(['test', '-d', cacheDir]).exitCode !== 0) {
    return {
      ok: !strict,
      label: 'cache dir',
      detail: `missing (run bun run install:all): ${cacheDir}`,
    };
  }
  const size = Bun.spawnSync(['du', '-sh', cacheDir], { stdout: 'pipe' });
  const du = size.stdout ? new TextDecoder().decode(size.stdout).trim().split('\t')[0] : '?';
  return { ok: true, label: 'cache dir', detail: `${cacheDir} (${du})` };
}

function checkGlobalStore(): Check {
  const cacheDir = resolveBunInstallCacheDir(applyBunInstallEnv());
  if (!cacheDir) {
    return { ok: false, label: 'global store', detail: 'no cache dir' };
  }
  const links = globalStoreLinksDir(cacheDir);
  if (Bun.spawnSync(['test', '-d', links]).exitCode !== 0) {
    return {
      ok: !strict,
      label: 'global store',
      detail: `links/ not yet populated — warm install will create ${links}`,
    };
  }
  const count = Bun.spawnSync(['find', links, '-mindepth', '1', '-maxdepth', '1', '-type', 'd'], {
    stdout: 'pipe',
  });
  const entries = count.stdout
    ? new TextDecoder().decode(count.stdout).trim().split('\n').filter(Boolean).length
    : 0;
  return { ok: true, label: 'global store', detail: `${links} (${entries} entries)` };
}

function checkTildeDrift(): Check {
  const dirs = findTildeCacheDirs(ROOT);
  if (dirs.length > 0) {
    const rel = dirs.map(d => d.replace(ROOT + '/', './')).join(', ');
    return { ok: false, label: 'tilde drift', detail: rel };
  }
  return { ok: true, label: 'tilde drift', detail: 'no literal ./~ cache dirs' };
}

async function checkTrustedDependencies(): Promise<Check> {
  const pkgPath = `${ROOT}/package.json`;
  if (!(await Bun.file(pkgPath).exists())) {
    return { ok: false, label: 'trustedDependencies', detail: 'root package.json missing' };
  }
  const pkg = (await Bun.file(pkgPath).json()) as Record<string, unknown>;
  const trusted = pkg.trustedDependencies;
  if (trusted === undefined) {
    // Absent is acceptable (Bun defaults apply), but an explicit empty list is preferred
    // because it documents the decision not to trust dependency lifecycle scripts.
    return {
      ok: true,
      label: 'trustedDependencies',
      detail: 'field absent — Bun defaults apply; consider setting [] to document intent',
    };
  }
  if (Array.isArray(trusted) && trusted.length === 0) {
    return {
      ok: true,
      label: 'trustedDependencies',
      detail: 'explicitly empty and documented',
    };
  }
  return {
    ok: false,
    label: 'trustedDependencies',
    detail:
      'must be an empty list or absent; partial list replaces Bun defaults silently — see docs/UNIFIED.md',
  };
}

async function checkLockfile(): Promise<Check> {
  const lockPath = `${ROOT}/bun.lock`;
  if (!(await Bun.file(lockPath).exists())) {
    return { ok: !strict, label: 'lockfile', detail: 'bun.lock missing' };
  }
  const text = await Bun.file(lockPath).text();
  if (text.includes('"configVersion": 1')) {
    return {
      ok: true,
      label: 'lockfile',
      detail: `configVersion 1 (${MACHINE_EXPECTED_LINKER})`,
    };
  }
  if (text.includes('"configVersion": 0')) {
    return {
      ok: false,
      label: 'lockfile',
      detail: `configVersion 0 — monorepo requires 1 (${MACHINE_EXPECTED_LINKER} default)`,
    };
  }
  // Missing configVersion is fatal for this workspace monorepo (default strategy SSOT)
  return {
    ok: false,
    label: 'lockfile',
    detail: 'configVersion missing — monorepo requires configVersion: 1',
  };
}

function checkNodeModulesLayout(): Check {
  const sample = `${ROOT}/node_modules/typescript/package.json`;
  if (Bun.spawnSync(['test', '-e', sample]).exitCode !== 0) {
    return { ok: true, label: 'node_modules layout', detail: 'typescript not installed — skipped' };
  }
  const real = Bun.spawnSync(['readlink', sample], { stdout: 'pipe' });
  if (real.exitCode === 0) {
    const target = new TextDecoder().decode(real.stdout).trim();
    return { ok: true, label: 'node_modules layout', detail: `typescript → symlink (${target})` };
  }
  const cacheDir = resolveBunInstallCacheDir(applyBunInstallEnv());
  if (cacheDir) {
    const path = Bun.spawnSync(['realpath', sample], { stdout: 'pipe' });
    const resolved = path.stdout ? new TextDecoder().decode(path.stdout).trim() : '';
    if (resolved.includes('/links/') || resolved.includes(cacheDir)) {
      return { ok: true, label: 'node_modules layout', detail: 'resolves into global store/cache' };
    }
  }
  return {
    ok: true,
    label: 'node_modules layout',
    detail: 'materialized copy (cold or hoisted path)',
  };
}

async function main() {
  if (!dryRun) {
    Bun.spawnSync(['bun', `${ROOT}/scripts/evict-root-tilde-cache.ts`], { cwd: ROOT });
  }

  const checks = [
    await checkBunfig(),
    checkEnvDefaults(),
    checkShellInstallEnv(),
    checkCacheDir(),
    checkGlobalStore(),
    checkTildeDrift(),
    await checkTrustedDependencies(),
    await checkLockfile(),
    checkNodeModulesLayout(),
  ];

  let failed = 0;
  for (const check of checks) {
    if (!check.ok) failed++;
  }

  if (json) {
    const result = {
      ok: failed === 0,
      failed,
      strict,
      dryRun,
      checks: checks.map(c => ({ ok: c.ok, label: c.label, detail: c.detail })),
    };
    console.info(JSON.stringify(result));
    if (failed > 0 && strict) {
      process.exit(1);
    }
    return;
  }

  for (const check of checks) {
    if (quiet && check.ok) continue;
    const icon = check.ok ? '✅' : strict ? '❌' : '⚠️';
    const suffix = check.detail ? ` — ${check.detail}` : '';
    console.info(`${icon} ${check.label}${suffix}`);
  }

  if (quiet && failed === 0) {
    console.info('✅ install:verify');
  }

  if (failed > 0 && strict) {
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
