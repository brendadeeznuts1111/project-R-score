import {
  CONTENT_REF_VERSION,
  contentDigestForBytes,
  contentKeyForDigest,
  parseContentRef,
  type ContentAuthorities,
  type ContentRef,
  type ContentRelationEdge,
  type ContentRights,
  type ContentRightsStore,
  type ContentSourceLocator,
  type ContentStore,
  type PackageDependencyRecord,
} from '../content-store/index.ts';
import { parseContentChannelId, type ContentChannelId } from '../types/branded.ts';
import {
  type FeedSnapshotArchivePublisher,
  type PublishedFeedSnapshotAlias,
} from './feed-snapshot-archive.ts';
import {
  FEED_SNAPSHOT_SCHEMA,
  FEED_SNAPSHOT_VERSION,
  parseFeedSnapshotManifest,
  type FeedSnapshotFreshness,
} from './feed-snapshot-manifest.ts';

export type FeedSnapshotAssetInput = {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly sources: readonly ContentSourceLocator[];
  readonly contentRelations?: readonly ContentRelationEdge[];
  readonly packageDependencies?: readonly PackageDependencyRecord[];
  readonly rights: ContentRights;
  readonly authorities: ContentAuthorities;
};

export type PublishFeedSnapshotInput = {
  readonly source: ContentSourceLocator;
  readonly feedXml: FeedSnapshotAssetInput;
  readonly images: readonly FeedSnapshotAssetInput[];
  readonly channels: readonly ContentChannelId[];
  readonly freshness: FeedSnapshotFreshness;
  readonly expectedRevision: number;
  readonly now?: Date;
};

function relationKey(edge: ContentRelationEdge): string {
  return `${edge.from}\0${edge.to}\0${edge.kind}`;
}

function dependencyKey(dependency: PackageDependencyRecord): string {
  return `${dependency.packageName}\0${dependency.kind}\0${dependency.range}\0${dependency.peer?.optional ?? ''}`;
}

function assertUnique<T>(values: readonly T[], key: (value: T) => string, field: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) throw new TypeError(`Feed snapshot ${field} contains a duplicate`);
    seen.add(itemKey);
  }
}

export function createFeedSnapshotContentRef(input: FeedSnapshotAssetInput): ContentRef {
  const exactBytes = input.bytes.slice();
  const digest = contentDigestForBytes(exactBytes);
  const sources = [...input.sources].sort((left, right) =>
    left.locatorId.localeCompare(right.locatorId)
  );
  assertUnique(sources, source => source.locatorId, 'sources');
  const contentRelations = [...(input.contentRelations ?? [])]
    .map(relation => ({ ...relation, from: digest }))
    .sort((left, right) => relationKey(left).localeCompare(relationKey(right)));
  assertUnique(contentRelations, relationKey, 'content relations');
  const packageDependencies = [...(input.packageDependencies ?? [])].sort((left, right) =>
    dependencyKey(left).localeCompare(dependencyKey(right))
  );
  assertUnique(packageDependencies, dependencyKey, 'package dependencies');
  return parseContentRef({
    version: CONTENT_REF_VERSION,
    digest,
    key: contentKeyForDigest(digest),
    byteLength: exactBytes.byteLength,
    mediaType: input.mediaType,
    sources,
    contentRelations,
    packageDependencies,
    rights: input.rights,
    authorities: input.authorities,
  });
}

function assertExactClock(now: Date): void {
  if (!Number.isFinite(now.getTime())) throw new TypeError('Feed snapshot writer clock is invalid');
}

/**
 * Writes immutable bytes first, verifies them, then atomically publishes the
 * source alias. Failed or raced writes can leave only unreferenced immutable
 * objects; a partial snapshot is never exposed by the archive.
 */
export class FeedSnapshotWriter {
  constructor(
    readonly contentStore: ContentStore,
    readonly rightsStore: ContentRightsStore,
    readonly archive: FeedSnapshotArchivePublisher,
    readonly clock: () => Date = () => new Date()
  ) {}

  async publish(input: PublishFeedSnapshotInput): Promise<PublishedFeedSnapshotAlias> {
    const now = input.now ?? this.clock();
    assertExactClock(now);
    const feedXml = createFeedSnapshotContentRef(input.feedXml);
    const images = input.images
      .map(createFeedSnapshotContentRef)
      .sort((left, right) => left.digest.localeCompare(right.digest));
    assertUnique(images, image => image.digest, 'images');
    const channels = input.channels.map(parseContentChannelId).sort();
    assertUnique(channels, channel => channel, 'channels');

    if (!feedXml.sources.some(source => source.locatorId === input.source.locatorId)) {
      throw new TypeError('Feed XML does not include the exact archive source');
    }
    if (!['application/rss+xml', 'application/xml', 'text/xml'].includes(feedXml.mediaType)) {
      throw new TypeError('Feed snapshot XML has an unsupported media type');
    }
    for (const image of images) {
      if (!image.mediaType.startsWith('image/')) {
        throw new TypeError('Feed snapshot image has a non-image media type');
      }
    }

    const allDigests = new Set([feedXml.digest, ...images.map(image => image.digest)]);
    for (const ref of [feedXml, ...images]) {
      for (const relation of ref.contentRelations) {
        if (!allDigests.has(relation.to)) {
          throw new TypeError('Feed snapshot content relation target is absent');
        }
      }
    }

    const manifest = parseFeedSnapshotManifest({
      schema: FEED_SNAPSHOT_SCHEMA,
      version: FEED_SNAPSHOT_VERSION,
      feedSource: input.source,
      feedXml,
      images,
      channels,
      freshness: input.freshness,
    });
    if (now.getTime() > Date.parse(manifest.freshness.freshUntil)) {
      throw new Error('Feed snapshot writer refuses an already-stale publication');
    }

    // Authorize every effect before the first byte write.
    for (const ref of [feedXml, ...images]) {
      await this.rightsStore.authorize(ref, 'store-bytes', now);
      await this.rightsStore.authorize(ref, 'publish-active-alias', now);
      if (
        ref.mediaType.startsWith('image/') &&
        ref.contentRelations.some(
          edge => edge.kind === 'derived-from' || edge.kind === 'rendition-of'
        )
      ) {
        await this.rightsStore.authorize(ref, 'derive-bytes', now);
      }
    }

    const assets = [
      { ref: feedXml, bytes: input.feedXml.bytes },
      ...images.map(ref => {
        const asset = input.images.find(
          candidate => contentDigestForBytes(candidate.bytes) === ref.digest
        );
        if (!asset) throw new Error('Feed snapshot image normalization lost its bytes');
        return { ref, bytes: asset.bytes };
      }),
    ];
    for (const asset of assets) {
      const stored = await this.contentStore.put(asset.bytes);
      if (stored.digest !== asset.ref.digest || stored.byteLength !== asset.ref.byteLength) {
        throw new Error(`Feed snapshot store returned substituted content: ${asset.ref.digest}`);
      }
      const verification = await this.contentStore.verify(asset.ref.digest);
      if (verification.status !== 'verified' || verification.byteLength !== asset.ref.byteLength) {
        throw new Error(`Feed snapshot write failed digest verification: ${asset.ref.digest}`);
      }
    }

    return this.archive.publishAlias({
      source: input.source,
      manifest,
      expectedRevision: input.expectedRevision,
    });
  }
}
