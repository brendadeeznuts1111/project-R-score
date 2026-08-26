import { describe, expect, test } from 'bun:test';

import {
  ChannelAliasPolicyError,
  MemoryChannelAliasStore,
  MemoryContentRightsStore,
  MemoryContentStore,
  contentKeyForDigest,
  createContentSourceLocator,
  parseContentRef,
  type ContentAuthorityRef,
  type ContentRef,
  type ContentRights,
  type StoredContent,
} from '../lib/content-store/index.ts';
import {
  asChannelAliasId,
  asContentChannelId,
  asEvidenceId,
  asIdentityId,
  type IdentityId,
} from '../lib/types/branded.ts';

const aliasId = asChannelAliasId('bun-latest');
const sourceChannelId = asContentChannelId('bun-release-feed');
const publisher = authority(asIdentityId('release-publisher'));
const reviewer = authority(asIdentityId('rights-reviewer'));
const aliasPublisher = authority(asIdentityId('alias-publisher'));
const steward = authority(asIdentityId('storage-steward'));

function authority(identityId: IdentityId): ContentAuthorityRef {
  return { kind: 'identity', identityId };
}

function approvedRights(validUntil = '2027-08-26T00:00:00.000Z'): ContentRights {
  return {
    state: 'approved-vendor',
    reviewEvidenceId: asEvidenceId('rights-evidence'),
    reviewedAt: '2026-08-25T00:00:00.000Z',
    validUntil,
  };
}

function contentRef(
  stored: StoredContent,
  options: {
    readonly rights?: ContentRights;
    readonly publisher?: ContentAuthorityRef;
    readonly reviewer?: ContentAuthorityRef;
    readonly aliasPublisher?: ContentAuthorityRef;
    readonly locator?: string;
    readonly byteLength?: number;
  } = {}
): ContentRef {
  return parseContentRef({
    version: 1,
    digest: stored.digest,
    key: contentKeyForDigest(stored.digest),
    byteLength: options.byteLength ?? stored.byteLength,
    mediaType: 'application/xml',
    sources: [
      createContentSourceLocator(options.locator ?? 'https://feeds.example.test/bun.xml'),
    ],
    contentRelations: [],
    packageDependencies: [],
    rights: options.rights ?? approvedRights(),
    authorities: {
      publisher: options.publisher ?? publisher,
      storageSteward: steward,
      rightsReviewAuthority: options.reviewer ?? reviewer,
      aliasPublisher: options.aliasPublisher ?? aliasPublisher,
    },
  });
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
      actor: target.authorities.rightsReviewAuthority,
      rights: target.rights,
      expectedRevision: 0,
    });
  }
  return store;
}

function expectPolicyCode(error: unknown, code: ChannelAliasPolicyError['code']): boolean {
  expect(error).toBeInstanceOf(ChannelAliasPolicyError);
  expect((error as ChannelAliasPolicyError).code).toBe(code);
  return true;
}

async function expectPolicyRejection(
  promise: Promise<unknown>,
  code: ChannelAliasPolicyError['code']
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected channel alias policy rejection: ${code}`);
  } catch (error) {
    expectPolicyCode(error, code);
  }
}

describe('MemoryChannelAliasStore', () => {
  test('promotes and resolves a frozen, content-addressed alias record', async () => {
    const bytes = new TextEncoder().encode('<rss>release</rss>');
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(bytes);
    const original = contentRef(stored);
    const rightsStore = await approvedRightsStore([original]);
    const store = new MemoryChannelAliasStore(
      contentStore,
      rightsStore,
      undefined,
      () => new Date('2026-08-26T12:00:00.000Z')
    );

    const promoted = await store.promote({
      aliasId,
      sourceChannelId,
      target: original,
      actor: aliasPublisher,
      expectedRevision: 0,
      expiresAt: '2026-09-01T00:00:00.000Z',
    });

    expect(promoted).toMatchObject({
      schema: 'factorywager.channel-alias',
      version: 1,
      aliasId,
      sourceChannelId,
      lifecycle: 'active',
      revision: 1,
      issuedAt: '2026-08-26T12:00:00.000Z',
    });
    expect(promoted.target.digest).toBe(stored.digest);
    expect(promoted.authorities).toEqual({ publisher, rightsReviewAuthority: reviewer, aliasPublisher });
    expect(Object.isFrozen(promoted)).toBeTrue();
    expect(Object.isFrozen(promoted.target)).toBeTrue();
    expect(Object.isFrozen(promoted.target.sources)).toBeTrue();
    expect(await store.resolve(aliasId)).toBe(promoted);
  });

  test('rejects missing, corrupt, length-mismatched, and rights-ineligible targets', async () => {
    const missingStore = new MemoryContentStore();
    const elsewhere = new MemoryContentStore();
    const missing = await elsewhere.put(new TextEncoder().encode('missing'));
    await expectPolicyRejection(
      new MemoryChannelAliasStore(missingStore, new MemoryContentRightsStore()).promote({
        aliasId,
        sourceChannelId,
        target: contentRef(missing),
        actor: aliasPublisher,
        expectedRevision: 0,
      }),
      'CONTENT_MISSING'
    );

    const backing = new Map();
    const corruptStore = new MemoryContentStore({ backing });
    const corrupt = await corruptStore.put(new TextEncoder().encode('trusted'));
    backing.set(corrupt.digest, new TextEncoder().encode('tampered'));
    await expectPolicyRejection(
      new MemoryChannelAliasStore(corruptStore, new MemoryContentRightsStore()).promote({
        aliasId,
        sourceChannelId,
        target: contentRef(corrupt),
        actor: aliasPublisher,
        expectedRevision: 0,
      }),
      'CONTENT_CORRUPT'
    );

    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('bytes'));
    const store = new MemoryChannelAliasStore(
      contentStore,
      new MemoryContentRightsStore(),
      undefined,
      () => new Date('2026-08-26T12:00:00.000Z')
    );
    await expectPolicyRejection(
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(stored, { byteLength: stored.byteLength + 1 }),
        actor: aliasPublisher,
        expectedRevision: 0,
      }),
      'CONTENT_LENGTH_MISMATCH'
    );

    for (const rights of [
      { state: 'unknown' },
      { state: 'pending-review' },
      {
        state: 'external-only',
        reviewEvidenceId: asEvidenceId('external-evidence'),
        reviewedAt: '2026-08-25T00:00:00.000Z',
      },
      {
        state: 'expired-or-revoked',
        reviewEvidenceId: asEvidenceId('revoked-evidence'),
        reviewedAt: '2026-08-25T00:00:00.000Z',
      },
    ] as const satisfies readonly ContentRights[]) {
      await expectPolicyRejection(
        store.promote({
          aliasId,
          sourceChannelId,
          target: contentRef(stored, { rights }),
          actor: aliasPublisher,
          expectedRevision: 0,
        }),
        'RIGHTS_INELIGIBLE'
      );
    }
  });

  test('defaults to distinct ownership and exact alias-publisher authority', async () => {
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('release'));
    const store = new MemoryChannelAliasStore(contentStore, new MemoryContentRightsStore());

    await expectPolicyRejection(
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(stored),
        actor: publisher,
        expectedRevision: 0,
      }),
      'AUTHORITY_MISMATCH'
    );

    await expectPolicyRejection(
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(stored, { reviewer: publisher }),
        actor: aliasPublisher,
        expectedRevision: 0,
      }),
      'AUTHORITY_ROLE_CONFLATION'
    );
  });

  test('uses exact revision and digest CAS so concurrent promotion has one winner', async () => {
    const contentStore = new MemoryContentStore();
    const first = await contentStore.put(new TextEncoder().encode('first'));
    const second = await contentStore.put(new TextEncoder().encode('second'));
    const third = await contentStore.put(new TextEncoder().encode('third'));
    const refs = [contentRef(first), contentRef(second), contentRef(third)] as const;
    const store = new MemoryChannelAliasStore(contentStore, await approvedRightsStore(refs));
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
    const rejected = results.find(result => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') expectPolicyCode(rejected.reason, 'STALE_REVISION');
    expect((await store.resolve(aliasId)).revision).toBe(2);

    await expectPolicyRejection(
      store.promote({
        aliasId,
        sourceChannelId,
        target: refs[1],
        actor: aliasPublisher,
        expectedRevision: 2,
        expectedCurrentDigest: first.digest,
      }),
      'DIGEST_SUBSTITUTION'
    );
  });

  test('snapshots locator metadata and revokes without changing content identity', async () => {
    let now = new Date('2026-08-26T12:00:00.000Z');
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('immutable'));
    const original = contentRef(stored);
    const rightsStore = await approvedRightsStore([original], () => now);
    const store = new MemoryChannelAliasStore(contentStore, rightsStore, undefined, () => now);
    const promoted = await store.promote({
      aliasId,
      sourceChannelId,
      target: original,
      actor: aliasPublisher,
      expectedRevision: 0,
      expiresAt: '2026-08-27T00:00:00.000Z',
    });
    const originalLocator = promoted.target.sources[0]?.locator;
    Reflect.set(
      original.sources,
      0,
      createContentSourceLocator('https://attacker.example.test/substitute')
    );
    expect(promoted.target.sources[0]?.locator).toBe(originalLocator);

    await expectPolicyRejection(
      store.promote({
        aliasId,
        sourceChannelId,
        target: contentRef(stored, {
          locator: 'https://attacker.example.test/substitute',
        }),
        actor: aliasPublisher,
        expectedRevision: promoted.revision,
        expectedCurrentDigest: promoted.target.digest,
      }),
      'DIGEST_SUBSTITUTION'
    );

    now = new Date('2026-08-28T00:00:00.000Z');
    await expectPolicyRejection(store.resolve(aliasId), 'ALIAS_EXPIRED');
    now = new Date('2026-08-26T13:00:00.000Z');

    const revoked = await store.revoke({
      aliasId,
      actor: aliasPublisher,
      expectedRevision: promoted.revision,
      expectedCurrentDigest: promoted.target.digest,
      reason: 'Rights withdrawn by reviewer',
    });
    expect(revoked.lifecycle).toBe('revoked');
    expect(revoked.target.digest).toBe(promoted.target.digest);
    expect(revoked.target.key).toBe(promoted.target.key);
    await expectPolicyRejection(store.resolve(aliasId), 'ALIAS_REVOKED');

    now = new Date('2028-08-28T00:00:00.000Z');
    await expectPolicyRejection(
      store.promote({
        aliasId: asChannelAliasId('expired-target'),
        sourceChannelId,
        target: contentRef(stored, { rights: approvedRights('2026-08-27T00:00:00.000Z') }),
        actor: aliasPublisher,
        expectedRevision: 0,
      }),
      'RIGHTS_INELIGIBLE'
    );
  });

  test('propagates independent reviewer revocation without rewriting active alias identity', async () => {
    const contentStore = new MemoryContentStore();
    const stored = await contentStore.put(new TextEncoder().encode('licensed-image'));
    const target = contentRef(stored);
    const rightsStore = await approvedRightsStore([target]);
    const store = new MemoryChannelAliasStore(contentStore, rightsStore);
    const promoted = await store.promote({
      aliasId,
      sourceChannelId,
      target,
      actor: aliasPublisher,
      expectedRevision: 0,
    });
    const currentRights = await rightsStore.get(target.digest);
    await rightsStore.revoke({
      target,
      actor: reviewer,
      reviewEvidenceId: asEvidenceId('independent-revocation'),
      expectedRevision: currentRights!.revision,
      expectedRecordDigest: currentRights!.recordDigest,
      reason: 'License withdrawn by reviewer',
    });

    await expectPolicyRejection(store.resolve(aliasId), 'RIGHTS_INELIGIBLE');
    const retained = await store.get(aliasId);
    expect(retained?.lifecycle).toBe('active');
    expect(retained?.target.digest).toBe(promoted.target.digest);
    expect(retained?.target.key).toBe(promoted.target.key);
    expect(retained?.revision).toBe(promoted.revision);
  });

  test('fails closed when stored bytes become corrupt after promotion', async () => {
    const backing = new Map();
    const contentStore = new MemoryContentStore({ backing });
    const stored = await contentStore.put(new TextEncoder().encode('trusted'));
    const target = contentRef(stored);
    const store = new MemoryChannelAliasStore(
      contentStore,
      await approvedRightsStore([target])
    );
    await store.promote({
      aliasId,
      sourceChannelId,
      target,
      actor: aliasPublisher,
      expectedRevision: 0,
    });
    backing.set(stored.digest, new TextEncoder().encode('corrupt'));
    await expectPolicyRejection(store.resolve(aliasId), 'CONTENT_CORRUPT');
  });
});
