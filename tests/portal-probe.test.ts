// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { listWorkspacePackageJsons } from '../tools/portal-probe.ts';

describe('portal-probe', () => {
  test('listWorkspacePackageJsons finds packages/*', async () => {
    const paths = await listWorkspacePackageJsons();
    expect(paths.some(p => p.startsWith('packages/'))).toBe(true);
    expect(paths.some(p => p.endsWith('package.json'))).toBe(true);
    expect(paths.some(p => p.includes('registry-client'))).toBe(true);
  });

  test('runtime probe exits 0', async () => {
    const proc = Bun.spawn(['bun', 'tools/portal-probe.ts', 'runtime', '--json'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    expect(code).toBe(0);
    const j = JSON.parse(out);
    expect(j.name).toBe('runtime');
    expect(j.ok).toBe(true);
    expect(j.detail.version).toBe(Bun.version);
  });

  test('scope probe returns scope string', async () => {
    const proc = Bun.spawn(['bun', 'tools/portal-probe.ts', 'scope', '--json'], {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, PORTAL_SCOPE: 'portal' },
    });
    const out = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    const j = JSON.parse(out);
    expect(j.detail.scope).toBe('portal');
    expect(j.detail.source).toBe('PORTAL_SCOPE');
  });
});
