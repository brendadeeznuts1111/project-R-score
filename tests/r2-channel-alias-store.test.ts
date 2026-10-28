import { describe, expect, test } from 'bun:test';

import {
  CONTENT_REF_VERSION,
  ChannelAliasPolicyError,
  MemoryContentRightsStore,
  MemoryContentStore,
  R2ChannelAliasStore,
  R2ContentRightsStore,
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

async function approvedRightsStore(
  targets: readonly ContentRef[],
  clock: () => Date = () => new Date('2026-08-26T12:00:00.000Z')
): Promise<MemoryContentRightsStore> {
  const store = new MemoryContentRightsStore(clock);
  for (const target of targets) {
    if (target.rights.state !== 'approved-vendor') throw new Error('Expected approved test target');
    await store.decide({
      target,
      actor: reviewer,
      rights: target.rights,
      expectedRevision: 0,
    });
  }
  return store;
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
    const ref = contentRef(stored);
    const rightsStore = await approvedRightsStore([ref], clock);
    const firstStore = new R2ChannelAliasStore(bucket, contentStore, rightsStore, undefined, clock);
    const promoted = await firstStore.promote({
      aliasId,
      sourceChannelId,
      target: ref,
      actor: aliasPublisher,
      expectedRevision: 0,
    });

    expect(promoted.revision).toBe(1);
    const reopened = new R2ChannelAliasStore(bucket, contentStore, rightsStore, undefined, clock);
    expect(await reopened.resolve(aliasId)).toEqual(promoted);
  });

  test('uses the observed R2 etag so two exact-revision promotions have one winner', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const first = await contentStore.put(new TextEncoder().encode('first'));
    const second = await contentStore.put(new TextEncoder().encode('second'));
    const third = await contentStore.put(new TextEncoder().encode('third'));
    const refs = [contentRef(first), contentRef(second), contentRef(third)] as const;
    const store = new R2ChannelAliasStore(bucket, contentStore, await approvedRightsStore(refs));
    const initial = await store.promote({
      aliasId,
      sourceChannelId,
      target: refs[0],
      actor: aliasPublisher,
      expectedRevision: 0,
    });

    const results = await Promise.allSettled([
      store.promote({
        aliasId,
        sourceChannelId,
        target: refs[1],
        actor: aliasPublisher,
        expectedRevision: initial.revision,
        expectedCurrentDigest: first.digest,
      }),
      store.promote({
        aliasId,
        sourceChannelId,
        target: refs[2],
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
    const ref = contentRef(stored);
    const store = new R2ChannelAliasStore(
      bucket,
      contentStore,
      await approvedRightsStore([ref])
    );
    const active = await store.promote({
      aliasId,
      sourceChannelId,
      target: ref,
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
        target: ref,
        actor: aliasPublisher,
        expectedRevision: revoked.revision,
        expectedCurrentDigest: stored.digest,
      }),
      'ALIAS_REVOKED'
    );
  });

  test('consults the durable reviewer ledger so revocation disables an active R2 alias', async () => {
    const bucket = new FakeAliasBucket();
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('licensed-release'));
    const ref = contentRef(stored);
    const clock = () => new Date('2026-08-26T12:00:00.000Z');
    const rightsStore = new R2ContentRightsStore(bucket, clock);
    if (ref.rights.state !== 'approved-vendor') throw new Error('Expected approved test rights');
    const decision = await rightsStore.decide({
      target: ref,
      actor: reviewer,
      rights: ref.rights,
      expectedRevision: 0,
    });
    const aliases = new R2ChannelAliasStore(bucket, contentStore, rightsStore, undefined, clock);
    const active = await aliases.promote({
      aliasId,
      sourceChannelId,
      target: ref,
      actor: aliasPublisher,
      expectedRevision: 0,
    });
    await rightsStore.revoke({
      target: ref,
      actor: reviewer,
      reviewEvidenceId: asEvidenceId('durable-rights-revocation'),
      expectedRevision: decision.revision,
      expectedRecordDigest: decision.recordDigest,
      reason: 'Durable vendor approval withdrawn',
    });

    await expectRejection(aliases.resolve(aliasId), 'RIGHTS_INELIGIBLE');
    expect((await aliases.get(aliasId))?.target.digest).toBe(active.target.digest);
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
    const store = new R2ChannelAliasStore(bucket, contentStore, new MemoryContentRightsStore());
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
    const ref = contentRef(stored);
    const store = new R2ChannelAliasStore(
      bucket,
      contentStore,
      await approvedRightsStore([ref])
    );
    await store.promote({
      aliasId,
      sourceChannelId,
      target: ref,
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
