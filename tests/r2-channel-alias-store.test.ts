import { describe, expect, test } from 'bun:test';

import {
  CONTENT_REF_VERSION,
  ChannelAliasPolicyError,
  MemoryContentStore,
  R2ChannelAliasStore,
  contentDigestForBytes,
  createContentSourceLocator,
  type ContentAuthorityRef,
  type ContentRef,
  type R2ChannelAliasBucket,
  type R2Conditional,
  type R2ObjectBody,
  type R2ObjectMetadata,
  type StoredContent,
} from '../lib/content-store/index.ts';
import {
  asChannelAliasId,
  asContentChannelId,
  asEvidenceId,
  asIdentityId,
} from '../lib/types/branded.ts';

type FakeObject = {
  bytes: Uint8Array;
  etag: string;
  customMetadata: Readonly<Record<string, string>>;
};

class FakeAliasBucket implements R2ChannelAliasBucket {
  readonly objects = new Map<string, FakeObject>();
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
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
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
      etag: `alias-etag-${++this.#revision}`,
      customMetadata: options.customMetadata,
    };
    this.objects.set(key, stored);
    return {
      key,
      size: bytes.byteLength,
      etag: stored.etag,
      customMetadata: stored.customMetadata,
    };
  }
}

const aliasId = asChannelAliasId('bun-latest');
const sourceChannelId = asContentChannelId('bun-release-feed');
const publisher: ContentAuthorityRef = {
  kind: 'identity',
  identityId: asIdentityId('release-publisher'),
};
const reviewer: ContentAuthorityRef = {
  kind: 'identity',
  identityId: asIdentityId('rights-reviewer'),
};
const aliasPublisher: ContentAuthorityRef = {
  kind: 'identity',
  identityId: asIdentityId('alias-publisher'),
};
const steward: ContentAuthorityRef = {
  kind: 'identity',
  identityId: asIdentityId('storage-steward'),
};

function contentRef(stored: StoredContent): ContentRef {
  return {
    version: CONTENT_REF_VERSION,
    digest: stored.digest,
    key: stored.key,
    byteLength: stored.byteLength,
    mediaType: 'application/rss+xml',
    sources: [createContentSourceLocator('https://feeds.example.test/releases.xml')],
    contentRelations: [],
    packageDependencies: [],
    rights: {
      state: 'approved-vendor',
      reviewEvidenceId: asEvidenceId('rights-evidence'),
      reviewedAt: '2026-08-25T00:00:00.000Z',
      validUntil: '2027-08-25T00:00:00.000Z',
    },
    authorities: {
      publisher,
      storageSteward: steward,
      rightsReviewAuthority: reviewer,
      aliasPublisher,
    },
  };
}

function expectCode(error: unknown, code: ChannelAliasPolicyError['code']): boolean {
  expect(error).toBeInstanceOf(ChannelAliasPolicyError);
  expect((error as ChannelAliasPolicyError).code).toBe(code);
  return true;
}

async function expectRejection(
  promise: Promise<unknown>,
  code: ChannelAliasPolicyError['code']
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected channel alias rejection: ${code}`);
  } catch (error) {
    expectCode(error, code);
  }
}

describe('R2ChannelAliasStore', () => {
  test('persists, resolves, and reopens an alias through strict R2 JSON', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('<rss/>'));
    const clock = () => new Date('2026-08-26T12:00:00.000Z');
    const firstStore = new R2ChannelAliasStore(bucket, contentStore, undefined, clock);
    const promoted = await firstStore.promote({
      aliasId,
      sourceChannelId,
      target: contentRef(stored),
      actor: aliasPublisher,
      expectedRevision: 0,
    });

    expect(promoted.revision).toBe(1);
    const reopened = new R2ChannelAliasStore(bucket, contentStore, undefined, clock);
    expect(await reopened.resolve(aliasId)).toEqual(promoted);
  });

  test('uses the observed R2 etag so two exact-revision promotions have one winner', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const first = await contentStore.put(new TextEncoder().encode('first'));
    const second = await contentStore.put(new TextEncoder().encode('second'));
    const third = await contentStore.put(new TextEncoder().encode('third'));
    const store = new R2ChannelAliasStore(bucket, contentStore);
    const initial = await store.promote({
      aliasId,
      sourceChannelId,
      target: contentRef(first),
      actor: aliasPublisher,
      expectedRevision: 0,
    });

    const results = await Promise.allSettled([
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(second),
        actor: aliasPublisher,
        expectedRevision: initial.revision,
        expectedCurrentDigest: first.digest,
      }),
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(third),
        actor: aliasPublisher,
        expectedRevision: initial.revision,
        expectedCurrentDigest: first.digest,
      }),
    ]);

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find(result => result.status === 'rejected');
    expect(loser?.status).toBe('rejected');
    if (loser?.status === 'rejected') expectCode(loser.reason, 'STALE_REVISION');
    expect((await store.resolve(aliasId)).revision).toBe(2);
  });

  test('makes revocation durable and terminal', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('release'));
    const store = new R2ChannelAliasStore(bucket, contentStore);
    const active = await store.promote({
      aliasId,
      sourceChannelId,
      target: contentRef(stored),
      actor: aliasPublisher,
      expectedRevision: 0,
    });
    const revoked = await store.revoke({
      aliasId,
      actor: aliasPublisher,
      expectedRevision: active.revision,
      expectedCurrentDigest: active.target.digest,
      reason: 'rights approval withdrawn',
    });
    expect(revoked.lifecycle).toBe('revoked');
    await expectRejection(store.resolve(aliasId), 'ALIAS_REVOKED');
    await expectRejection(
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(stored),
        actor: aliasPublisher,
        expectedRevision: revoked.revision,
        expectedCurrentDigest: stored.digest,
      }),
      'ALIAS_REVOKED'
    );
  });

  test('fails closed on malformed persisted JSON and mismatched metadata', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const key = `channel-alias/v1/${aliasId}.json`;
    bucket.objects.set(key, {
      bytes: new TextEncoder().encode('{"schema":"wrong"}\n'),
      etag: 'bad-json',
      customMetadata: {},
    });
    const store = new R2ChannelAliasStore(bucket, contentStore);
    await expect(store.get(aliasId)).rejects.toThrow('unknown lifecycle');

    bucket.objects.set(key, {
      bytes: new TextEncoder().encode('{}\n'),
      etag: 'bad-metadata',
      customMetadata: {
        schema: 'factorywager.channel-alias-object.v1',
        aliasId: 'other-alias',
      },
    });
    await expect(store.get(aliasId)).rejects.toThrow();
  });

  test('rehashes persisted alias bytes independently of R2 metadata', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('release'));
    const store = new R2ChannelAliasStore(bucket, contentStore);
    await store.promote({
      aliasId,
      sourceChannelId,
      target: contentRef(stored),
      actor: aliasPublisher,
      expectedRevision: 0,
    });
    const key = `channel-alias/v1/${aliasId}.json`;
    const persisted = bucket.objects.get(key)!;
    const wire = JSON.parse(new TextDecoder().decode(persisted.bytes));
    wire.issuedAt = '2026-08-26T12:00:01.000Z';
    persisted.bytes = new TextEncoder().encode(`${JSON.stringify(wire)}\n`);

    await expect(store.get(aliasId)).rejects.toThrow('custom metadata mismatch');
  });
});
