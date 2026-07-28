// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/install#default-strategy
// @see https://bun.com/docs/pm/isolated-installs
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  checkLinkerConfigVersion,
  filterDoctorChecks,
  formatAgeFromIso,
  formatDoctorSummaryFooter,
  formatPortalDoctor,
  formatPortalDoctorVerbose,
  runPortalDoctor,
  summarizeDoctorChecks,
} from '../tools/lib/portal-cli-doctor.ts';
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
    expect(formatDoctorSummaryFooter(s)).toContain('2/3 passed');
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
  });

  test('runPortalDoctor is OK on monorepo root (default)', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false });
    expect(r.kind).toBe('portal-cli-doctor');
    expect(r.schemaVersion).toBe(3);
    expect(r.ok).toBe(true);
    const linker = r.checks.find(c => c.id === 'linker-config-version');
    expect(linker?.ok).toBe(true);
    expect(linker?.group).toBe('linker');
    expect(linker?.envScope).toBe('all');
    expect(r.summary.passed).toBe(r.summary.checkCount);
    expect(r.summary.failed).toBe(0);
    const text = formatPortalDoctor(r);
    expect(text).toContain('Linker policy:');
    expect(text).toContain('Offline bakes:');
    expect(text).toContain('linker-config-version');
    expect(text).toMatch(/\d+\/\d+ passed/);
  });

  test('verbose format includes status table and remediation section', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false, verbose: true });
    const text = formatPortalDoctorVerbose(r);
    expect(text).toContain('verbose');
    expect(text).toMatch(/status|pass|FAIL/i);
    expect(text).toContain('Remediation detail');
    expect(text).toContain('Linker policy reference');
    expect(text).toContain('default-strategy');
  });

  test('PORTAL_CLI_COMMANDS includes doctor', () => {
    expect(PORTAL_CLI_COMMANDS.has('doctor')).toBe(true);
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
    expect(out).toContain('portal doctor');
    expect(out).toContain('linker-config-version');
    expect(out).toContain('configVersion=1');
    expect(out).toContain('Linker policy:');
  });

  test('doctor --json is machine-readable with summary + groups', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor', '--json'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    const j = JSON.parse(out);
    expect(j.kind).toBe('portal-cli-doctor');
    expect(j.schemaVersion).toBe(3);
    expect(j.ok).toBe(true);
    expect(j.summary?.passed).toBe(j.summary?.checkCount);
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

  test('doctor --verbose prints extended columns', async () => {
    const proc = Bun.spawn(['bun', CLI, 'doctor', '--verbose'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('verbose');
    expect(out).toMatch(/Summary:|passed/);
  });

  test('root help lists doctor', async () => {
    const proc = Bun.spawn(['bun', CLI, 'help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('doctor');
  });
});
