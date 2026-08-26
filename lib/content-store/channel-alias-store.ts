import type { ChannelAliasId, ContentChannelId, ContentDigest } from '../types/branded.ts';
import {
  parseChannelAliasId,
  parseContentChannelId,
  parseIdentityId,
  parseSourceSystemId,
} from '../types/branded.ts';
import {
  contentKeyForDigest,
  decideContentRights,
  parseContentRef,
  type ContentAuthorityRef,
  type ContentRef,
} from './content-contract.ts';
import type { ContentStore } from './memory-content-store.ts';

export const CHANNEL_ALIAS_SCHEMA = 'factorywager.channel-alias' as const;
export const CHANNEL_ALIAS_VERSION = 1 as const;

export type ChannelAliasAuthorities = {
  readonly publisher: ContentAuthorityRef;
  readonly rightsReviewAuthority: ContentAuthorityRef;
  readonly aliasPublisher: ContentAuthorityRef;
};

type ChannelAliasRecordBase = {
  readonly schema: typeof CHANNEL_ALIAS_SCHEMA;
  readonly version: typeof CHANNEL_ALIAS_VERSION;
  readonly aliasId: ChannelAliasId;
  readonly revision: number;
  readonly target: ContentRef;
  readonly sourceChannelId: ContentChannelId;
  readonly authorities: ChannelAliasAuthorities;
  readonly issuedAt: string;
  readonly expiresAt?: string;
};

export type ActiveChannelAliasRecord = ChannelAliasRecordBase & {
  readonly lifecycle: 'active';
};

export type RevokedChannelAliasRecord = ChannelAliasRecordBase & {
  readonly lifecycle: 'revoked';
  readonly revokedAt: string;
  readonly revokedBy: ContentAuthorityRef;
  readonly revocationReason: string;
};

export type ChannelAliasRecord = ActiveChannelAliasRecord | RevokedChannelAliasRecord;
export type ChannelAliasSeparationPolicy = 'all-distinct' | 'rights-reviewer-distinct';

export type ChannelAliasPolicy = {
  readonly separationOfDuties: ChannelAliasSeparationPolicy;
};

export const DEFAULT_CHANNEL_ALIAS_POLICY: ChannelAliasPolicy = Object.freeze({
  separationOfDuties: 'all-distinct',
});

export type PromoteChannelAliasInput = {
  readonly aliasId: ChannelAliasId;
  readonly sourceChannelId: ContentChannelId;
  readonly target: ContentRef;
  readonly actor: ContentAuthorityRef;
  /** Zero creates an alias. Every update must name the exact observed revision. */
  readonly expectedRevision: number;
  /** Required for updates so a mutable locator can never substitute for the pinned bytes. */
  readonly expectedCurrentDigest?: ContentDigest;
  readonly expiresAt?: string;
};

export type RevokeChannelAliasInput = {
  readonly aliasId: ChannelAliasId;
  readonly actor: ContentAuthorityRef;
  readonly expectedRevision: number;
  readonly expectedCurrentDigest: ContentDigest;
  readonly reason: string;
};

export type ChannelAliasPolicyErrorCode =
  | 'ALIAS_MISSING'
  | 'ALIAS_REVOKED'
  | 'ALIAS_EXPIRED'
  | 'CONTENT_MISSING'
  | 'CONTENT_CORRUPT'
  | 'CONTENT_LENGTH_MISMATCH'
  | 'RIGHTS_INELIGIBLE'
  | 'AUTHORITY_MISMATCH'
  | 'AUTHORITY_ROLE_CONFLATION'
  | 'STALE_REVISION'
  | 'DIGEST_SUBSTITUTION'
  | 'INVALID_EXPIRY'
  | 'INVALID_REASON';

export class ChannelAliasPolicyError extends Error {
  constructor(
    readonly code: ChannelAliasPolicyErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ChannelAliasPolicyError';
  }
}

export interface ChannelAliasStore {
  get(aliasId: ChannelAliasId): Promise<ChannelAliasRecord | undefined>;
  promote(input: PromoteChannelAliasInput): Promise<ActiveChannelAliasRecord>;
  revoke(input: RevokeChannelAliasInput): Promise<RevokedChannelAliasRecord>;
  resolve(aliasId: ChannelAliasId): Promise<ActiveChannelAliasRecord>;
}

function authorityKey(authority: ContentAuthorityRef): string {
  return authority.kind === 'identity'
    ? `identity:${authority.identityId}`
    : `source-system:${authority.sourceSystemId}`;
}

function sameAuthority(left: ContentAuthorityRef, right: ContentAuthorityRef): boolean {
  return authorityKey(left) === authorityKey(right);
}

function cloneAuthority(authority: ContentAuthorityRef): ContentAuthorityRef {
  return Object.freeze(
    authority.kind === 'identity'
      ? { kind: 'identity', identityId: authority.identityId }
      : { kind: 'source-system', sourceSystemId: authority.sourceSystemId }
  );
}

function parseAliasRecordObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid ChannelAliasRecord ${field}: expected object`);
  }
  return value as Record<string, unknown>;
}

function assertAliasRecordKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value)
    .filter(key => !allowedSet.has(key))
    .sort()[0];
  if (unexpected !== undefined) {
    throw new TypeError(`Invalid ChannelAliasRecord ${field}: unexpected key ${unexpected}`);
  }
}

function parseAliasAuthority(value: unknown, field: string): ContentAuthorityRef {
  const authority = parseAliasRecordObject(value, field);
  if (authority.kind === 'identity') {
    assertAliasRecordKeys(authority, ['kind', 'identityId'], field);
    return { kind: 'identity', identityId: parseIdentityId(authority.identityId) };
  }
  if (authority.kind === 'source-system') {
    assertAliasRecordKeys(authority, ['kind', 'sourceSystemId'], field);
    return { kind: 'source-system', sourceSystemId: parseSourceSystemId(authority.sourceSystemId) };
  }
  throw new TypeError(`Invalid ChannelAliasRecord ${field}.kind: unknown authority kind`);
}

function parseAliasTimestamp(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`Invalid ChannelAliasRecord ${field}: expected UTC ISO timestamp`);
  }
  return new Date(Date.parse(value)).toISOString();
}

/** Strict persisted boundary shared by durable alias adapters. */
export function parseChannelAliasRecord(value: unknown): ChannelAliasRecord {
  const record = parseAliasRecordObject(value, 'root');
  const commonKeys = [
    'schema',
    'version',
    'aliasId',
    'revision',
    'target',
    'sourceChannelId',
    'authorities',
    'issuedAt',
    'expiresAt',
    'lifecycle',
  ];
  if (record.lifecycle === 'active') {
    assertAliasRecordKeys(record, commonKeys, 'root');
  } else if (record.lifecycle === 'revoked') {
    assertAliasRecordKeys(
      record,
      [...commonKeys, 'revokedAt', 'revokedBy', 'revocationReason'],
      'root'
    );
  } else {
    throw new TypeError('Invalid ChannelAliasRecord lifecycle: unknown lifecycle');
  }
  if (record.schema !== CHANNEL_ALIAS_SCHEMA || record.version !== CHANNEL_ALIAS_VERSION) {
    throw new TypeError('Invalid ChannelAliasRecord schema: unsupported schema or version');
  }
  if (!Number.isSafeInteger(record.revision) || Number(record.revision) < 1) {
    throw new TypeError('Invalid ChannelAliasRecord revision: expected positive safe integer');
  }
  const authoritiesWire = parseAliasRecordObject(record.authorities, 'authorities');
  assertAliasRecordKeys(
    authoritiesWire,
    ['publisher', 'rightsReviewAuthority', 'aliasPublisher'],
    'authorities'
  );
  const authorities: ChannelAliasAuthorities = {
    publisher: parseAliasAuthority(authoritiesWire.publisher, 'authorities.publisher'),
    rightsReviewAuthority: parseAliasAuthority(
      authoritiesWire.rightsReviewAuthority,
      'authorities.rightsReviewAuthority'
    ),
    aliasPublisher: parseAliasAuthority(
      authoritiesWire.aliasPublisher,
      'authorities.aliasPublisher'
    ),
  };
  const target = cloneAndFreezeTarget(parseContentRef(record.target));
  if (
    !sameAuthority(authorities.publisher, target.authorities.publisher) ||
    !sameAuthority(authorities.rightsReviewAuthority, target.authorities.rightsReviewAuthority) ||
    !sameAuthority(authorities.aliasPublisher, target.authorities.aliasPublisher)
  ) {
    throw new TypeError(
      'Invalid ChannelAliasRecord authorities: do not match immutable target authorities'
    );
  }
  const common = {
    schema: CHANNEL_ALIAS_SCHEMA,
    version: CHANNEL_ALIAS_VERSION,
    aliasId: parseChannelAliasId(record.aliasId),
    revision: Number(record.revision),
    target,
    sourceChannelId: parseContentChannelId(record.sourceChannelId),
    authorities: Object.freeze(authorities),
    issuedAt: parseAliasTimestamp(record.issuedAt, 'issuedAt'),
    ...(record.expiresAt === undefined
      ? {}
      : { expiresAt: parseAliasTimestamp(record.expiresAt, 'expiresAt') }),
  } as const;
  if (record.lifecycle === 'active') return Object.freeze({ ...common, lifecycle: 'active' });
  if (
    typeof record.revocationReason !== 'string' ||
    record.revocationReason.length === 0 ||
    record.revocationReason.length > 512 ||
    record.revocationReason.trim() !== record.revocationReason ||
    record.revocationReason.includes('\0')
  ) {
    throw new TypeError('Invalid ChannelAliasRecord revocationReason: expected canonical reason');
  }
  const revokedBy = cloneAuthority(parseAliasAuthority(record.revokedBy, 'revokedBy'));
  if (!sameAuthority(revokedBy, authorities.aliasPublisher)) {
    throw new TypeError('Invalid ChannelAliasRecord revokedBy: must be exact alias publisher');
  }
  return Object.freeze({
    ...common,
    lifecycle: 'revoked',
    revokedAt: parseAliasTimestamp(record.revokedAt, 'revokedAt'),
    revokedBy,
    revocationReason: record.revocationReason,
  });
}

export function parseChannelAliasRecordJson(json: string): ChannelAliasRecord {
  if (new TextEncoder().encode(json).byteLength > 2 * 1024 * 1024) {
    throw new TypeError('Invalid ChannelAliasRecord json: exceeds 2097152 bytes');
  }
  let wire: unknown;
  try {
    wire = JSON.parse(json);
  } catch {
    throw new TypeError('Invalid ChannelAliasRecord json: malformed JSON');
  }
  return parseChannelAliasRecord(wire);
}

export function serializeChannelAliasRecord(record: ChannelAliasRecord): string {
  return `${JSON.stringify(parseChannelAliasRecord(record))}\n`;
}

function cloneAndFreezeTarget(target: ContentRef): ContentRef {
  const parsed = parseContentRef(target);
  return Object.freeze({
    ...parsed,
    sources: Object.freeze(parsed.sources.map(source => Object.freeze({ ...source }))),
    contentRelations: Object.freeze(
      parsed.contentRelations.map(relation => Object.freeze({ ...relation }))
    ),
    packageDependencies: Object.freeze(
      parsed.packageDependencies.map(dependency =>
        Object.freeze({
          ...dependency,
          ...(dependency.peer === undefined ? {} : { peer: Object.freeze({ ...dependency.peer }) }),
        })
      )
    ),
    rights: Object.freeze({ ...parsed.rights }),
    authorities: Object.freeze({
      publisher: cloneAuthority(parsed.authorities.publisher),
      storageSteward: cloneAuthority(parsed.authorities.storageSteward),
      rightsReviewAuthority: cloneAuthority(parsed.authorities.rightsReviewAuthority),
      aliasPublisher: cloneAuthority(parsed.authorities.aliasPublisher),
    }),
  });
}

function isoTimestamp(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new ChannelAliasPolicyError('INVALID_EXPIRY', 'Channel alias clock is invalid');
  }
  return date.toISOString();
}

function parseExpiry(value: string | undefined, now: Date): string | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new ChannelAliasPolicyError('INVALID_EXPIRY', 'Alias expiry must be a UTC ISO timestamp');
  }
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    throw new ChannelAliasPolicyError('INVALID_EXPIRY', 'Alias expiry must be in the future');
  }
  return new Date(expiresAt).toISOString();
}

function assertExpectedRevision(expectedRevision: number): void {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new ChannelAliasPolicyError(
      'STALE_REVISION',
      'Expected revision must be a nonnegative safe integer'
    );
  }
}

function assertAuthorities(
  target: ContentRef,
  actor: ContentAuthorityRef,
  policy: ChannelAliasPolicy
): ChannelAliasAuthorities {
  const publisher = target.authorities.publisher;
  const rightsReviewAuthority = target.authorities.rightsReviewAuthority;
  const aliasPublisher = target.authorities.aliasPublisher;
  if (!sameAuthority(actor, aliasPublisher)) {
    throw new ChannelAliasPolicyError(
      'AUTHORITY_MISMATCH',
      'Only the exact content alias publisher may promote or revoke the alias'
    );
  }
  const reviewerMatchesPublisher = sameAuthority(rightsReviewAuthority, publisher);
  const reviewerMatchesAliasPublisher = sameAuthority(rightsReviewAuthority, aliasPublisher);
  const publisherMatchesAliasPublisher = sameAuthority(publisher, aliasPublisher);
  if (
    reviewerMatchesPublisher ||
    reviewerMatchesAliasPublisher ||
    (policy.separationOfDuties === 'all-distinct' && publisherMatchesAliasPublisher)
  ) {
    throw new ChannelAliasPolicyError(
      'AUTHORITY_ROLE_CONFLATION',
      `Channel alias violates ${policy.separationOfDuties} separation of duties`
    );
  }
  return Object.freeze({
    publisher: cloneAuthority(publisher),
    rightsReviewAuthority: cloneAuthority(rightsReviewAuthority),
    aliasPublisher: cloneAuthority(aliasPublisher),
  });
}

/** Hermetic atomic alias adapter and shared policy engine for durable CAS adapters. */
export class MemoryChannelAliasStore implements ChannelAliasStore {
  readonly #records: Map<ChannelAliasId, ChannelAliasRecord>;

  constructor(
    readonly contentStore: ContentStore,
    readonly policy: ChannelAliasPolicy = DEFAULT_CHANNEL_ALIAS_POLICY,
    readonly clock: () => Date = () => new Date(),
    initialRecords: Iterable<readonly [ChannelAliasId, ChannelAliasRecord]> = []
  ) {
    this.#records = new Map(
      Array.from(initialRecords, ([aliasId, record]) => {
        const parsed = parseChannelAliasRecord(record);
        if (parsed.aliasId !== aliasId) {
          throw new ChannelAliasPolicyError(
            'AUTHORITY_MISMATCH',
            'Hydrated alias key does not match its persisted record'
          );
        }
        const expectedAuthorities = assertAuthorities(
          parsed.target,
          parsed.authorities.aliasPublisher,
          policy
        );
        if (JSON.stringify(expectedAuthorities) !== JSON.stringify(parsed.authorities)) {
          throw new ChannelAliasPolicyError(
            'AUTHORITY_MISMATCH',
            'Persisted alias authorities do not match the immutable target authorities'
          );
        }
        if (
          parsed.lifecycle === 'revoked' &&
          !sameAuthority(parsed.revokedBy, parsed.authorities.aliasPublisher)
        ) {
          throw new ChannelAliasPolicyError(
            'AUTHORITY_MISMATCH',
            'Persisted alias revocation actor is not the exact alias publisher'
          );
        }
        return [aliasId, parsed] as const;
      })
    );
  }

  async get(aliasId: ChannelAliasId): Promise<ChannelAliasRecord | undefined> {
    return this.#records.get(aliasId);
  }

  async promote(input: PromoteChannelAliasInput): Promise<ActiveChannelAliasRecord> {
    assertExpectedRevision(input.expectedRevision);
    const now = this.clock();
    const issuedAt = isoTimestamp(now);
    const target = cloneAndFreezeTarget(input.target);
    const verification = await this.contentStore.verify(target.digest);
    if (verification.status === 'missing') {
      throw new ChannelAliasPolicyError('CONTENT_MISSING', 'Alias target is missing');
    }
    if (verification.status !== 'verified') {
      throw new ChannelAliasPolicyError(
        'CONTENT_CORRUPT',
        `Alias target is ${verification.status}`
      );
    }
    if (verification.byteLength !== target.byteLength) {
      throw new ChannelAliasPolicyError(
        'CONTENT_LENGTH_MISMATCH',
        'Alias target byte length does not match verified content'
      );
    }
    const rightsDecision = decideContentRights(target.rights, 'publish-active-alias', now);
    if (!rightsDecision.allowed) {
      throw new ChannelAliasPolicyError(
        'RIGHTS_INELIGIBLE',
        `Alias target rights are ineligible: ${rightsDecision.reason}`
      );
    }
    const expiresAt = parseExpiry(input.expiresAt, now);
    if (
      expiresAt !== undefined &&
      target.rights.state === 'approved-vendor' &&
      target.rights.validUntil !== undefined &&
      Date.parse(expiresAt) > Date.parse(target.rights.validUntil)
    ) {
      throw new ChannelAliasPolicyError(
        'INVALID_EXPIRY',
        'Alias expiry cannot exceed the rights validity window'
      );
    }
    const authorities = assertAuthorities(target, input.actor, this.policy);

    // No await after this point: observe, compare, and swap are one event-loop turn.
    const current = this.#records.get(input.aliasId);
    if (current === undefined) {
      if (input.expectedRevision !== 0 || input.expectedCurrentDigest !== undefined) {
        throw new ChannelAliasPolicyError(
          'STALE_REVISION',
          'Alias does not exist at that revision'
        );
      }
    } else {
      if (current.lifecycle === 'revoked') {
        throw new ChannelAliasPolicyError('ALIAS_REVOKED', 'Revoked aliases are terminal');
      }
      if (current.revision !== input.expectedRevision) {
        throw new ChannelAliasPolicyError('STALE_REVISION', 'Alias revision changed');
      }
      if (
        input.expectedCurrentDigest === undefined ||
        current.target.digest !== input.expectedCurrentDigest
      ) {
        throw new ChannelAliasPolicyError(
          'DIGEST_SUBSTITUTION',
          'Expected digest does not match the pinned alias target'
        );
      }
      if (
        current.target.digest === target.digest &&
        JSON.stringify(current.target.sources) !== JSON.stringify(target.sources)
      ) {
        throw new ChannelAliasPolicyError(
          'DIGEST_SUBSTITUTION',
          'Source locators cannot be substituted for the same immutable content digest'
        );
      }
    }

    const record: ActiveChannelAliasRecord = Object.freeze({
      schema: CHANNEL_ALIAS_SCHEMA,
      version: CHANNEL_ALIAS_VERSION,
      aliasId: input.aliasId,
      revision: input.expectedRevision + 1,
      lifecycle: 'active',
      target,
      sourceChannelId: input.sourceChannelId,
      authorities,
      issuedAt,
      ...(expiresAt === undefined ? {} : { expiresAt }),
    });
    this.#records.set(input.aliasId, record);
    return record;
  }

  async revoke(input: RevokeChannelAliasInput): Promise<RevokedChannelAliasRecord> {
    assertExpectedRevision(input.expectedRevision);
    const reason = input.reason.trim();
    if (
      reason.length === 0 ||
      reason.length > 512 ||
      reason !== input.reason ||
      reason.includes('\0')
    ) {
      throw new ChannelAliasPolicyError('INVALID_REASON', 'Revocation reason must be canonical');
    }
    const revokedAt = isoTimestamp(this.clock());
    const current = this.#records.get(input.aliasId);
    if (current === undefined) {
      throw new ChannelAliasPolicyError('ALIAS_MISSING', 'Alias does not exist');
    }
    if (current.lifecycle === 'revoked') {
      throw new ChannelAliasPolicyError('ALIAS_REVOKED', 'Alias is already revoked');
    }
    if (current.revision !== input.expectedRevision) {
      throw new ChannelAliasPolicyError('STALE_REVISION', 'Alias revision changed');
    }
    if (current.target.digest !== input.expectedCurrentDigest) {
      throw new ChannelAliasPolicyError('DIGEST_SUBSTITUTION', 'Alias digest changed');
    }
    if (!sameAuthority(input.actor, current.authorities.aliasPublisher)) {
      throw new ChannelAliasPolicyError(
        'AUTHORITY_MISMATCH',
        'Only the exact alias publisher may revoke the alias'
      );
    }
    const record: RevokedChannelAliasRecord = Object.freeze({
      ...current,
      revision: current.revision + 1,
      lifecycle: 'revoked',
      revokedAt,
      revokedBy: cloneAuthority(input.actor),
      revocationReason: reason,
    });
    this.#records.set(input.aliasId, record);
    return record;
  }

  async resolve(aliasId: ChannelAliasId): Promise<ActiveChannelAliasRecord> {
    const current = this.#records.get(aliasId);
    if (current === undefined) {
      throw new ChannelAliasPolicyError('ALIAS_MISSING', 'Alias does not exist');
    }
    if (current.lifecycle === 'revoked') {
      throw new ChannelAliasPolicyError('ALIAS_REVOKED', 'Alias is revoked');
    }
    const now = this.clock();
    if (current.expiresAt !== undefined && Date.parse(current.expiresAt) <= now.getTime()) {
      throw new ChannelAliasPolicyError('ALIAS_EXPIRED', 'Alias is expired');
    }
    const rightsDecision = decideContentRights(current.target.rights, 'publish-active-alias', now);
    if (!rightsDecision.allowed) {
      throw new ChannelAliasPolicyError('RIGHTS_INELIGIBLE', rightsDecision.reason);
    }
    const verification = await this.contentStore.verify(current.target.digest);
    if (verification.status === 'missing') {
      throw new ChannelAliasPolicyError('CONTENT_MISSING', 'Alias target is missing');
    }
    if (
      verification.status !== 'verified' ||
      verification.byteLength !== current.target.byteLength
    ) {
      throw new ChannelAliasPolicyError('CONTENT_CORRUPT', 'Alias target failed verification');
    }
    if (this.#records.get(aliasId) !== current) {
      throw new ChannelAliasPolicyError('STALE_REVISION', 'Alias changed while resolving');
    }
    return current;
  }
}

export function channelAliasContractIssues(): readonly string[] {
  const issues: string[] = [];
  if (CHANNEL_ALIAS_SCHEMA !== 'factorywager.channel-alias') issues.push('schema drift');
  if (CHANNEL_ALIAS_VERSION !== 1) issues.push('version drift');
  if (DEFAULT_CHANNEL_ALIAS_POLICY.separationOfDuties !== 'all-distinct') {
    issues.push('default separation policy must remain all-distinct');
  }
  return issues;
}
