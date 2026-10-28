import { describe, expect, test } from 'bun:test';

import { MemoryContentStore, type ContentStore } from '../lib/content-store/index.ts';
import { loadArchivedFeedSnapshot } from '../lib/rss/feed-snapshot-archive.ts';
import { createFeedSnapshotContentRef } from '../lib/rss/feed-snapshot-writer.ts';
import { asContentChannelId, asEvidenceId } from '../lib/types/branded.ts';
import {
  feedWriterFixture,
  now,
  otherSource,
  source,
} from './fixtures/feed-snapshot-writer-fixture.ts';

describe('FeedSnapshotWriter', () => {
  test('publishes deterministic verified XML, images, channels, relations, and package edges', async () => {
    const { archive, input, writer } = await feedWriterFixture();
    const published = await writer.publish(input);
    expect(published.revision).toBe(1);
    expect(published.manifest.channels).toEqual([
      asContentChannelId('canary'),
      asContentChannelId('stable'),
    ]);
    expect(published.manifest.images.map(image => image.digest)).toEqual(
      published.manifest.images.map(image => image.digest).toSorted()
    );
    expect(published.manifest.images[0]?.packageDependencies.map(item => item.packageName)).toEqual([
      'bun-xml',
      'feed-renderer',
    ]);
    const loaded = await loadArchivedFeedSnapshot({ archive, sourceUrl: source.locator, now });
    expect(loaded?.feedXml).toEqual(input.feedXml.bytes);
    expect(loaded?.images.size).toBe(2);
  });

  test('rejects source substitution and stale publication before writing bytes', async () => {
    const { archive, contentStore, input, writer } = await feedWriterFixture();
    await expect(writer.publish({ ...input, source: otherSource })).rejects.toThrow(
      'exact archive source'
    );
    await expect(
      writer.publish({
        ...input,
        freshness: { ...input.freshness, freshUntil: '2026-08-26T11:00:00.000Z' },
      })
    ).rejects.toThrow('already-stale');
    expect(await archive.load(source)).toBeUndefined();
    expect(await contentStore.has(createFeedSnapshotContentRef(input.feedXml).digest)).toBeFalse();
  });

  test('does not publish an alias after corruption or a partial immutable write', async () => {
    const backing = new MemoryContentStore();
    let puts = 0;
    const failingStore: ContentStore = {
      put: async bytes => {
        if (++puts === 2) throw new Error('simulated partial write');
        return backing.put(bytes);
      },
      get: digest => backing.get(digest),
      has: digest => backing.has(digest),
      verify: digest => backing.verify(digest),
    };
    const partial = await feedWriterFixture(failingStore);
    await expect(partial.writer.publish(partial.input)).rejects.toThrow('partial write');
    expect(await partial.archive.load(source)).toBeUndefined();

    const corruptBase = new MemoryContentStore();
    const corruptStore: ContentStore = {
      put: bytes => corruptBase.put(bytes),
      get: digest => corruptBase.get(digest),
      has: digest => corruptBase.has(digest),
      async verify(digest) {
        const verification = await corruptBase.verify(digest);
        return verification.status === 'verified'
          ? { ...verification, status: 'corrupt', expectedDigest: digest, actualDigest: digest }
          : verification;
      },
    };
    const corrupt = await feedWriterFixture(corruptStore);
    await expect(corrupt.writer.publish(corrupt.input)).rejects.toThrow('digest verification');
    expect(await corrupt.archive.load(source)).toBeUndefined();
  });

  test('consults current rights for stored and derived images before effects', async () => {
    const { archive, contentStore, input, rightsStore, writer } = await feedWriterFixture();
    const thumbnail = createFeedSnapshotContentRef(input.images[0]!);
    const current = await rightsStore.get(thumbnail.digest);
    if (!current) throw new Error('missing rights fixture');
    await rightsStore.revoke({
      target: thumbnail,
      actor: thumbnail.authorities.rightsReviewAuthority,
      reviewEvidenceId: asEvidenceId('feed-image-revoked'),
      expectedRevision: current.revision,
      expectedRecordDigest: current.recordDigest,
      reason: 'image approval withdrawn',
    });
    await expect(writer.publish(input)).rejects.toThrow('rights-expired-or-revoked');
    expect(await archive.load(source)).toBeUndefined();
    expect(await contentStore.has(thumbnail.digest)).toBeFalse();
  });

  test('is cache-only and performs no network operation while publishing or loading', async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = Object.assign(async () => {
      calls += 1;
      throw new Error('network forbidden');
    }, { preconnect: originalFetch.preconnect }) as typeof fetch;
    try {
      const { archive, input, writer } = await feedWriterFixture();
      await writer.publish(input);
      await loadArchivedFeedSnapshot({ archive, sourceUrl: source.locator, now });
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
