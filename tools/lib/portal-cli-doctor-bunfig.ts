// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @verified Bun.TOML · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/toml#bun-toml-parse
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env (HOME)
// @see https://bun.com/docs/pm/isolated-installs — linker / machine policy
/**
 * portal-cli doctor — bunfig group (machine SSOT · project drift · merge · excludes).
 *
 * Policy table SSOT: lib/install/machine-bunfig-policy.ts
 *   linker · globalStore · minimumReleaseAge · minimumReleaseAgeExcludes · [install.cache].dir
 *
 *   portal-cli doctor --group bunfig
 *
 * Fix: bun run audit:bunfig · bun run install:verify · docs/UNIFIED.md
 */
import {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_OWNED_CACHE_DIR_LABEL,
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
} from '../../lib/install/machine-bunfig-policy.ts';
import { joinPath } from '../../scripts/lib/fs-bun.ts';
import {
  isAbsoluteCachePath,
  readGlobalBunfigLayers,
  readProjectBunfig,
  resolveEffectiveInstallPolicy,
  type GlobalBunfigLayers,
  type MachineBunfigSnapshot,
} from '../../scripts/lib/machine-bunfig.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

// Re-export SSOT for existing importers (tests / CLI).
export {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_OWNED_CACHE_DIR_LABEL,
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
} from '../../lib/install/machine-bunfig-policy.ts';

const UNIFIED = 'docs/UNIFIED.md';
const BUNFIG_ISOLATED = 'https://bun.com/docs/pm/isolated-installs';

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

function installTomlFromSnapshot(
  snap: Awaited<ReturnType<typeof readProjectBunfig>>
): InstallToml | null {
  if (!snap.bunfigPath) return null;
  return (snap.install ?? {}) as InstallToml;
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

export type BunfigCheckLoad = {
  layers: GlobalBunfigLayers;
  project: MachineBunfigSnapshot;
};

/**
 * Run pure bunfig SSOT checks (no network, no spawn).
 * @param env process-like env for HOME / BUN_INSTALL_* (tests inject; default Bun.env)
 * @param loaded reuse layers/project already read by portal doctor
 */
export async function runBunfigChecks(
  cwd: string,
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>,
  loaded?: BunfigCheckLoad
): Promise<PortalDoctorCheck[]> {
  const layers = loaded?.layers ?? (await readGlobalBunfigLayers(env));
  const project = loaded?.project ?? (await readProjectBunfig(cwd));
  const machine = layers.machine;
  const globalLayer = layers.effective;
  const machineInstall = installTomlFromSnapshot(machine);
  const projectInstall = installTomlFromSnapshot(project);
  const effective = resolveEffectiveInstallPolicy(project, globalLayer);
  const checks: PortalDoctorCheck[] = [];

  // 1) Machine ~/.bunfig.toml SSOT keys
  const missing: string[] = [];
  if (machine.inode === 'dangling-symlink') {
    missing.push('dangling symlink (~/.bunfig.toml)');
  } else if (!machine.bunfigPath) {
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

  // 1a) $XDG_CONFIG_HOME/.bunfig.toml wins over $HOME/.bunfig.toml (Bun 1.3.14).
  const xdgShadow = layers.xdgPath;
  const xdgShadowExists = layers.xdgLoaded;
  checks.push(
    withMeta(
      {
        id: 'bunfig-xdg-shadow',
        level: 'fatal',
        group: 'bunfig',
        ok: !xdgShadowExists,
        message: xdgShadowExists
          ? `$XDG_CONFIG_HOME/.bunfig.toml shadows ~/.bunfig.toml (${xdgShadow})`
          : xdgShadow
            ? 'no $XDG_CONFIG_HOME/.bunfig.toml shadow'
            : 'XDG_CONFIG_HOME unset — ~/.bunfig.toml is the only global path',
        source: UNIFIED,
      },
      {
        fixCommand: xdgShadowExists ? `rm ${xdgShadow}` : undefined,
        impact: 'Bun loads the XDG global bunfig ahead of $HOME/.bunfig.toml',
        autoFixable: false,
        timeToFix: xdgShadowExists ? '1–2 min' : undefined,
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
    if (projectInstall.cache?.dir != null) leaked.push(MACHINE_OWNED_CACHE_DIR_LABEL);
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
          ? `effective linker=isolated · globalStore=true · cache=${effective.source.cacheDir} · global=${globalLayer.bunfigPath}`
          : `effective policy mismatch: ${mergeParts.join('; ')} (global=${globalLayer.bunfigPath ?? 'none'})`,
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
  const forbiddenEnv = FORBIDDEN_INSTALL_ENV_VARS.filter(k => {
    const v = env[k];
    return typeof v === 'string' && v.trim().length > 0;
  });
  const ephemeralCi = isEphemeralCiInstallEnv(env);
  const envOk = forbiddenEnv.length === 0 || ephemeralCi;
  const forbiddenLabel = FORBIDDEN_INSTALL_ENV_VARS.join(' / ');
  checks.push(
    withMeta(
      {
        id: 'bunfig-no-install-env-overrides',
        level: 'fatal',
        group: 'bunfig',
        ok: envOk,
        message:
          forbiddenEnv.length === 0
            ? `no ${forbiddenLabel} in env`
            : ephemeralCi
              ? `ephemeral CI install env allowed: ${forbiddenEnv.join(', ')} (local still machine bunfig SSOT)`
              : `forbidden install env set: ${forbiddenEnv.join(', ')} — use ~/.bunfig.toml`,
        source: UNIFIED,
      },
      {
        fixCommand:
          forbiddenEnv.length === 0 || ephemeralCi
            ? undefined
            : `Unset ${forbiddenLabel} from shell/IDE; use machine bunfig`,
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

/** Home path for docs/tests. */
export function machineBunfigPath(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | null {
  const home = env.HOME ?? env.USERPROFILE;
  if (!home) return null;
  return joinPath(home, '.bunfig.toml');
}
