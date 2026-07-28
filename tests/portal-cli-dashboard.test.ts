// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli dashboard', () => {
  test('prints tools hub URL by default', async () => {
    const proc = Bun.spawn(['bun', CLI, 'dashboard'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, PORTAL_BASE_URL: 'https://score.factory-wager.com' },
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('https://score.factory-wager.com/portal/tools/');
    expect(out).toContain('127.0.0.1:8787');
  });

  test('accepts path argument', async () => {
    const proc = Bun.spawn(['bun', CLI, 'dashboard', '/portal/vault/'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, PORTAL_BASE_URL: 'https://example.test' },
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('https://example.test/portal/vault/');
  });

  test('--view=packages maps to packages board', async () => {
    const proc = Bun.spawn(['bun', CLI, 'dashboard', '--view=packages'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, PORTAL_BASE_URL: 'https://score.factory-wager.com' },
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('/portal/packages/');
  });

  test('--view=capabilities uses tools hash', async () => {
    const proc = Bun.spawn(['bun', CLI, 'dashboard', '--view=capabilities'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, PORTAL_BASE_URL: 'https://score.factory-wager.com' },
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('/portal/tools/#capabilities');
  });
});
