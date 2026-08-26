import {
  MemoryContentRightsStore,
  MemoryContentStore,
  contentDigestForBytes,
  createContentSourceLocator,
  type ContentAuthorities,
  type ContentRights,
  type ContentStore,
} from '../../lib/content-store/index.ts';
import {
  createFeedSnapshotContentRef,
  FeedSnapshotWriter,
  type FeedSnapshotAssetInput,
  type PublishFeedSnapshotInput,
} from '../../lib/rss/feed-snapshot-writer.ts';
import { MemoryFeedSnapshotArchive } from '../../lib/rss/memory-feed-snapshot-archive.ts';
import { asContentChannelId, asEvidenceId, asIdentityId } from '../../lib/types/branded.ts';

export const source = createContentSourceLocator('https://feeds.example.test/releases.xml');
export const otherSource = createContentSourceLocator('https://other.example.test/releases.xml');
export const now = new Date('2026-08-26T12:00:00.000Z');
const authorities: ContentAuthorities = {
  publisher: { kind: 'identity', identityId: asIdentityId('feed-publisher') },
  storageSteward: { kind: 'identity', identityId: asIdentityId('storage-steward') },
  rightsReviewAuthority: { kind: 'identity', identityId: asIdentityId('rights-reviewer') },
  aliasPublisher: { kind: 'identity', identityId: asIdentityId('alias-publisher') },
};
const rights = {
  state: 'approved-vendor',
  reviewEvidenceId: asEvidenceId('feed-archive-rights'),
  reviewedAt: '2026-08-25T00:00:00.000Z',
  validUntil: '2027-08-25T00:00:00.000Z',
} satisfies ContentRights;

function asset(
  bytes: Uint8Array,
  mediaType: string,
  contentRelations: FeedSnapshotAssetInput['contentRelations'] = []
): FeedSnapshotAssetInput {
  return {
    bytes,
    mediaType,
    sources: [source],
    contentRelations,
    packageDependencies: [
      { packageName: 'feed-renderer', range: '^2.0.0', kind: 'peer', peer: { optional: true } },
      { packageName: 'bun-xml', range: '^1.0.0', kind: 'runtime' },
    ],
    rights,
    authorities,
  };
}

export async function feedWriterFixture(contentStore: ContentStore = new MemoryContentStore()) {
  const xml = asset(
    new TextEncoder().encode('<rss version="2.0"><channel/></rss>'),
    'application/rss+xml'
  );
  const original = asset(new Uint8Array([137, 80, 78, 71]), 'image/png');
  const thumbnail = asset(new Uint8Array([82, 73, 70, 70]), 'image/webp', [
    {
      from: contentDigestForBytes(new Uint8Array([0])),
      to: contentDigestForBytes(original.bytes),
      kind: 'derived-from',
    },
  ]);
  const rightsStore = new MemoryContentRightsStore(() => now);
  for (const input of [xml, original, thumbnail]) {
    const target = createFeedSnapshotContentRef(input);
    await rightsStore.decide({
      target,
      actor: target.authorities.rightsReviewAuthority,
      rights,
      expectedRevision: 0,
    });
  }
  const archive = new MemoryFeedSnapshotArchive(contentStore);
  const writer = new FeedSnapshotWriter(contentStore, rightsStore, archive, () => now);
  const input: PublishFeedSnapshotInput = {
    source,
    feedXml: xml,
    images: [thumbnail, original],
    channels: [asContentChannelId('stable'), asContentChannelId('canary')],
    freshness: {
      capturedAt: '2026-08-26T00:00:00.000Z',
      freshUntil: '2026-08-27T00:00:00.000Z',
      staleUntil: '2026-09-02T00:00:00.000Z',
      staleBehavior: 'serve-verified',
    },
    expectedRevision: 0,
    now,
  };
  return { archive, contentStore, input, rightsStore, writer };
}
