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
  parseDoctorEnv,
  parseDoctorGroup,
  parseDoctorGroupsFromArgv,
  runPortalDoctor,
  summarizeDoctorChecks,
} from '../tools/lib/portal-cli-doctor.ts';
import { runCatalogChecks } from '../tools/lib/portal-cli-doctor-catalog.ts';
import {
  MACHINE_OWNED_INSTALL_KEYS,
  REQUIRED_RELEASE_AGE_EXCLUDES,
  runBunfigChecks,
} from '../tools/lib/portal-cli-doctor-bunfig.ts';
import { toDoctorState, DOCTOR_STATE_KIND } from '../tools/bake-doctor.ts';
import { PORTAL_CLI_COMMANDS } from '../tools/lib/portal-cli-bun-flags.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli doctor pure', () => {
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
    expect(formatDoctorSummaryFooter(s)).toContain('passed=2/3');
    expect(formatDoctorSummaryFooter(s)).toContain('bake:capabilities');
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
    const r = await runPortalDoctor({ cwd: ROOT, full: false, skipLiveAccess: true });
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
    const text = formatPortalDoctor(r);
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
    const text = formatPortalDoctorVerbose(r);
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
    expect(r.checks).toHaveLength(6);
    expect(r.checks.every(c => c.group === 'bunfig')).toBe(true);
    expect(r.ok).toBe(true);
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
    expect(checks).toHaveLength(6);
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
    const drift = diffDoctorStates(a, { ...a, tone: 'red' as const });
    expect(drift.some(l => l.startsWith('tone:'))).toBe(true);
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
    expect(r.checks).toHaveLength(2);
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
    expect(r.checks.find(c => c.id === 'infra-ledger-access')?.message).toMatch(/policy/);
    expect(r.checks.find(c => c.id === 'infra-ledger-access')?.ok).toBe(true);
  });

  test('--env ci drops envScope=dev checks', async () => {
    const all = await runPortalDoctor({ cwd: ROOT, full: false, skipLiveAccess: true });
    const ci = await runPortalDoctor({ cwd: ROOT, full: false, env: 'ci', skipLiveAccess: true });
    expect(ci.env).toBe('ci');
    expect(ci.checks.find(c => c.id === 'catalog-deprecated-flags')).toBeUndefined();
    expect(all.checks.find(c => c.id === 'catalog-deprecated-flags')).toBeTruthy();
    expect(ci.summary.checkCount).toBeLessThan(all.summary.checkCount);
  });

  test('parseDoctorGroup / parseDoctorEnv / filterDoctorByScope', () => {
    expect(parseDoctorGroup('catalog')).toBe('catalog');
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
});

describe('portal-cli doctor CLI', () => {
  test('doctor exits 0 and reports linker configVersion', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor'], {
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
