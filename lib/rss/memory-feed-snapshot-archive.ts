import type { ContentStore } from '../content-store/index.ts';
import type { SourceLocatorId } from '../types/branded.ts';
import {
  FeedSnapshotArchiveConflictError,
  type FeedSnapshotArchive,
  type FeedSnapshotArchiveEntry,
  type FeedSnapshotArchivePublisher,
  type PublishFeedSnapshotAliasInput,
  type PublishedFeedSnapshotAlias,
} from './feed-snapshot-archive.ts';
import {
  parseFeedSnapshotManifest,
  parseFeedSnapshotManifestJson,
  serializeFeedSnapshotManifest,
} from './feed-snapshot-manifest.ts';

type MemoryAlias = PublishedFeedSnapshotAlias;

/** Process-local alias adapter for hermetic composition and race tests. */
export class MemoryFeedSnapshotArchive
  implements FeedSnapshotArchive, FeedSnapshotArchivePublisher
{
  readonly #aliases = new Map<SourceLocatorId, MemoryAlias>();

  constructor(readonly contentStore: ContentStore) {}

  async load(
    source: PublishFeedSnapshotAliasInput['source']
  ): Promise<FeedSnapshotArchiveEntry | undefined> {
    const alias = this.#aliases.get(source.locatorId);
    if (alias === undefined) return undefined;
    if (alias.source.locator !== source.locator || alias.source.locatorId !== source.locatorId) {
      throw new TypeError('Feed snapshot alias source identity mismatch');
    }
    return {
      manifest: parseFeedSnapshotManifestJson(serializeFeedSnapshotManifest(alias.manifest)),
      contentStore: this.contentStore,
    };
  }

  async publishAlias(input: PublishFeedSnapshotAliasInput): Promise<PublishedFeedSnapshotAlias> {
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw new FeedSnapshotArchiveConflictError('Expected feed snapshot revision is invalid');
    }
    const manifest = parseFeedSnapshotManifest(input.manifest);
    if (
      manifest.feedSource.locator !== input.source.locator ||
      manifest.feedSource.locatorId !== input.source.locatorId
    ) {
      throw new TypeError('Feed snapshot manifest source does not match alias source');
    }
    const current = this.#aliases.get(input.source.locatorId);
    const currentRevision = current?.revision ?? 0;
    if (currentRevision !== input.expectedRevision) {
      throw new FeedSnapshotArchiveConflictError('Feed snapshot alias revision changed');
    }
    if (current !== undefined && current.source.locator !== input.source.locator) {
      throw new TypeError('Feed snapshot alias locator hash collision');
    }
    const storedManifest = parseFeedSnapshotManifestJson(serializeFeedSnapshotManifest(manifest));
    const published = Object.freeze({
      source: storedManifest.feedSource,
      revision: input.expectedRevision + 1,
      manifest: storedManifest,
    });
    // No await occurs between the revision comparison and this mutation.
    this.#aliases.set(input.source.locatorId, published);
    const returnedManifest = parseFeedSnapshotManifestJson(
      serializeFeedSnapshotManifest(published.manifest)
    );
    return {
      source: returnedManifest.feedSource,
      revision: published.revision,
      manifest: returnedManifest,
    };
  }
}
