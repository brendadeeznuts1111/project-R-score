// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/install#default-strategy
// @see https://bun.com/docs/pm/isolated-installs
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  checkLinkerConfigVersion,
  formatPortalDoctor,
  runPortalDoctor,
} from '../tools/lib/portal-cli-doctor.ts';
import { PORTAL_CLI_COMMANDS } from '../tools/lib/portal-cli-bun-flags.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli doctor pure', () => {
  test('linker check passes for monorepo configVersion=1', async () => {
    const c = await checkLinkerConfigVersion(ROOT);
    expect(c.id).toBe('linker-config-version');
    expect(c.ok).toBe(true);
    expect(c.message).toContain('configVersion=1');
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

  test('runPortalDoctor is OK on monorepo root (default)', async () => {
    const r = await runPortalDoctor({ cwd: ROOT, full: false });
    expect(r.kind).toBe('portal-cli-doctor');
    expect(r.schemaVersion).toBe(2);
    expect(r.ok).toBe(true);
    const linker = r.checks.find(c => c.id === 'linker-config-version');
    expect(linker?.ok).toBe(true);
    expect(linker?.fixCommand).toBeTruthy();
    expect(linker?.autoFixable).toBe(false);
    expect(linker?.envScope).toBe('all');
    expect(r.summary.fatal).toBeGreaterThanOrEqual(2);
    expect(formatPortalDoctor(r)).toContain('linker-config-version');
    expect(formatPortalDoctor(r)).toContain('Summary:');
  });

  test('verbose format includes fix table columns', async () => {
    const { formatPortalDoctorVerbose } = await import('../tools/lib/portal-cli-doctor.ts');
    const r = await runPortalDoctor({ cwd: ROOT, full: false, verbose: true });
    const text = formatPortalDoctorVerbose(r);
    expect(text).toContain('verbose');
    expect(text).toMatch(/fix|auto|scope/i);
    expect(text).toContain('impact');
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
  });

  test('doctor --json is machine-readable with summary + fix metadata', async () => {
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
    expect(j.schemaVersion).toBe(2);
    expect(j.ok).toBe(true);
    expect(j.summary?.fatal).toBeGreaterThanOrEqual(2);
    expect(
      j.checks.some((c: { id: string /* brand-ok — opaque check key */ }) => c.id === 'linker-config-version')
    ).toBe(true);
    const linker = j.checks.find(
      (c: { id: string /* brand-ok */ }) => c.id === 'linker-config-version'
    );
    expect(linker?.fixCommand).toBeTruthy();
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
    expect(out).toContain('Summary:');
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
