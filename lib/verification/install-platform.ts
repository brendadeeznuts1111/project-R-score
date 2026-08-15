// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Project-scoped bun install platform verification — FactoryWager monorepo aspects.
 *
 * @see https://bun.com/docs/pm/cli/install#platform-specific-dependencies
 * @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags
 * @see https://bun.com/docs/pm/isolated-installs — configVersion = 1 workspace default
 * @see https://bun.com/docs/pm/global-store — global virtual store (isolated linker)
 * @see docs/UNIFIED.md — install policy / shared lockfile
 */
import { CryptoHasher } from 'bun';
import {
  INSTALL_LINKER_DOCS,
  probeLockfileConfigVersion,
} from '../docs/bun-install-linker-docs.ts';
import {
  BUN_INSTALL_PLATFORM_SUPPORTED,
  INSTALL_PLATFORM_DOCS,
  probeBunInstallPlatformFlags,
} from '../docs/bun-install-platform-docs.ts';
import { joinPath } from '../path-bun.ts';
import {
  formatPolicySource,
  readEffectiveGlobalBunfig,
  readMachineBunfig,
  readProjectBunfig,
  resolveEffectiveInstallPolicy,
} from '../../scripts/lib/machine-bunfig.ts';
import { resolveInstallAspectCanonical } from './canonical-coverage.ts';
import { formatSpawnedBunNote, resolveVerificationBunBinary } from './resolve-bun-binary.ts';
import {
  probeBunConfigEnvSsot,
  probeForbiddenInstallEnv,
  probeInstallMechanismNotesSsot,
} from './install-env-config.ts';
import type { VerificationLinks, VerificationResult, VerificationSubsystem } from './types.ts';

const REPO_ROOT = joinPath(import.meta.dir, '../..');
const INSTALL_PROFILES_PATH = joinPath(
  REPO_ROOT,
  '.agents/skills/ast-grep/bun-install-profiles.json'
);

/** Cross-platform CI/deploy profiles from bun-install-profiles.json. */
export const PROJECT_CROSS_INSTALL_PROFILES = [
  'cross-linux-x64',
  'cross-linux-arm64',
  'cross-darwin-arm64',
] as const;

/** Toolchain — which binary runs install spawns. */
export const PROJECT_INSTALL_TOOLCHAIN_ASPECTS = [
  {
    id: 'bun-binary-resolved',
    scope: 'Verification toolchain (runtime execPath / Bun.which)',
    description: 'spawned bun matches runtime interpreter version',
    canonical: 'https://bun.com/docs/runtime/utils#bun-which',
  },
] as const;

/** Scoped aspects — huge Bun behavior narrowed to FactoryWager surfaces. */
export const PROJECT_INSTALL_PLATFORM_ASPECTS = [
  {
    id: 'runtime-flags',
    scope: 'Bun CLI (isolated probe dir)',
    description: '--cpu/--os accepted; invalid cpu rejected',
    canonical: INSTALL_PLATFORM_DOCS.cpuAndOsFlags,
  },
  {
    id: 'profile-ssot',
    scope: '.agents/skills/ast-grep/bun-install-profiles.json',
    description: 'cross-* profiles use supported cpu/os only',
    canonical: INSTALL_PLATFORM_DOCS.cpuAndOsFlags,
    profiles: PROJECT_CROSS_INSTALL_PROFILES,
  },
  {
    id: 'monorepo-cross-dry-run',
    scope: 'FactoryWager monorepo root (package.json + bun.lock)',
    description: 'cross-platform dry-run resolves workspace deps',
    canonical: INSTALL_PLATFORM_DOCS.platformSpecificDependencies,
    profiles: PROJECT_CROSS_INSTALL_PROFILES,
  },
  {
    id: 'lockfile-stable',
    scope: 'bun.lock shared lockfile (docs/UNIFIED.md)',
    description: 'cross dry-run does not mutate bun.lock',
    canonical: INSTALL_PLATFORM_DOCS.platformSpecificDependencies,
  },
] as const;

/** Linker / global store — scoped to FactoryWager lockfile + machine policy. */
export const PROJECT_INSTALL_LINKER_ASPECTS = [
  {
    id: 'lockfile-config-version',
    scope: 'bun.lock configVersion + workspaces',
    description: 'configVersion 1 workspace monorepo → isolated linker default',
    canonical: INSTALL_LINKER_DOCS.isolatedInstalls,
  },
  {
    id: 'machine-isolated-linker',
    scope: '~/.bunfig.toml (docs/UNIFIED.md machine SSOT)',
    description: 'effective linker = isolated',
    canonical: INSTALL_LINKER_DOCS.isolatedInstalls,
  },
  {
    id: 'machine-global-store',
    scope: '~/.bunfig.toml globalStore + isolated linker',
    description: 'global virtual store enabled (install once, link everywhere)',
    canonical: INSTALL_LINKER_DOCS.globalStore,
  },
] as const;

/** Config / env — BUN_CONFIG_* SSOT and UNIFIED shell policy. */
export const PROJECT_INSTALL_CONFIG_ASPECTS = [
  {
    id: 'bun-config-env-ssot',
    scope: 'tools/bun-install-env.ts BUN_CONFIG_INSTALL_VARS',
    description: 'six official BUN_CONFIG_* install vars match bun install docs',
    canonical: 'https://bun.com/docs/pm/cli/install#configuring-with-environment-variables',
  },
  {
    id: 'forbidden-install-env',
    scope: 'shell env (docs/UNIFIED.md machine layer)',
    description: 'BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE not set in env',
    canonical: 'https://bun.com/docs/pm/cli/install#configuring-with-environment-variables',
  },
  {
    id: 'install-mechanism-notes-ssot',
    scope: 'tools/bun-install-env.ts INSTALL_MECHANISM_NOTES',
    description: 'cache, backends, node_modules check, eager/lazy resolve documented',
    canonical: 'https://bun.com/docs/pm/cli/install#cache',
  },
] as const;

export const PROJECT_INSTALL_VERIFY_ASPECTS = [
  ...PROJECT_INSTALL_TOOLCHAIN_ASPECTS,
  ...PROJECT_INSTALL_CONFIG_ASPECTS,
  ...PROJECT_INSTALL_PLATFORM_ASPECTS,
  ...PROJECT_INSTALL_LINKER_ASPECTS,
] as const;

export type InstallPlatformAspectId = (typeof PROJECT_INSTALL_VERIFY_ASPECTS)[number]['id'];

export type InstallPlatformAspectRow = {
  aspect: InstallPlatformAspectId;
  scope: string;
  name: string;
  ok: boolean;
  skipped?: boolean;
  note: string;
  /** CANONICAL_REFS key (e.g. `bun install --cpu`). */
  canonicalKey: string;
  canonical: string;
  canonicalKind?: string;
  canonicalStability?: string;
  subsystem?: VerificationSubsystem;
  introducedIn?: string;
  _links: VerificationLinks;
  supported: typeof BUN_INSTALL_PLATFORM_SUPPORTED;
};

type InstallProfilesDoc = {
  profiles?: Record<string, { description?: string; args?: string[] }>;
};

function decodeSpawnOutput(data: Uint8Array | string | undefined): string {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  return new TextDecoder().decode(data);
}

function parsePlatformArgs(args: readonly string[]): { cpu?: string; os?: string } {
  let cpu: string | undefined;
  let os: string | undefined;
  for (const arg of args) {
    if (arg.startsWith('--cpu=')) cpu = arg.slice('--cpu='.length);
    if (arg.startsWith('--os=')) os = arg.slice('--os='.length);
  }
  return { cpu, os };
}

function isSupportedCpu(cpu: string): boolean {
  return (BUN_INSTALL_PLATFORM_SUPPORTED.cpu as readonly string[]).includes(cpu);
}

function isSupportedOs(osName: string): boolean {
  return (BUN_INSTALL_PLATFORM_SUPPORTED.os as readonly string[]).includes(osName);
}

async function loadInstallProfiles(): Promise<InstallProfilesDoc> {
  const raw = await Bun.file(INSTALL_PROFILES_PATH).text();
  return JSON.parse(raw) as InstallProfilesDoc;
}

async function hashLockfile(rootDir: string): Promise<string | null> {
  const lockPath = joinPath(rootDir, 'bun.lock');
  const file = Bun.file(lockPath);
  if (!(await file.exists())) return null;
  const hasher = new CryptoHasher('sha256');
  hasher.update(await file.arrayBuffer());
  return hasher.digest('hex').slice(0, 16);
}

function spawnInstallDryRun(
  rootDir: string,
  extraArgs: readonly string[]
): { ok: boolean; note: string; exitCode: number | null } {
  const bunPath = resolveVerificationBunBinary().path;
  const proc = Bun.spawnSync([bunPath, 'install', ...extraArgs, '--dry-run', '--ignore-scripts'], {
    cwd: rootDir,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  const stderr = decodeSpawnOutput(proc.stderr).trim();
  const stdout = decodeSpawnOutput(proc.stdout).trim();
  const tail = (stderr || stdout).split('\n').slice(-2).join(' ').slice(0, 160);
  const ok = proc.exitCode === 0;
  return {
    ok,
    exitCode: proc.exitCode,
    note: ok ? `exit=0 ${tail}` : `exit=${proc.exitCode} ${tail}`,
  };
}

function aspectName(aspect: InstallPlatformAspectId): string {
  return `install platform: ${aspect}`;
}

export type InstallPlatformVerifyOptions = {
  /** Skip bun install spawns; validate profile SSOT only. */
  dryRun?: boolean;
  rootDir?: string;
};

export type InstallPlatformVerificationReport = {
  ok: boolean;
  dryRun: boolean;
  rows: InstallPlatformAspectRow[];
  toolchain: ReturnType<typeof resolveVerificationBunBinary>;
};

function probeBunBinaryResolved(): { ok: boolean; note: string } {
  try {
    const resolved = resolveVerificationBunBinary({ fresh: true });
    return {
      ok: resolved.matchesRuntime,
      note: formatSpawnedBunNote(resolved),
    };
  } catch (e: unknown) {
    return {
      ok: false,
      note: e instanceof Error ? e.message : String(e),
    };
  }
}

function aspectMeta(aspect: InstallPlatformAspectId) {
  return PROJECT_INSTALL_VERIFY_ASPECTS.find(a => a.id === aspect)!;
}

function aspectRow(
  aspect: InstallPlatformAspectId,
  row: Omit<
    InstallPlatformAspectRow,
    | 'aspect'
    | 'name'
    | 'canonicalKey'
    | 'canonical'
    | '_links'
    | 'supported'
    | 'canonicalKind'
    | 'canonicalStability'
    | 'subsystem'
    | 'introducedIn'
  >
): InstallPlatformAspectRow {
  const resolved = resolveInstallAspectCanonical(aspect);
  return {
    aspect,
    name: aspectName(aspect),
    ...resolved,
    supported: BUN_INSTALL_PLATFORM_SUPPORTED,
    ...row,
  };
}

function skippedRow(aspect: InstallPlatformAspectId, note: string): InstallPlatformAspectRow {
  const meta = aspectMeta(aspect);
  return aspectRow(aspect, {
    scope: meta.scope,
    ok: true,
    skipped: true,
    note,
  });
}

async function probeMachineInstallPolicy(
  rootDir: string
): Promise<{ linkerOk: boolean; storeOk: boolean; note: string }> {
  const [project, machine, globalLayer] = await Promise.all([
    readProjectBunfig(rootDir),
    readMachineBunfig(),
    readEffectiveGlobalBunfig(),
  ]);
  const policy = resolveEffectiveInstallPolicy(project, globalLayer);
  const linkerOk = policy.linker === 'isolated';
  const storeOk = policy.globalStore === true;
  const parts = [
    `linker=${policy.linker ?? 'unset'} (${formatPolicySource('linker', policy)})`,
    `globalStore=${String(policy.globalStore)} (${formatPolicySource('globalStore', policy)})`,
  ];
  if (machine.inode === 'dangling-symlink') {
    parts.push('dangling symlink ~/.bunfig.toml');
  } else if (!machine.bunfigPath) {
    parts.push('missing ~/.bunfig.toml');
  }
  return { linkerOk, storeOk, note: parts.join('; ') };
}

/**
 * Run project-scoped install verification (platform + linker aspects).
 */
export async function runProjectInstallPlatformVerification(
  options: InstallPlatformVerifyOptions = {}
): Promise<InstallPlatformVerificationReport> {
  const rootDir = options.rootDir ?? REPO_ROOT;
  const dryRun = options.dryRun === true;
  const toolchain = resolveVerificationBunBinary({ fresh: true });
  const rows: InstallPlatformAspectRow[] = [];

  const binaryProbe = probeBunBinaryResolved();
  rows.push(
    aspectRow('bun-binary-resolved', {
      scope: PROJECT_INSTALL_TOOLCHAIN_ASPECTS[0]!.scope,
      ok: binaryProbe.ok,
      note: binaryProbe.note,
    })
  );

  const envSsot = probeBunConfigEnvSsot();
  rows.push(
    aspectRow('bun-config-env-ssot', {
      scope: PROJECT_INSTALL_CONFIG_ASPECTS[0]!.scope,
      ok: envSsot.ok,
      note: envSsot.note,
    })
  );
  const forbiddenEnv = probeForbiddenInstallEnv();
  rows.push(
    aspectRow('forbidden-install-env', {
      scope: PROJECT_INSTALL_CONFIG_ASPECTS[1]!.scope,
      ok: forbiddenEnv.ok,
      note: forbiddenEnv.note,
    })
  );
  const mechanismNotes = probeInstallMechanismNotesSsot();
  rows.push(
    aspectRow('install-mechanism-notes-ssot', {
      scope: PROJECT_INSTALL_CONFIG_ASPECTS[2]!.scope,
      ok: mechanismNotes.ok,
      note: mechanismNotes.note,
    })
  );

  if (dryRun) {
    rows.push(
      skippedRow(
        'runtime-flags',
        'skipped (--dry-run) — would run bun install --cpu=x64 --os=linux --dry-run in isolated dir'
      )
    );
  } else {
    const runtime = await probeBunInstallPlatformFlags();
    rows.push(
      aspectRow('runtime-flags', {
        scope: PROJECT_INSTALL_PLATFORM_ASPECTS[0]!.scope,
        ok: runtime.ok,
        note: runtime.note,
      })
    );
  }

  const profilesDoc = await loadInstallProfiles();
  const profileChecks: string[] = [];
  let profileOk = true;
  for (const profileName of PROJECT_CROSS_INSTALL_PROFILES) {
    const profile = profilesDoc.profiles?.[profileName];
    if (!profile?.args) {
      profileOk = false;
      profileChecks.push(`${profileName}=missing`);
      continue;
    }
    const { cpu, os: osName } = parsePlatformArgs(profile.args);
    if (!cpu || !osName || !isSupportedCpu(cpu) || !isSupportedOs(osName)) {
      profileOk = false;
      profileChecks.push(`${profileName}=${cpu ?? '?'}/${osName ?? '?'} invalid`);
      continue;
    }
    profileChecks.push(`${profileName}=${cpu}/${osName}`);
  }
  rows.push(
    aspectRow('profile-ssot', {
      scope: PROJECT_INSTALL_PLATFORM_ASPECTS[1]!.scope,
      ok: profileOk,
      note: profileChecks.join('; '),
    })
  );

  const lockfileConfig = await probeLockfileConfigVersion(rootDir);
  rows.push(
    aspectRow('lockfile-config-version', {
      scope: PROJECT_INSTALL_LINKER_ASPECTS[0]!.scope,
      ok: lockfileConfig.ok,
      note: lockfileConfig.note,
    })
  );

  const machinePolicy = await probeMachineInstallPolicy(rootDir);
  rows.push(
    aspectRow('machine-isolated-linker', {
      scope: PROJECT_INSTALL_LINKER_ASPECTS[1]!.scope,
      ok: machinePolicy.linkerOk,
      note: machinePolicy.note,
    })
  );
  rows.push(
    aspectRow('machine-global-store', {
      scope: PROJECT_INSTALL_LINKER_ASPECTS[2]!.scope,
      ok: machinePolicy.storeOk,
      note: machinePolicy.note,
    })
  );

  if (dryRun) {
    const planned = PROJECT_CROSS_INSTALL_PROFILES.map(name => {
      const args = profilesDoc.profiles?.[name]?.args ?? [];
      const { cpu, os: osName } = parsePlatformArgs(args);
      return `${name}=bun install ${args.join(' ')} --dry-run (${cpu ?? '?'}/${osName ?? '?'})`;
    });
    rows.push(
      skippedRow('monorepo-cross-dry-run', `skipped (--dry-run) — would run: ${planned.join('; ')}`)
    );
    rows.push(
      skippedRow(
        'lockfile-stable',
        'skipped (--dry-run) — would hash bun.lock before/after cross dry-runs'
      )
    );
    return { ok: rows.every(r => r.ok), dryRun, rows, toolchain };
  }

  const lockBefore = await hashLockfile(rootDir);
  const crossNotes: string[] = [];
  let crossOk = true;
  for (const profileName of PROJECT_CROSS_INSTALL_PROFILES) {
    const profile = profilesDoc.profiles?.[profileName];
    if (!profile?.args) continue;
    const run = spawnInstallDryRun(rootDir, profile.args);
    crossNotes.push(`${profileName}:${run.ok ? 'ok' : run.note}`);
    if (!run.ok) crossOk = false;
  }
  rows.push(
    aspectRow('monorepo-cross-dry-run', {
      scope: PROJECT_INSTALL_PLATFORM_ASPECTS[2]!.scope,
      ok: crossOk,
      note: crossNotes.join('; '),
    })
  );

  const lockAfter = await hashLockfile(rootDir);
  const lockStable = lockBefore != null && lockAfter != null && lockBefore === lockAfter && crossOk;
  rows.push(
    aspectRow('lockfile-stable', {
      scope: PROJECT_INSTALL_PLATFORM_ASPECTS[3]!.scope,
      ok: lockStable,
      note:
        lockBefore == null
          ? 'bun.lock missing'
          : lockStable
            ? `hash unchanged (${lockBefore}) after cross dry-runs`
            : `hash changed ${lockBefore} → ${lockAfter ?? 'missing'}`,
    })
  );

  return { ok: rows.every(r => r.ok), dryRun: false, rows, toolchain };
}
