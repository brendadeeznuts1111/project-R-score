// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/isolated-installs
// @see https://bun.com/docs/pm/global-store
/**
 * Prove install:verify imports the same machine-bunfig-policy SSOT references
 * (forbidden install env · expected linker/globalStore · ephemeral CI gate).
 * @see docs/UNIFIED.md
 * @see lib/install/machine-bunfig-policy.ts
 * @see scripts/verify-install-cache.ts
 */
import { describe, expect, test } from 'bun:test';
import packageJson from '../package.json' with { type: 'json' };
import {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_EXPECTED_GLOBAL_STORE,
  MACHINE_EXPECTED_LINKER,
  MACHINE_BUNFIG_REQUIRED_SNIPPETS,
  xdgShadowBunfigPath,
} from '../lib/install/machine-bunfig-policy.ts';
import { checkNodeModulesLayout } from '../scripts/verify-install-cache.ts';
import { withExplicitProjectCwd } from '../scripts/with-bun-cache-env.ts';
import { createTestWorkspace } from './harness.ts';

describe('verify-install-cache policy SSOT', () => {
  test('verify re-exports the same array/function references as machine-bunfig-policy', async () => {
    const verify = await import('../scripts/verify-install-cache.ts');
    expect(verify.FORBIDDEN_INSTALL_ENV_VARS).toBe(FORBIDDEN_INSTALL_ENV_VARS);
    expect(verify.isEphemeralCiInstallEnv).toBe(isEphemeralCiInstallEnv);
    expect(verify.MACHINE_EXPECTED_LINKER).toBe(MACHINE_EXPECTED_LINKER);
    expect(verify.MACHINE_EXPECTED_GLOBAL_STORE).toBe(MACHINE_EXPECTED_GLOBAL_STORE);
    expect(verify.xdgShadowBunfigPath).toBe(xdgShadowBunfigPath);
  });

  test('verify, doctor, and audit share FORBIDDEN_INSTALL_ENV_VARS reference', async () => {
    const verify = await import('../scripts/verify-install-cache.ts');
    const doctor = await import('../tools/lib/portal-cli-doctor-bunfig.ts');
    const audit = await import('../scripts/audit-bunfig.ts');
    expect(verify.FORBIDDEN_INSTALL_ENV_VARS).toBe(doctor.FORBIDDEN_INSTALL_ENV_VARS);
    expect(verify.FORBIDDEN_INSTALL_ENV_VARS).toBe(audit.FORBIDDEN_INSTALL_ENV_VARS);
    expect(verify.isEphemeralCiInstallEnv).toBe(doctor.isEphemeralCiInstallEnv);
    expect(verify.isEphemeralCiInstallEnv).toBe(audit.isEphemeralCiInstallEnv);
  });

  test('expected linker/globalStore match required snippets', () => {
    expect(MACHINE_EXPECTED_LINKER).toBe('isolated');
    expect(MACHINE_EXPECTED_GLOBAL_STORE).toBe(true);
    expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain(`linker = "${MACHINE_EXPECTED_LINKER}"`);
    expect(MACHINE_BUNFIG_REQUIRED_SNIPPETS).toContain(
      `globalStore = ${MACHINE_EXPECTED_GLOBAL_STORE}`
    );
  });

  test('forbidden install env names are the cache + global store pair', () => {
    expect([...FORBIDDEN_INSTALL_ENV_VARS]).toEqual([
      'BUN_INSTALL_CACHE_DIR',
      'BUN_INSTALL_GLOBAL_STORE',
    ]);
  });

  test('install wrapper pins install and ci to the current project root', () => {
    expect(withExplicitProjectCwd(['install'], '/tmp/project-r')).toEqual([
      'install',
      '--cwd',
      '/tmp/project-r',
    ]);
    expect(withExplicitProjectCwd(['ci', '--ignore-scripts'], '/tmp/project-r')).toEqual([
      'ci',
      '--cwd',
      '/tmp/project-r',
      '--ignore-scripts',
    ]);
    expect(withExplicitProjectCwd(['install', '--cwd=/tmp/owned'], '/tmp/project-r')).toEqual([
      'install',
      '--cwd=/tmp/owned',
    ]);
    expect(packageJson.scripts.setup).toContain('bun run install:verify:strict');
  });

  test('strict verification rejects an ancestor-only install', async () => {
    await using workspace = await createTestWorkspace('factorywager-install-policy-');
    const missing = checkNodeModulesLayout(workspace.root, true);
    expect(missing.ok).toBe(false);
    expect(missing.detail).toContain('local node_modules missing');
  });
});
