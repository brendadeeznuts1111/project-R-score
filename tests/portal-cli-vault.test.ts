// @see https://bun.com/docs/test
// @see https://bun.com/docs/test/snapshots
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli vault health', () => {
  test('vault health exits 0 (snapshot gate)', async () => {
    const proc = Bun.spawn(['bun', CLI, 'vault', 'health'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
    expect(code).toBe(0);
    expect(out.includes('vault-health') || out.includes('pass')).toBe(true);
  });

  test('vault help mentions --update and bake', async () => {
    const proc = Bun.spawn(['bun', CLI, 'vault', 'help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('--update');
    expect(out).toContain('vault:health:bake');
  });
});
