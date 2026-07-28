// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');
const BAKE_ALL = resolvePath(ROOT, 'tools/bake-all.ts');

async function run(
  args: string[],
  cmd: string = CLI
): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(['bun', cmd, ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const code = await proc.exited;
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  return { code, out, err };
}

describe('portal-cli badge', () => {
  test('prints offline badge table for the four nav boards', async () => {
    const { code, out } = await run(['badge']);
    expect(code).toBe(0);
    expect(out.includes('/portal/failures/')).toBe(true);
    expect(out.includes('/portal/vault/')).toBe(true);
    expect(out.includes('/portal/packages/')).toBe(true);
    expect(out.includes('/portal/health/')).toBe(true);
  });

  test('badge --json prints parseable rows with tone', async () => {
    const { code, out } = await run(['badge', '--json']);
    expect(code).toBe(0);
    const rows = JSON.parse(out) as Array<{ board: string; tone: string }>;
    expect(rows.length).toBe(4);
    expect(rows.every(r => typeof r.tone === 'string' && r.tone.length > 0)).toBe(true);
  });

  test('badge rejects unknown flags', async () => {
    const { code, err } = await run(['badge', '--wat']);
    expect(code).not.toBe(0);
    expect(err.includes('Unknown badge flag')).toBe(true);
  });
});

describe('portal-cli dashboard --list', () => {
  test('prints the known view → path map', async () => {
    const { code, out } = await run(['dashboard', '--list']);
    expect(code).toBe(0);
    expect(out.includes('packages')).toBe(true);
    expect(out.includes('/portal/packages/')).toBe(true);
    expect(out.includes('vault')).toBe(true);
  });
});

describe('bake:all', () => {
  test('--list shows offline steps and vault skips without running', async () => {
    const { code, out } = await run(['--list'], BAKE_ALL);
    expect(code).toBe(0);
    for (const step of ['capabilities', 'chrome', 'packages', 'failures', 'health', 'ops']) {
      expect(out.includes(step)).toBe(true);
    }
    expect(out.includes('vault:health:bake')).toBe(true); // listed as skipped
  });

  test('--dry-run prints commands without executing', async () => {
    const { code, out } = await run(['--dry-run'], BAKE_ALL);
    expect(code).toBe(0);
    expect(out.includes('$ capabilities')).toBe(true);
    expect(out.includes('audit:packages')).toBe(true);
  });

  test('--only=bogus exits non-zero with known steps', async () => {
    const { code, err } = await run(['--only=bogus'], BAKE_ALL);
    expect(code).not.toBe(0);
    expect(err.includes('Unknown bake step')).toBe(true);
  });

  test('--only filters the step list', async () => {
    const { code, out } = await run(['--dry-run', '--only=capabilities,failures'], BAKE_ALL);
    expect(code).toBe(0);
    expect(out.includes('capabilities')).toBe(true);
    expect(out.includes('failures')).toBe(true);
    expect(out.includes('$ compliance')).toBe(false);
  });
});
