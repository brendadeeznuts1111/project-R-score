import type { ContentStore } from '../content-store/index.ts';
import {
  createContentSourceLocator,
  type ContentSourceLocator,
} from '../content-store/content-contract.ts';
import {
  loadFeedSnapshotOffline,
  parseFeedSnapshotManifest,
  type FeedSnapshotManifest,
  type LoadedFeedSnapshot,
} from './feed-snapshot-manifest.ts';

export type FeedSnapshotArchiveEntry = {
  /** Persisted wire data. It is parsed strictly before any content is read. */
  readonly manifest: unknown;
  /** Immutable byte store referenced by the manifest's content digests. */
  readonly contentStore: ContentStore;
};

export interface FeedSnapshotArchive {
  load(source: ContentSourceLocator): Promise<FeedSnapshotArchiveEntry | undefined>;
}

export type PublishFeedSnapshotAliasInput = {
  readonly source: ContentSourceLocator;
  readonly manifest: FeedSnapshotManifest;
  /** Zero creates an alias; later writes require the exact current revision. */
  readonly expectedRevision: number;
};

export type PublishedFeedSnapshotAlias = {
  readonly source: ContentSourceLocator;
  readonly revision: number;
  readonly manifest: FeedSnapshotManifest;
};

/** Mutable alias publication is deliberately separate from immutable byte storage. */
export interface FeedSnapshotArchivePublisher {
  publishAlias(input: PublishFeedSnapshotAliasInput): Promise<PublishedFeedSnapshotAlias>;
}

export class FeedSnapshotArchiveConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedSnapshotArchiveConflictError';
  }
}

/**
 * Resolve an exact source alias into verified immutable bytes. This boundary is
 * cache-only: it has no fetch callback and therefore cannot silently go online.
 */
export async function loadArchivedFeedSnapshot(input: {
  readonly archive: FeedSnapshotArchive;
  readonly sourceUrl: string;
  readonly now?: Date;
}): Promise<LoadedFeedSnapshot | undefined> {
  const source = createContentSourceLocator(new URL(input.sourceUrl).toString());
  const entry = await input.archive.load(source);
  if (entry === undefined) return undefined;
  const manifest = parseFeedSnapshotManifest(entry.manifest);
  if (
    manifest.feedSource.locator !== source.locator ||
    manifest.feedSource.locatorId !== source.locatorId
  ) {
    throw new TypeError('Feed snapshot archive returned a different source identity');
  }
  return loadFeedSnapshotOffline({
    manifest,
    store: entry.contentStore,
    ...(input.now === undefined ? {} : { now: input.now }),
  });
}
