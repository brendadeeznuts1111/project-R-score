// @see https://bun.com/docs/test — bun:test
import { afterEach, describe, expect, test } from 'bun:test';
import {
  loadEnhancementRegistry,
  parseEnhancementRegistry,
} from '../lib/enhancements/registry.ts';
import { resolveEnhancementRegistry } from '../lib/enhancements/resolver.ts';
import { EnhancementStore } from '../lib/enhancements/store.ts';
import { publicEnhancementSnapshot } from '../lib/enhancements/public.ts';

const stores: EnhancementStore[] = [];
const originalNodeEnv = Bun.env.NODE_ENV;

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  if (originalNodeEnv === undefined) delete Bun.env.NODE_ENV;
  else Bun.env.NODE_ENV = originalNodeEnv;
});

describe('Bun enhancement registry', () => {
  test('resolves lifecycle defaults separately from runtime availability', async () => {
    const registry = await loadEnhancementRegistry();
    const production = resolveEnhancementRegistry(registry, {
      environment: 'production',
      env: {},
      bunVersion: '1.3.14',
    });
    const staging = resolveEnhancementRegistry(registry, {
      environment: 'staging',
      env: {},
      bunVersion: '1.3.14',
    });

    expect(production.items.find(item => item.id === 'bun-jsonc')?.available).toBe(true);
    expect(production.items.find(item => item.id === 'bun-jsonc')?.enabled).toBeNull();
    expect(production.items.find(item => item.id === 'bun-image')?.enabled).toBe(false);
    expect(staging.items.find(item => item.id === 'bun-image')?.enabled).toBe(false);
    expect(staging.items.find(item => item.id === 'bun-cron')?.enabled).toBe(false);
  });

  test('allows beta/experimental overrides but never enables proposals', async () => {
    const registry = await loadEnhancementRegistry();
    const snapshot = resolveEnhancementRegistry(registry, {
      environment: 'production',
      env: { ENABLE_BUN_IMAGE: '1', ENABLE_BUN_CRON: '1' },
    });
    expect(snapshot.items.find(item => item.id === 'bun-image')?.enabled).toBe(true);
    expect(snapshot.items.find(item => item.id === 'bun-cron')?.enabled).toBe(false);
  });

  test('fails closed on malformed flags and duplicate ids', async () => {
    const registry = await loadEnhancementRegistry();
    expect(() =>
      resolveEnhancementRegistry(registry, {
        env: { ENABLE_BUN_IMAGE: 'sometimes' },
      })
    ).toThrow('true/false/1/0');
    const duplicate = JSON.stringify({
      version: registry.version,
      items: [registry.items[0], registry.items[0]],
    });
    expect(() => parseEnhancementRegistry(duplicate)).toThrow('duplicate enhancement id');
  });

  test('public artifact exposes decisions without promotion internals', async () => {
    const registry = await loadEnhancementRegistry();
    const artifact = publicEnhancementSnapshot(resolveEnhancementRegistry(registry));
    expect(artifact.items.map(item => item.id)).toEqual(
      expect.arrayContaining([
        'bun-test-isolate',
        'bun-test-changed',
        'sha3',
        'bun-markdown-cli',
        'bun-no-orphans',
        'bun-runtime-1-4',
      ])
    );
    expect(artifact.items[0]).toHaveProperty('available');
    expect(artifact.items[0]).toHaveProperty('kind');
    expect(artifact.items[0]).toHaveProperty('minimumBunVersion');
    expect(artifact.items[0]).not.toHaveProperty('bunVersion');
    expect(artifact.items[0]).not.toHaveProperty('promotionCriteria');
  });

  test('matches prerelease canaries without pretending compatibility lanes are flags', async () => {
    const registry = await loadEnhancementRegistry();
    const snapshot = resolveEnhancementRegistry(registry, {
      environment: 'test',
      env: {},
      bunVersion: '1.4.0-canary.1+8326d1bd3',
    });
    const lane = snapshot.items.find(item => item.id === 'bun-runtime-1-4');
    expect(lane?.kind).toBe('compatibility-lane');
    expect(lane?.available).toBe(true);
    expect(lane?.enabled).toBeNull();
    expect(lane?.featureFlag).toBeNull();
  });

  test('development watcher swaps only complete valid snapshots', async () => {
    Bun.env.NODE_ENV = 'development';
    const registry = await loadEnhancementRegistry();
    const tempPath = `${Bun.env.TMPDIR ?? '/tmp'}/enhancement-registry-${Bun.randomUUIDv7()}.jsonc`;
    await Bun.write(tempPath, JSON.stringify(registry));
    const store = new EnhancementStore(tempPath);
    stores.push(store);
    await store.load();

    const reloaded = new Promise<void>(resolve => {
      void store.startDevelopmentWatcher(snapshot => {
        if (snapshot.version === '2026-08-17') resolve();
      });
    });
    await Bun.sleep(25);
    await Bun.write(tempPath, JSON.stringify({ ...registry, version: '2026-08-17' }));
    await Promise.race([
      reloaded,
      Bun.sleep(1_000).then(() => {
        throw new Error('watcher did not reload');
      }),
    ]);
    expect(store.snapshot.version).toBe('2026-08-17');

    await Bun.write(tempPath, '{ invalid');
    await Bun.sleep(150);
    expect(store.snapshot.version).toBe('2026-08-17');
  });
});
