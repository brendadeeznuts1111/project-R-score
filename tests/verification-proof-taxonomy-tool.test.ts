// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('tools/verify-proof-taxonomy.ts', () => {
  test('passes when all saved proof artifacts satisfy contracts', async () => {
    const proc = Bun.spawn({
      cmd: ['bun', 'tools/verify-proof-taxonomy.ts'],
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [code, out, err] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    if (code !== 0) {
      console.error(out, err);
    }
    expect(code).toBe(0);
    expect(out).toContain('consistency · ok');
  });

  test('--json emits structured audit rows', async () => {
    const proc = Bun.spawn({
      cmd: ['bun', 'tools/verify-proof-taxonomy.ts', '--json'],
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [code, out] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
    expect(code).toBe(0);
    const body = JSON.parse(out) as {
      ok: boolean;
      type: string;
      audits: Array<{ path: string; ok: boolean; primarySubsystem: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.type).toBe('ProofTaxonomyAuditReport');
    expect(body.audits.length).toBeGreaterThanOrEqual(6);
    expect(body.audits.every(a => a.ok)).toBe(true);
    expect(body.audits.every(a => a.primarySubsystem)).toBe(true);
    expect(Array.isArray(body.consistency)).toBe(true);
    expect(body.consistency.every((c: { ok: boolean }) => c.ok)).toBe(true);
  });

  test('--save writes proof-taxonomy-audit.json for dashboard', async () => {
    const outPath = joinPath(ROOT, 'public/registry/proof-taxonomy-audit.json');
    const proc = Bun.spawn({
      cmd: ['bun', 'tools/verify-proof-taxonomy.ts', '--save'],
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    expect(code).toBe(0);
    const file = Bun.file(outPath);
    expect(await file.exists()).toBe(true);
    const body = (await file.json()) as {
      type: string;
      ok: boolean;
      audits: unknown[];
      consistency: unknown[];
      proofHash?: string;
    };
    expect(body.type).toBe('ProofTaxonomyAuditReport');
    expect(body.ok).toBe(true);
    expect(body.audits.length).toBeGreaterThanOrEqual(6);
    expect(body.consistency.length).toBeGreaterThan(0);
    expect(body.proofHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
