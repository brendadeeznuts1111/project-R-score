import { describe, expect, test } from 'bun:test';

import {
  contentKeyForDigest,
  loadVerifiedOfflineContent,
  MemoryContentStore,
  type OfflineForbiddenEffects,
} from '../lib/content-store/index.ts';
import { asContentDigest, asContentKey } from '../lib/types/branded.ts';

function forbiddenEffectSentinel() {
  const calls: string[] = [];
  const deny = (name: string) => () => {
    calls.push(name);
    throw new Error(`Offline side effect attempted: ${name}`);
  };
  const effects = {
    fetch: deny('fetch'),
    dns: deny('dns'),
    proxyOrPreconnect: deny('proxy-or-preconnect'),
    registry: deny('registry'),
    feedOrImage: deny('feed-or-image'),
    objectStore: deny('object-store'),
    childProcess: deny('child-process'),
  } satisfies OfflineForbiddenEffects;
  return { calls, effects };
}

describe('offline content guard', () => {
  for (const mode of ['cached-only', 'offline-no-socket'] as const) {
    test(`${mode} serves only verified local bytes with zero external activity`, async () => {
      const sentinel = forbiddenEffectSentinel();
      const store = new MemoryContentStore();
      const bytes = new TextEncoder().encode(`verified-${mode}`);
      const stored = await store.put(bytes);
      const result = await loadVerifiedOfflineContent({
        mode,
        store,
        ref: stored,
        forbiddenEffects: sentinel.effects,
      });
      expect(result).toEqual(bytes);
      expect(sentinel.calls).toEqual([]);
    });
  }

  test('a missing local object fails before every forbidden adapter', async () => {
    const sentinel = forbiddenEffectSentinel();
    const digest = asContentDigest(`sha256:${'f'.repeat(64)}`);
    await expect(
      loadVerifiedOfflineContent({
        mode: 'offline-no-socket',
        store: new MemoryContentStore(),
        ref: { digest, key: contentKeyForDigest(digest), byteLength: 1 },
        forbiddenEffects: sentinel.effects,
      })
    ).rejects.toThrow('not present locally');
    expect(sentinel.calls).toEqual([]);
  });

  test('key and byte-length mismatches fail closed without external recovery', async () => {
    const sentinel = forbiddenEffectSentinel();
    const store = new MemoryContentStore();
    const stored = await store.put(new TextEncoder().encode('verified'));
    await expect(
      loadVerifiedOfflineContent({
        mode: 'cached-only',
        store,
        ref: { ...stored, key: asContentKey(`sha256/${'0'.repeat(2)}/${'0'.repeat(64)}`) },
        forbiddenEffects: sentinel.effects,
      })
    ).rejects.toThrow('key does not match digest');
    await expect(
      loadVerifiedOfflineContent({
        mode: 'cached-only',
        store,
        ref: { ...stored, byteLength: stored.byteLength + 1 },
        forbiddenEffects: sentinel.effects,
      })
    ).rejects.toThrow('byte length does not match reference');
    expect(sentinel.calls).toEqual([]);
  });

  test('corrupt local bytes fail integrity checks without fallback', async () => {
    const sentinel = forbiddenEffectSentinel();
    const backing = new Map();
    const store = new MemoryContentStore({ backing });
    const stored = await store.put(new TextEncoder().encode('original'));
    backing.set(stored.digest, new TextEncoder().encode('tampered'));
    await expect(
      loadVerifiedOfflineContent({
        mode: 'offline-no-socket',
        store,
        ref: stored,
        forbiddenEffects: sentinel.effects,
      })
    ).rejects.toThrow('Content store corrupt');
    expect(sentinel.calls).toEqual([]);
  });
});
