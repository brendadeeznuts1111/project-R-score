// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { TOML } from 'bun';
import { xdgShadowBunfigPath } from '../../lib/install/machine-bunfig-policy.ts';
import {
  bunfigInodeIsReadable,
  inspectBunfigInode,
  type BunfigInode,
} from './bunfig-inode.ts';
import { joinPath } from './fs-bun';

export type BunfigInstall = {
  linker?: string;
  globalStore?: boolean;
  frozenLockfile?: boolean;
  minimumReleaseAge?: number;
  minimumReleaseAgeExcludes?: unknown;
  cache?: { dir?: string };
};

export type MachineBunfigSnapshot = {
  bunfigPath: string | null;
  install: BunfigInstall | null;
  cacheDir: string | null;
  /** lstat kind. Dangling is not missing — `Bun.file().exists()` cannot tell. */
  inode: BunfigInode;
};

export type EffectiveInstallPolicy = {
  linker: string | null;
  globalStore: boolean | null;
  cacheDir: string | null;
  /** Global bunfig that supplied inherited keys (XDG if present, else home). */
  globalBunfigPath: string | null;
  source: {
    linker: 'project' | 'machine' | 'unset';
    globalStore: 'project' | 'machine' | 'unset';
    cacheDir: 'project' | 'machine' | 'unset';
  };
};

function resolveHome(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | undefined {
  return env.HOME ?? env.USERPROFILE;
}

function expandTilde(value: string, home: string): string {
  if (value === '~') return home;
  if (value.startsWith('~/')) return joinPath(home, value.slice(2));
  return value;
}

/** One lstat + at most one read. `inode` decides whether the path is readable. */
export async function readBunfigSnapshot(
  bunfigPath: string,
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<MachineBunfigSnapshot> {
  const inode = inspectBunfigInode(bunfigPath);
  if (!bunfigInodeIsReadable(inode)) {
    return { bunfigPath: null, install: null, cacheDir: null, inode };
  }
  try {
    const parsed = TOML.parse(await Bun.file(bunfigPath).text()) as { install?: BunfigInstall };
    const install = parsed.install ?? null;
    const home = resolveHome(env);
    const rawDir = install?.cache?.dir ?? null;
    const cacheDir = rawDir && home ? expandTilde(rawDir, home) : rawDir ? rawDir : null;
    return { bunfigPath, install, cacheDir, inode };
  } catch {
    return { bunfigPath: null, install: null, cacheDir: null, inode };
  }
}

export async function readBunfigInstall(
  bunfigPath: string,
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<{ install: BunfigInstall | null; cacheDir: string | null }> {
  const snap = await readBunfigSnapshot(bunfigPath, env);
  return { install: snap.install, cacheDir: snap.cacheDir };
}

export function resolveHomeBunfigPath(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string | null {
  const home = resolveHome(env);
  return home ? joinPath(home, '.bunfig.toml') : null;
}

export async function readMachineBunfig(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<MachineBunfigSnapshot> {
  const bunfigPath = resolveHomeBunfigPath(env);
  if (!bunfigPath) {
    return { bunfigPath: null, install: null, cacheDir: null, inode: 'missing' };
  }
  return readBunfigSnapshot(bunfigPath, env);
}

/**
 * Global bunfig Bun's package manager actually loads: `$XDG_CONFIG_HOME/.bunfig.toml`
 * if present, otherwise `$HOME/.bunfig.toml`.
 * @see https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml
 */
export type GlobalBunfigLayers = {
  machine: MachineBunfigSnapshot;
  effective: MachineBunfigSnapshot;
  xdgPath: string | null;
  xdgLoaded: boolean;
};

/**
 * One home read. XDG is inspected only when `XDG_CONFIG_HOME` is set.
 * Call this instead of `readMachineBunfig` + `readEffectiveGlobalBunfig`.
 */
export async function readGlobalBunfigLayers(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<GlobalBunfigLayers> {
  const machine = await readMachineBunfig(env);
  const xdgPath = xdgShadowBunfigPath(env);
  if (!xdgPath) {
    return { machine, effective: machine, xdgPath: null, xdgLoaded: false };
  }
  const xdg = await readBunfigSnapshot(xdgPath, env);
  const xdgLoaded = bunfigInodeIsReadable(xdg.inode);
  return { machine, effective: xdgLoaded ? xdg : machine, xdgPath, xdgLoaded };
}

export async function readEffectiveGlobalBunfig(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<MachineBunfigSnapshot> {
  return (await readGlobalBunfigLayers(env)).effective;
}

/** SSOT home path vs the global file Bun loads. */
export async function resolveGlobalBunfigPaths(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<{ machine: string | null; effectiveGlobal: string | null }> {
  const machine = resolveHomeBunfigPath(env);
  const layers = await readGlobalBunfigLayers(env);
  return { machine, effectiveGlobal: layers.effective.bunfigPath ?? machine };
}

export async function readProjectBunfig(projectRoot: string): Promise<MachineBunfigSnapshot> {
  return readBunfigSnapshot(joinPath(projectRoot, 'bunfig.toml'));
}

export function resolveEffectiveInstallPolicy(
  project: MachineBunfigSnapshot,
  machine: MachineBunfigSnapshot
): EffectiveInstallPolicy {
  const linker = project.install?.linker ?? machine.install?.linker ?? null;
  const globalStore = project.install?.globalStore ?? machine.install?.globalStore ?? null;
  const cacheDir = project.cacheDir ?? machine.cacheDir ?? null;

  return {
    linker,
    globalStore,
    cacheDir,
    globalBunfigPath: machine.bunfigPath,
    source: {
      linker:
        project.install?.linker != null
          ? 'project'
          : machine.install?.linker != null
            ? 'machine'
            : 'unset',
      globalStore:
        project.install?.globalStore != null
          ? 'project'
          : machine.install?.globalStore != null
            ? 'machine'
            : 'unset',
      cacheDir:
        project.cacheDir != null ? 'project' : machine.cacheDir != null ? 'machine' : 'unset',
    },
  };
}

export function isAbsoluteCachePath(cacheDir: string | null): boolean {
  if (!cacheDir) return false;
  return !cacheDir.startsWith('~/') && cacheDir !== '~' && !cacheDir.includes('/~/');
}

/** Operator label for the global bunfig Bun actually loaded. */
export function formatGlobalBunfigRef(
  bunfigPath: string | null,
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string {
  if (!bunfigPath) return 'global bunfig';
  const home = resolveHome(env);
  if (home && bunfigPath === joinPath(home, '.bunfig.toml')) return '~/.bunfig.toml';
  const xdg = xdgShadowBunfigPath(env);
  if (xdg && bunfigPath === xdg) return '$XDG_CONFIG_HOME/.bunfig.toml';
  return bunfigPath;
}

export function formatPolicySource(
  key: keyof EffectiveInstallPolicy['source'],
  policy: EffectiveInstallPolicy,
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): string {
  const src = policy.source[key];
  if (src === 'machine') {
    return `inherited from ${formatGlobalBunfigRef(policy.globalBunfigPath, env)}`;
  }
  if (src === 'project') return 'set in project bunfig.toml';
  return 'unset';
}
