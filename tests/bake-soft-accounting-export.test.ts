// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
import { describe, expect, test } from 'bun:test';
import {
  resolveBunExecutable,
  resolveTocOpsRepo,
} from '../tools/bake-soft-accounting-export.ts';

describe('soft:accounting:from-ct spawn resolution', () => {
  test('resolveBunExecutable prefers Bun.which or process.execPath', () => {
    const bin = resolveBunExecutable();
    expect(bin.length).toBeGreaterThan(0);
    expect(bin).not.toBe('bun');
    expect(bin === Bun.which('bun') || bin === process.execPath).toBe(true);
  });

  test('resolveTocOpsRepo finds Soft checkout from factory root or worktree', async () => {
    const repo = await resolveTocOpsRepo();
    expect(await Bun.file(`${repo}/package.json`).exists()).toBe(true);
    // Soft package name is toc-ops (or similar) — require ct script presence
    const pkg = (await Bun.file(`${repo}/package.json`).json()) as {
      scripts?: Record<string, string>;
    };
    expect(typeof pkg.scripts?.ct === 'string' || typeof pkg.scripts?.['soft-accounting-export'] === 'string').toBe(
      true
    );
  });

  test('missing cwd was the ENOENT red herring — resolve rejects empty path', async () => {
    await expect(resolveTocOpsRepo('/tmp/factorywager-no-soft-here')).rejects.toThrow(
      /toc-ops-repo not found/
    );
  });
});
