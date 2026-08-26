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
  'unreviewed' | 'approved' | 'denied' | 'expired' | 'revoked';

export type ContentRights =
  | { readonly state: 'unreviewed' }
  | {
      readonly state: Exclude<ContentRightsLifecycleState, 'unreviewed'>;
      readonly reviewEvidenceId: EvidenceId;
      readonly reviewedAt: string;
      readonly validUntil?: string;
      readonly reason?: string;
    };

export type ContentDependencyKind = 'runtime' | 'development' | 'optional' | 'peer';

export type ContentDependencyEdge = {
  readonly from: ContentDigest;
  readonly to: ContentDigest;
  readonly kind: ContentDependencyKind;
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
  readonly dependencies: readonly ContentDependencyEdge[];
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

export function isContentRightsUsable(rights: ContentRights, now = new Date()): boolean {
  if (rights.state !== 'approved') return false;
  return rights.validUntil === undefined || Date.parse(rights.validUntil) > now.getTime();
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

function parseAuthority(value: unknown, field: string): ContentAuthorityRef {
  const record = parseRecord(value, field);
  if (record.kind === 'identity') {
    return { kind: 'identity', identityId: parseIdentityId(record.identityId) };
  }
  if (record.kind === 'source-system') {
    return { kind: 'source-system', sourceSystemId: parseSourceSystemId(record.sourceSystemId) };
  }
  return fail(`${field}.kind`, 'expected identity or source-system');
}

function parseAuthorities(value: unknown): ContentAuthorities {
  const record = parseRecord(value, 'authorities');
  return {
    publisher: parseAuthority(record.publisher, 'authorities.publisher'),
    storageSteward: parseAuthority(record.storageSteward, 'authorities.storageSteward'),
    rightsReviewAuthority: parseAuthority(
      record.rightsReviewAuthority,
      'authorities.rightsReviewAuthority'
    ),
    aliasPublisher: parseAuthority(record.aliasPublisher, 'authorities.aliasPublisher'),
  };
}

function parseRights(value: unknown): ContentRights {
  const record = parseRecord(value, 'rights');
  if (record.state === 'unreviewed') return { state: 'unreviewed' };
  if (!['approved', 'denied', 'expired', 'revoked'].includes(String(record.state))) {
    return fail('rights.state', 'unknown lifecycle state');
  }
  const validUntil =
    record.validUntil === undefined
      ? undefined
      : parseIsoTimestamp(record.validUntil, 'rights.validUntil');
  const reason =
    record.reason === undefined ? undefined : parseExactString(record.reason, 'rights.reason', 512);
  return {
    state: record.state as Exclude<ContentRightsLifecycleState, 'unreviewed'>,
    reviewEvidenceId: parseEvidenceId(record.reviewEvidenceId),
    reviewedAt: parseIsoTimestamp(record.reviewedAt, 'rights.reviewedAt'),
    ...(validUntil === undefined ? {} : { validUntil }),
    ...(reason === undefined ? {} : { reason }),
  };
}

function parseSource(value: unknown, index: number): ContentSourceLocator {
  const record = parseRecord(value, `sources[${index}]`);
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

function parseDependency(value: unknown, index: number): ContentDependencyEdge {
  const record = parseRecord(value, `dependencies[${index}]`);
  const kind = record.kind;
  if (!['runtime', 'development', 'optional', 'peer'].includes(String(kind))) {
    return fail(`dependencies[${index}].kind`, 'unknown dependency kind');
  }
  const peerRecord = record.peer;
  if (kind === 'peer') {
    const peer = parseRecord(peerRecord, `dependencies[${index}].peer`);
    if (typeof peer.optional !== 'boolean') {
      return fail(`dependencies[${index}].peer.optional`, 'expected boolean');
    }
    return {
      from: parseContentDigest(record.from),
      to: parseContentDigest(record.to),
      kind,
      peer: { optional: peer.optional },
    };
  }
  if (peerRecord !== undefined) {
    return fail(`dependencies[${index}].peer`, 'peer metadata belongs only to peer edges');
  }
  return {
    from: parseContentDigest(record.from),
    to: parseContentDigest(record.to),
    kind: kind as Exclude<ContentDependencyKind, 'peer'>,
  };
}

/** Parse untrusted persisted/API data once into the trusted content contract. */
export function parseContentRef(value: unknown): ContentRef {
  const record = parseRecord(value, 'root');
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
  if (!Array.isArray(record.dependencies)) return fail('dependencies', 'expected array');
  if (record.sources.length > MAX_CONTENT_SOURCES) {
    return fail('sources', `cannot exceed ${MAX_CONTENT_SOURCES} entries`);
  }
  if (record.dependencies.length > MAX_CONTENT_DEPENDENCIES) {
    return fail('dependencies', `cannot exceed ${MAX_CONTENT_DEPENDENCIES} entries`);
  }
  const sources = record.sources.map(parseSource);
  const dependencies = record.dependencies.map(parseDependency);
  for (const [index, dependency] of dependencies.entries()) {
    if (dependency.from !== digest) {
      return fail(`dependencies[${index}].from`, 'must equal the owning content digest');
    }
  }

  return {
    version: CONTENT_REF_VERSION,
    digest,
    key,
    byteLength: record.byteLength,
    mediaType,
    sources,
    dependencies,
    rights: parseRights(record.rights),
    authorities: parseAuthorities(record.authorities),
  };
}
