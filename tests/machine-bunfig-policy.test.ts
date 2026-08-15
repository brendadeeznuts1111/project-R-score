// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/isolated-installs
// @see https://bun.com/docs/pm/cli/install#minimum-release-age
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';
import {
  CACHE_DIR_PLACEHOLDER,
  cacheDirUsesUnexpandedTilde,
  EPHEMERAL_CI_INSTALL_ENV_ALLOWLIST,
  xdgShadowBunfigPath,
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_BUNFIG_REQUIRED_SNIPPETS,
  MACHINE_BUNFIG_TEMPLATE_REL,
  MACHINE_EXPECTED_GLOBAL_STORE,
  MACHINE_EXPECTED_LINKER,
  MACHINE_MINIMUM_RELEASE_AGE_SECONDS,
  MACHINE_OWNED_CACHE_DIR_LABEL,
  MACHINE_OWNED_INSTALL_KEYS,
  machineBunfigMissingSnippets,
  REQUIRED_RELEASE_AGE_EXCLUDES,
} from '../lib/install/machine-bunfig-policy.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('machine-bunfig-policy SSOT', () => {
  test('machine-owned install keys cover linker / globalStore / age / excludes', () => {
    expect([...MACHINE_OWNED_INSTALL_KEYS]).toEqual([
      'linker',
      'globalStore',
      'minimumReleaseAge',
      'minimumReleaseAgeExcludes',
    ]);
    expect(MACHINE_OWNED_CACHE_DIR_LABEL).toBe('[install.cache].dir');
  });

  test('required release-age excludes are catalog type packages (superset of Bun default)', () => {
    expect([...REQUIRED_RELEASE_AGE_EXCLUDES]).toEqual([
      'bun-types',
      '@types/bun',
      '@types/node',
      'typescript',
    ]);
    // Bun default is @types/node + typescript — our list must stay a superset
    expect(REQUIRED_RELEASE_AGE_EXCLUDES).toContain('@types/node');
    expect(REQUIRED_RELEASE_AGE_EXCLUDES).toContain('typescript');
  });

  test('forbidden install env is cache + global store only', () => {
    expect([...FORBIDDEN_INSTALL_ENV_VARS]).toEqual([
      'BUN_INSTALL_CACHE_DIR',
      'BUN_INSTALL_GLOBAL_STORE',
    ]);
  });

  test('ephemeral CI allowlist: GHA / FACTORY_BUN_CI / CI_ALLOW — not bare CI', () => {
    expect(EPHEMERAL_CI_INSTALL_ENV_ALLOWLIST.map(e => e.key).sort()).toEqual([
      'CI_ALLOW_BUN_INSTALL_ENV',
      'FACTORY_BUN_CI',
      'GITHUB_ACTIONS',
    ]);
    expect(isEphemeralCiInstallEnv({ GITHUB_ACTIONS: 'true' })).toBe(true);
    expect(isEphemeralCiInstallEnv({ FACTORY_BUN_CI: '1' })).toBe(true);
    expect(isEphemeralCiInstallEnv({ CI_ALLOW_BUN_INSTALL_ENV: '1' })).toBe(true);
    expect(isEphemeralCiInstallEnv({ CI: 'true' })).toBe(false);
    expect(isEphemeralCiInstallEnv({ GITHUB_ACTIONS: '1' })).toBe(false);
    expect(isEphemeralCiInstallEnv({})).toBe(false);
  });

  test('required snippets include policy fragments + every age exclude', () => {
    expect(MACHINE_MINIMUM_RELEASE_AGE_SECONDS).toBe(259200);
    expect(MACHINE_EXPECTED_LINKER).toBe('isolated');
    expect(MACHINE_EXPECTED_GLOBAL_STORE).toBe(true);
    expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain(`linker = "${MACHINE_EXPECTED_LINKER}"`);
    expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain(
      `globalStore = ${MACHINE_EXPECTED_GLOBAL_STORE}`
    );
    expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain(
      `minimumReleaseAge = ${MACHINE_MINIMUM_RELEASE_AGE_SECONDS}`
    );
    expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain('[install.cache]');
    for (const pkg of REQUIRED_RELEASE_AGE_EXCLUDES) {
      expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain(pkg);
    }
  });

  test('committed template matches SSOT path + snippets after CACHE_DIR render', async () => {
    const path = joinPath(ROOT, MACHINE_BUNFIG_TEMPLATE_REL);
    expect(await Bun.file(path).exists()).toBe(true);
    const text = await Bun.file(path).text();
    expect(text).toContain(CACHE_DIR_PLACEHOLDER);
    const rendered = text.split(CACHE_DIR_PLACEHOLDER).join('/tmp/bun-install-cache');
    expect(machineBunfigMissingSnippets(rendered)).toEqual([]);
    expect(cacheDirUsesUnexpandedTilde(rendered)).toBe(false);
  });

  test('cacheDirUsesUnexpandedTilde catches bare ~ cache.dir', () => {
    expect(cacheDirUsesUnexpandedTilde('dir = "~/.bun/install/cache"')).toBe(true);
    expect(cacheDirUsesUnexpandedTilde("dir = '~/x'")).toBe(true);
    expect(cacheDirUsesUnexpandedTilde('dir = "/home/u/.bun/install/cache"')).toBe(false);
  });

  test('doctor + ensure re-export the same SSOT references', async () => {
    const doctor = await import('../tools/lib/portal-cli-doctor-bunfig.ts');
    const ensure = await import('../scripts/ensure-machine-bunfig.ts');
    expect(doctor.MACHINE_OWNED_INSTALL_KEYS).toBe(MACHINE_OWNED_INSTALL_KEYS);
    expect(doctor.REQUIRED_RELEASE_AGE_EXCLUDES).toBe(REQUIRED_RELEASE_AGE_EXCLUDES);
    expect(doctor.FORBIDDEN_INSTALL_ENV_VARS).toBe(FORBIDDEN_INSTALL_ENV_VARS);
    expect(doctor.isEphemeralCiInstallEnv).toBe(isEphemeralCiInstallEnv);
    expect(ensure.MACHINE_BUNFIG_TEMPLATE_REL).toBe(MACHINE_BUNFIG_TEMPLATE_REL);
    expect(ensure.CACHE_DIR_PLACEHOLDER).toBe(CACHE_DIR_PLACEHOLDER);
    expect(ensure.MACHINE_BUNFIG_REQUIRED_SNIPPETS).toBe(MACHINE_BUNFIG_REQUIRED_SNIPPETS);
    expect(ensure.xdgShadowBunfigPath).toBe(xdgShadowBunfigPath);
  });

  test('xdgShadowBunfigPath is $XDG_CONFIG_HOME/.bunfig.toml only', () => {
    expect(xdgShadowBunfigPath({})).toBeNull();
    expect(xdgShadowBunfigPath({ XDG_CONFIG_HOME: '' })).toBeNull();
    expect(xdgShadowBunfigPath({ XDG_CONFIG_HOME: '/tmp/xdg' })).toBe('/tmp/xdg/.bunfig.toml');
    expect(xdgShadowBunfigPath({ XDG_CONFIG_HOME: '/tmp/xdg/' })).toBe('/tmp/xdg/.bunfig.toml');
  });
});
