// @see https://bun.com/docs/typescript-6 — types allowlist
// @see https://bun.com/docs/runtime/child-process — Bun.spawnSync
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun';

const ROOT = resolvePath(import.meta.dir, '..');

describe('check:tsconfig-types audit', () => {
  test(
    'repo has zero monorepo TS6 risk and zero bun-types labels',
    async () => {
      // Full monorepo walk can exceed default 5s under load
      const r = Bun.spawnSync({
        cmd: ['bun', 'tools/tsconfig-types-audit.ts'],
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(r.exitCode).toBe(0);

      const inv = (await Bun.file(resolvePath(ROOT, '.tmp/tsconfig-types-audit.json')).json()) as {
        summary: {
          omit: number;
          bunTypes: number;
          bunOk: number;
          total: number;
          monorepoRisk?: number;
        };
      };
      // Full checkout has ~80 configs; staged-temp exports can be thinner.
      expect(inv.summary.total).toBeGreaterThan(10);
      // Tool exits ok when monorepo_risk=0 even if leaf/archive packages still
      // carry TS6-risk "omit" (8 tracked outside monorepo spine). Gate risk + labels.
      expect(inv.summary.monorepoRisk ?? 0).toBe(0);
      expect(inv.summary.bunTypes).toBe(0);
      expect(inv.summary.bunOk).toBeGreaterThan(0);
    },
    { timeout: 60_000 }
  );
});
