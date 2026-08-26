import { describe, expect, test } from 'bun:test';
import {
  CONTENT_RETENTION_POLICY,
  CONTENT_REF_VERSION,
  contentDigestForBytes,
  contentKeyForDigest,
  createContentSourceLocator,
  decideContentByteDeletion,
  parseContentRetentionPolicy,
  type ContentRef,
  type ContentRetentionPolicy,
} from '../lib/content-store/index.ts';
import { asEvidenceId, asIdentityId } from '../lib/types/branded.ts';

const steward = { kind: 'identity', identityId: asIdentityId('retention-steward') } as const;
const digest = contentDigestForBytes(new TextEncoder().encode('retained bytes'));

function target(state: 'denied' | 'expired-or-revoked' | 'approved-vendor' = 'expired-or-revoked'): ContentRef {
  return {
    version: CONTENT_REF_VERSION,
    digest,
    key: contentKeyForDigest(digest),
    byteLength: 14,
    mediaType: 'image/webp',
    sources: [createContentSourceLocator('https://media.example.test/image.webp')],
    contentRelations: [],
    packageDependencies: [],
    rights: {
      state,
      reviewEvidenceId: asEvidenceId('retention-rights'),
      reviewedAt: '2025-01-01T00:00:00.000Z',
    },
    authorities: {
      publisher: { kind: 'identity', identityId: asIdentityId('publisher') },
      storageSteward: steward,
      rightsReviewAuthority: { kind: 'identity', identityId: asIdentityId('reviewer') },
      aliasPublisher: { kind: 'identity', identityId: asIdentityId('alias-publisher') },
    },
  };
}

function enabledPolicy(): ContentRetentionPolicy {
  return parseContentRetentionPolicy({
    ...CONTENT_RETENTION_POLICY,
    byteDeletion: { ...CONTENT_RETENTION_POLICY.byteDeletion, enabled: true, grant: 'retention-review-2026' },
  });
}

function input() {
  return {
    target: target(),
    expectedDigest: digest,
    actor: steward,
    storedAt: '2025-01-01T00:00:00.000Z',
    now: '2026-08-26T00:00:00.000Z',
    activeAliasCount: 0,
    inboundRelationCount: 0,
    legalHold: false,
  } as const;
}

describe('content retention and deletion authority', () => {
  test('default policy disables deletion and preserves immutable records', () => {
    expect(decideContentByteDeletion(input())).toEqual({ allowed: false, reason: 'policy-disabled' });
    expect(CONTENT_RETENTION_POLICY.immutableRecords).toEqual([
      'content-identity',
      'rights-history',
      'source-provenance',
    ]);
  });

  test('an explicit policy grant permits only terminal unreferenced bytes after retention', () => {
    expect(decideContentByteDeletion(input(), enabledPolicy())).toEqual({
      allowed: true,
      reason: 'explicit-policy-grant',
      grant: 'retention-review-2026',
    });
    expect(decideContentByteDeletion({ ...input(), target: target('approved-vendor') }, enabledPolicy()).reason).toBe('rights-state-ineligible');
    expect(decideContentByteDeletion({ ...input(), activeAliasCount: 1 }, enabledPolicy()).reason).toBe('active-alias');
    expect(decideContentByteDeletion({ ...input(), inboundRelationCount: 1 }, enabledPolicy()).reason).toBe('inbound-relation');
    expect(decideContentByteDeletion({ ...input(), legalHold: true }, enabledPolicy()).reason).toBe('legal-hold');
  });

  test('denies digest, authority, clock, and minimum-retention substitutions', () => {
    const policy = enabledPolicy();
    const other = contentDigestForBytes(new TextEncoder().encode('other'));
    expect(decideContentByteDeletion({ ...input(), expectedDigest: other }, policy).reason).toBe('digest-substitution');
    expect(decideContentByteDeletion({ ...input(), actor: { kind: 'identity', identityId: asIdentityId('intruder') } }, policy).reason).toBe('authority-mismatch');
    expect(decideContentByteDeletion({ ...input(), now: 'invalid' }, policy).reason).toBe('invalid-clock');
    expect(decideContentByteDeletion({ ...input(), now: '2025-02-01T00:00:00.000Z' }, policy).reason).toBe('minimum-retention-active');
  });

  test('strictly rejects enabling deletion without a named grant or changing immutable history', () => {
    expect(() => parseContentRetentionPolicy({ ...CONTENT_RETENTION_POLICY, byteDeletion: { ...CONTENT_RETENTION_POLICY.byteDeletion, enabled: true } })).toThrow('deletion grant');
    expect(() => parseContentRetentionPolicy({ ...CONTENT_RETENTION_POLICY, immutableRecords: ['rights-history'] })).toThrow('immutable records');
  });
});
