#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Verify Bun install cache + global virtual store alignment.
 * https://bun.sh/docs/pm/global-cache
 * https://bun.sh/docs/pm/global-store
 */
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

const ROOT = `${import.meta.dir}/..`;
const strict = process.argv.includes('--strict');

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

  const linkerOk = policy.linker === 'isolated';
  const storeOk = policy.globalStore === true;
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
    parts.push('policy via BUN_INSTALL_CACHE_DIR + BUN_INSTALL_GLOBAL_STORE env');
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
      detail: `cache=${cache || '(unset)'}, globalStore=${store ?? '(unset)'}`,
    };
  }
  return { ok: true, label: 'install env', detail: 'cache absolute, globalStore=1' };
}

function checkCacheDir(): Check {
  const cacheDir = resolveBunInstallCacheDir(applyBunInstallEnv());
  if (!cacheDir) {
    return { ok: false, label: 'cache dir', detail: 'could not resolve BUN_INSTALL_CACHE_DIR' };
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

async function checkLockfile(): Promise<Check> {
  const lockPath = `${ROOT}/bun.lock`;
  if (!(await Bun.file(lockPath).exists())) {
    return { ok: !strict, label: 'lockfile', detail: 'bun.lock missing' };
  }
  const text = await Bun.file(lockPath).text();
  if (text.includes('"configVersion": 1')) {
    return { ok: true, label: 'lockfile', detail: 'configVersion 1 (isolated)' };
  }
  if (text.includes('"configVersion": 0')) {
    return { ok: false, label: 'lockfile', detail: 'configVersion 0 — run bun run install:all' };
  }
  return { ok: true, label: 'lockfile', detail: 'configVersion not found (non-fatal)' };
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
  Bun.spawnSync(['bun', `${ROOT}/scripts/evict-root-tilde-cache.ts`], { cwd: ROOT });

  const checks = [
    await checkBunfig(),
    checkEnvDefaults(),
    checkCacheDir(),
    checkGlobalStore(),
    checkTildeDrift(),
    await checkLockfile(),
    checkNodeModulesLayout(),
  ];

  let failed = 0;
  for (const check of checks) {
    const icon = check.ok ? '✅' : strict ? '❌' : '⚠️';
    const suffix = check.detail ? ` — ${check.detail}` : '';
    console.info(`${icon} ${check.label}${suffix}`);
    if (!check.ok) failed++;
  }

  if (failed > 0 && strict) {
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
