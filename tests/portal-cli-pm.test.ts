// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/pm — bun pm
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli pm passthrough', () => {
  test('bare pm prints short help and exits 0', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    // Short PM_HELP — not a full bun pm dump; lists main subcommands
    expect(out.includes('pack') || out.includes('ls')).toBe(true);
    expect(out.includes('https://bun.com/docs/pm/cli/pm')).toBe(true);
  });

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

  test('pm graph prints offline packages-graph-map table', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out.includes('packages-graph-map') || out.includes('registry-client')).toBe(true);
    expect(out.includes('Rebake') || out.includes('role') || out.includes('score')).toBe(true);
  });
});
