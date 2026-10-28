import {
  contentKeyForDigest,
  createContentSourceLocator,
  parseContentRef,
  type ContentRef,
  type ContentSourceLocator,
  type ContentStore,
} from '../content-store/index.ts';
import {
  parseContentChannelId,
  parseSourceLocatorId,
  type ContentChannelId,
  type ContentDigest,
} from '../types/branded.ts';

export const FEED_SNAPSHOT_SCHEMA = 'factorywager.feed-snapshot' as const;
export const FEED_SNAPSHOT_VERSION = 1 as const;
export const MAX_FEED_SNAPSHOT_BYTES = 2 * 1024 * 1024;
export const MAX_FEED_SNAPSHOT_IMAGES = 1_024;
export const MAX_FEED_SNAPSHOT_CHANNELS = 64;

export type FeedSnapshotStaleBehavior = 'reject' | 'serve-verified';

export type FeedSnapshotFreshness = {
  readonly capturedAt: string;
  readonly freshUntil: string;
  readonly staleUntil: string;
  readonly staleBehavior: FeedSnapshotStaleBehavior;
};

export type FeedSnapshotManifest = {
  readonly schema: typeof FEED_SNAPSHOT_SCHEMA;
  readonly version: typeof FEED_SNAPSHOT_VERSION;
  /** Mutable source identity. It is never used as byte identity. */
  readonly feedSource: ContentSourceLocator;
  /** Immutable XML bytes. Image refs retain their own source and dependency metadata. */
  readonly feedXml: ContentRef;
  readonly images: readonly ContentRef[];
  readonly channels: readonly ContentChannelId[];
  readonly freshness: FeedSnapshotFreshness;
};

export type LoadedFeedSnapshot = {
  readonly manifest: FeedSnapshotManifest;
  readonly feedXml: Uint8Array;
  readonly images: ReadonlyMap<ContentDigest, Uint8Array>;
  readonly freshness: 'fresh' | 'stale';
};

function fail(field: string, detail: string): never {
  throw new TypeError(`Invalid FeedSnapshotManifest ${field}: ${detail}`);
}

function parseRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(field, 'expected object');
  }
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value)
    .filter(key => !allowedSet.has(key))
    .sort()[0];
  if (unexpected !== undefined) fail(field, `unexpected key ${unexpected}`);
}

function parseTimestamp(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return fail(field, 'expected UTC ISO-8601 timestamp');
  }
  return new Date(Date.parse(value)).toISOString();
}

function parseFeedSource(value: unknown): ContentSourceLocator {
  const source = parseRecord(value, 'feedSource');
  onlyKeys(source, ['locator', 'locatorId'], 'feedSource');
  if (
    typeof source.locator !== 'string' ||
    source.locator.length === 0 ||
    source.locator.length > 8_192 ||
    source.locator.trim() !== source.locator ||
    source.locator.includes('\0')
  ) {
    return fail('feedSource.locator', 'expected bounded canonical locator');
  }
  const parsed = createContentSourceLocator(source.locator);
  const locatorId = parseSourceLocatorId(source.locatorId);
  if (parsed.locatorId !== locatorId) {
    return fail('feedSource.locatorId', 'does not hash the exact feed locator');
  }
  return parsed;
}

function parseFreshness(value: unknown): FeedSnapshotFreshness {
  const freshness = parseRecord(value, 'freshness');
  onlyKeys(freshness, ['capturedAt', 'freshUntil', 'staleUntil', 'staleBehavior'], 'freshness');
  const capturedAt = parseTimestamp(freshness.capturedAt, 'freshness.capturedAt');
  const freshUntil = parseTimestamp(freshness.freshUntil, 'freshness.freshUntil');
  const staleUntil = parseTimestamp(freshness.staleUntil, 'freshness.staleUntil');
  if (freshness.staleBehavior !== 'reject' && freshness.staleBehavior !== 'serve-verified') {
    return fail('freshness.staleBehavior', 'expected reject or serve-verified');
  }
  if (Date.parse(capturedAt) > Date.parse(freshUntil)) {
    return fail('freshness', 'capturedAt must not follow freshUntil');
  }
  if (Date.parse(freshUntil) > Date.parse(staleUntil)) {
    return fail('freshness', 'freshUntil must not follow staleUntil');
  }
  return { capturedAt, freshUntil, staleUntil, staleBehavior: freshness.staleBehavior };
}

function parseSortedChannels(value: unknown): readonly ContentChannelId[] {
  if (!Array.isArray(value)) return fail('channels', 'expected array');
  if (value.length === 0 || value.length > MAX_FEED_SNAPSHOT_CHANNELS) {
    return fail('channels', `expected 1 to ${MAX_FEED_SNAPSHOT_CHANNELS} entries`);
  }
  const channels = value.map(parseContentChannelId);
  for (let index = 1; index < channels.length; index += 1) {
    if (channels[index - 1]! >= channels[index]!) {
      return fail('channels', 'must be sorted and unique');
    }
  }
  return channels;
}

function parseSortedImages(value: unknown): readonly ContentRef[] {
  if (!Array.isArray(value)) return fail('images', 'expected array');
  if (value.length > MAX_FEED_SNAPSHOT_IMAGES) {
    return fail('images', `cannot exceed ${MAX_FEED_SNAPSHOT_IMAGES} entries`);
  }
  const images = value.map(parseContentRef);
  for (let index = 1; index < images.length; index += 1) {
    if (images[index - 1]!.digest >= images[index]!.digest) {
      return fail('images', 'must be sorted by digest and unique');
    }
  }
  for (const [index, image] of images.entries()) {
    if (!image.mediaType.startsWith('image/')) {
      return fail(`images[${index}].mediaType`, 'expected image MIME type');
    }
  }
  return images;
}

function assertDeterministicDependencies(ref: ContentRef, field: string): void {
  const relationKeys = ref.contentRelations.map(
    relation => `${relation.from}\0${relation.to}\0${relation.kind}`
  );
  const packageKeys = ref.packageDependencies.map(
    dependency =>
      `${dependency.packageName}\0${dependency.kind}\0${dependency.range}\0${dependency.peer?.optional ?? ''}`
  );
  for (const [name, keys] of [
    ['contentRelations', relationKeys],
    ['packageDependencies', packageKeys],
  ] as const) {
    for (let index = 1; index < keys.length; index += 1) {
      if (keys[index - 1]! >= keys[index]!) {
        fail(`${field}.${name}`, 'must be sorted and unique');
      }
    }
  }
}

/** Parse persisted JSON once. Extra keys, unstable ordering, and identity conflation fail closed. */
export function parseFeedSnapshotManifest(value: unknown): FeedSnapshotManifest {
  const manifest = parseRecord(value, 'root');
  onlyKeys(
    manifest,
    ['schema', 'version', 'feedSource', 'feedXml', 'images', 'channels', 'freshness'],
    'root'
  );
  if (manifest.schema !== FEED_SNAPSHOT_SCHEMA) fail('schema', 'unknown schema');
  if (manifest.version !== FEED_SNAPSHOT_VERSION) fail('version', 'unsupported version');
  const feedSource = parseFeedSource(manifest.feedSource);
  const feedXml = parseContentRef(manifest.feedXml);
  if (!['application/rss+xml', 'application/xml', 'text/xml'].includes(feedXml.mediaType)) {
    fail('feedXml.mediaType', 'expected RSS/XML MIME type');
  }
  if (!feedXml.sources.some(source => source.locatorId === feedSource.locatorId)) {
    fail('feedXml.sources', 'must include the exact feed source identity');
  }
  const images = parseSortedImages(manifest.images);
  assertDeterministicDependencies(feedXml, 'feedXml');
  for (const [index, image] of images.entries()) {
    assertDeterministicDependencies(image, `images[${index}]`);
  }
  const allDigests = new Set([feedXml.digest, ...images.map(image => image.digest)]);
  for (const [owner, ref] of [feedXml, ...images].entries()) {
    for (const [edge, relation] of ref.contentRelations.entries()) {
      if (!allDigests.has(relation.to)) {
        fail(`content[${owner}].contentRelations[${edge}].to`, 'target is absent from snapshot');
      }
    }
  }
  return {
    schema: FEED_SNAPSHOT_SCHEMA,
    version: FEED_SNAPSHOT_VERSION,
    feedSource,
    feedXml,
    images,
    channels: parseSortedChannels(manifest.channels),
    freshness: parseFreshness(manifest.freshness),
  };
}

export function parseFeedSnapshotManifestJson(json: string): FeedSnapshotManifest {
  const byteLength = new TextEncoder().encode(json).byteLength;
  if (byteLength > MAX_FEED_SNAPSHOT_BYTES) {
    fail('json', `exceeds ${MAX_FEED_SNAPSHOT_BYTES} bytes`);
  }
  let wire: unknown;
  try {
    wire = JSON.parse(json);
  } catch {
    return fail('json', 'malformed JSON');
  }
  return parseFeedSnapshotManifest(wire);
}

export function serializeFeedSnapshotManifest(manifest: FeedSnapshotManifest): string {
  return `${JSON.stringify(parseFeedSnapshotManifest(manifest))}\n`;
}

async function loadRef(store: ContentStore, ref: ContentRef): Promise<Uint8Array> {
  if (ref.key !== contentKeyForDigest(ref.digest)) {
    throw new Error(`Feed snapshot key does not match digest: ${ref.digest}`);
  }
  const verification = await store.verify(ref.digest);
  if (verification.status !== 'verified' || verification.byteLength !== ref.byteLength) {
    throw new Error(`Feed snapshot content is unavailable or corrupt: ${ref.digest}`);
  }
  const bytes = await store.get(ref.digest);
  if (!bytes || bytes.byteLength !== ref.byteLength) {
    throw new Error(`Feed snapshot content changed during load: ${ref.digest}`);
  }
  return bytes;
}

/** Strict cache-only load. There is deliberately no online fallback or fetch callback in this API. */
export async function loadFeedSnapshotOffline(input: {
  readonly manifest: FeedSnapshotManifest;
  readonly store: ContentStore;
  readonly now?: Date;
}): Promise<LoadedFeedSnapshot> {
  const manifest = parseFeedSnapshotManifest(input.manifest);
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new TypeError('Feed snapshot clock is invalid');
  const nowMs = now.getTime();
  const fresh = nowMs <= Date.parse(manifest.freshness.freshUntil);
  if (nowMs > Date.parse(manifest.freshness.staleUntil)) {
    throw new Error('Feed snapshot exceeded its staleUntil boundary');
  }
  if (!fresh && manifest.freshness.staleBehavior === 'reject') {
    throw new Error('Feed snapshot policy rejects stale cached content');
  }

  const feedXml = await loadRef(input.store, manifest.feedXml);
  const images = new Map<ContentDigest, Uint8Array>();
  for (const image of manifest.images) images.set(image.digest, await loadRef(input.store, image));
  return { manifest, feedXml, images, freshness: fresh ? 'fresh' : 'stale' };
}

export function feedSnapshotContractIssues(): readonly string[] {
  const issues: string[] = [];
  if (FEED_SNAPSHOT_SCHEMA !== 'factorywager.feed-snapshot') issues.push('schema drift');
  if (FEED_SNAPSHOT_VERSION !== 1) issues.push('version drift');
  if (MAX_FEED_SNAPSHOT_BYTES > 2 * 1024 * 1024) issues.push('manifest byte bound widened');
  return issues;
}
