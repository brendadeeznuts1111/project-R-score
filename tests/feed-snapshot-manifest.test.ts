import { describe, expect, test } from 'bun:test';

import {
  CONTENT_REF_VERSION,
  MemoryContentStore,
  contentKeyForDigest,
  createContentSourceLocator,
  type ContentAuthorities,
  type ContentRef,
  type ContentRights,
  type StoredContent,
} from '../lib/content-store/index.ts';
import {
  FEED_SNAPSHOT_SCHEMA,
  FEED_SNAPSHOT_VERSION,
  loadFeedSnapshotOffline,
  parseFeedSnapshotManifest,
  parseFeedSnapshotManifestJson,
  serializeFeedSnapshotManifest,
  type FeedSnapshotManifest,
} from '../lib/rss/feed-snapshot-manifest.ts';
import {
  asContentChannelId,
  asEvidenceId,
  asIdentityId,
} from '../lib/types/branded.ts';

const feedLocator = 'https://feeds.example.test/releases.xml';
const feedSource = createContentSourceLocator(feedLocator);
const authorities: ContentAuthorities = {
  publisher: { kind: 'identity', identityId: asIdentityId('feed-publisher') },
  storageSteward: { kind: 'identity', identityId: asIdentityId('storage-steward') },
  rightsReviewAuthority: { kind: 'identity', identityId: asIdentityId('rights-reviewer') },
  aliasPublisher: { kind: 'identity', identityId: asIdentityId('alias-publisher') },
};
const rights: ContentRights = {
  state: 'approved-vendor',
  reviewEvidenceId: asEvidenceId('feed-rights'),
  reviewedAt: '2026-08-25T00:00:00.000Z',
  validUntil: '2027-08-25T00:00:00.000Z',
};

function ref(
  stored: StoredContent,
  mediaType: string,
  contentRelations: ContentRef['contentRelations'] = []
): ContentRef {
  return {
    version: CONTENT_REF_VERSION,
    digest: stored.digest,
    key: stored.key,
    byteLength: stored.byteLength,
    mediaType,
    sources: [feedSource],
    contentRelations,
    packageDependencies: [
      { packageName: 'bun-xml', range: '^1.0.0', kind: 'runtime' },
      { packageName: 'feed-renderer', range: '^2.0.0', kind: 'peer', peer: { optional: true } },
    ],
    rights,
    authorities,
  };
}

async function fixture(staleBehavior: 'reject' | 'serve-verified' = 'serve-verified') {
  const store = new MemoryContentStore();
  const xml = await store.put(new TextEncoder().encode('<rss version="2.0"/>'));
  const original = await store.put(new Uint8Array([1, 2, 3, 4]));
  const thumbnail = await store.put(new Uint8Array([5, 6, 7]));
  const originalRef = ref(original, 'image/png');
  const thumbnailRef = ref(thumbnail, 'image/webp', [
    { from: thumbnail.digest, to: original.digest, kind: 'derived-from' },
  ]);
  const images = [originalRef, thumbnailRef].sort((left, right) =>
    left.digest.localeCompare(right.digest)
  );
  const manifest: FeedSnapshotManifest = {
    schema: FEED_SNAPSHOT_SCHEMA,
    version: FEED_SNAPSHOT_VERSION,
    feedSource,
    feedXml: ref(xml, 'application/rss+xml'),
    images,
    channels: [asContentChannelId('canary'), asContentChannelId('stable')],
    freshness: {
      capturedAt: '2026-08-26T00:00:00.000Z',
      freshUntil: '2026-08-27T00:00:00.000Z',
      staleUntil: '2026-09-02T00:00:00.000Z',
      staleBehavior,
    },
  };
  return { store, manifest, xml, original, thumbnail };
}

describe('FeedSnapshotManifest', () => {
  test('strictly parses a deterministic source-to-content snapshot and preserves dependency kinds', async () => {
    const { manifest } = await fixture();
    const serialized = serializeFeedSnapshotManifest(manifest);
    const parsed = parseFeedSnapshotManifestJson(serialized);

    expect(serializeFeedSnapshotManifest(parsed)).toBe(serialized);
    expect(parsed.feedSource.locatorId).not.toBe(parsed.feedXml.digest);
    expect(parsed.feedXml.key).toBe(contentKeyForDigest(parsed.feedXml.digest));
    expect(parsed.feedXml.packageDependencies).toEqual([
      { packageName: 'bun-xml', range: '^1.0.0', kind: 'runtime' },
      { packageName: 'feed-renderer', range: '^2.0.0', kind: 'peer', peer: { optional: true } },
    ]);
    expect(parsed.channels).toEqual([
      asContentChannelId('canary'),
      asContentChannelId('stable'),
    ]);
  });

  test('rejects extra fields, source hash mismatches, unstable membership, and dangling edges', async () => {
    const { manifest } = await fixture();
    expect(() => parseFeedSnapshotManifest({ ...manifest, onlineFallback: feedLocator })).toThrow(
      'unexpected key onlineFallback'
    );
    expect(() =>
      parseFeedSnapshotManifest({
        ...manifest,
        feedSource: { ...manifest.feedSource, locator: 'https://other.example.test/feed.xml' },
      })
    ).toThrow('does not hash the exact feed locator');
    expect(() => parseFeedSnapshotManifest({ ...manifest, channels: ['stable', 'canary'] })).toThrow(
      'must be sorted and unique'
    );
    expect(() =>
      parseFeedSnapshotManifest({
        ...manifest,
        feedXml: {
          ...manifest.feedXml,
          packageDependencies: manifest.feedXml.packageDependencies.toReversed(),
        },
      })
    ).toThrow('packageDependencies: must be sorted and unique');
    const firstImage = manifest.images[0]!;
    expect(() =>
      parseFeedSnapshotManifest({
        ...manifest,
        images: [
          {
            ...firstImage,
            contentRelations: [
              {
                from: firstImage.digest,
                to: `sha256:${'f'.repeat(64)}`,
                kind: 'embeds',
              },
            ],
          },
          manifest.images[1],
        ],
      })
    ).toThrow('target is absent from snapshot');
  });

  test('loads fresh and policy-allowed stale snapshots from verified CAS only', async () => {
    const { store, manifest, xml } = await fixture();
    const fresh = await loadFeedSnapshotOffline({
      manifest,
      store,
      now: new Date('2026-08-26T12:00:00.000Z'),
    });
    expect(fresh.freshness).toBe('fresh');
    expect(fresh.feedXml).toEqual((await store.get(xml.digest))!);
    expect(fresh.images.size).toBe(2);

    const stale = await loadFeedSnapshotOffline({
      manifest,
      store,
      now: new Date('2026-08-29T00:00:00.000Z'),
    });
    expect(stale.freshness).toBe('stale');
  });

  test('fails closed on stale policy, expiry, missing bytes, and corruption', async () => {
    const rejected = await fixture('reject');
    await expect(
      loadFeedSnapshotOffline({
        manifest: rejected.manifest,
        store: rejected.store,
        now: new Date('2026-08-29T00:00:00.000Z'),
      })
    ).rejects.toThrow('rejects stale cached content');
    await expect(
      loadFeedSnapshotOffline({
        manifest: rejected.manifest,
        store: rejected.store,
        now: new Date('2026-09-03T00:00:00.000Z'),
      })
    ).rejects.toThrow('exceeded its staleUntil boundary');

    const missing = await fixture();
    await expect(
      loadFeedSnapshotOffline({
        manifest: missing.manifest,
        store: new MemoryContentStore(),
        now: new Date('2026-08-26T12:00:00.000Z'),
      })
    ).rejects.toThrow('unavailable or corrupt');

    const backing = new Map();
    const corruptStore = new MemoryContentStore({ backing });
    const corruptFixture = await fixture();
    for (const content of [corruptFixture.manifest.feedXml, ...corruptFixture.manifest.images]) {
      backing.set(content.digest, (await corruptFixture.store.get(content.digest))!);
    }
    backing.set(
      corruptFixture.manifest.feedXml.digest,
      new TextEncoder().encode('<rss>tampered</rss>')
    );
    await expect(
      loadFeedSnapshotOffline({
        manifest: corruptFixture.manifest,
        store: corruptStore,
        now: new Date('2026-08-26T12:00:00.000Z'),
      })
    ).rejects.toThrow('unavailable or corrupt');
  });
});
