/**
 * Channel R2 store tests.
 */

import { describe, expect, test } from 'bun:test';
import { MemoryChannelStore, R2ChannelStore } from '../lib/channels/channels.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';

function mockR2(): R2PutBucket {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      const body = store.get(key);
      if (!body) return null;
      return {
        body: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(body));
            c.close();
          },
        }),
      };
    },
    async put(key: string, value: string) {
      const prev = store.get(key) ?? '';
      store.set(key, key.endsWith('.jsonl') ? `${prev}${value}` : value);
    },
  };
}

describe('R2ChannelStore', () => {
  test('publish and readSince', async () => {
    const store = new R2ChannelStore(mockR2());
    await store.publish('factory', { event: 'deploy.requested', by: 'u1' });
    const events = await store.readSince('factory', 0);
    expect(events.length).toBe(1);
    expect(events[0]?.seq).toBe(1);
  });
});

describe('MemoryChannelStore', () => {
  test('in-memory publish', async () => {
    const store = new MemoryChannelStore();
    await store.publish('onboard', { event: 'account.created' });
    expect((await store.readSince('onboard', 0)).length).toBe(1);
  });
});
