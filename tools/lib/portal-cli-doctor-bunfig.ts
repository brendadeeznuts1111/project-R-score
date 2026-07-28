// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env (HOME)
// @see https://bun.com/docs/pm/isolated-installs — linker / machine policy
/**
 * portal-cli doctor — bunfig group (machine SSOT · project drift · merge · excludes).
 *
 * Machine-owned install keys (must NOT appear in project bunfig.toml):
 *   linker · globalStore · minimumReleaseAge · minimumReleaseAgeExcludes · [install.cache].dir
 *
 *   portal-cli doctor --group bunfig
 *
 * Fix: bun run audit:bunfig · bun run install:verify · docs/UNIFIED.md
 */
import { TOML } from 'bun';
import { joinPath } from '../../scripts/lib/fs-bun.ts';
import {
  isAbsoluteCachePath,
  readMachineBunfig,
  readProjectBunfig,
  resolveEffectiveInstallPolicy,
} from '../../scripts/lib/machine-bunfig.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

const UNIFIED = 'docs/UNIFIED.md';
const BUNFIG_ISOLATED = 'https://bun.com/docs/pm/isolated-installs';

/** Install keys that must live only on the machine (~/.bunfig.toml). */
export const MACHINE_OWNED_INSTALL_KEYS = [
  'linker',
  'globalStore',
  'minimumReleaseAge',
  'minimumReleaseAgeExcludes',
] as const;

/** Catalog / types packages that must bypass minimumReleaseAge. */
export const REQUIRED_RELEASE_AGE_EXCLUDES = [
  'bun-types',
  '@types/bun',
  '@types/node',
  'typescript',
] as const;

type InstallToml = {
  linker?: unknown;
  globalStore?: unknown;
  frozenLockfile?: unknown;
  minimumReleaseAge?: unknown;
  minimumReleaseAgeExcludes?: unknown;
  cache?: { dir?: unknown };
};

function withMeta(
  base: PortalDoctorCheck,
  meta: Partial<Omit<PortalDoctorCheck, 'id' | 'level' | 'ok' | 'message' | 'group'>>
): PortalDoctorCheck {
  return { ...base, ...meta };
}

async function readInstallSection(path: string | null): Promise<InstallToml | null> {
  if (!path) return null;
  try {
    if (!(await Bun.file(path).exists())) return null;
    const parsed = TOML.parse(await Bun.file(path).text()) as { install?: InstallToml };
    return parsed.install ?? {};
  } catch {
    return null;
  }
}

/** Coerce TOML install array fields (typed as optional unknown on InstallToml). */
function asStringArray(v: InstallToml[keyof InstallToml]): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === 'string') out.push(x);
  }
  return out;
}

/**
 * Run pure bunfig SSOT checks (no network, no spawn).
 */
export async function runBunfigChecks(cwd: string): Promise<PortalDoctorCheck[]> {
  const machine = await readMachineBunfig();
  const project = await readProjectBunfig(cwd);
  const machineInstall = await readInstallSection(machine.bunfigPath);
  const projectInstall = await readInstallSection(project.bunfigPath);
  const effective = resolveEffectiveInstallPolicy(project, machine);
  const checks: PortalDoctorCheck[] = [];

  // 1) Machine ~/.bunfig.toml SSOT keys
  const missing: string[] = [];
  if (!machine.bunfigPath) {
    missing.push('file missing (~/.bunfig.toml)');
  } else {
    if (machineInstall?.linker !== 'isolated') missing.push('linker="isolated"');
    if (machineInstall?.globalStore !== true) missing.push('globalStore=true');
    if (typeof machineInstall?.minimumReleaseAge !== 'number') {
      missing.push('minimumReleaseAge (number)');
    }
    if (!asStringArray(machineInstall?.minimumReleaseAgeExcludes).length) {
      missing.push('minimumReleaseAgeExcludes[]');
    }
    const cacheDir =
      typeof machineInstall?.cache?.dir === 'string' ? String(machineInstall.cache.dir) : null;
    if (!cacheDir) missing.push('[install.cache].dir');
    else if (!isAbsoluteCachePath(machine.cacheDir ?? cacheDir) && !cacheDir.startsWith('~/')) {
      // tilde is expanded in readMachineBunfig; prefer absolute after expand
      if (!machine.cacheDir || !isAbsoluteCachePath(machine.cacheDir)) {
        missing.push('[install.cache].dir absolute or ~/…');
      }
    }
  }
  const machineOk = missing.length === 0;
  checks.push(
    withMeta(
      {
        id: 'bunfig-machine-ssot',
        level: 'fatal',
        group: 'bunfig',
        ok: machineOk,
        message: machineOk
          ? `machine ${machine.bunfigPath} has linker/globalStore/age/excludes/cache.dir`
          : `machine bunfig missing: ${missing.join(', ')}`,
        source: BUNFIG_ISOLATED,
      },
      {
        fixCommand: machineOk
          ? undefined
          : 'bun run audit:bunfig  # set SSOT keys in ~/.bunfig.toml (see docs/UNIFIED.md)',
        impact:
          'Machine install policy (isolated linker, global store, release age) is the monorepo SSOT',
        autoFixable: false,
        timeToFix: machineOk ? undefined : '5–15 min',
        envScope: 'all',
      }
    )
  );

  // 1b) Machine frozenLockfile recommended (warn — project may own hardened true)
  const frozenPresent =
    machineInstall?.frozenLockfile === true || machineInstall?.frozenLockfile === false;
  checks.push(
    withMeta(
      {
        id: 'bunfig-machine-frozen-lockfile',
        level: 'warn',
        group: 'bunfig',
        ok: frozenPresent,
        message: frozenPresent
          ? `machine frozenLockfile=${String(machineInstall?.frozenLockfile)}`
          : 'machine ~/.bunfig.toml missing frozenLockfile (recommend true for CI parity)',
        source: UNIFIED,
      },
      {
        fixCommand: frozenPresent
          ? undefined
          : 'Add frozenLockfile = true to [install] in ~/.bunfig.toml (docs/UNIFIED.md)',
        impact: 'Machine frozenLockfile documents install freeze posture; project may harden true',
        autoFixable: false,
        timeToFix: frozenPresent ? undefined : '1–3 min',
        envScope: 'all',
      }
    )
  );

  // 2) Project must not own machine keys
  const leaked: string[] = [];
  if (projectInstall) {
    for (const k of MACHINE_OWNED_INSTALL_KEYS) {
      if (projectInstall[k] != null) leaked.push(k);
    }
    if (projectInstall.cache?.dir != null) leaked.push('[install.cache].dir');
  }
  const projectOk = leaked.length === 0;
  checks.push(
    withMeta(
      {
        id: 'bunfig-project-no-machine-keys',
        level: 'fatal',
        group: 'bunfig',
        ok: projectOk,
        message: projectOk
          ? 'project bunfig.toml does not set machine-owned install keys'
          : `project bunfig.toml sets machine keys: ${leaked.join(', ')} — remove them`,
        source: UNIFIED,
      },
      {
        fixCommand: projectOk
          ? undefined
          : 'Edit ./bunfig.toml — remove linker/globalStore/minimumReleaseAge/cache.dir (machine SSOT)',
        impact: 'Project-level machine keys fight ~/.bunfig.toml and break install:verify / doctor',
        autoFixable: false,
        timeToFix: projectOk ? undefined : '2–10 min',
        envScope: 'all',
      }
    )
  );

  // 3) Effective merge matches expected overlay
  const mergeOk =
    effective.linker === 'isolated' &&
    effective.globalStore === true &&
    effective.cacheDir != null &&
    isAbsoluteCachePath(effective.cacheDir) &&
    effective.source.linker !== 'unset' &&
    effective.source.globalStore !== 'unset';
  const mergeParts: string[] = [];
  if (effective.linker !== 'isolated') {
    mergeParts.push(`linker=${effective.linker ?? 'unset'} (want isolated)`);
  }
  if (effective.globalStore !== true) {
    mergeParts.push(`globalStore=${String(effective.globalStore)} (want true)`);
  }
  if (!effective.cacheDir || !isAbsoluteCachePath(effective.cacheDir)) {
    mergeParts.push('cache.dir missing/not absolute');
  }
  checks.push(
    withMeta(
      {
        id: 'bunfig-merge-consistency',
        level: 'fatal',
        group: 'bunfig',
        ok: mergeOk,
        message: mergeOk
          ? `effective linker=isolated · globalStore=true · cache=${effective.source.cacheDir}`
          : `effective policy mismatch: ${mergeParts.join('; ')}`,
        source: BUNFIG_ISOLATED,
      },
      {
        fixCommand: mergeOk
          ? undefined
          : 'bun run install:verify  # then fix machine/project bunfig overlay (docs/UNIFIED.md)',
        impact:
          'Effective install policy is the merge of machine → project; wrong merge → phantom deps',
        autoFixable: false,
        timeToFix: mergeOk ? undefined : '5–15 min',
        envScope: 'all',
      }
    )
  );

  // 4) minimumReleaseAgeExcludes must include catalog type packages
  const excludes = asStringArray(machineInstall?.minimumReleaseAgeExcludes);
  const missingEx = REQUIRED_RELEASE_AGE_EXCLUDES.filter(p => !excludes.includes(p));
  const excludesOk = missingEx.length === 0;
  checks.push(
    withMeta(
      {
        id: 'bunfig-release-age-excludes',
        level: 'warn',
        group: 'bunfig',
        ok: excludesOk,
        message: excludesOk
          ? `minimumReleaseAgeExcludes covers ${REQUIRED_RELEASE_AGE_EXCLUDES.join(', ')}`
          : `missing excludes: ${missingEx.join(', ')}`,
        source: UNIFIED,
      },
      {
        fixCommand: excludesOk
          ? undefined
          : 'Add missing packages to minimumReleaseAgeExcludes in ~/.bunfig.toml',
        impact:
          'Without excludes, catalog type packages can be blocked by minimumReleaseAge on install',
        autoFixable: false,
        timeToFix: excludesOk ? undefined : '2–5 min',
        envScope: 'all',
      }
    )
  );

  // 5) Shell must not set install cache/store env (machine bunfig owns them).
  // Ephemeral CI (GHA setup-factory-bun / with-bun-cache-env) may set them — allowed.
  const forbiddenEnv = (['BUN_INSTALL_CACHE_DIR', 'BUN_INSTALL_GLOBAL_STORE'] as const).filter(
    k => {
      const v = Bun.env[k];
      return typeof v === 'string' && v.trim().length > 0;
    }
  );
  const ephemeralCi = isEphemeralCiInstallEnv();
  const envOk = forbiddenEnv.length === 0 || ephemeralCi;
  checks.push(
    withMeta(
      {
        id: 'bunfig-no-install-env-overrides',
        level: 'fatal',
        group: 'bunfig',
        ok: envOk,
        message:
          forbiddenEnv.length === 0
            ? 'no BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE in env'
            : ephemeralCi
              ? `ephemeral CI install env allowed: ${forbiddenEnv.join(', ')} (local still machine bunfig SSOT)`
              : `forbidden install env set: ${forbiddenEnv.join(', ')} — use ~/.bunfig.toml`,
        source: UNIFIED,
      },
      {
        fixCommand:
          forbiddenEnv.length === 0 || ephemeralCi
            ? undefined
            : 'Unset BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE from shell/IDE; use machine bunfig',
        impact:
          'Local shell BUN_INSTALL_* cache/store env bypasses bunfig-policy; GHA/setup-factory-bun is the documented exception',
        autoFixable: false,
        timeToFix: envOk ? undefined : '2–10 min',
        envScope: 'all',
      }
    )
  );

  return checks;
}

/**
 * Ephemeral CI may set BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE
 * (setup-factory-bun, with-bun-cache-env). Local developer shells must not.
 * @see docs/UNIFIED.md
 */
export function isEphemeralCiInstallEnv(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): boolean {
  return (
    env.GITHUB_ACTIONS === 'true' ||
    env.FACTORY_BUN_CI === '1' ||
    env.CI_ALLOW_BUN_INSTALL_ENV === '1'
  );
}

/** Home path for docs/tests. */
export function machineBunfigPath(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | null {
  const home = env.HOME ?? env.USERPROFILE;
  if (!home) return null;
  return joinPath(home, '.bunfig.toml');
}
