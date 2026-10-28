import { describe, expect, test } from 'bun:test';

import {
  CONTENT_REF_VERSION,
  MemoryContentStore,
  contentKeyForDigest,
  createContentSourceLocator,
  type ContentAuthorities,
  type ContentRef,
  type ContentRights,
} from '../lib/content-store/index.ts';
import {
  loadArchivedFeedSnapshot,
  type FeedSnapshotArchive,
} from '../lib/rss/feed-snapshot-archive.ts';
import {
  FEED_SNAPSHOT_SCHEMA,
  FEED_SNAPSHOT_VERSION,
  type FeedSnapshotManifest,
} from '../lib/rss/feed-snapshot-manifest.ts';
import { RSSManager } from '../lib/rss/rss-manager.ts';
import {
  asContentChannelId,
  asEvidenceId,
  asIdentityId,
} from '../lib/types/branded.ts';

const sourceUrl = 'https://feeds.example.test/releases.xml';
const source = createContentSourceLocator(sourceUrl);
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

async function fixture() {
  const contentStore = new MemoryContentStore();
  const xmlBytes = new TextEncoder().encode(
    '<rss version="2.0"><channel><title>Archived</title><link>https://example.test/</link><description>Verified</description></channel></rss>'
  );
  const stored = await contentStore.put(xmlBytes);
  const feedXml: ContentRef = {
    version: CONTENT_REF_VERSION,
    digest: stored.digest,
    key: contentKeyForDigest(stored.digest),
    byteLength: stored.byteLength,
    mediaType: 'application/rss+xml',
    sources: [source],
    contentRelations: [],
    packageDependencies: [],
    rights,
    authorities,
  };
  const manifest: FeedSnapshotManifest = {
    schema: FEED_SNAPSHOT_SCHEMA,
    version: FEED_SNAPSHOT_VERSION,
    feedSource: source,
    feedXml,
    images: [],
    channels: [asContentChannelId('stable')],
    freshness: {
      capturedAt: '2026-08-26T00:00:00.000Z',
      freshUntil: '2026-08-27T00:00:00.000Z',
      staleUntil: '2026-09-02T00:00:00.000Z',
      staleBehavior: 'serve-verified',
    },
  };
  const archive: FeedSnapshotArchive = {
    async load(requestedSource) {
      expect(requestedSource).toEqual(source);
      return { manifest, contentStore };
    },
  };
  return { archive, contentStore, manifest, xmlBytes };
}

describe('verified feed snapshot archive', () => {
  test('loads only exact-source, digest-verified immutable XML', async () => {
    const { archive, xmlBytes } = await fixture();
    const loaded = await loadArchivedFeedSnapshot({
      archive,
      sourceUrl,
      now: new Date('2026-08-29T00:00:00.000Z'),
    });
    expect(loaded?.freshness).toBe('stale');
    expect(loaded?.feedXml).toEqual(xmlBytes);
  });

  test('rejects source substitution before reading content', async () => {
    const { contentStore, manifest } = await fixture();
    let contentReads = 0;
    const archive: FeedSnapshotArchive = {
      async load() {
        return {
          manifest: {
            ...manifest,
            feedSource: createContentSourceLocator('https://other.example.test/releases.xml'),
          },
          contentStore: {
            put: bytes => contentStore.put(bytes),
            async get() {
              contentReads += 1;
              return undefined;
            },
            has: digest => contentStore.has(digest),
            verify: digest => contentStore.verify(digest),
          },
        };
      },
    };
    await expect(loadArchivedFeedSnapshot({ archive, sourceUrl })).rejects.toThrow(
      'must include the exact feed source identity'
    );
    expect(contentReads).toBe(0);
  });

  test('RSSManager falls back only to verified archived XML and reparses it in the worker', async () => {
    const { archive } = await fixture();
    let fetchCalls = 0;
    const offlineFetcher = Object.assign(
      async (..._args: Parameters<typeof fetch>): Promise<Response> => {
        fetchCalls += 1;
        throw new Error('offline');
      },
      { preconnect: fetch.preconnect }
    ) satisfies typeof fetch;
    const manager = new RSSManager(undefined, {
      snapshotArchive: archive,
      enrichImages: false,
      fetcher: offlineFetcher,
    });
    const feed = await manager.fetchFeed(sourceUrl);
    expect(fetchCalls).toBe(1);
    expect(feed.title).toBe('Archived');
    expect(feed.description).toBe('Verified');
  });
});
