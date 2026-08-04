// @see https://bun.com/docs/typescript-6 — types allowlist
// @see https://bun.com/docs/runtime/child-process — Bun.spawnSync
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('check:tsconfig-types audit', () => {
  test('repo has zero TS6-risk omit and zero bun-types labels', async () => {
    const r = Bun.spawnSync({
      cmd: ['bun', 'tools/tsconfig-types-audit.ts'],
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(r.exitCode).toBe(0);

    const inv = (await Bun.file(resolvePath(ROOT, '.tmp/tsconfig-types-audit.json')).json()) as {
      summary: { omit: number; bunTypes: number; bunOk: number; total: number };
    };
    expect(inv.summary.total).toBeGreaterThan(50);
    expect(inv.summary.omit).toBe(0);
    expect(inv.summary.bunTypes).toBe(0);
    expect(inv.summary.bunOk).toBeGreaterThan(50);
  });
});
