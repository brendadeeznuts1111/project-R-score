// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { xdgShadowBunfigPath } from '../../lib/install/machine-bunfig-policy.ts';
import type { EffectiveInstallPolicy } from './machine-bunfig.ts';
import { joinPath } from './fs-bun';

type MachineEnv = Record<string, string | undefined>;

/** Operator label for the global bunfig Bun actually loaded. */
export function formatGlobalBunfigRef(
  bunfigPath: string | null,
  env: MachineEnv = Bun.env as MachineEnv
): string {
  if (!bunfigPath) return 'global bunfig';
  const home = env.HOME ?? env.USERPROFILE;
  if (home && bunfigPath === joinPath(home, '.bunfig.toml')) return '~/.bunfig.toml';
  const xdg = xdgShadowBunfigPath(env);
  if (xdg && bunfigPath === xdg) return '$XDG_CONFIG_HOME/.bunfig.toml';
  return bunfigPath;
}

export function formatPolicySource(
  key: keyof EffectiveInstallPolicy['source'],
  policy: EffectiveInstallPolicy,
  env: MachineEnv = Bun.env as MachineEnv
): string {
  const src = policy.source[key];
  if (src === 'machine') {
    return `inherited from ${formatGlobalBunfigRef(policy.globalBunfigPath, env)}`;
  }
  if (src === 'project') return 'set in project bunfig.toml';
  return 'unset';
}
