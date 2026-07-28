// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/pm — bun pm
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli pm passthrough', () => {
  test('pm ls exits 0 and lists workspace packages', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'ls'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    // Root monorepo workspaces appear in bun pm ls
    expect(out.includes('@factorywager/') || out.includes('workspace:')).toBe(true);
  });

  test('pm pkg get name returns root package name', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'pkg', 'get', 'name'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = (await new Response(proc.stdout).text()).trim();
    expect(code).toBe(0);
    expect(out.includes('factorywager') || out.includes('"name"')).toBe(true);
  });
});
