// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { TOML } from 'bun';
import { xdgShadowBunfigPath } from '../../lib/install/machine-bunfig-policy.ts';
import { joinPath } from './fs-bun';

export type BunfigInstall = {
  linker?: string;
  globalStore?: boolean;
  cache?: { dir?: string };
};

export type MachineBunfigSnapshot = {
  bunfigPath: string | null;
  install: BunfigInstall | null;
  cacheDir: string | null;
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

export async function readBunfigInstall(
  bunfigPath: string,
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<{ install: BunfigInstall | null; cacheDir: string | null }> {
  try {
    const exists = await Bun.file(bunfigPath).exists();
    if (!exists) return { install: null, cacheDir: null };
    const parsed = TOML.parse(await Bun.file(bunfigPath).text()) as { install?: BunfigInstall };
    const install = parsed.install ?? null;
    const home = resolveHome(env);
    const rawDir = install?.cache?.dir ?? null;
    const cacheDir = rawDir && home ? expandTilde(rawDir, home) : rawDir ? rawDir : null;
    return { install, cacheDir };
  } catch {
    return { install: null, cacheDir: null };
  }
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
  if (!bunfigPath) return { bunfigPath: null, install: null, cacheDir: null };
  const { install, cacheDir } = await readBunfigInstall(bunfigPath, env);
  const exists = await Bun.file(bunfigPath).exists();
  return {
    bunfigPath: exists ? bunfigPath : null,
    install,
    cacheDir,
  };
}

/**
 * Global bunfig Bun's package manager actually loads: `$XDG_CONFIG_HOME/.bunfig.toml`
 * if present, otherwise `$HOME/.bunfig.toml`.
 * @see https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml
 */
export async function readEffectiveGlobalBunfig(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<MachineBunfigSnapshot> {
  const xdg = xdgShadowBunfigPath(env);
  if (xdg && (await Bun.file(xdg).exists())) {
    const { install, cacheDir } = await readBunfigInstall(xdg, env);
    return { bunfigPath: xdg, install, cacheDir };
  }
  return readMachineBunfig(env);
}

/** SSOT home path vs the global file Bun loads. */
export async function resolveGlobalBunfigPaths(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<{ machine: string | null; effectiveGlobal: string | null }> {
  const machine = resolveHomeBunfigPath(env);
  const effective = await readEffectiveGlobalBunfig(env);
  return { machine, effectiveGlobal: effective.bunfigPath ?? machine };
}

export async function readProjectBunfig(projectRoot: string): Promise<MachineBunfigSnapshot> {
  const bunfigPath = joinPath(projectRoot, 'bunfig.toml');
  const exists = await Bun.file(bunfigPath).exists();
  const { install, cacheDir } = await readBunfigInstall(bunfigPath);
  return {
    bunfigPath: exists ? bunfigPath : null,
    install,
    cacheDir,
  };
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
