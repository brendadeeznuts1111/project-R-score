// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
import { describe, expect, test } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import {
  assertSoftCtNonEmpty,
  clearBunExecutableCache,
  resolveBunExecutable,
  resolveTocOpsRepo,
  validateSoftCtExport,
} from '../tools/bake-soft-accounting-export.ts';
import {
  SOFT_ACCOUNTING_EXPORT_SCHEMA,
  type SoftAccountingExport,
} from '../lib/telegram/soft-accounting-export.ts';
import { createTestWorkspace, withTestEnvironment } from './harness.ts';

function emptySoftCtExport(): SoftAccountingExport {
  return {
    schema: SOFT_ACCOUNTING_EXPORT_SCHEMA,
    version: '1',
    generatedAt: '2026-07-31T00:00:00.000Z',
    source: 'soft-ct',
    available: false,
    path: '/registry/soft-accounting-export.json',
    plays: [],
    weeks: [],
    byBookType: [],
  };
}

describe('soft-ct empty export governance', () => {
  test('validateSoftCtExport allows schema-valid empty soft-ct', () => {
    expect(() => validateSoftCtExport(emptySoftCtExport())).not.toThrow();
  });

  test('assertSoftCtNonEmpty rejects empty soft-ct for check / from-ct promote', () => {
    expect(() => assertSoftCtNonEmpty(emptySoftCtExport())).toThrow(/0 plays/);
    expect(() => assertSoftCtNonEmpty(emptySoftCtExport())).toThrow(/soft:accounting:bake/);
  });

  test('assertSoftCtNonEmpty accepts non-empty soft-ct', () => {
    const withPlay = {
      ...emptySoftCtExport(),
      available: true,
      plays: [
        {
          playId: 'play-test-001',
          partnerCode: 'ASH',
          stake: 100,
          odds: -110,
          placedAt: '2026-07-13T17:10:00.000Z',
        },
      ],
    } satisfies SoftAccountingExport;
    expect(() => assertSoftCtNonEmpty(withPlay)).not.toThrow();
  });
});

describe('soft:accounting:from-ct spawn resolution', () => {
  test('resolveBunExecutable prefers Bun.which or process.execPath', () => {
    clearBunExecutableCache();
    const bin = resolveBunExecutable();
    expect(bin.length).toBeGreaterThan(0);
    expect(bin).not.toBe('bun');
    expect(bin === Bun.which('bun') || bin === process.execPath).toBe(true);
  });

  test('resolveBunExecutable caches per PATH key', () => {
    clearBunExecutableCache();
    const a = resolveBunExecutable();
    const b = resolveBunExecutable();
    expect(a).toBe(b);
    clearBunExecutableCache();
    const empty = resolveBunExecutable({ PATH: '' });
    expect(empty).toBe(process.execPath);
    // Default PATH cache must not poison empty-PATH resolution
    expect(resolveBunExecutable({ PATH: '' })).toBe(process.execPath);
  });

  test('resolveBunExecutable honors Bun.which PATH option (docs)', () => {
    clearBunExecutableCache();
    // Empty PATH → which miss → execPath fallback (same as Bun.which docs cwd+PATH:"").
    const bin = resolveBunExecutable({ PATH: '' });
    expect(bin).toBe(process.execPath);
    if (Bun.env.PATH) {
      clearBunExecutableCache();
      const viaEnv = resolveBunExecutable({ PATH: Bun.env.PATH });
      expect(viaEnv === Bun.which('bun', { PATH: Bun.env.PATH }) || viaEnv === process.execPath).toBe(
        true
      );
    }
  });

  test('resolveTocOpsRepo finds Soft checkout from factory root or worktree', async () => {
    await using workspace = await createTestWorkspace('soft-checkout-resolution-');
    const softRepo = workspace.resolve('toc-ops-repo');
    await mkdir(softRepo, { recursive: true });
    await Bun.write(
      `${softRepo}/package.json`,
      `${JSON.stringify({ name: 'toc-ops', scripts: { ct: 'bun run src/cli.ts' } }, null, 2)}\n`
    );

    await withTestEnvironment({ TOC_OPS_REPO: undefined }, async () => {
      const repo = await resolveTocOpsRepo(workspace.root);
      expect(repo).toBe(softRepo);
      expect(await Bun.file(`${repo}/package.json`).exists()).toBe(true);
      const pkg = (await Bun.file(`${repo}/package.json`).json()) as {
        scripts?: Record<string, string>;
      };
      expect(
        typeof pkg.scripts?.ct === 'string' ||
          typeof pkg.scripts?.['soft-accounting-export'] === 'string'
      ).toBe(true);
    });
  });

  test('missing cwd was the ENOENT red herring — resolve rejects empty path', async () => {
    await expect(resolveTocOpsRepo('/tmp/factorywager-no-soft-here')).rejects.toThrow(
      /toc-ops-repo not found/
    );
  });

  test('edge: Bun.which null falls back to process.execPath (PATH miss)', () => {
    clearBunExecutableCache();
    // Documented contract: never return bare "bun" — spawn argv0 must be absolute/resolvable.
    const which = Bun.which('bun');
    const bin = resolveBunExecutable();
    if (which == null) expect(bin).toBe(process.execPath);
    else expect(bin).toBe(which);
  });
});
