import type { ChannelAliasId } from '../types/branded.ts';
import {
  ChannelAliasPolicyError,
  DEFAULT_CHANNEL_ALIAS_POLICY,
  MemoryChannelAliasStore,
  parseChannelAliasRecordJson,
  serializeChannelAliasRecord,
  type ActiveChannelAliasRecord,
  type ChannelAliasPolicy,
  type ChannelAliasRecord,
  type ChannelAliasStore,
  type PromoteChannelAliasInput,
  type RevokeChannelAliasInput,
  type RevokedChannelAliasRecord,
} from './channel-alias-store.ts';
import type { ContentStore } from './memory-content-store.ts';
import type { R2Conditional, R2ObjectBody, R2ObjectMetadata } from './r2-content-store.ts';

// @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations

export interface R2ChannelAliasBucket {
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

type AliasSnapshot = {
  readonly record: ChannelAliasRecord;
  readonly etag: string;
  readonly serialized: string;
};

const ALIAS_OBJECT_SCHEMA = 'factorywager.channel-alias-object.v1';
const MAX_ALIAS_BYTES = 2 * 1024 * 1024;

function aliasKey(aliasId: ChannelAliasId): string {
  return `channel-alias/v1/${aliasId}.json`;
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function sha256Hex(bytes: Uint8Array): string {
  return Bun.CryptoHasher.hash('sha256', bytes, 'hex');
}

/** R2-backed alias store using R2 ETag conditions as exact revision+digest CAS. */
export class R2ChannelAliasStore implements ChannelAliasStore {
  constructor(
    readonly bucket: R2ChannelAliasBucket,
    readonly contentStore: ContentStore,
    readonly policy: ChannelAliasPolicy = DEFAULT_CHANNEL_ALIAS_POLICY,
    readonly clock: () => Date = () => new Date()
  ) {}

  async get(aliasId: ChannelAliasId): Promise<ChannelAliasRecord | undefined> {
    return (await this.readSnapshot(aliasId))?.record;
  }

  async promote(input: PromoteChannelAliasInput): Promise<ActiveChannelAliasRecord> {
    const before = await this.readSnapshot(input.aliasId);
    const memory = this.policyStore(before);
    const record = await memory.promote(input);
    await this.compareAndSwap(input.aliasId, before, record);
    return record;
  }

  async revoke(input: RevokeChannelAliasInput): Promise<RevokedChannelAliasRecord> {
    const before = await this.readSnapshot(input.aliasId);
    const memory = this.policyStore(before);
    const record = await memory.revoke(input);
    await this.compareAndSwap(input.aliasId, before, record);
    return record;
  }

  async resolve(aliasId: ChannelAliasId): Promise<ActiveChannelAliasRecord> {
    const before = await this.readSnapshot(aliasId);
    if (!before) throw new ChannelAliasPolicyError('ALIAS_MISSING', 'Alias does not exist');
    const resolved = await this.policyStore(before).resolve(aliasId);
    const after = await this.readSnapshot(aliasId);
    if (!after || after.etag !== before.etag || after.serialized !== before.serialized) {
      throw new ChannelAliasPolicyError('STALE_REVISION', 'Alias changed while resolving');
    }
    return resolved;
  }

  private policyStore(snapshot: AliasSnapshot | undefined): MemoryChannelAliasStore {
    return new MemoryChannelAliasStore(
      this.contentStore,
      this.policy,
      this.clock,
      snapshot ? [[snapshot.record.aliasId, snapshot.record]] : []
    );
  }

  private async compareAndSwap(
    aliasId: ChannelAliasId,
    before: AliasSnapshot | undefined,
    record: ChannelAliasRecord
  ): Promise<void> {
    const serialized = serializeChannelAliasRecord(record);
    const bytes = new TextEncoder().encode(serialized);
    const key = aliasKey(aliasId);
    const result = await this.bucket.put(key, exactArrayBuffer(bytes), {
      onlyIf: before ? { etagMatches: before.etag } : { etagDoesNotMatch: '*' },
      sha256: sha256Hex(bytes),
      customMetadata: {
        schema: ALIAS_OBJECT_SCHEMA,
        aliasId,
        revision: String(record.revision),
        digest: record.target.digest,
        lifecycle: record.lifecycle,
      },
    });
    if (result === null) {
      throw new ChannelAliasPolicyError('STALE_REVISION', 'Alias changed before durable CAS');
    }
    const persisted = await this.readSnapshot(aliasId);
    if (!persisted || persisted.serialized !== serialized) {
      throw new ChannelAliasPolicyError(
        'STALE_REVISION',
        'Alias failed post-write durable verification'
      );
    }
  }

  private async readSnapshot(aliasId: ChannelAliasId): Promise<AliasSnapshot | undefined> {
    const key = aliasKey(aliasId);
    const object = await this.bucket.get(key);
    if (object === null) return undefined;
    if (object.key !== key || !Number.isSafeInteger(object.size) || object.size < 0) {
      throw new TypeError('Invalid R2 channel alias object metadata');
    }
    if (object.size > MAX_ALIAS_BYTES) {
      throw new TypeError(`Invalid R2 channel alias object: exceeds ${MAX_ALIAS_BYTES} bytes`);
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength !== object.size) {
      throw new TypeError('Invalid R2 channel alias object: body length mismatch');
    }
    const serialized = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const record = parseChannelAliasRecordJson(serialized);
    if (record.aliasId !== aliasId) {
      throw new TypeError('Invalid R2 channel alias object: alias key mismatch');
    }
    if (
      object.customMetadata?.schema !== ALIAS_OBJECT_SCHEMA ||
      object.customMetadata.aliasId !== aliasId ||
      object.customMetadata.revision !== String(record.revision) ||
      object.customMetadata.digest !== record.target.digest ||
      object.customMetadata.lifecycle !== record.lifecycle
    ) {
      throw new TypeError('Invalid R2 channel alias object: custom metadata mismatch');
    }
    return { record, etag: object.etag, serialized };
  }
}
