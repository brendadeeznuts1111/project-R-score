// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Install env + mechanism verification — BUN_CONFIG_* SSOT and UNIFIED shell policy.
 *
 * @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables
 * @see https://bun.com/docs/pm/cli/install#cache
 * @see tools/bun-install-env.ts — BUN_CONFIG_INSTALL_VARS, INSTALL_MECHANISM_NOTES
 * @see docs/UNIFIED.md — forbidden BUN_INSTALL_* shell env
 */
import {
  BUN_CONFIG_INSTALL_VARS,
  FACTORY_INSTALL_DEFAULTS,
  INSTALL_MECHANISM_NOTES,
} from '../../tools/bun-install-env.ts';

/** Official BUN_CONFIG_* names from bun install docs (env > bunfig). */
export const OFFICIAL_BUN_CONFIG_INSTALL_VAR_NAMES = [
  'BUN_CONFIG_REGISTRY',
  'BUN_CONFIG_TOKEN',
  'BUN_CONFIG_YARN_LOCKFILE',
  'BUN_CONFIG_SKIP_SAVE_LOCKFILE',
  'BUN_CONFIG_SKIP_LOAD_LOCKFILE',
  'BUN_CONFIG_SKIP_INSTALL_PACKAGES',
] as const;

const MECHANISM_NOTE_IDS = [
  'backend',
  'cache-layout',
  'node-modules-check',
  'eager-resolve',
  'lazy-resolve',
] as const;

/** Repo SSOT matches the six official BUN_CONFIG_* install vars. */
export function probeBunConfigEnvSsot(): { ok: boolean; note: string } {
  const ours = BUN_CONFIG_INSTALL_VARS.map(v => v.name).sort();
  const official = [...OFFICIAL_BUN_CONFIG_INSTALL_VAR_NAMES].sort();
  const ok =
    ours.length === official.length && ours.every((name, index) => name === official[index]);
  return {
    ok,
    note: ok
      ? `env > bunfig; 6 vars (${official.join(', ')})`
      : `SSOT mismatch: repo=[${ours.join(', ')}] official=[${official.join(', ')}]`,
  };
}

/** UNIFIED policy: shell must not set machine-owned cache/store env overrides. */
export function probeForbiddenInstallEnv(): { ok: boolean; note: string } {
  const violations = FACTORY_INSTALL_DEFAULTS.shellEnvForbidden.filter(
    name => Bun.env[name] != null && Bun.env[name] !== ''
  );
  return {
    ok: violations.length === 0,
    note:
      violations.length === 0
        ? `no ${FACTORY_INSTALL_DEFAULTS.shellEnvForbidden.join(' / ')} in shell env`
        : `forbidden env set: ${violations.join(', ')}`,
  };
}

/** Mechanism notes (cache, backends, eager/lazy) catalogued in bun-install-env.ts. */
export function probeInstallMechanismNotesSsot(): { ok: boolean; note: string } {
  const ids = INSTALL_MECHANISM_NOTES.map(n => n.id);
  const missing = MECHANISM_NOTE_IDS.filter(id => !ids.includes(id));
  const ok = missing.length === 0;
  return {
    ok,
    note: ok
      ? `5 mechanism notes (backend, cache, node_modules, eager/lazy resolve)`
      : `missing mechanism note ids: ${missing.join(', ')}`,
  };
}
