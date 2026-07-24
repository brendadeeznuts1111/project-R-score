// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/pm/cli/install#platform-specific-dependencies
import { describe, expect, test } from 'bun:test';
import {
  BUN_INSTALL_PLATFORM_SUPPORTED,
  INSTALL_PLATFORM_DOCS,
  probeBunInstallPlatformFlags,
} from '../lib/docs/bun-install-platform-docs.ts';
import {
  PROJECT_CROSS_INSTALL_PROFILES,
  PROJECT_INSTALL_CONFIG_ASPECTS,
  PROJECT_INSTALL_LINKER_ASPECTS,
  PROJECT_INSTALL_PLATFORM_ASPECTS,
  PROJECT_INSTALL_TOOLCHAIN_ASPECTS,
  runProjectInstallPlatformVerification,
} from '../lib/verification/install-platform.ts';

describe('lib/verification/install-platform', () => {
  test('PROJECT_INSTALL_PLATFORM_ASPECTS scopes huge behavior to repo surfaces', () => {
    expect(PROJECT_INSTALL_TOOLCHAIN_ASPECTS.map(a => a.id)).toEqual(['bun-binary-resolved']);
    expect(PROJECT_INSTALL_CONFIG_ASPECTS.map(a => a.id)).toEqual([
      'bun-config-env-ssot',
      'forbidden-install-env',
      'install-mechanism-notes-ssot',
    ]);
    expect(PROJECT_INSTALL_PLATFORM_ASPECTS.map(a => a.id)).toHaveLength(4);
    expect(PROJECT_INSTALL_LINKER_ASPECTS.map(a => a.id)).toEqual([
      'lockfile-config-version',
      'machine-isolated-linker',
      'machine-global-store',
    ]);
    expect(PROJECT_CROSS_INSTALL_PROFILES).toEqual([
      'cross-linux-x64',
      'cross-linux-arm64',
      'cross-darwin-arm64',
    ]);
    expect(PROJECT_INSTALL_PLATFORM_ASPECTS[1]?.supported).toBeUndefined();
    expect(BUN_INSTALL_PLATFORM_SUPPORTED.cpu).toContain('x64');
    expect(BUN_INSTALL_PLATFORM_SUPPORTED.os).toContain('linux');
  });

  test('probeBunInstallPlatformFlags accepts valid target and rejects invalid cpu', async () => {
    const probe = await probeBunInstallPlatformFlags();
    expect(probe.ok).toBe(true);
  });

  test(
    'runProjectInstallPlatformVerification passes all aspects',
    async () => {
      const report = await runProjectInstallPlatformVerification();
      expect(report.rows.length).toBe(11);
      const binary = report.rows[0];
      expect(binary?.aspect).toBe('bun-binary-resolved');
      expect(binary?.canonicalKey).toBe('Bun.which');
      expect(binary?.note).toMatch(/spawned=.*source=.*runtime=/);
      expect(binary?.ok).toBe(true);
      for (const row of report.rows) {
        expect(row.supported).toBe(BUN_INSTALL_PLATFORM_SUPPORTED);
        if (row.aspect !== 'bun-binary-resolved') {
          expect(row.canonical).toContain('bun.com/docs/');
        }
      }
      expect(report.rows.find(r => r.aspect === 'profile-ssot')?.note).toContain('cross-linux-x64');
      expect(report.rows.find(r => r.aspect === 'lockfile-config-version')?.ok).toBe(true);
      expect(report.rows.find(r => r.aspect === 'lockfile-config-version')?.note).toContain(
        'configVersion=1'
      );
      expect(report.ok).toBe(true);
    },
    { timeout: 60_000 }
  );

  test('readLockfileInstallMeta detects workspace configVersion 1', async () => {
    const { readLockfileInstallMeta } = await import('../lib/docs/bun-install-linker-docs.ts');
    const meta = await readLockfileInstallMeta(process.cwd());
    expect(meta?.configVersion).toBe(1);
    expect(meta?.hasWorkspaces).toBe(true);
    expect(meta?.expectsIsolatedDefault).toBe(true);
  });

  test('aspect rows link to platform-specific-dependencies or cpu-and-os-flags', async () => {
    const report = await runProjectInstallPlatformVerification();
    const runtime = report.rows.find(r => r.aspect === 'runtime-flags');
    expect(runtime?.canonicalKey).toBe('bun install --cpu');
    expect(runtime?.canonical).toBe(INSTALL_PLATFORM_DOCS.cpuAndOsFlags);
    expect(runtime?._links?.docs).toBe(INSTALL_PLATFORM_DOCS.cpuAndOsFlags);
    const lock = report.rows.find(r => r.aspect === 'lockfile-stable');
    expect(lock?.canonicalKey).toBe('platform-specific dependencies');
    expect(lock?.canonical).toBe(INSTALL_PLATFORM_DOCS.platformSpecificDependencies);
  });

  test('runProjectInstallPlatformVerification --dry-run skips install spawns', async () => {
    const report = await runProjectInstallPlatformVerification({ dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.ok).toBe(true);
    expect(report.rows.length).toBe(11);
    expect(report.rows.filter(r => r.skipped).length).toBe(3);
    expect(report.rows.find(r => r.aspect === 'bun-config-env-ssot')?.ok).toBe(true);
    expect(report.rows.find(r => r.aspect === 'bun-binary-resolved')?.skipped).toBeUndefined();
    expect(report.rows.find(r => r.aspect === 'profile-ssot')?.skipped).toBeUndefined();
    expect(report.rows.find(r => r.aspect === 'lockfile-config-version')?.skipped).toBeUndefined();
    expect(report.rows.find(r => r.aspect === 'runtime-flags')?.note).toContain('--dry-run');
  });
});
