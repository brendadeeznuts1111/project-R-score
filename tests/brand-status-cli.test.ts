// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/bun-apis#bun-spawn — Bun.spawn
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = `${ROOT}/tools/brand-status.ts`;

async function runBrandStatus(
  argv: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', CLI, ...argv], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1', FORCE_COLOR: undefined },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

describe('brand-status CLI', () => {
  test('--json --once emits brand-status snapshot with planes + lineage', async () => {
    const { code, stdout } = await runBrandStatus(['--json', '--once']);
    expect(code).toBe(0);
    const snap = JSON.parse(stdout) as {
      kind: string;
      apex: string;
      planes: Array<{ property?: string; default?: string }>;
      serveShape: Array<{ property: string; default: string; fallback: string }>;
      lineage: { host: string; transitions: Array<{ step: string }> } | null;
    };
    expect(snap.kind).toBe('brand-status');
    expect(snap.apex).toBe('factory-wager.com');
    expect(snap.planes.length).toBeGreaterThanOrEqual(13);
    expect(snap.planes.some(p => p.property === 'server.port' && p.default?.includes('BUN_PORT'))).toBeTrue();
    expect(snap.serveShape.some(r => r.property === 'server.url')).toBeTrue();
    expect(snap.lineage?.host).toBe('score.factory-wager.com');
    expect(snap.lineage?.transitions.some(t => t.step === '4.accessPath')).toBeTrue();
  });

  test('--plane dns --once filters HOST PLANES', async () => {
    const { code, stdout } = await runBrandStatus(['--plane', 'dns', '--once']);
    expect(code).toBe(0);
    expect(stdout).toContain('HOST PLANES');
    expect(stdout).toContain('plane=dns');
    expect(stdout).toContain('HostId');
    expect(stdout).not.toContain('\nDOMAINS\n');
  });

  test('--plane bind --once shows SERVER/URL defaults columns', async () => {
    const { code, stdout } = await runBrandStatus(['--plane', 'bind', '--once']);
    expect(code).toBe(0);
    expect(stdout).toContain('SERVER / URL');
    expect(stdout).toContain('server.port');
    expect(stdout).toContain('BUN_PORT');
    expect(stdout).toContain('fallback');
  });

  test('--lineage --once prints live transition steps', async () => {
    const { code, stdout } = await runBrandStatus([
      '--lineage',
      'score.factory-wager.com',
      '--once',
    ]);
    expect(code).toBe(0);
    expect(stdout).toContain('LINEAGE');
    expect(stdout).toContain('splitHostId');
    expect(stdout).toContain('accessDomainFromHost');
    expect(stdout).toContain('httpsUrlForAccessDomain');
  });

  test('--help lists repl commands', async () => {
    const { code, stdout } = await runBrandStatus(['--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('--json');
    expect(stdout).toContain('access <host>');
    expect(stdout).toContain('lineage');
  });
});
