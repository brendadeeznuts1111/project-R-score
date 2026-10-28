// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations

import type { ContentStore } from '../content-store/index.ts';
import type { ContentSourceLocator } from '../content-store/content-contract.ts';
import {
  FeedSnapshotArchiveConflictError,
  type FeedSnapshotArchive,
  type FeedSnapshotArchiveEntry,
  type FeedSnapshotArchivePublisher,
  type PublishFeedSnapshotAliasInput,
  type PublishedFeedSnapshotAlias,
} from './feed-snapshot-archive.ts';
import {
  MAX_FEED_SNAPSHOT_BYTES,
  parseFeedSnapshotManifest,
  type FeedSnapshotManifest,
} from './feed-snapshot-manifest.ts';
import {
  FEED_SNAPSHOT_ALIAS_SCHEMA as ALIAS_SCHEMA,
  FEED_SNAPSHOT_ALIAS_VERSION as ALIAS_VERSION,
  type R2FeedSnapshotAliasBucket,
} from './r2-feed-snapshot-bucket.ts';
export type { R2FeedSnapshotAliasBucket } from './r2-feed-snapshot-bucket.ts';

type AliasWire = {
  readonly schema: 'factorywager.feed-snapshot-alias';
  readonly version: 1;
  readonly revision: number;
  readonly manifest: FeedSnapshotManifest;
};

type AliasSnapshot = PublishedFeedSnapshotAlias & {
  readonly etag: string;
  readonly serialized: string;
};

const MAX_ALIAS_BYTES = MAX_FEED_SNAPSHOT_BYTES + 1_024;

function aliasKey(source: ContentSourceLocator): string {
  return `feed-snapshot-alias/v1/${source.locatorId}.json`;
}

function sha256(bytes: Uint8Array): string {
  return Bun.CryptoHasher.hash('sha256', bytes, 'hex');
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function parseAliasWire(value: unknown): AliasWire {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Invalid feed snapshot alias: expected object');
  }
  const wire = value as Record<string, unknown>;
  const keys = Object.keys(wire).sort();
  if (keys.join(',') !== ['manifest', 'revision', 'schema', 'version'].join(',')) {
    throw new TypeError('Invalid feed snapshot alias: unexpected fields');
  }
  if (wire.schema !== ALIAS_SCHEMA || wire.version !== ALIAS_VERSION) {
    throw new TypeError('Invalid feed snapshot alias: unsupported schema');
  }
  if (!Number.isSafeInteger(wire.revision) || Number(wire.revision) < 1) {
    throw new TypeError('Invalid feed snapshot alias: invalid revision');
  }
  return {
    schema: ALIAS_SCHEMA,
    version: ALIAS_VERSION,
    revision: Number(wire.revision),
    manifest: parseFeedSnapshotManifest(wire.manifest),
  };
}

function serializeAlias(wire: AliasWire): string {
  return `${JSON.stringify(parseAliasWire(wire))}\n`;
}

/** Hermetic Workers-binding adapter; callers provide the binding and immutable CAS explicitly. */
export class R2FeedSnapshotArchive implements FeedSnapshotArchive, FeedSnapshotArchivePublisher {
  constructor(
    readonly bucket: R2FeedSnapshotAliasBucket,
    readonly contentStore: ContentStore
  ) {}

  async load(source: ContentSourceLocator): Promise<FeedSnapshotArchiveEntry | undefined> {
    const snapshot = await this.readSnapshot(source);
    return snapshot === undefined
      ? undefined
      : { manifest: snapshot.manifest, contentStore: this.contentStore };
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
    const before = await this.readSnapshot(input.source);
    if ((before?.revision ?? 0) !== input.expectedRevision) {
      throw new FeedSnapshotArchiveConflictError('Feed snapshot alias revision changed');
    }
    const revision = input.expectedRevision + 1;
    const serialized = serializeAlias({
      schema: ALIAS_SCHEMA,
      version: ALIAS_VERSION,
      revision,
      manifest,
    });
    const bytes = new TextEncoder().encode(serialized);
    const contentSha256 = sha256(bytes);
    const result = await this.bucket.put(aliasKey(input.source), exactBuffer(bytes), {
      onlyIf: before ? { etagMatches: before.etag } : { etagDoesNotMatch: '*' },
      sha256: contentSha256,
      customMetadata: {
        schema: `${ALIAS_SCHEMA}.v1`,
        locatorId: input.source.locatorId,
        revision: String(revision),
        manifestDigest: contentSha256,
      },
    });
    if (result === null) {
      throw new FeedSnapshotArchiveConflictError('Feed snapshot alias changed before durable CAS');
    }
    const persisted = await this.readSnapshot(input.source);
    if (!persisted || persisted.serialized !== serialized) {
      throw new FeedSnapshotArchiveConflictError(
        'Feed snapshot alias failed post-write verification'
      );
    }
    return { source: persisted.source, revision, manifest: persisted.manifest };
  }

  private async readSnapshot(source: ContentSourceLocator): Promise<AliasSnapshot | undefined> {
    const key = aliasKey(source);
    const object = await this.bucket.get(key);
    if (object === null) return undefined;
    if (object.key !== key || !Number.isSafeInteger(object.size) || object.size < 0) {
      throw new TypeError('Invalid R2 feed snapshot alias metadata');
    }
    if (object.size > MAX_ALIAS_BYTES) {
      throw new TypeError(`Invalid R2 feed snapshot alias: exceeds ${MAX_ALIAS_BYTES} bytes`);
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength !== object.size) {
      throw new TypeError('Invalid R2 feed snapshot alias: body length mismatch');
    }
    const manifestDigest = sha256(bytes);
    let wire: unknown;
    let serialized: string;
    try {
      serialized = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      wire = JSON.parse(serialized);
    } catch {
      throw new TypeError('Invalid R2 feed snapshot alias: malformed JSON');
    }
    const alias = parseAliasWire(wire);
    const canonical = serializeAlias(alias);
    if (serialized !== canonical) {
      throw new TypeError('Invalid R2 feed snapshot alias: noncanonical JSON');
    }
    if (
      alias.manifest.feedSource.locator !== source.locator ||
      alias.manifest.feedSource.locatorId !== source.locatorId
    ) {
      throw new TypeError('Invalid R2 feed snapshot alias: source substitution');
    }
    if (
      object.customMetadata?.schema !== `${ALIAS_SCHEMA}.v1` ||
      object.customMetadata.locatorId !== source.locatorId ||
      object.customMetadata.revision !== String(alias.revision) ||
      object.customMetadata.manifestDigest !== manifestDigest
    ) {
      throw new TypeError('Invalid R2 feed snapshot alias: custom metadata mismatch');
    }
    return {
      source: alias.manifest.feedSource,
      revision: alias.revision,
      manifest: alias.manifest,
      etag: object.etag,
      serialized: canonical,
    };
  }
}
