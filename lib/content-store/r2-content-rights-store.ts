// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
import type { ContentDigest } from '../types/branded.ts';
import {
  MAX_CONTENT_RIGHTS_RECORD_BYTES,
  ContentRightsStoreError,
  MemoryContentRightsStore,
  parseRightsDecisionRecordJson,
  serializeRightsDecisionRecord,
  type ActiveRightsDecisionRecord,
  type ContentRightsStore,
  type CurrentRightsAuthorization,
  type DecideContentRightsInput,
  type RevokedRightsDecisionRecord,
  type RevokeContentRightsInput,
  type RightsDecisionRecord,
} from './content-rights-store.ts';
import type { ContentRef, ContentRightsOperation } from './content-contract.ts';
import type { R2Conditional, R2ObjectBody, R2ObjectMetadata } from './r2-content-store.ts';

// @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations
// @see https://developers.cloudflare.com/r2/reference/consistency/

export interface R2ContentRightsBucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options: {
      readonly onlyIf: R2Conditional;
      readonly sha256: string;
      readonly customMetadata: Readonly<Record<string, string>>;
    }
  ): Promise<R2ObjectMetadata | null>;
}

type RightsSnapshot = {
  readonly record: RightsDecisionRecord;
  readonly etag: string;
  readonly serialized: string;
};

const RIGHTS_CURRENT_OBJECT_SCHEMA = 'factorywager.content-rights-current.v1';
const RIGHTS_HISTORY_OBJECT_SCHEMA = 'factorywager.content-rights-history.v1';

function digestHex(digest: ContentDigest): string {
  return digest.slice('sha256:'.length);
}

function currentKey(contentDigest: ContentDigest): string {
  return `content-rights/current/v1/${digestHex(contentDigest)}.json`;
}

function historyKey(contentDigest: ContentDigest, recordDigest: ContentDigest): string {
  return `content-rights/history/v1/${digestHex(contentDigest)}/${digestHex(recordDigest)}.json`;
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function sha256Hex(bytes: Uint8Array): string {
  return Bun.CryptoHasher.hash('sha256', bytes, 'hex');
}

/**
 * Structural Workers-binding adapter. Each decision is retained under its own
 * hash key before the conditional current-pointer write. A losing CAS can
 * leave an unreachable candidate history object, but can never replace the
 * authoritative chain.
 */
export class R2ContentRightsStore implements ContentRightsStore {
  constructor(
    readonly bucket: R2ContentRightsBucket,
    readonly clock: () => Date = () => new Date()
  ) {}

  async get(contentDigest: ContentDigest): Promise<RightsDecisionRecord | undefined> {
    return (await this.readCurrent(contentDigest))?.record;
  }

  async history(contentDigest: ContentDigest): Promise<readonly RightsDecisionRecord[]> {
    const current = await this.get(contentDigest);
    if (!current) return [];
    const reversed: RightsDecisionRecord[] = [];
    let cursor: RightsDecisionRecord | undefined = current;
    while (cursor !== undefined) {
      reversed.push(cursor);
      if (cursor.previousRecordDigest === undefined) break;
      const previous = await this.readHistory(contentDigest, cursor.previousRecordDigest);
      if (previous.revision !== cursor.revision - 1) {
        throw new TypeError('Invalid R2 content rights history: non-contiguous revision');
      }
      cursor = previous;
    }
    return Object.freeze(reversed.reverse());
  }

  async decide(input: DecideContentRightsInput): Promise<ActiveRightsDecisionRecord> {
    const before = await this.readCurrent(input.target.digest);
    const record = await this.policyStore(before).decide(input);
    await this.persist(before, record);
    return record;
  }

  async revoke(input: RevokeContentRightsInput): Promise<RevokedRightsDecisionRecord> {
    const before = await this.readCurrent(input.target.digest);
    const record = await this.policyStore(before).revoke(input);
    await this.persist(before, record);
    return record;
  }

  async authorize(
    target: ContentRef,
    operation: ContentRightsOperation,
    now = this.clock()
  ): Promise<CurrentRightsAuthorization> {
    const before = await this.readCurrent(target.digest);
    const authorization = await this.policyStore(before).authorize(target, operation, now);
    const after = await this.readCurrent(target.digest);
    if (!after || after.etag !== before?.etag || after.serialized !== before.serialized) {
      throw new ContentRightsStoreError(
        'STALE_REVISION',
        'Rights decision changed while authorizing'
      );
    }
    return authorization;
  }

  private policyStore(snapshot: RightsSnapshot | undefined): MemoryContentRightsStore {
    return new MemoryContentRightsStore(this.clock, snapshot ? [snapshot.record] : []);
  }

  private async persist(
    before: RightsSnapshot | undefined,
    record: RightsDecisionRecord
  ): Promise<void> {
    const serialized = serializeRightsDecisionRecord(record);
    const bytes = new TextEncoder().encode(serialized);
    const contentSha256 = sha256Hex(bytes);
    const immutableKey = historyKey(record.contentDigest, record.recordDigest);
    const historyResult = await this.bucket.put(immutableKey, exactArrayBuffer(bytes), {
      onlyIf: { etagDoesNotMatch: '*' },
      sha256: contentSha256,
      customMetadata: this.metadata(RIGHTS_HISTORY_OBJECT_SCHEMA, record, contentSha256),
    });
    if (historyResult === null) {
      const existing = await this.readHistory(record.contentDigest, record.recordDigest);
      if (serializeRightsDecisionRecord(existing) !== serialized) {
        throw new ContentRightsStoreError('DIGEST_SUBSTITUTION', 'Rights history hash collision');
      }
    }

    const result = await this.bucket.put(
      currentKey(record.contentDigest),
      exactArrayBuffer(bytes),
      {
        onlyIf: before ? { etagMatches: before.etag } : { etagDoesNotMatch: '*' },
        sha256: contentSha256,
        customMetadata: this.metadata(RIGHTS_CURRENT_OBJECT_SCHEMA, record, contentSha256),
      }
    );
    if (result === null) {
      throw new ContentRightsStoreError(
        'STALE_REVISION',
        'Rights decision changed before durable CAS'
      );
    }
    const persisted = await this.readCurrent(record.contentDigest);
    if (!persisted || persisted.serialized !== serialized) {
      throw new ContentRightsStoreError(
        'STALE_REVISION',
        'Rights decision failed post-write verification'
      );
    }
  }

  private metadata(
    schema: string,
    record: RightsDecisionRecord,
    contentSha256: string
  ): Readonly<Record<string, string>> {
    return {
      schema,
      contentDigest: record.contentDigest,
      recordDigest: record.recordDigest,
      revision: String(record.revision),
      lifecycle: record.lifecycle,
      contentSha256,
    };
  }

  private async readCurrent(contentDigest: ContentDigest): Promise<RightsSnapshot | undefined> {
    const object = await this.bucket.get(currentKey(contentDigest));
    if (object === null) return undefined;
    return this.parseObject(
      object,
      currentKey(contentDigest),
      RIGHTS_CURRENT_OBJECT_SCHEMA,
      contentDigest
    );
  }

  private async readHistory(
    contentDigest: ContentDigest,
    recordDigest: ContentDigest
  ): Promise<RightsDecisionRecord> {
    const key = historyKey(contentDigest, recordDigest);
    const object = await this.bucket.get(key);
    if (object === null) throw new TypeError('Invalid R2 content rights history: missing link');
    const snapshot = await this.parseObject(
      object,
      key,
      RIGHTS_HISTORY_OBJECT_SCHEMA,
      contentDigest
    );
    if (snapshot.record.recordDigest !== recordDigest) {
      throw new TypeError('Invalid R2 content rights history: record key mismatch');
    }
    return snapshot.record;
  }

  private async parseObject(
    object: R2ObjectBody,
    expectedKey: string,
    schema: string,
    contentDigest: ContentDigest
  ): Promise<RightsSnapshot> {
    if (object.key !== expectedKey || !Number.isSafeInteger(object.size) || object.size < 0) {
      throw new TypeError('Invalid R2 content rights object metadata');
    }
    if (object.size > MAX_CONTENT_RIGHTS_RECORD_BYTES) {
      throw new TypeError(
        `Invalid R2 content rights object: exceeds ${MAX_CONTENT_RIGHTS_RECORD_BYTES} bytes`
      );
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength !== object.size) {
      throw new TypeError('Invalid R2 content rights object: body length mismatch');
    }
    const contentSha256 = sha256Hex(bytes);
    const serialized = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const record = parseRightsDecisionRecordJson(serialized);
    if (
      record.contentDigest !== contentDigest ||
      object.customMetadata?.schema !== schema ||
      object.customMetadata.contentDigest !== contentDigest ||
      object.customMetadata.recordDigest !== record.recordDigest ||
      object.customMetadata.revision !== String(record.revision) ||
      object.customMetadata.lifecycle !== record.lifecycle ||
      object.customMetadata.contentSha256 !== contentSha256
    ) {
      throw new TypeError('Invalid R2 content rights object: custom metadata mismatch');
    }
    return { record, etag: object.etag, serialized };
  }
}
