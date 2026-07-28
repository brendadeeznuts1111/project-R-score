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
    const source = `// npm install\nconst docs = "yarn install";\nconsole.info(docs);`;
    expect(findBlockedInstallCommands(source, 'sample.ts', true)).toEqual([]);
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
