import { describe, expect, test } from 'bun:test';
import { evaluateBunPmCache } from '../scripts/check-bun-pm-cache';
import { findBlockedInstallCommands } from '../scripts/check-npm-install';
import type { BunCacheMetrics } from '../scripts/lib/bun-cache-metrics';

function metrics(overrides: Partial<BunCacheMetrics> = {}): BunCacheMetrics {
  return {
    collectedAt: '2026-07-28T00:00:00.000Z',
    cacheDir: '/tmp/bun-cache',
    cacheDirExists: true,
    sizeBytes: 1024,
    sizeHuman: '1 KiB',
    globalStoreLinksDir: '/tmp/bun-cache/links',
    linksEntries: 1,
    globalStoreEnv: '1',
    bunPmCachePath: '/tmp/bun-cache',
    bunxCacheClearedEstimate: null,
    ...overrides,
  };
}

describe('root install policy gate', () => {
  test('finds executable non-Bun install commands', () => {
    expect(findBlockedInstallCommands('npm ci\npnpm install\nbun install')).toHaveLength(2);
  });

  test('ignores TypeScript comments and string literals', () => {
    const source = [
      `// Bun.spawn(['npm', 'install']);`,
      `const docs = "yarn install";`,
      `const example = 'exec("pnpm install")';`,
      `console.info(docs, example);`,
    ].join('\n');
    expect(findBlockedInstallCommands(source, 'sample.ts', true)).toEqual([]);
  });

  test('detects executable Bun.spawn, Bun shell, and exec command literals', () => {
    const source = [
      `Bun.spawn(['npm', 'install']);`,
      'await Bun.$`pnpm install`;',
      `exec('yarn install');`,
      `spawn('npm', ['ci']);`,
      `Bun.spawnSync(['pnpm', 'install']);`,
      `execFileSync('yarn install');`,
      `Bun.spawn(['bun', 'install']);`,
    ].join('\n');

    expect(findBlockedInstallCommands(source, 'sample.ts', true)).toEqual([
      expect.objectContaining({ line: 1, rule: 'npm install' }),
      expect.objectContaining({ line: 2, rule: 'pnpm install' }),
      expect.objectContaining({ line: 3, rule: 'yarn install' }),
      expect.objectContaining({ line: 4, rule: 'npm install' }),
      expect.objectContaining({ line: 5, rule: 'pnpm install' }),
      expect.objectContaining({ line: 6, rule: 'yarn install' }),
    ]);
  });
});

describe('Bun cache policy gate', () => {
  test('accepts matching, measurable cache paths', () => {
    expect(evaluateBunPmCache(metrics()).every(check => check.ok)).toBe(true);
  });

  test('rejects cache-path drift', () => {
    const checks = evaluateBunPmCache(metrics({ bunPmCachePath: '/tmp/other-cache' }));
    expect(checks.find(check => check.label === 'cache path agreement')?.ok).toBe(false);
  });
});
