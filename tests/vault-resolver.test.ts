// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/vault-resolver.ts');

describe('vault-resolver', () => {
  test('--json emits inventory without secret values', async () => {
    const proc = Bun.spawn(['bun', CLI, '--json'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    const body = JSON.parse(out) as {
      kind: string;
      count: number;
      entries: { envKey: string; passRef: string | null }[];
    };
    expect(body.kind).toBe('vault-resolve-inventory');
    expect(body.count).toBeGreaterThan(0);
    expect(body.entries.some(e => e.envKey === 'CLOUDFLARE_API_TOKEN')).toBe(true);
    expect(out).toContain('pass://');
    // No long opaque token material
    expect(out).not.toMatch(/cfat_[A-Za-z0-9]{20,}/);
  });

  test('--check exits 0 when pass-cli on PATH (session optional)', async () => {
    const proc = Bun.spawn(['bun', CLI, '--check'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
    // pass-cli present on this machine → 0 even if session corrupt
    if (Bun.which('pass-cli')) {
      expect(code).toBe(0);
      expect(out).toMatch(/pass-cli: (ok|no-session|error)/);
    } else {
      expect(code).toBe(1);
      expect(out).toContain('not-found');
    }
    expect(out).toContain('vault-map:');
  });
});
