// @see https://bun.com/docs/runtime/bunfig — bunfig.toml install keys
// @see https://bun.com/docs/pm/isolated-installs — linker = isolated
// @see https://bun.com/docs/pm/global-store — globalStore + absolute cache.dir
// @see https://bun.com/docs/pm/cli/install#minimum-release-age — age gate + excludes
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env (HOME / CI flags)
/**
 * Machine bunfig install policy — single SSOT table.
 *
 * Consumers:
 *   - tools/lib/portal-cli-doctor-bunfig.ts  (doctor bunfig group)
 *   - scripts/ensure-machine-bunfig.ts       (template ensure / --check snippets)
 *
 * Human map: docs/UNIFIED.md · template: config/machine.bunfig.toml.template
 *
 * Do not duplicate these lists in doctor / ensure / shell docs without importing here.
 */

/** Repo-relative path of the machine bunfig template (written to ~/.bunfig.toml). */
export const MACHINE_BUNFIG_TEMPLATE_REL = 'config/machine.bunfig.toml.template';

/** Placeholder in the template replaced with an absolute cache path. */
export const CACHE_DIR_PLACEHOLDER = '{{CACHE_DIR}}';

/**
 * Top-level `[install]` keys that must live only on the machine (`~/.bunfig.toml`).
 * Project `./bunfig.toml` must not set these (doctor: bunfig-project-no-machine-keys).
 * Nested `[install.cache].dir` is checked separately via {@link MACHINE_OWNED_CACHE_DIR_LABEL}.
 */
export const MACHINE_OWNED_INSTALL_KEYS = [
  'linker',
  'globalStore',
  'minimumReleaseAge',
  'minimumReleaseAgeExcludes',
] as const;

export type MachineOwnedInstallKey = (typeof MACHINE_OWNED_INSTALL_KEYS)[number];

/** Nested cache key label (not a top-level install field name). */
export const MACHINE_OWNED_CACHE_DIR_LABEL = '[install.cache].dir' as const;

/**
 * Catalog / type-only packages that must appear in `minimumReleaseAgeExcludes`.
 * List **replaces** Bun's default `["@types/node", "typescript"]` — keep a superset.
 */
export const REQUIRED_RELEASE_AGE_EXCLUDES = [
  'bun-types',
  '@types/bun',
  '@types/node',
  'typescript',
] as const;

export type RequiredReleaseAgeExclude = (typeof REQUIRED_RELEASE_AGE_EXCLUDES)[number];

/** Supply-chain floor (seconds) — 3 days. */
export const MACHINE_MINIMUM_RELEASE_AGE_SECONDS = 259200 as const;

/**
 * Process env vars forbidden in normal shell/IDE (machine bunfig owns cache/store).
 * Ephemeral CI may set them when {@link isEphemeralCiInstallEnv} is true.
 */
export const FORBIDDEN_INSTALL_ENV_VARS = [
  'BUN_INSTALL_CACHE_DIR',
  'BUN_INSTALL_GLOBAL_STORE',
] as const;

export type ForbiddenInstallEnvVar = (typeof FORBIDDEN_INSTALL_ENV_VARS)[number];

/**
 * Env key/value pairs that allow ephemeral CI `BUN_INSTALL_*` overrides
 * (setup-factory-bun, with-bun-cache-env). Local `CI=true` alone is not enough.
 */
export const EPHEMERAL_CI_INSTALL_ENV_ALLOWLIST = [
  { key: 'GITHUB_ACTIONS', value: 'true' },
  { key: 'FACTORY_BUN_CI', value: '1' },
  { key: 'CI_ALLOW_BUN_INSTALL_ENV', value: '1' },
] as const;

/**
 * String-contains fragments for `ensure-machine-bunfig --check`
 * (not a full TOML parse). Derived from age excludes so lists cannot drift.
 */
export const MACHINE_BUNFIG_REQUIRED_SNIPPETS: readonly string[] = [
  'linker = "isolated"',
  'globalStore = true',
  `minimumReleaseAge = ${MACHINE_MINIMUM_RELEASE_AGE_SECONDS}`,
  ...REQUIRED_RELEASE_AGE_EXCLUDES,
  '[install.cache]',
];

/**
 * Ephemeral CI may set BUN_INSTALL_CACHE_DIR / BUN_INSTALL_GLOBAL_STORE
 * (setup-factory-bun, with-bun-cache-env). Local developer shells must not.
 * @see docs/UNIFIED.md
 */
export function isEphemeralCiInstallEnv(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): boolean {
  return EPHEMERAL_CI_INSTALL_ENV_ALLOWLIST.some(({ key, value }) => env[key] === value);
}

/**
 * Detect unexpanded `~` in cache.dir (becomes literal `./~` — oven-sh/bun#6237).
 * Used by ensure-machine-bunfig --check.
 */
export function cacheDirUsesUnexpandedTilde(text: string): boolean {
  return text.includes('dir = "~') || text.includes("dir = '~/");
}

/** Snippets present in text that are required by machine SSOT; returns missing ones. */
export function machineBunfigMissingSnippets(text: string): string[] {
  return MACHINE_BUNFIG_REQUIRED_SNIPPETS.filter(s => !text.includes(s));
}
