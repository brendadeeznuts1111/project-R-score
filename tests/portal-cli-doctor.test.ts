// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/install#default-strategy
// @see https://bun.com/docs/pm/isolated-installs
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  checkLinkerConfigVersion,
  filterDoctorByScope,
  filterDoctorChecks,
  formatAgeFromIso,
  formatDoctorSummaryFooter,
  formatPortalDoctor,
  formatPortalDoctorVerbose,
  isBakeStale,
  parseDoctorEnv,
  parseDoctorGroup,
  parseDoctorGroupsFromArgv,
  runPortalDoctor,
  summarizeDoctorChecks,
  VAULT_HEALTH_STALE_MS,
  type PortalDoctorReport,
} from '../tools/lib/portal-cli-doctor.ts';
import { runCatalogChecks } from '../tools/lib/portal-cli-doctor-catalog.ts';
import {
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
  runBunfigChecks,
} from '../tools/lib/portal-cli-doctor-bunfig.ts';
import { runRuntimeEnvChecks } from '../tools/lib/portal-cli-doctor-runtime-env.ts';
import { toDoctorState, DOCTOR_STATE_KIND } from '../tools/bake-doctor.ts';
import { PORTAL_CLI_COMMANDS } from '../tools/lib/portal-cli-bun-flags.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

async function freshRootDoctorTime(): Promise<number> {
  const bake = (await Bun.file(`${ROOT}/public/registry/vault-health.json`).json()) as {
    generatedAt?: unknown;
  };
  if (typeof bake.generatedAt !== 'string') {
    throw new Error('vault-health fixture must declare generatedAt');
  }
  const generatedAtMs = Date.parse(bake.generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    throw new Error('vault-health fixture generatedAt must be a valid ISO timestamp');
  }
  return generatedAtMs + 60 * 60 * 1000;
}

describe('portal-cli doctor pure', () => {
  test('isBakeStale flags vault-health older than 48h', () => {
    const now = Date.parse('2026-08-05T12:00:00.000Z');
    expect(isBakeStale(undefined, VAULT_HEALTH_STALE_MS, now)).toBe(false);
    expect(isBakeStale('not-a-date', VAULT_HEALTH_STALE_MS, now)).toBe(false);
    expect(isBakeStale('2026-08-05T11:00:00.000Z', VAULT_HEALTH_STALE_MS, now)).toBe(false);
    expect(isBakeStale('2026-08-03T11:59:00.000Z', VAULT_HEALTH_STALE_MS, now)).toBe(true);
    expect(isBakeStale('2026-07-28T17:14:41.828Z', VAULT_HEALTH_STALE_MS, now)).toBe(true);
  });

  test('linker check passes for monorepo configVersion=1', async () => {
    const c = await checkLinkerConfigVersion(ROOT);
    expect(c.id).toBe('linker-config-version');
    expect(c.ok).toBe(true);
    expect(c.group).toBe('linker');
    expect(c.message).toContain('configVersion=1');
    expect(c.fixCommand).toBeUndefined(); // clean when passing
  });

  test('linker check fails when configVersion is 0', async () => {
    const tmp = resolvePath(ROOT, 'tmp/portal-doctor-lock-test');
    await Bun.$`mkdir -p ${tmp}`.quiet();
    await Bun.write(
      `${tmp}/bun.lock`,
      `{\n  "lockfileVersion": 1,\n  "configVersion": 0,\n  "workspaces": { "": {} }\n}\n`
    );
    const c = await checkLinkerConfigVersion(tmp);
    expect(c.ok).toBe(false);
    expect(c.message).toContain('configVersion=0');
    expect(c.fixCommand).toBeTruthy();
    expect(c.autoFixable).toBe(false);
    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('linker check fails when configVersion missing', async () => {
    const tmp = resolvePath(ROOT, 'tmp/portal-doctor-lock-missing');
    await Bun.$`mkdir -p ${tmp}`.quiet();
    await Bun.write(`${tmp}/bun.lock`, `{\n  "lockfileVersion": 1,\n  "workspaces": {}\n}\n`);
    const c = await checkLinkerConfigVersion(tmp);
    expect(c.ok).toBe(false);
    expect(c.message.toLowerCase()).toContain('missing');
    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('formatAgeFromIso produces human ages', () => {
    const now = Date.parse('2026-07-28T12:00:00.000Z');
    expect(formatAgeFromIso('2026-07-28T11:59:00.000Z', now)).toBe('1m ago');
    expect(formatAgeFromIso('2026-07-28T10:00:00.000Z', now)).toBe('2h ago');
    expect(formatAgeFromIso('2026-07-25T12:00:00.000Z', now)).toBe('3d ago');
  });

  test('summarizeDoctorChecks counts passed/failed and auto-fix suggestions', () => {
    const s = summarizeDoctorChecks([
      {
        id: 'a',
        level: 'fatal',
        group: 'linker',
        ok: true,
        message: 'ok',
      },
      {
        id: 'b',
        level: 'warn',
        group: 'bakes',
        ok: false,
        message: 'miss',
        autoFixable: true,
        fixCommand: 'bun run bake:capabilities',
      },
      {
        id: 'c',
        level: 'info',
        group: 'bakes',
        ok: true,
        message: 'ok',
      },
    ]);
    expect(s.checkCount).toBe(3);
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.autoFixableFailed).toBe(1);
    expect(s.suggested).toEqual(['bun run bake:capabilities']);
    expect(formatDoctorSummaryFooter(s, false, 'plain')).toContain('passed=2/3');
    expect(formatDoctorSummaryFooter(s, false, 'plain')).toContain('bake:capabilities');
  });

  test('filterDoctorChecks failed-only keeps failures', () => {
    const checks = [
      {
        id: 'linker-config-version',
        level: 'fatal' as const,
        group: 'linker' as const,
        ok: true,
        message: 'ok',
      },
      {
        id: 'vault-health-bake',
        level: 'warn' as const,
        group: 'bakes' as const,
        ok: false,
        message: 'miss',
      },
    ];
    const f = filterDoctorChecks(checks, true);
    expect(f).toHaveLength(1);
    expect(f[0]!.id).toBe('vault-health-bake');
    // green tree → empty list (header/summary still report counts)
    expect(
      filterDoctorChecks(
        checks.map(c => ({ ...c, ok: true })),
        true
      )
    ).toEqual([]);
  });

  test('bunfig env probe allows ephemeral GHA install env', async () => {
    const { isEphemeralCiInstallEnv } = await import('../tools/lib/portal-cli-doctor-bunfig.ts');
    expect(isEphemeralCiInstallEnv({ GITHUB_ACTIONS: 'true' })).toBe(true);
    expect(isEphemeralCiInstallEnv({ FACTORY_BUN_CI: '1' })).toBe(true);
    expect(isEphemeralCiInstallEnv({ CI_ALLOW_BUN_INSTALL_ENV: '1' })).toBe(true);
    expect(isEphemeralCiInstallEnv({ CI: 'true' })).toBe(false);
    expect(isEphemeralCiInstallEnv({})).toBe(false);
  });

  test('runPortalDoctor is OK on monorepo root (default)', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      skipLiveAccess: true,
      nowMs: await freshRootDoctorTime(),
    });
    expect(r.kind).toBe('portal-cli-doctor');
    expect(r.schemaVersion).toBe(4);
    expect(r.ok).toBe(true);
    const linker = r.checks.find(c => c.id === 'linker-config-version');
    expect(linker?.ok).toBe(true);
    expect(linker?.group).toBe('linker');
    expect(linker?.envScope).toBe('all');
    expect(r.summary.failedFatal).toBe(0);
    expect(r.ok).toBe(true);
    expect(r.summary.failed).toBe(0);
    const text = formatPortalDoctor(r, { format: 'plain' });
    expect(text).toContain('portal-doctor');
    expect(text).toMatch(/result=ok/);
    expect(text).toContain('Linker policy');
    expect(text).toContain('Offline bakes');
    expect(text).toContain('linker-config-version');
    expect(text).toMatch(/PASS\s+fatal\s+linker-config-version/);
    expect(text).toMatch(/summary\s+passed=\d+\/\d+/);
    // CI format: no box-drawing truncation toys
    expect(text).not.toMatch(/[╭╰│]/);
    expect(text).not.toContain('…');
  });

  test('verbose format includes full fields and remediation section', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, verbose: true, skipLiveAccess: true });
    const text = formatPortalDoctorVerbose(r, { format: 'plain' });
    expect(text).toContain('portal-doctor');
    expect(text).toMatch(/result=ok/);
    expect(text).toContain('## checks');
    expect(text).toContain('## remediation');
    expect(text).toMatch(/PASS\s+group=/);
    expect(text).toContain('default-strategy');
    expect(text).not.toMatch(/[╭╰]/);
  });

  test('PORTAL_CLI_COMMANDS includes doctor and flags', () => {
    expect(PORTAL_CLI_COMMANDS.has('doctor')).toBe(true);
    expect(PORTAL_CLI_COMMANDS.has('flags')).toBe(true);
  });

  test('doctor includes granular catalog SSOT checks', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, skipLiveAccess: true });
    const ids = r.checks.filter(c => c.group === 'catalog').map(c => c.id);
    expect(ids).toEqual([
      'catalog-json-schema',
      'catalog-shortcode-conflict',
      'catalog-bun-help-parity',
      'catalog-help-coverage',
      'catalog-deprecated-flags',
    ]);
    for (const id of ids) {
      expect(r.checks.find(c => c.id === id)?.ok).toBe(true);
    }
    const schema = r.checks.find(c => c.id === 'catalog-json-schema');
    expect(schema?.level).toBe('fatal');
    expect(schema?.autoFixable).toBe(false);
    expect(r.checks.find(c => c.id === 'catalog-help-coverage')?.autoFixable).toBe(false);
    expect(r.checks.find(c => c.id === 'catalog-bun-help-parity')?.level).toBe('fatal');
    expect(r.checks.find(c => c.id === 'catalog-deprecated-flags')?.envScope).toBe('dev');
    expect(formatPortalDoctor(r)).toContain('Catalog SSOT');
  });

  test('runCatalogChecks returns health + five checks', async () => {
    const res = await runCatalogChecks(ROOT);
    expect(res.loadOk).toBe(true);
    expect(res.checks).toHaveLength(5);
    expect(res.health.curated).toBe(14);
    expect(res.health.schemaIssues).toEqual([]);
    expect(res.health.shortcodeConflicts).toEqual([]);
    expect(res.health.bunHelpMisses).toEqual([]);
  });

  test('--group catalog scopes report to catalog checks only', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, group: 'catalog', skipLiveAccess: true });
    expect(r.group).toBe('catalog');
    expect(r.checks.every(c => c.group === 'catalog')).toBe(true);
    expect(r.checks).toHaveLength(5);
    expect(r.ok).toBe(true);
    expect(formatPortalDoctor(r)).toContain('group=catalog');
  });

  test('doctor includes bunfig SSOT checks', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, skipLiveAccess: true });
    const ids = r.checks.filter(c => c.group === 'bunfig').map(c => c.id);
    expect(ids).toEqual([
      'bunfig-machine-ssot',
      'bunfig-xdg-shadow',
      'bunfig-machine-frozen-lockfile',
      'bunfig-project-no-machine-keys',
      'bunfig-merge-consistency',
      'bunfig-release-age-excludes',
      'bunfig-no-install-env-overrides',
    ]);
    for (const id of ids) {
      expect(r.checks.find(c => c.id === id)?.ok).toBe(true);
    }
    expect(formatPortalDoctor(r)).toContain('Bunfig SSOT');
  });

  test('--group bunfig scopes to bunfig checks only', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, group: 'bunfig', skipLiveAccess: true });
    expect(r.group).toBe('bunfig');
    expect(r.checks).toHaveLength(7);
    expect(r.checks.every(c => c.group === 'bunfig')).toBe(true);
    expect(r.checks.some(c => c.group === 'catalog' || c.group === 'infra')).toBe(false);
    expect(r.ok).toBe(true);
  });

  test('bunfig-xdg-shadow fails when $XDG_CONFIG_HOME/.bunfig.toml exists', async () => {
    const tmp = `${ROOT}/tmp/doctor-xdg-shadow`;
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/xdg ${tmp}/home`.quiet();
    await Bun.write(`${tmp}/xdg/.bunfig.toml`, '[install]\nlinker = "hoisted"\n');
    const checks = await runBunfigChecks(ROOT, {
      HOME: `${tmp}/home`,
      XDG_CONFIG_HOME: `${tmp}/xdg`,
    });
    const shadow = checks.find(c => c.id === 'bunfig-xdg-shadow');
    expect(shadow?.ok).toBe(false);
    expect(shadow?.level).toBe('fatal');
    expect(shadow?.message).toContain('shadows');
    const merge = checks.find(c => c.id === 'bunfig-merge-consistency');
    expect(merge?.ok).toBe(false);
    expect(merge?.message).toContain('hoisted');
    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('--group catalog does not emit bunfig or isolated-linker checks', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      group: 'catalog',
      skipLiveAccess: true,
    });
    expect(r.checks.some(c => c.group === 'catalog')).toBe(true);
    expect(r.checks.some(c => c.id === 'machine-isolated-linker')).toBe(false);
    expect(r.checks.some(c => c.id === 'linker-config-version')).toBe(false);
    expect(r.checks.some(c => c.group === 'bunfig')).toBe(false);
    expect(r.checks.some(c => c.group === 'infra')).toBe(false);
  });

  test('machine-isolated-linker uses machineEnv, not process HOME', async () => {
    const tmp = `${ROOT}/tmp/doctor-isolated-env`;
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/home`.quiet();
    await Bun.write(`${tmp}/home/.bunfig.toml`, '[install]\nlinker = "hoisted"\n');
    const r = await runPortalDoctor({
      cwd: ROOT,
      group: 'linker',
      skipLiveAccess: true,
      machineEnv: { HOME: `${tmp}/home` },
    });
    const linker = r.checks.find(c => c.id === 'machine-isolated-linker');
    expect(linker?.ok).toBe(false);
    expect(linker?.message).toContain('hoisted');
    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('bunfig-machine-ssot names a dangling home link, not missing', async () => {
    const tmp = `${ROOT}/tmp/doctor-dangling-home`;
    await Bun.$`rm -rf ${tmp}`.quiet();
    await Bun.$`mkdir -p ${tmp}/home`.quiet();
    const { symlinkSync } = await import('node:fs');
    symlinkSync(`${tmp}/home/missing-target.toml`, `${tmp}/home/.bunfig.toml`);
    const checks = await runBunfigChecks(ROOT, { HOME: `${tmp}/home` });
    const ssot = checks.find(c => c.id === 'bunfig-machine-ssot');
    expect(ssot?.ok).toBe(false);
    expect(ssot?.message).toContain('dangling symlink');
    expect(ssot?.message).not.toContain('file missing');
    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('runtime group reports effective state without exposing BUN_OPTIONS', async () => {
    const secretishOptions = '--preload=pass://vault/private-item/password';
    const checks = runRuntimeEnvChecks({
      FORCE_COLOR: '1',
      NO_COLOR: '1',
      BUN_OPTIONS: secretishOptions,
    });
    expect(checks.map(c => c.id)).toEqual([
      'runtime-env-tls-verification',
      'runtime-env-control-values',
      'runtime-env-effective-state',
    ]);
    expect(checks.every(c => c.group === 'runtime')).toBe(true);
    expect(checks.every(c => c.ok)).toBe(true);
    expect(checks.find(c => c.id === 'runtime-env-effective-state')?.message).toContain(
      'color=forced'
    );
    expect(checks.find(c => c.id === 'runtime-env-effective-state')?.message).toContain(
      'tmp=platform'
    );
    expect(checks.find(c => c.id === 'runtime-env-effective-state')?.message).toContain(
      'reload=default'
    );
    expect(JSON.stringify(checks)).not.toContain(secretishOptions);
  });

  test('--group runtime fails closed when TLS verification is disabled', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      group: 'runtime',
      machineEnv: {
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        BUN_CONFIG_MAX_HTTP_REQUESTS: 'invalid',
      },
      skipLiveAccess: true,
    });
    expect(r.group).toBe('runtime');
    expect(r.checks).toHaveLength(3);
    expect(r.checks.every(c => c.group === 'runtime')).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.summary.failedFatal).toBe(1);
    expect(r.summary.failedWarn).toBe(1);
    expect(formatPortalDoctor(r)).toContain('Runtime environment');
  });

  test('--full wires the native Bun env-loading integration gate', async () => {
    const spawned: string[] = [];
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: true,
      group: 'gates',
      skipLiveAccess: true,
      passSessionProbe: async () => ({
        passCliPath: '/usr/bin/pass-cli',
        ready: true,
        patName: 'factorywager-bot',
        sessionHasLock: false,
        vaults: ['factorywager'],
      }),
      spawn: async argv => {
        spawned.push(argv.join(' '));
        return 0;
      },
    });
    expect(spawned.some(s => s.endsWith('test tests/bun-env-loading.test.ts'))).toBe(true);
    expect(spawned.every(s => !s.startsWith('bun '))).toBe(true);
    expect(r.checks.find(c => c.id === 'runtime-env-native-gate')).toMatchObject({
      group: 'gates',
      level: 'fatal',
      ok: true,
      heavy: true,
    });
    expect(r.checks.find(c => c.id === 'pass-session-ready')?.ok).toBe(true);
  });

  test('runBunfigChecks exports machine key / excludes constants', async () => {
    expect(MACHINE_OWNED_INSTALL_KEYS).toContain('linker');
    expect(MACHINE_OWNED_INSTALL_KEYS).toContain('globalStore');
    expect(REQUIRED_RELEASE_AGE_EXCLUDES).toEqual([
      'bun-types',
      '@types/bun',
      '@types/node',
      'typescript',
    ]);
    const checks = await runBunfigChecks(ROOT);
    expect(checks).toHaveLength(7);
    expect(checks.every(c => c.group === 'bunfig')).toBe(true);
  });

  test('project bunfig leaking machine keys fails project probe', async () => {
    const tmp = resolvePath(ROOT, 'tmp/portal-doctor-bunfig-leak');
    await Bun.$`mkdir -p ${tmp}`.quiet();
    await Bun.write(
      `${tmp}/bunfig.toml`,
      `[install]\nlinker = "hoisted"\nglobalStore = false\n`
    );
    const checks = await runBunfigChecks(tmp);
    const project = checks.find(c => c.id === 'bunfig-project-no-machine-keys');
    expect(project?.ok).toBe(false);
    expect(project?.message).toMatch(/linker|globalStore/);
    await Bun.$`rm -rf ${tmp}`.quiet();
  });

  test('toDoctorState maps report to portal-doctor-state', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, group: 'bunfig', skipLiveAccess: true });
    const state = toDoctorState(r);
    expect(state.kind).toBe(DOCTOR_STATE_KIND);
    expect(state.schemaVersion).toBe(1);
    expect(state.tone).toBe('green');
    expect(state.byGroup.bunfig?.total).toBe(r.checks.length);
    expect(state.checks).toHaveLength(r.checks.length);
    expect(state.board).toBe('/portal/doctor/');
    expect(state.href).toBe('/registry/doctor-state.json');
  });

  test('doctorStateFingerprint ignores generatedAt and messages', async () => {
    const { doctorStateFingerprint, diffDoctorStates } = await import('../tools/bake-doctor.ts');
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      group: 'bunfig',
      skipLiveAccess: true,
    });
    const a = toDoctorState(r);
    const b = {
      ...a,
      generatedAt: '1999-01-01T00:00:00.000Z',
      checks: a.checks.map(c => ({ ...c, message: 'noise' })),
    };
    expect(doctorStateFingerprint(a)).toBe(doctorStateFingerprint(b));
    expect(doctorStateFingerprint(a)).toMatch(/^[0-9a-f]{64}$/);
    // Portable fingerprint recomputes tone from checks — flip a check ok to drift.
    const drifted = {
      ...a,
      checks: a.checks.map((c, i) => (i === 0 ? { ...c, ok: false } : c)),
    };
    const drift = diffDoctorStates(a, drifted);
    expect(drift.some(l => l.startsWith('check '))).toBe(true);
  });

  test('parseDoctorGroupsFromArgv supports multi and comma groups', () => {
    expect(parseDoctorGroupsFromArgv(['--group', 'catalog'])).toEqual(['catalog']);
    expect(parseDoctorGroupsFromArgv(['--group=linker,catalog'])).toEqual([
      'linker',
      'catalog',
    ]);
    expect(
      parseDoctorGroupsFromArgv(['--group', 'linker', '--group', 'catalog'])
    ).toEqual(['linker', 'catalog']);
    expect(parseDoctorGroupsFromArgv([])).toBeUndefined();
  });

  test('multi --group filters with OR', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      groups: ['linker', 'catalog'],
      skipLiveAccess: true,
    });
    expect(r.groups).toEqual(['linker', 'catalog']);
    expect(r.checks.every(c => c.group === 'linker' || c.group === 'catalog')).toBe(true);
    expect(r.checks.some(c => c.group === 'linker')).toBe(true);
    expect(r.checks.some(c => c.group === 'catalog')).toBe(true);
    expect(r.checks.some(c => c.group === 'bakes')).toBe(false);
  });

  test('--group infra includes Access checks', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      group: 'infra',
      env: 'ci',
      skipLiveAccess: false,
      accessFetch: async url => {
        if (String(url).includes('ledger')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/ledger',
              'www-authenticate': 'Cloudflare-Access',
            },
          });
        }
        // portal still public → warn fails
        return new Response('<html></html>', { status: 200 });
      },
    });
    expect(r.group).toBe('infra');
    expect(r.liveAccess).toBe(true);
    expect(r.checks.map(c => c.id)).toContain('infra-ledger-access');
    expect(r.checks.map(c => c.id)).toContain('infra-portal-access');
    expect(r.checks.map(c => c.id)).toContain('infra-access-policy');
    expect(r.checks.find(c => c.id === 'infra-ledger-access')?.ok).toBe(true);
    expect(r.checks.find(c => c.id === 'infra-portal-access')?.ok).toBe(false);
    expect(r.checks.find(c => c.id === 'infra-portal-access')?.level).toBe('warn');
    // only fatals fail the gate
    expect(r.ok).toBe(true);
    expect(formatPortalDoctor(r, { format: 'plain' })).toContain('infra-portal-access');
  });

  test('offline infra uses policy presence not skipped green', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      group: 'infra',
      skipLiveAccess: true,
    });
    expect(r.liveAccess).toBe(false);
    expect(r.checks.map(c => c.id)).toEqual([
      'infra-access-policy',
      'infra-surfaces-state',
      'infra-ledger-access',
      'infra-portal-access',
    ]);
    expect(r.checks.find(c => c.id === 'infra-ledger-access')?.message).toMatch(/policy/);
    expect(r.checks.find(c => c.id === 'infra-ledger-access')?.ok).toBe(true);
    expect(r.checks.find(c => c.id === 'infra-surfaces-state')?.ok).toBe(true);
  });

  test('--env ci drops envScope=dev checks', async () => {
    const all = await runPortalDoctor({ cwd: ROOT, full: false, skipLiveAccess: true });
    const ci = await runPortalDoctor({ cwd: ROOT, full: false, env: 'ci', skipLiveAccess: true });
    expect(ci.env).toBe('ci');
    expect(ci.checks.find(c => c.id === 'catalog-deprecated-flags')).toBeUndefined();
    expect(all.checks.find(c => c.id === 'catalog-deprecated-flags')).toBeTruthy();
    expect(ci.summary.checkCount).toBeLessThan(all.summary.checkCount);
  });

  test('--full pass-session-ready uses injected probe (PAT matrix)', async () => {
    const r = await runPortalDoctor({
      cwd: ROOT,
      full: true,
      skipLiveAccess: true,
      spawn: async () => 0,
      passSessionProbe: async () => ({
        passCliPath: '/usr/bin/pass-cli',
        ready: true,
        patName: 'factorywager-bot',
        sessionHasLock: false,
        vaults: ['factorywager'],
      }),
    });
    const pass = r.checks.find(c => c.id === 'pass-session-ready');
    expect(pass?.ok).toBe(true);
    expect(pass?.group).toBe('gates');
    expect(pass?.envScope).toBe('dev');
    expect(pass?.message).toMatch(/factorywager-bot/);

    const bad = await runPortalDoctor({
      cwd: ROOT,
      full: true,
      skipLiveAccess: true,
      spawn: async () => 0,
      passSessionProbe: async () => ({
        passCliPath: '/usr/bin/pass-cli',
        ready: true,
        patName: 'factorywager-bot',
        sessionHasLock: false,
        vaults: [],
      }),
    });
    expect(bad.checks.find(c => c.id === 'pass-session-ready')?.ok).toBe(false);

    const ciFull = await runPortalDoctor({
      cwd: ROOT,
      full: true,
      env: 'ci',
      skipLiveAccess: true,
      spawn: async () => 0,
      passSessionProbe: async () => ({
        passCliPath: null,
        ready: false,
        patName: null,
        sessionHasLock: null,
        vaults: [],
      }),
    });
    // pass-session-ready is envScope=dev — dropped under --env ci
    expect(ciFull.checks.find(c => c.id === 'pass-session-ready')).toBeUndefined();
  });

  test('parseDoctorGroup / parseDoctorEnv / filterDoctorByScope', () => {
    expect(parseDoctorGroup('catalog')).toBe('catalog');
    expect(parseDoctorGroup('runtime')).toBe('runtime');
    expect(() => parseDoctorGroup('nope')).toThrow(/Unknown doctor --group/);
    expect(parseDoctorEnv('ci')).toBe('ci');
    expect(() => parseDoctorEnv('prod')).toThrow(/Unknown doctor --env/);
    const checks = [
      {
        id: 'a',
        level: 'fatal' as const,
        group: 'linker' as const,
        ok: true,
        message: 'x',
        envScope: 'all' as const,
      },
      {
        id: 'b',
        level: 'info' as const,
        group: 'catalog' as const,
        ok: true,
        message: 'y',
        envScope: 'dev' as const,
      },
    ];
    expect(filterDoctorByScope(checks, { group: 'catalog' }).map(c => c.id)).toEqual(['b']);
    expect(filterDoctorByScope(checks, { env: 'ci' }).map(c => c.id)).toEqual(['a']);
  });

  test('pretty format keeps full messages (no mid-line …) and wraps in frame', async () => {
    const longMsg =
      'lockfile configVersion is isolated-compatible and this sentence is deliberately long so same-line layout cannot fit inside a narrow frame without wrapping or ellipsis';
    const base = await runPortalDoctor({
      cwd: ROOT,
      full: false,
      skipLiveAccess: true,
      nowMs: await freshRootDoctorTime(),
    });
    const checks = base.checks.map((c, i) => (i === 0 ? { ...c, message: longMsg } : c));
    const r: PortalDoctorReport = {
      ...base,
      format: 'pretty',
      checks,
      summary: summarizeDoctorChecks(checks),
    };
    /** Collapse frame wrap + padding so full message is searchable after Bun.wrapAnsi. */
    const flat = (s: string) =>
      s
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/[╭╰│─]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const pretty = formatPortalDoctor(r, { format: 'pretty' });
    expect(pretty).toMatch(/[╭╰│]/);
    expect(flat(pretty)).toContain(longMsg);
    expect(pretty).not.toContain('…');
    expect(pretty).toContain('status: all checks passed');
    expect(pretty).not.toMatch(/All checks green/i);

    const plain = formatPortalDoctor(r, { format: 'plain' });
    expect(plain).not.toMatch(/[╭╰│]/);
    expect(plain).toContain(longMsg);
    expect(plain).toContain('portal-doctor');

    const verbosePretty = formatPortalDoctorVerbose(r, { format: 'pretty' });
    expect(flat(verbosePretty)).toContain(longMsg);
    expect(verbosePretty).not.toContain('…');
    expect(verbosePretty).toMatch(/[╭╰]/);
  });

  test('plain format under CI-style override has no box chars', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, skipLiveAccess: true });
    const text = formatPortalDoctor(r, { format: 'plain' });
    expect(text).not.toMatch(/[╭╰│]/);
    expect(text).not.toContain('…');
    expect(text).toMatch(/summary\s+passed=/);
  });
});

describe('portal-cli doctor CLI', () => {
  test('doctor exits 0 and reports linker configVersion', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor', '--no-write'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('portal-doctor');
    expect(out).toMatch(/result=ok/);
    expect(out).toContain('linker-config-version');
    expect(out).toContain('configVersion=1');
    expect(out).toContain('Linker policy');
    expect(out).not.toMatch(/[╭╰]/);
  });

  test('doctor --json is machine-readable with summary + groups', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor', '--json', '--no-write'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    const j = JSON.parse(out);
    expect(j.kind).toBe('portal-cli-doctor');
    expect(j.schemaVersion).toBe(4);
    expect(j.ok).toBe(true);
    expect(j.summary?.failedFatal).toBe(0);
    // default offline: live Access probes recorded as skipped (use --live-access to hit edge)
    const ledger = j.checks.find((c: { id: string /* brand-ok */ }) => c.id === 'infra-ledger-access');
    expect(ledger?.ok).toBe(true);
    expect(String(ledger?.message ?? '')).toMatch(/skipped|offline/i);
    expect(j.docs?.installIsolated).toContain('isolated-installs');
    expect(
      j.checks.some((c: { id: string /* brand-ok — opaque check key */ }) => c.id === 'linker-config-version')
    ).toBe(true);
    const linker = j.checks.find(
      (c: { id: string /* brand-ok */ }) => c.id === 'linker-config-version'
    );
    expect(linker?.group).toBe('linker');
    expect(typeof linker?.autoFixable).toBe('boolean');
  });

  test('doctor --verbose prints full fields (CI plain)', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor', '--verbose', '--no-write'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, CI: 'true', NO_COLOR: '1' },
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('verbose');
    expect(out).toMatch(/summary\s+passed=/);
    expect(out).toContain('## checks');
    expect(out).not.toMatch(/[╭╰]/);
  });

  test('root help lists doctor and flags', async () => {
    const proc = Bun.spawn(['bun', CLI, 'help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('doctor');
    expect(out).toContain('flags');
  });

  test('doctor help lists the runtime group and value-free checks', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor', '--help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('bunfig | runtime | infra');
    expect(out).toContain('Runtime: TLS verification');
    expect(out).toContain('native env-loading tests');
    expect(out).toContain('doctor --group runtime');
  });

  test('portal-cli flags prints curated table', async () => {
    const proc = Bun.spawn(['bun', CLI, 'flags'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('portal flags');
    expect(out).toContain('--watch');
    expect(out).toContain('config/runtime-flags.json');
  });

  test('portal-cli flags --json is machine-readable', async () => {
    const proc = Bun.spawn(['bun', CLI, 'flags', '--json'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    const j = JSON.parse(out);
    expect(j.kind).toBe('portal-cli-flags');
    expect(j.schemaVersion).toBe(1);
    expect(j.health?.ok).toBe(true);
    expect(j.flags?.length).toBe(14);
  });
});
