// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher

import type {
  ContentDigest,
  ContentKey,
  EvidenceId,
  IdentityId,
  SourceLocatorId,
  SourceSystemId,
} from '../types/branded.ts';
import {
  asContentDigest,
  asContentKey,
  asSourceLocatorId,
  parseContentDigest,
  parseContentKey,
  parseEvidenceId,
  parseIdentityId,
  parseSourceLocatorId,
  parseSourceSystemId,
} from '../types/branded.ts';

export const CONTENT_REF_VERSION = 1 as const;
export const MAX_CONTENT_REF_BYTES = 1_073_741_824;
export const MAX_SOURCE_LOCATOR_LENGTH = 8_192;
export const MAX_CONTENT_SOURCES = 64;
export const MAX_CONTENT_DEPENDENCIES = 4_096;

export type ContentAuthorityRef =
  | { readonly kind: 'identity'; readonly identityId: IdentityId }
  | { readonly kind: 'source-system'; readonly sourceSystemId: SourceSystemId };

/** These roles are separate grants; no role implies any other role. */
export type ContentAuthorities = {
  readonly publisher: ContentAuthorityRef;
  readonly storageSteward: ContentAuthorityRef;
  readonly rightsReviewAuthority: ContentAuthorityRef;
  readonly aliasPublisher: ContentAuthorityRef;
};

export type ContentRightsLifecycleState =
  | 'unknown'
  | 'pending-review'
  | 'external-only'
  | 'approved-vendor'
  | 'denied'
  | 'expired-or-revoked';

export type ContentRights =
  | { readonly state: 'unknown' | 'pending-review' }
  | {
      readonly state: Exclude<ContentRightsLifecycleState, 'unknown' | 'pending-review'>;
      readonly reviewEvidenceId: EvidenceId;
      readonly reviewedAt: string;
      readonly validUntil?: string;
      readonly reason?: string;
    };

export type ContentRightsOperation =
  'retain-provenance' | 'store-bytes' | 'derive-bytes' | 'publish-active-alias' | 'link-external';

export type ContentRightsDecision = {
  readonly operation: ContentRightsOperation;
  readonly allowed: boolean;
  readonly reason:
    | 'historical-provenance'
    | 'approved-vendor'
    | 'external-delivery-only'
    | 'rights-not-approved'
    | 'rights-denied'
    | 'rights-expired-or-revoked';
};

export type ContentRelationKind = 'derived-from' | 'rendition-of' | 'embeds';

/** Digest graph for byte derivation/provenance, never a package dependency substitute. */
export type ContentRelationEdge = {
  readonly from: ContentDigest;
  readonly to: ContentDigest;
  readonly kind: ContentRelationKind;
};

export type PackageDependencyKind = 'runtime' | 'development' | 'optional' | 'peer';

export type PackageDependencyRecord = {
  readonly packageName: string;
  readonly range: string;
  readonly kind: PackageDependencyKind;
  /** Mirrors package peerDependenciesMeta without treating optional peers as optional deps. */
  readonly peer?: { readonly optional: boolean };
};

export type ContentSourceLocator = {
  readonly locator: string;
  readonly locatorId: SourceLocatorId;
};

export type ContentRef = {
  readonly version: typeof CONTENT_REF_VERSION;
  readonly digest: ContentDigest;
  readonly key: ContentKey;
  readonly byteLength: number;
  readonly mediaType: string;
  readonly sources: readonly ContentSourceLocator[];
  readonly contentRelations: readonly ContentRelationEdge[];
  readonly packageDependencies: readonly PackageDependencyRecord[];
  readonly rights: ContentRights;
  readonly authorities: ContentAuthorities;
};

function sha256Hex(bytes: Uint8Array): string {
  return Bun.CryptoHasher.hash('sha256', bytes, 'hex');
}

export function contentDigestForBytes(bytes: Uint8Array): ContentDigest {
  return asContentDigest(`sha256:${sha256Hex(bytes)}`);
}

export function contentKeyForDigest(digest: ContentDigest): ContentKey {
  const hex = digest.slice('sha256:'.length);
  return asContentKey(`sha256/${hex.slice(0, 2)}/${hex}`);
}

export function sourceLocatorIdFor(locator: string): SourceLocatorId {
  assertCanonicalLocator(locator);
  return asSourceLocatorId(`locator-sha256:${sha256Hex(new TextEncoder().encode(locator))}`);
}

export function createContentSourceLocator(locator: string): ContentSourceLocator {
  return { locator, locatorId: sourceLocatorIdFor(locator) };
}

export function decideContentRights(
  rights: ContentRights,
  operation: ContentRightsOperation,
  now = new Date()
): ContentRightsDecision {
  if (operation === 'retain-provenance') {
    return { operation, allowed: true, reason: 'historical-provenance' };
  }
  if (rights.state === 'approved-vendor') {
    if (rights.validUntil !== undefined && Date.parse(rights.validUntil) <= now.getTime()) {
      return { operation, allowed: false, reason: 'rights-expired-or-revoked' };
    }
    return { operation, allowed: true, reason: 'approved-vendor' };
  }
  if (rights.state === 'external-only' && operation === 'link-external') {
    return { operation, allowed: true, reason: 'external-delivery-only' };
  }
  if (rights.state === 'denied') return { operation, allowed: false, reason: 'rights-denied' };
  if (rights.state === 'expired-or-revoked') {
    return { operation, allowed: false, reason: 'rights-expired-or-revoked' };
  }
  return { operation, allowed: false, reason: 'rights-not-approved' };
}

/** Ratchet the lifecycle/operation matrix without coupling it to content identity. */
export function contentRightsContractIssues(): readonly string[] {
  const reviewedAt = '2026-08-26T00:00:00.000Z';
  const reviewEvidenceId = parseEvidenceId('rights-contract-ratchet');
  const now = new Date('2026-08-26T12:00:00.000Z');
  const approved: ContentRights = {
    state: 'approved-vendor',
    reviewEvidenceId,
    reviewedAt,
    validUntil: '2026-08-27T00:00:00.000Z',
  };
  const external: ContentRights = {
    state: 'external-only',
    reviewEvidenceId,
    reviewedAt,
  };
  const revoked: ContentRights = {
    state: 'expired-or-revoked',
    reviewEvidenceId,
    reviewedAt,
  };
  const checks = [
    ['approved-store', decideContentRights(approved, 'store-bytes', now).allowed, true],
    ['approved-alias', decideContentRights(approved, 'publish-active-alias', now).allowed, true],
    ['external-link', decideContentRights(external, 'link-external', now).allowed, true],
    ['external-alias', decideContentRights(external, 'publish-active-alias', now).allowed, false],
    ['unknown-store', decideContentRights({ state: 'unknown' }, 'store-bytes', now).allowed, false],
    ['revoked-alias', decideContentRights(revoked, 'publish-active-alias', now).allowed, false],
    ['revoked-provenance', decideContentRights(revoked, 'retain-provenance', now).allowed, true],
  ] as const;
  return checks
    .filter(([, actual, expected]) => actual !== expected)
    .map(([name]) => `rights decision drift: ${name}`);
}

function fail(field: string, detail: string): never {
  throw new TypeError(`Invalid ContentRef ${field}: ${detail}`);
}

function parseRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(field, 'expected object');
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  field: string
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(record)
    .filter(key => !allowedSet.has(key))
    .sort()[0];
  if (unexpected !== undefined) fail(field, `unexpected key ${unexpected}`);
}

function parseExactString(value: unknown, field: string, maxLength = 512): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value ||
    value.includes('\0')
  ) {
    return fail(field, 'expected canonical nonblank string');
  }
  return value;
}

function parseIsoTimestamp(value: unknown, field: string): string {
  const timestamp = parseExactString(value, field, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp)) {
    return fail(field, 'expected UTC ISO-8601 timestamp');
  }
  if (!Number.isFinite(Date.parse(timestamp))) return fail(field, 'invalid timestamp');
  return timestamp;
}

function assertCanonicalLocator(locator: string): void {
  if (
    locator.length === 0 ||
    locator.length > MAX_SOURCE_LOCATOR_LENGTH ||
    locator.trim() !== locator ||
    locator.includes('\0')
  ) {
    fail('source.locator', 'expected bounded canonical locator');
  }
}

export function parseContentAuthorityRef(value: unknown, field = 'authority'): ContentAuthorityRef {
  const record = parseRecord(value, field);
  if (record.kind === 'identity') {
    assertOnlyKeys(record, ['kind', 'identityId'], field);
    return { kind: 'identity', identityId: parseIdentityId(record.identityId) };
  }
  if (record.kind === 'source-system') {
    assertOnlyKeys(record, ['kind', 'sourceSystemId'], field);
    return { kind: 'source-system', sourceSystemId: parseSourceSystemId(record.sourceSystemId) };
  }
  return fail(`${field}.kind`, 'expected identity or source-system');
}

function parseAuthorities(value: unknown): ContentAuthorities {
  const record = parseRecord(value, 'authorities');
  assertOnlyKeys(
    record,
    ['publisher', 'storageSteward', 'rightsReviewAuthority', 'aliasPublisher'],
    'authorities'
  );
  return {
    publisher: parseContentAuthorityRef(record.publisher, 'authorities.publisher'),
    storageSteward: parseContentAuthorityRef(record.storageSteward, 'authorities.storageSteward'),
    rightsReviewAuthority: parseContentAuthorityRef(
      record.rightsReviewAuthority,
      'authorities.rightsReviewAuthority'
    ),
    aliasPublisher: parseContentAuthorityRef(record.aliasPublisher, 'authorities.aliasPublisher'),
  };
}

export function parseContentRights(value: unknown): ContentRights {
  const record = parseRecord(value, 'rights');
  if (record.state === 'unknown' || record.state === 'pending-review') {
    assertOnlyKeys(record, ['state'], 'rights');
    return { state: record.state };
  }
  if (
    !['external-only', 'approved-vendor', 'denied', 'expired-or-revoked'].includes(
      String(record.state)
    )
  ) {
    return fail('rights.state', 'unknown lifecycle state');
  }
  assertOnlyKeys(
    record,
    ['state', 'reviewEvidenceId', 'reviewedAt', 'validUntil', 'reason'],
    'rights'
  );
  const validUntil =
    record.validUntil === undefined
      ? undefined
      : parseIsoTimestamp(record.validUntil, 'rights.validUntil');
  const reason =
    record.reason === undefined ? undefined : parseExactString(record.reason, 'rights.reason', 512);
  return {
    state: record.state as Exclude<ContentRightsLifecycleState, 'unknown' | 'pending-review'>,
    reviewEvidenceId: parseEvidenceId(record.reviewEvidenceId),
    reviewedAt: parseIsoTimestamp(record.reviewedAt, 'rights.reviewedAt'),
    ...(validUntil === undefined ? {} : { validUntil }),
    ...(reason === undefined ? {} : { reason }),
  };
}

function parseSource(value: unknown, index: number): ContentSourceLocator {
  const record = parseRecord(value, `sources[${index}]`);
  assertOnlyKeys(record, ['locator', 'locatorId'], `sources[${index}]`);
  const locator = parseExactString(
    record.locator,
    `sources[${index}].locator`,
    MAX_SOURCE_LOCATOR_LENGTH
  );
  const locatorId = parseSourceLocatorId(record.locatorId);
  if (sourceLocatorIdFor(locator) !== locatorId) {
    return fail(`sources[${index}].locatorId`, 'does not hash the exact locator string');
  }
  return { locator, locatorId };
}

function parseContentRelation(value: unknown, index: number): ContentRelationEdge {
  const record = parseRecord(value, `contentRelations[${index}]`);
  assertOnlyKeys(record, ['from', 'to', 'kind'], `contentRelations[${index}]`);
  if (!['derived-from', 'rendition-of', 'embeds'].includes(String(record.kind))) {
    return fail(`contentRelations[${index}].kind`, 'unknown content relation kind');
  }
  return {
    from: parseContentDigest(record.from),
    to: parseContentDigest(record.to),
    kind: record.kind as ContentRelationKind,
  };
}

function parsePackageDependency(value: unknown, index: number): PackageDependencyRecord {
  const record = parseRecord(value, `packageDependencies[${index}]`);
  assertOnlyKeys(record, ['packageName', 'range', 'kind', 'peer'], `packageDependencies[${index}]`);
  const kind = record.kind;
  if (!['runtime', 'development', 'optional', 'peer'].includes(String(kind))) {
    return fail(`packageDependencies[${index}].kind`, 'unknown dependency kind');
  }
  const packageName = parseExactString(
    record.packageName,
    `packageDependencies[${index}].packageName`,
    214
  );
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/.test(packageName)) {
    return fail(`packageDependencies[${index}].packageName`, 'expected canonical package name');
  }
  const range = parseExactString(record.range, `packageDependencies[${index}].range`, 512);
  const peerRecord = record.peer;
  if (kind === 'peer') {
    const peer = parseRecord(peerRecord, `packageDependencies[${index}].peer`);
    assertOnlyKeys(peer, ['optional'], `packageDependencies[${index}].peer`);
    if (typeof peer.optional !== 'boolean') {
      return fail(`packageDependencies[${index}].peer.optional`, 'expected boolean');
    }
    return { packageName, range, kind, peer: { optional: peer.optional } };
  }
  if (peerRecord !== undefined) {
    return fail(
      `packageDependencies[${index}].peer`,
      'peer metadata belongs only to peer dependencies'
    );
  }
  return {
    packageName,
    range,
    kind: kind as Exclude<PackageDependencyKind, 'peer'>,
  };
}

/** Parse untrusted persisted/API data once into the trusted content contract. */
export function parseContentRef(value: unknown): ContentRef {
  const record = parseRecord(value, 'root');
  assertOnlyKeys(
    record,
    [
      'version',
      'digest',
      'key',
      'byteLength',
      'mediaType',
      'sources',
      'contentRelations',
      'packageDependencies',
      'rights',
      'authorities',
    ],
    'root'
  );
  if (record.version !== CONTENT_REF_VERSION) return fail('version', 'unsupported version');

  const digest = parseContentDigest(record.digest);
  const key = parseContentKey(record.key);
  if (contentKeyForDigest(digest) !== key) return fail('key', 'does not derive from digest');

  if (
    typeof record.byteLength !== 'number' ||
    !Number.isSafeInteger(record.byteLength) ||
    record.byteLength < 0 ||
    record.byteLength > MAX_CONTENT_REF_BYTES
  ) {
    return fail('byteLength', `expected integer from 0 to ${MAX_CONTENT_REF_BYTES}`);
  }

  const mediaType = parseExactString(record.mediaType, 'mediaType', 255);
  if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(mediaType)) {
    return fail('mediaType', 'expected canonical MIME type without parameters');
  }
  if (!Array.isArray(record.sources)) return fail('sources', 'expected array');
  if (!Array.isArray(record.contentRelations)) return fail('contentRelations', 'expected array');
  if (!Array.isArray(record.packageDependencies)) {
    return fail('packageDependencies', 'expected array');
  }
  if (record.sources.length > MAX_CONTENT_SOURCES) {
    return fail('sources', `cannot exceed ${MAX_CONTENT_SOURCES} entries`);
  }
  if (
    record.contentRelations.length + record.packageDependencies.length >
    MAX_CONTENT_DEPENDENCIES
  ) {
    return fail('dependency collections', `cannot exceed ${MAX_CONTENT_DEPENDENCIES} entries`);
  }
  const sources = record.sources.map(parseSource);
  const contentRelations = record.contentRelations.map(parseContentRelation);
  const packageDependencies = record.packageDependencies.map(parsePackageDependency);
  for (const [index, relation] of contentRelations.entries()) {
    if (relation.from !== digest) {
      return fail(`contentRelations[${index}].from`, 'must equal the owning content digest');
    }
  }

  return {
    version: CONTENT_REF_VERSION,
    digest,
    key,
    byteLength: record.byteLength,
    mediaType,
    sources,
    contentRelations,
    packageDependencies,
    rights: parseContentRights(record.rights),
    authorities: parseAuthorities(record.authorities),
  };
}
