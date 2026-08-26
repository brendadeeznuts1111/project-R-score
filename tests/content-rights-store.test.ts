import { describe, expect, test } from 'bun:test';

import {
  CONTENT_REF_VERSION,
  ContentRightsStoreError,
  MemoryContentRightsStore,
  MemoryContentStore,
  contentKeyForDigest,
  createContentSourceLocator,
  parseRightsDecisionRecordJson,
  serializeRightsDecisionRecord,
  type ContentAuthorityRef,
  type ContentRef,
  type StoredContent,
} from '../lib/content-store/index.ts';
import { asEvidenceId, asIdentityId, type IdentityId } from '../lib/types/branded.ts';

const publisher = authority(asIdentityId('publisher'));
const steward = authority(asIdentityId('storage-steward'));
const reviewer = authority(asIdentityId('rights-reviewer'));
const aliasPublisher = authority(asIdentityId('alias-publisher'));

function authority(identityId: IdentityId): ContentAuthorityRef {
  return { kind: 'identity', identityId };
}

function contentRef(stored: StoredContent): ContentRef {
  return {
    version: CONTENT_REF_VERSION,
    digest: stored.digest,
    key: contentKeyForDigest(stored.digest),
    byteLength: stored.byteLength,
    mediaType: 'application/xml',
    sources: [createContentSourceLocator('https://feeds.example.test/releases.xml')],
    contentRelations: [],
    packageDependencies: [],
    rights: { state: 'pending-review' },
    authorities: { publisher, storageSteward: steward, rightsReviewAuthority: reviewer, aliasPublisher },
  };
}

function approval(validUntil = '2026-08-27T00:00:00.000Z') {
  return {
    state: 'approved-vendor' as const,
    reviewEvidenceId: asEvidenceId('rights-approval'),
    reviewedAt: '2026-08-26T00:00:00.000Z',
    validUntil,
  };
}

async function expectCode(promise: Promise<unknown>, code: ContentRightsStoreError['code']) {
  try {
    await promise;
    throw new Error(`Expected rights error ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ContentRightsStoreError);
    expect((error as ContentRightsStoreError).code).toBe(code);
  }
}

describe('MemoryContentRightsStore', () => {
  test('persists a strict hash-verified record and rejects wire tampering', async () => {
    const content = new MemoryContentStore();
    const target = contentRef(await content.put(new TextEncoder().encode('<rss/>')));
    const store = new MemoryContentRightsStore(() => new Date('2026-08-26T12:00:00.000Z'));
    const record = await store.decide({
      target,
      actor: reviewer,
      rights: approval(),
      expectedRevision: 0,
    });
    const serialized = serializeRightsDecisionRecord(record);
    expect(parseRightsDecisionRecordJson(serialized)).toEqual(record);
    const tampered = JSON.parse(serialized);
    tampered.rights.validUntil = '2027-08-27T00:00:00.000Z';
    expect(() => parseRightsDecisionRecordJson(`${JSON.stringify(tampered)}\n`)).toThrow(
      'hash mismatch'
    );
    tampered.unknown = true;
    expect(() => parseRightsDecisionRecordJson(`${JSON.stringify(tampered)}\n`)).toThrow(
      'unexpected key unknown'
    );
  });

  test('allows only one concurrent exact-revision reviewer update', async () => {
    const content = new MemoryContentStore();
    const target = contentRef(await content.put(new TextEncoder().encode('bytes')));
    const store = new MemoryContentRightsStore();
    const initial = await store.decide({ target, actor: reviewer, rights: approval(), expectedRevision: 0 });
    const results = await Promise.allSettled([
      store.decide({
        target,
        actor: reviewer,
        rights: { ...approval(), reviewEvidenceId: asEvidenceId('renewal-a') },
        expectedRevision: initial.revision,
        expectedRecordDigest: initial.recordDigest,
      }),
      store.decide({
        target,
        actor: reviewer,
        rights: { ...approval(), reviewEvidenceId: asEvidenceId('renewal-b') },
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
    expect(await store.history(target.digest)).toHaveLength(2);
  });

  test('fails closed on expiry and preserves terminal reviewer revocation history', async () => {
    let now = new Date('2026-08-26T12:00:00.000Z');
    const content = new MemoryContentStore();
    const target = contentRef(await content.put(new TextEncoder().encode('image')));
    const store = new MemoryContentRightsStore(() => now);
    const approved = await store.decide({ target, actor: reviewer, rights: approval(), expectedRevision: 0 });
    await store.authorize(target, 'publish-active-alias');
    now = new Date('2026-08-28T00:00:00.000Z');
    await expectCode(store.authorize(target, 'publish-active-alias'), 'RIGHTS_INELIGIBLE');
    now = new Date('2026-08-26T13:00:00.000Z');
    const revoked = await store.revoke({
      target,
      actor: reviewer,
      reviewEvidenceId: asEvidenceId('rights-revocation'),
      expectedRevision: approved.revision,
      expectedRecordDigest: approved.recordDigest,
      reason: 'Vendor approval withdrawn',
    });
    expect(revoked.previousRecordDigest).toBe(approved.recordDigest);
    expect((await store.history(target.digest)).map(item => item.recordDigest)).toEqual([
      approved.recordDigest,
      revoked.recordDigest,
    ]);
    await expectCode(store.authorize(target, 'publish-active-alias'), 'DECISION_REVOKED');
    await expectCode(
      store.decide({
        target,
        actor: reviewer,
        rights: approval(),
        expectedRevision: revoked.revision,
        expectedRecordDigest: revoked.recordDigest,
      }),
      'DECISION_REVOKED'
    );
  });

  test('never lets publisher, steward, or alias publisher impersonate reviewer', async () => {
    const content = new MemoryContentStore();
    const target = contentRef(await content.put(new TextEncoder().encode('asset')));
    for (const actor of [publisher, steward, aliasPublisher]) {
      await expectCode(
        new MemoryContentRightsStore().decide({ target, actor, rights: approval(), expectedRevision: 0 }),
        'AUTHORITY_MISMATCH'
      );
    }
    const conflated = { ...target, authorities: { ...target.authorities, rightsReviewAuthority: publisher } };
    await expectCode(
      new MemoryContentRightsStore().decide({
        target: conflated,
        actor: publisher,
        rights: approval(),
        expectedRevision: 0,
      }),
      'AUTHORITY_ROLE_CONFLATION'
    );
  });
});
