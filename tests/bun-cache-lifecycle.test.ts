// @see https://bun.com/docs/pm/global-cache — Bun package cache
import { describe, expect, test } from 'bun:test';
import {
  runBunCacheLifecycle,
  type BunCacheMetrics,
} from '../scripts/lib/bun-cache-metrics.ts';
import { collectBunPmHealth } from '../scripts/lib/bun-pm-health.ts';

const CACHE_SNAPSHOT: BunCacheMetrics = {
  collectedAt: '2026-08-25T00:00:00.000Z',
  cacheDir: '/tmp/factory-test-cache',
  cacheDirExists: true,
  sizeBytes: 4096,
  sizeHuman: '4 KB',
  globalStoreLinksDir: '/tmp/factory-test-cache/links',
  linksEntries: 2,
  globalStoreEnv: '1',
  bunPmCachePath: '/tmp/factory-test-cache',
  bunxCacheClearedEstimate: null,
};

describe('Bun cache lifecycle snapshot reuse', () => {
  test('lifecycle planning accepts an already-collected cache snapshot', async () => {
    const plan = await runBunCacheLifecycle(
      { dryRun: true, prune: false },
      CACHE_SNAPSHOT
    );

    expect(plan.metrics).toBe(CACHE_SNAPSHOT);
    expect(plan.wouldPrune).toBe(false);
    expect(plan.pruneExecuted).toBe(false);
  });

  test('package-manager health reuses the same cache snapshot', async () => {
    const health = await collectBunPmHealth(undefined, CACHE_SNAPSHOT);
    expect(health.cache).toBe(CACHE_SNAPSHOT);
  });

  test('the lifecycle CLI collects once and fans the snapshot into both consumers', async () => {
    const source = await Bun.file(
      new URL('../scripts/bun-cache-lifecycle.ts', import.meta.url)
    ).text();
    expect(source.match(/collectBunCacheMetrics\(\)/g)?.length).toBe(1);
    expect(source).toContain('runBunCacheLifecycle({ dryRun, prune: args.prune }, cache)');
    expect(source).toContain('collectBunPmHealth(undefined, cache)');
  });
});
