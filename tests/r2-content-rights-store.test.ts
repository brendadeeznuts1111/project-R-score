import { describe, expect, test } from 'bun:test';

import {
  CONTENT_REF_VERSION,
  MAX_CONTENT_RIGHTS_RECORD_BYTES,
  ContentRightsStoreError,
  MemoryContentStore,
  R2ContentRightsStore,
  contentDigestForBytes,
  contentKeyForDigest,
  createContentSourceLocator,
  type ContentAuthorityRef,
  type ContentRef,
  type R2Conditional,
  type R2ContentRightsBucket,
  type R2ObjectBody,
  type R2ObjectMetadata,
  type StoredContent,
} from '../lib/content-store/index.ts';
import { asEvidenceId, asIdentityId } from '../lib/types/branded.ts';

type FakeObject = {
  bytes: Uint8Array;
  etag: string;
  customMetadata: Readonly<Record<string, string>>;
};

class FakeRightsBucket implements R2ContentRightsBucket {
  readonly objects = new Map<string, FakeObject>();
  bodyReads = 0;
  #revision = 0;

  async get(key: string): Promise<R2ObjectBody | null> {
    const object = this.objects.get(key);
    if (!object) return null;
    const bytes = object.bytes.slice();
    return {
      key,
      size: bytes.byteLength,
      etag: object.etag,
      customMetadata: object.customMetadata,
      arrayBuffer: async () => {
        this.bodyReads += 1;
        return bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
      },
    };
  }

  async put(
    key: string,
    value: ArrayBuffer,
    options: {
      readonly onlyIf: R2Conditional;
      readonly sha256: string;
      readonly customMetadata: Readonly<Record<string, string>>;
    }
  ): Promise<R2ObjectMetadata | null> {
    const current = this.objects.get(key);
    if (options.onlyIf.etagDoesNotMatch === '*' && current) return null;
    if (options.onlyIf.etagMatches !== undefined && current?.etag !== options.onlyIf.etagMatches) {
      return null;
    }
    const bytes = new Uint8Array(value).slice();
    expect(contentDigestForBytes(bytes).slice('sha256:'.length)).toBe(options.sha256);
    const stored = {
      bytes,
      etag: `rights-etag-${++this.#revision}`,
      customMetadata: options.customMetadata,
    };
    this.objects.set(key, stored);
    return { key, size: bytes.byteLength, etag: stored.etag, customMetadata: stored.customMetadata };
  }
}

const publisher: ContentAuthorityRef = { kind: 'identity', identityId: asIdentityId('publisher') };
const steward: ContentAuthorityRef = { kind: 'identity', identityId: asIdentityId('steward') };
const reviewer: ContentAuthorityRef = { kind: 'identity', identityId: asIdentityId('reviewer') };
const aliasPublisher: ContentAuthorityRef = {
  kind: 'identity',
  identityId: asIdentityId('alias-publisher'),
};

function target(stored: StoredContent): ContentRef {
  return {
    version: CONTENT_REF_VERSION,
    digest: stored.digest,
    key: contentKeyForDigest(stored.digest),
    byteLength: stored.byteLength,
    mediaType: 'image/png',
    sources: [createContentSourceLocator('https://images.example.test/asset.png')],
    contentRelations: [],
    packageDependencies: [],
    rights: { state: 'pending-review' },
    authorities: { publisher, storageSteward: steward, rightsReviewAuthority: reviewer, aliasPublisher },
  };
}

function approval(evidence = 'approval') {
  return {
    state: 'approved-vendor' as const,
    reviewEvidenceId: asEvidenceId(evidence),
    reviewedAt: '2026-08-26T00:00:00.000Z',
    validUntil: '2027-08-26T00:00:00.000Z',
  };
}

describe('R2ContentRightsStore', () => {
  test('uses R2 current-pointer ETag CAS so concurrent reviewer updates have one winner', async () => {
    const bucket = new FakeRightsBucket();
    const bytes = new MemoryContentStore();
    const ref = target(await bytes.put(new TextEncoder().encode('asset')));
    const store = new R2ContentRightsStore(bucket, () => new Date('2026-08-26T12:00:00.000Z'));
    const initial = await store.decide({ target: ref, actor: reviewer, rights: approval(), expectedRevision: 0 });
    const results = await Promise.allSettled([
      store.decide({
        target: ref,
        actor: reviewer,
        rights: approval('renewal-a'),
        expectedRevision: initial.revision,
        expectedRecordDigest: initial.recordDigest,
      }),
      store.decide({
        target: ref,
        actor: reviewer,
        rights: approval('renewal-b'),
        expectedRevision: initial.revision,
        expectedRecordDigest: initial.recordDigest,
      }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find(result => result.status === 'rejected');
    expect(loser?.status).toBe('rejected');
    if (loser?.status === 'rejected') {
      expect(loser.reason).toBeInstanceOf(ContentRightsStoreError);
      expect((loser.reason as ContentRightsStoreError).code).toBe('STALE_REVISION');
    }
    expect(await store.history(ref.digest)).toHaveLength(2);
  });

  test('reopens the hash chain and fails closed on persisted body tampering', async () => {
    const bucket = new FakeRightsBucket();
    const bytes = new MemoryContentStore();
    const ref = target(await bytes.put(new TextEncoder().encode('asset')));
    const store = new R2ContentRightsStore(bucket);
    const approved = await store.decide({ target: ref, actor: reviewer, rights: approval(), expectedRevision: 0 });
    await store.revoke({
      target: ref,
      actor: reviewer,
      reviewEvidenceId: asEvidenceId('revoked'),
      expectedRevision: approved.revision,
      expectedRecordDigest: approved.recordDigest,
      reason: 'Approval withdrawn',
    });
    const reopened = new R2ContentRightsStore(bucket);
    expect((await reopened.history(ref.digest)).map(record => record.revision)).toEqual([1, 2]);

    const current = [...bucket.objects.entries()].find(([key]) => key.includes('/current/'))!;
    const wire = JSON.parse(new TextDecoder().decode(current[1].bytes));
    wire.rights.reason = 'Tampered';
    current[1].bytes = new TextEncoder().encode(`${JSON.stringify(wire)}\n`);
    await expect(reopened.get(ref.digest)).rejects.toThrow('hash mismatch');
  });

  test('rejects oversized persisted records before body materialization', async () => {
    const bucket = new FakeRightsBucket();
    const bytes = new MemoryContentStore();
    const ref = target(await bytes.put(new TextEncoder().encode('asset')));
    const store = new R2ContentRightsStore(bucket);
    await store.decide({
      target: ref,
      actor: reviewer,
      rights: approval(),
      expectedRevision: 0,
    });
    const current = [...bucket.objects.entries()].find(([key]) => key.includes('/current/'))!;
    current[1].bytes = new Uint8Array(MAX_CONTENT_RIGHTS_RECORD_BYTES + 1);
    const bodyReads = bucket.bodyReads;

    await expect(store.get(ref.digest)).rejects.toThrow(
      `exceeds ${MAX_CONTENT_RIGHTS_RECORD_BYTES} bytes`
    );
    expect(bucket.bodyReads).toBe(bodyReads);
  });
});
