import { describe, expect, test } from 'bun:test';

import {
  MemoryContentStore,
  type R2Conditional,
  type R2ObjectBody,
  type R2ObjectMetadata,
} from '../lib/content-store/index.ts';
import {
  FeedSnapshotArchiveConflictError,
  loadArchivedFeedSnapshot,
} from '../lib/rss/feed-snapshot-archive.ts';
import { FeedSnapshotWriter } from '../lib/rss/feed-snapshot-writer.ts';
import {
  R2FeedSnapshotArchive,
  type R2FeedSnapshotAliasBucket,
} from '../lib/rss/r2-feed-snapshot-archive.ts';
import { feedWriterFixture, now, source } from './fixtures/feed-snapshot-writer-fixture.ts';

type FakeObject = {
  bytes: Uint8Array;
  etag: string;
  customMetadata: Readonly<Record<string, string>>;
};

class FakeAliasBucket implements R2FeedSnapshotAliasBucket {
  readonly objects = new Map<string, FakeObject>();
  beforeWrite?: (key: string) => void;
  corruptAfterWrite = false;
  #revision = 0;

  async get(key: string): Promise<R2ObjectBody | null> {
    const object = this.objects.get(key);
    if (!object) return null;
    const bytes = object.bytes.slice();
    return {
      key,
      size: bytes.byteLength,
      etag: object.etag,
      customMetadata: object.customMetadata,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    };
  }

  async put(
    key: string,
    value: ArrayBuffer,
    options: {
      readonly onlyIf: R2Conditional;
      readonly sha256: string;
      readonly customMetadata: Readonly<Record<string, string>>;
    }
  ): Promise<R2ObjectMetadata | null> {
    this.beforeWrite?.(key);
    this.beforeWrite = undefined;
    const current = this.objects.get(key);
    if (options.onlyIf.etagDoesNotMatch === '*' && current) return null;
    if (options.onlyIf.etagMatches !== undefined && current?.etag !== options.onlyIf.etagMatches) {
      return null;
    }
    const bytes = new Uint8Array(value).slice();
    expect(Bun.CryptoHasher.hash('sha256', bytes, 'hex')).toBe(options.sha256);
    const stored = {
      bytes: this.corruptAfterWrite ? new Uint8Array([0]) : bytes,
      etag: `etag-${++this.#revision}`,
      customMetadata: options.customMetadata,
    };
    this.objects.set(key, stored);
    return {
      key,
      size: stored.bytes.byteLength,
      etag: stored.etag,
      customMetadata: stored.customMetadata,
    };
  }
}

describe('R2FeedSnapshotArchive', () => {
  test('uses conditional alias publication and verifies the persisted digest', async () => {
    const contentStore = new MemoryContentStore();
    const data = await feedWriterFixture(contentStore);
    const bucket = new FakeAliasBucket();
    const archive = new R2FeedSnapshotArchive(bucket, contentStore);
    const writer = new FeedSnapshotWriter(contentStore, data.rightsStore, archive, () => now);
    await writer.publish(data.input);
    expect(
      (await loadArchivedFeedSnapshot({ archive, sourceUrl: source.locator, now }))?.images.size
    ).toBe(2);

    const racedBucket = new FakeAliasBucket();
    const racedArchive = new R2FeedSnapshotArchive(racedBucket, contentStore);
    const racedWriter = new FeedSnapshotWriter(contentStore, data.rightsStore, racedArchive, () => now);
    racedBucket.beforeWrite = key => {
      racedBucket.objects.set(key, {
        bytes: new Uint8Array([1]),
        etag: 'racer',
        customMetadata: {},
      });
    };
    await expect(racedWriter.publish(data.input)).rejects.toBeInstanceOf(
      FeedSnapshotArchiveConflictError
    );

    const corruptBucket = new FakeAliasBucket();
    corruptBucket.corruptAfterWrite = true;
    const corruptArchive = new R2FeedSnapshotArchive(corruptBucket, contentStore);
    const corruptWriter = new FeedSnapshotWriter(contentStore, data.rightsStore, corruptArchive, () => now);
    await expect(corruptWriter.publish(data.input)).rejects.toThrow(
      'Invalid R2 feed snapshot alias'
    );
  });
});
