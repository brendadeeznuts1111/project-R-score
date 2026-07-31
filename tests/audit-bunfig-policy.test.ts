// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/shell#getting-started
// @see https://bun.com/docs/pm/isolated-installs
// @see https://bun.com/docs/pm/cli/install#minimum-release-age
/**
 * Prove audit:bunfig imports the same machine-bunfig-policy SSOT as doctor bunfig probes.
 * @see docs/UNIFIED.md
 * @see lib/install/machine-bunfig-policy.ts
 */
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';
import {
  FORBIDDEN_INSTALL_ENV_VARS,
  isEphemeralCiInstallEnv,
  MACHINE_OWNED_CACHE_DIR_LABEL,
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
} from '../lib/install/machine-bunfig-policy.ts';
import {
  auditBunfig,
  buildMachineOwnedKeyLinePattern,
  collectMachineOwnedBunfigMatches,
  escapeRegExp,
  machineOwnedKeysLabel,
  machineOwnedLineAssignmentKeys,
  resolveGitTopLevel,
} from '../scripts/audit-bunfig.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('audit-bunfig policy SSOT', () => {
  test('audit re-exports the same array/function references as machine-bunfig-policy', async () => {
    const audit = await import('../scripts/audit-bunfig.ts');
    expect(audit.MACHINE_OWNED_INSTALL_KEYS).toBe(MACHINE_OWNED_INSTALL_KEYS);
    expect(audit.REQUIRED_RELEASE_AGE_EXCLUDES).toBe(REQUIRED_RELEASE_AGE_EXCLUDES);
    expect(audit.FORBIDDEN_INSTALL_ENV_VARS).toBe(FORBIDDEN_INSTALL_ENV_VARS);
    expect(audit.MACHINE_OWNED_CACHE_DIR_LABEL).toBe(MACHINE_OWNED_CACHE_DIR_LABEL);
    expect(audit.isEphemeralCiInstallEnv).toBe(isEphemeralCiInstallEnv);
  });

  test('audit and doctor re-export identical SSOT references (no divergent lists)', async () => {
    const audit = await import('../scripts/audit-bunfig.ts');
    const doctor = await import('../tools/lib/portal-cli-doctor-bunfig.ts');
    expect(audit.MACHINE_OWNED_INSTALL_KEYS).toBe(doctor.MACHINE_OWNED_INSTALL_KEYS);
    expect(audit.REQUIRED_RELEASE_AGE_EXCLUDES).toBe(doctor.REQUIRED_RELEASE_AGE_EXCLUDES);
    expect(audit.FORBIDDEN_INSTALL_ENV_VARS).toBe(doctor.FORBIDDEN_INSTALL_ENV_VARS);
    expect(audit.isEphemeralCiInstallEnv).toBe(doctor.isEphemeralCiInstallEnv);
    expect(audit.MACHINE_OWNED_CACHE_DIR_LABEL).toBe(doctor.MACHINE_OWNED_CACHE_DIR_LABEL);
  });

  test('line-assignment keys are a subset of MACHINE_OWNED_INSTALL_KEYS (SSOT-derived)', () => {
    const lineKeys = machineOwnedLineAssignmentKeys();
    expect(lineKeys.length).toBeGreaterThan(0);
    for (const k of lineKeys) {
      expect(MACHINE_OWNED_INSTALL_KEYS).toContain(k);
    }
    // every SSOT key is either line-scanned or the known multi-line exclude list
    for (const k of MACHINE_OWNED_INSTALL_KEYS) {
      if (k === 'minimumReleaseAgeExcludes') {
        expect(lineKeys).not.toContain(k);
      } else {
        expect(lineKeys).toContain(k);
      }
    }
  });

  test('buildMachineOwnedKeyLinePattern matches scalar machine-owned keys + cache dir', () => {
    const re = buildMachineOwnedKeyLinePattern();
    expect(re.test('linker = "isolated"')).toBe(true);
    expect(re.test('globalStore = true')).toBe(true);
    expect(re.test('minimumReleaseAge = 259200')).toBe(true);
    // multi-line array key: line scan skips; doctor owns exclude package content
    expect(re.test('minimumReleaseAgeExcludes = [')).toBe(false);
    expect(re.test('  dir = "/tmp/cache"')).toBe(true);
    expect(re.test('dir = "~/.bun/install/cache"')).toBe(true);
    // project-owned keys must not match
    expect(re.test('exact = true')).toBe(false);
    expect(re.test('frozenLockfile = true')).toBe(false);
    expect(re.test('# linker = "hoisted"')).toBe(false);
  });

  test('pattern longest-first + helpers', () => {
    const re = buildMachineOwnedKeyLinePattern(['minimumReleaseAge', 'minimumReleaseAgeExcludes']);
    expect('minimumReleaseAgeExcludes = []'.match(re)?.[0]).toContain(
      'minimumReleaseAgeExcludes'
    );
    expect(escapeRegExp('a.b')).toBe('a\\.b');
    expect(machineOwnedKeysLabel()).toContain('linker');
    expect(machineOwnedKeysLabel()).toContain(MACHINE_OWNED_CACHE_DIR_LABEL);
  });

  test('collectMachineOwnedBunfigMatches finds synthetic fixture only', async () => {
    const tmp = joinPath(ROOT, 'tmp/audit-bunfig-policy-fixture');
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/nested`.quiet();
    await Bun.$`mkdir -p ${tmp}/nested ${tmp}/clean ${tmp}/separate-repo`.quiet();
    await Bun.write(
      joinPath(tmp, 'nested/bunfig.toml'),
      `[install]\nlinker = "hoisted"\nglobalStore = false\nexact = true\n`
    );
    await Bun.write(joinPath(tmp, 'clean/bunfig.toml'), `[install]\nexact = true\n`);
    await Bun.write(
      joinPath(tmp, 'separate-repo/bunfig.toml'),
      `[install]\nlinker = "hoisted"\n`
    );
    await Bun.$`git -C ${joinPath(tmp, 'separate-repo')} init --quiet`.quiet();

    const files = await collectMachineOwnedBunfigMatches(tmp);
    expect(files.length).toBe(1);
    expect(files[0]!.rel).toBe('nested/bunfig.toml');
    expect(files[0]!.matches.some(m => m.includes('linker'))).toBe(true);
    expect(files[0]!.matches.some(m => m.includes('globalStore'))).toBe(true);
    expect(files.some(file => file.rel.startsWith('separate-repo/'))).toBe(false);
    expect(await resolveGitTopLevel(joinPath(tmp, 'nested'))).toBe(
      await resolveGitTopLevel(ROOT)
    );
    expect(await resolveGitTopLevel(joinPath(tmp, 'separate-repo'))).not.toBe(
      await resolveGitTopLevel(ROOT)
    );

    const strict = await auditBunfig({
      root: tmp,
      strict: true,
      quietPm: true,
      silent: true,
    });
    expect(strict.found).toBe(true);
    expect(strict.exitCode).toBe(1);
    expect(strict.ok).toBe(false);

    const soft = await auditBunfig({
      root: tmp,
      strict: false,
      quietPm: true,
      silent: true,
    });
    expect(soft.found).toBe(true);
    expect(soft.exitCode).toBe(0);
    expect(soft.ok).toBe(true);

    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('clean tree exits 0 under --strict', async () => {
    const tmp = joinPath(ROOT, 'tmp/audit-bunfig-policy-clean');
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}`.quiet();
    await Bun.write(joinPath(tmp, 'bunfig.toml'), `[install]\nfrozenLockfile = true\n`);

    const r = await auditBunfig({
      root: tmp,
      strict: true,
      quietPm: true,
      silent: true,
      env: {},
    });
    expect(r.found).toBe(false);
    expect(r.exitCode).toBe(0);
    expect(r.forbiddenEnv).toEqual([]);

    await Bun.$`rm -rf ${tmp}`.quiet();
  });
});
