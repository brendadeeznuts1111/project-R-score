// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
import type { ContentDigest, EvidenceId } from '../types/branded.ts';
import { parseContentDigest } from '../types/branded.ts';
import {
  decideContentRights,
  parseContentAuthorityRef,
  parseContentRef,
  parseContentRights,
  type ContentAuthorities,
  type ContentAuthorityRef,
  type ContentRef,
  type ContentRights,
  type ContentRightsDecision,
  type ContentRightsOperation,
} from './content-contract.ts';

export const CONTENT_RIGHTS_RECORD_SCHEMA = 'factorywager.content-rights-decision' as const;
export const CONTENT_RIGHTS_RECORD_VERSION = 1 as const;
export const MAX_CONTENT_RIGHTS_RECORD_BYTES = 32 * 1024;

type RightsDecisionRecordBase = {
  readonly schema: typeof CONTENT_RIGHTS_RECORD_SCHEMA;
  readonly version: typeof CONTENT_RIGHTS_RECORD_VERSION;
  readonly contentDigest: ContentDigest;
  readonly revision: number;
  readonly recordDigest: ContentDigest;
  readonly previousRecordDigest?: ContentDigest;
  readonly lifecycle: 'active' | 'revoked';
  readonly rights: ContentRights;
  readonly authorities: ContentAuthorities;
  readonly decidedBy: ContentAuthorityRef;
  readonly decidedAt: string;
};

export type ActiveRightsDecisionRecord = RightsDecisionRecordBase & {
  readonly lifecycle: 'active';
};

export type RevokedRightsDecisionRecord = RightsDecisionRecordBase & {
  readonly lifecycle: 'revoked';
  readonly rights: Extract<ContentRights, { readonly state: 'expired-or-revoked' }>;
};

export type RightsDecisionRecord = ActiveRightsDecisionRecord | RevokedRightsDecisionRecord;

export type DecideContentRightsInput = {
  readonly target: ContentRef;
  readonly actor: ContentAuthorityRef;
  readonly rights: Exclude<
    ContentRights,
    { readonly state: 'unknown' | 'pending-review' | 'expired-or-revoked' }
  >;
  readonly expectedRevision: number;
  readonly expectedRecordDigest?: ContentDigest;
};

export type RevokeContentRightsInput = {
  readonly target: ContentRef;
  readonly actor: ContentAuthorityRef;
  readonly reviewEvidenceId: EvidenceId;
  readonly expectedRevision: number;
  readonly expectedRecordDigest: ContentDigest;
  readonly reason: string;
};

export type CurrentRightsAuthorization = {
  readonly record: RightsDecisionRecord;
  readonly decision: ContentRightsDecision;
};

export type ContentRightsStoreErrorCode =
  | 'DECISION_MISSING'
  | 'DECISION_REVOKED'
  | 'RIGHTS_INELIGIBLE'
  | 'AUTHORITY_MISMATCH'
  | 'AUTHORITY_ROLE_CONFLATION'
  | 'STALE_REVISION'
  | 'DIGEST_SUBSTITUTION'
  | 'INVALID_RIGHTS'
  | 'INVALID_REASON';

export class ContentRightsStoreError extends Error {
  constructor(
    readonly code: ContentRightsStoreErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ContentRightsStoreError';
  }
}

export interface ContentRightsStore {
  get(contentDigest: ContentDigest): Promise<RightsDecisionRecord | undefined>;
  history(contentDigest: ContentDigest): Promise<readonly RightsDecisionRecord[]>;
  decide(input: DecideContentRightsInput): Promise<ActiveRightsDecisionRecord>;
  revoke(input: RevokeContentRightsInput): Promise<RevokedRightsDecisionRecord>;
  authorize(
    target: ContentRef,
    operation: ContentRightsOperation,
    now?: Date
  ): Promise<CurrentRightsAuthorization>;
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

function cloneAuthorities(authorities: ContentAuthorities): ContentAuthorities {
  return Object.freeze({
    publisher: cloneAuthority(authorities.publisher),
    storageSteward: cloneAuthority(authorities.storageSteward),
    rightsReviewAuthority: cloneAuthority(authorities.rightsReviewAuthority),
    aliasPublisher: cloneAuthority(authorities.aliasPublisher),
  });
}

function authoritiesKey(authorities: ContentAuthorities): string {
  return [
    authorityKey(authorities.publisher),
    authorityKey(authorities.storageSteward),
    authorityKey(authorities.rightsReviewAuthority),
    authorityKey(authorities.aliasPublisher),
  ].join('|');
}

function assertSeparatedAuthorities(target: ContentRef, actor: ContentAuthorityRef): void {
  const authorities = target.authorities;
  if (!sameAuthority(actor, authorities.rightsReviewAuthority)) {
    throw new ContentRightsStoreError(
      'AUTHORITY_MISMATCH',
      'Only the exact rights review authority may decide or revoke content rights'
    );
  }
  const reviewer = authorityKey(authorities.rightsReviewAuthority);
  if (
    reviewer === authorityKey(authorities.publisher) ||
    reviewer === authorityKey(authorities.storageSteward) ||
    reviewer === authorityKey(authorities.aliasPublisher)
  ) {
    throw new ContentRightsStoreError(
      'AUTHORITY_ROLE_CONFLATION',
      'Rights reviewer must be distinct from publisher, storage steward, and alias publisher'
    );
  }
}

function exactTimestamp(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new ContentRightsStoreError('INVALID_RIGHTS', 'Rights decision clock is invalid');
  }
  return date.toISOString();
}

function assertExpectedRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new ContentRightsStoreError('STALE_REVISION', 'Expected revision is invalid');
  }
}

function canonicalReason(reason: string): string {
  if (
    reason.length === 0 ||
    reason.length > 512 ||
    reason.trim() !== reason ||
    reason.includes('\0')
  ) {
    throw new ContentRightsStoreError('INVALID_REASON', 'Revocation reason must be canonical');
  }
  return reason;
}

type UnhashedRightsRecord = Omit<RightsDecisionRecord, 'recordDigest'>;

function recordDigestFor(record: UnhashedRightsRecord): ContentDigest {
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  return parseContentDigest(`sha256:${Bun.CryptoHasher.hash('sha256', bytes, 'hex')}`);
}

function finalizeRecord(record: UnhashedRightsRecord): RightsDecisionRecord {
  return Object.freeze({
    ...record,
    recordDigest: recordDigestFor(record),
  }) as RightsDecisionRecord;
}

function parseRightsRecordObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid RightsDecisionRecord ${field}: expected object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  field: string
): void {
  const set = new Set(allowed);
  const unexpected = Object.keys(record)
    .filter(key => !set.has(key))
    .sort()[0];
  if (unexpected !== undefined) {
    throw new TypeError(`Invalid RightsDecisionRecord ${field}: unexpected key ${unexpected}`);
  }
}

function parseTimestamp(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`Invalid RightsDecisionRecord ${field}: expected UTC ISO timestamp`);
  }
  return new Date(Date.parse(value)).toISOString();
}

function parseAuthorities(value: unknown): ContentAuthorities {
  const record = parseRightsRecordObject(value, 'authorities');
  exactKeys(
    record,
    ['publisher', 'storageSteward', 'rightsReviewAuthority', 'aliasPublisher'],
    'authorities'
  );
  return cloneAuthorities({
    publisher: parseContentAuthorityRef(record.publisher, 'authorities.publisher'),
    storageSteward: parseContentAuthorityRef(record.storageSteward, 'authorities.storageSteward'),
    rightsReviewAuthority: parseContentAuthorityRef(
      record.rightsReviewAuthority,
      'authorities.rightsReviewAuthority'
    ),
    aliasPublisher: parseContentAuthorityRef(record.aliasPublisher, 'authorities.aliasPublisher'),
  });
}

/** Strict persisted boundary; the record hash covers every field except itself. */
export function parseRightsDecisionRecord(value: unknown): RightsDecisionRecord {
  const record = parseRightsRecordObject(value, 'root');
  exactKeys(
    record,
    [
      'schema',
      'version',
      'contentDigest',
      'revision',
      'recordDigest',
      'previousRecordDigest',
      'lifecycle',
      'rights',
      'authorities',
      'decidedBy',
      'decidedAt',
    ],
    'root'
  );
  if (
    record.schema !== CONTENT_RIGHTS_RECORD_SCHEMA ||
    record.version !== CONTENT_RIGHTS_RECORD_VERSION
  ) {
    throw new TypeError('Invalid RightsDecisionRecord schema or version');
  }
  if (!Number.isSafeInteger(record.revision) || Number(record.revision) < 1) {
    throw new TypeError('Invalid RightsDecisionRecord revision');
  }
  if (record.lifecycle !== 'active' && record.lifecycle !== 'revoked') {
    throw new TypeError('Invalid RightsDecisionRecord lifecycle');
  }
  const contentDigest = parseContentDigest(record.contentDigest);
  const recordDigest = parseContentDigest(record.recordDigest);
  const previousRecordDigest =
    record.previousRecordDigest === undefined
      ? undefined
      : parseContentDigest(record.previousRecordDigest);
  if ((Number(record.revision) === 1) !== (previousRecordDigest === undefined)) {
    throw new TypeError('Invalid RightsDecisionRecord history link');
  }
  const rights = parseContentRights(record.rights);
  if (rights.state === 'unknown' || rights.state === 'pending-review') {
    throw new TypeError('Invalid RightsDecisionRecord unreviewed rights state');
  }
  if ((record.lifecycle === 'revoked') !== (rights.state === 'expired-or-revoked')) {
    throw new TypeError('Invalid RightsDecisionRecord terminal lifecycle');
  }
  const authorities = parseAuthorities(record.authorities);
  const decidedBy = cloneAuthority(parseContentAuthorityRef(record.decidedBy, 'decidedBy'));
  if (!sameAuthority(decidedBy, authorities.rightsReviewAuthority)) {
    throw new TypeError('Invalid RightsDecisionRecord reviewer authority');
  }
  const unhashed = {
    schema: CONTENT_RIGHTS_RECORD_SCHEMA,
    version: CONTENT_RIGHTS_RECORD_VERSION,
    contentDigest,
    revision: Number(record.revision),
    ...(previousRecordDigest === undefined ? {} : { previousRecordDigest }),
    lifecycle: record.lifecycle,
    rights: Object.freeze({ ...rights }),
    authorities,
    decidedBy,
    decidedAt: parseTimestamp(record.decidedAt, 'decidedAt'),
  } as UnhashedRightsRecord;
  if (recordDigestFor(unhashed) !== recordDigest) {
    throw new TypeError('Invalid RightsDecisionRecord hash mismatch');
  }
  return Object.freeze({ ...unhashed, recordDigest }) as RightsDecisionRecord;
}

export function parseRightsDecisionRecordJson(json: string): RightsDecisionRecord {
  if (new TextEncoder().encode(json).byteLength > MAX_CONTENT_RIGHTS_RECORD_BYTES) {
    throw new TypeError(
      `Invalid RightsDecisionRecord json: exceeds ${MAX_CONTENT_RIGHTS_RECORD_BYTES} bytes`
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new TypeError('Invalid RightsDecisionRecord json: malformed JSON');
  }
  return parseRightsDecisionRecord(value);
}

export function serializeRightsDecisionRecord(record: RightsDecisionRecord): string {
  return `${JSON.stringify(parseRightsDecisionRecord(record))}\n`;
}

function assertTargetMatches(record: RightsDecisionRecord, target: ContentRef): void {
  if (record.contentDigest !== target.digest) {
    throw new ContentRightsStoreError(
      'DIGEST_SUBSTITUTION',
      'Rights decision content digest changed'
    );
  }
  if (authoritiesKey(record.authorities) !== authoritiesKey(target.authorities)) {
    throw new ContentRightsStoreError(
      'AUTHORITY_MISMATCH',
      'Content authorities do not match the rights decision provenance'
    );
  }
}

/** In-memory exact CAS. There is no await between comparison and append. */
export class MemoryContentRightsStore implements ContentRightsStore {
  readonly #history = new Map<ContentDigest, RightsDecisionRecord[]>();

  constructor(
    readonly clock: () => Date = () => new Date(),
    initialRecords: Iterable<RightsDecisionRecord> = []
  ) {
    for (const item of initialRecords) {
      const record = parseRightsDecisionRecord(item);
      const history = this.#history.get(record.contentDigest) ?? [];
      const previous = history.at(-1);
      if (
        history.length > 0 &&
        (record.revision !== previous!.revision + 1 ||
          record.previousRecordDigest !== previous!.recordDigest ||
          previous!.lifecycle === 'revoked')
      ) {
        throw new ContentRightsStoreError('STALE_REVISION', 'Invalid hydrated rights history');
      }
      history.push(record);
      this.#history.set(record.contentDigest, history);
    }
  }

  async get(contentDigest: ContentDigest): Promise<RightsDecisionRecord | undefined> {
    return this.#history.get(contentDigest)?.at(-1);
  }

  async history(contentDigest: ContentDigest): Promise<readonly RightsDecisionRecord[]> {
    return Object.freeze([...(this.#history.get(contentDigest) ?? [])]);
  }

  async decide(input: DecideContentRightsInput): Promise<ActiveRightsDecisionRecord> {
    const target = parseContentRef(input.target);
    assertExpectedRevision(input.expectedRevision);
    assertSeparatedAuthorities(target, input.actor);
    const rights = parseContentRights(input.rights);
    if (
      rights.state === 'unknown' ||
      rights.state === 'pending-review' ||
      rights.state === 'expired-or-revoked'
    ) {
      throw new ContentRightsStoreError(
        'INVALID_RIGHTS',
        'Decision requires a reviewed non-revocation state'
      );
    }
    const history = this.#history.get(target.digest) ?? [];
    const current = history.at(-1);
    this.assertCas(current, target, input.expectedRevision, input.expectedRecordDigest);
    const record = finalizeRecord({
      schema: CONTENT_RIGHTS_RECORD_SCHEMA,
      version: CONTENT_RIGHTS_RECORD_VERSION,
      contentDigest: target.digest,
      revision: input.expectedRevision + 1,
      ...(current === undefined ? {} : { previousRecordDigest: current.recordDigest }),
      lifecycle: 'active',
      rights: Object.freeze({ ...rights }),
      authorities: cloneAuthorities(target.authorities),
      decidedBy: cloneAuthority(input.actor),
      decidedAt: exactTimestamp(this.clock()),
    }) as ActiveRightsDecisionRecord;
    history.push(record);
    this.#history.set(target.digest, history);
    return record;
  }

  async revoke(input: RevokeContentRightsInput): Promise<RevokedRightsDecisionRecord> {
    const target = parseContentRef(input.target);
    assertExpectedRevision(input.expectedRevision);
    assertSeparatedAuthorities(target, input.actor);
    const history = this.#history.get(target.digest) ?? [];
    const current = history.at(-1);
    this.assertCas(current, target, input.expectedRevision, input.expectedRecordDigest);
    if (current === undefined) {
      throw new ContentRightsStoreError('DECISION_MISSING', 'Rights decision does not exist');
    }
    const decidedAt = exactTimestamp(this.clock());
    const record = finalizeRecord({
      schema: CONTENT_RIGHTS_RECORD_SCHEMA,
      version: CONTENT_RIGHTS_RECORD_VERSION,
      contentDigest: target.digest,
      revision: current.revision + 1,
      previousRecordDigest: current.recordDigest,
      lifecycle: 'revoked',
      rights: Object.freeze({
        state: 'expired-or-revoked',
        reviewEvidenceId: input.reviewEvidenceId,
        reviewedAt: decidedAt,
        reason: canonicalReason(input.reason),
      }),
      authorities: cloneAuthorities(target.authorities),
      decidedBy: cloneAuthority(input.actor),
      decidedAt,
    }) as RevokedRightsDecisionRecord;
    history.push(record);
    return record;
  }

  async authorize(
    targetWire: ContentRef,
    operation: ContentRightsOperation,
    now = this.clock()
  ): Promise<CurrentRightsAuthorization> {
    const target = parseContentRef(targetWire);
    const record = await this.get(target.digest);
    if (record === undefined) {
      throw new ContentRightsStoreError('DECISION_MISSING', 'Current rights decision is missing');
    }
    assertTargetMatches(record, target);
    const decision = decideContentRights(record.rights, operation, now);
    if (!decision.allowed) {
      throw new ContentRightsStoreError(
        record.lifecycle === 'revoked' ? 'DECISION_REVOKED' : 'RIGHTS_INELIGIBLE',
        decision.reason
      );
    }
    return { record, decision };
  }

  private assertCas(
    current: RightsDecisionRecord | undefined,
    target: ContentRef,
    expectedRevision: number,
    expectedRecordDigest: ContentDigest | undefined
  ): void {
    if (current === undefined) {
      if (expectedRevision !== 0 || expectedRecordDigest !== undefined) {
        throw new ContentRightsStoreError(
          'STALE_REVISION',
          'Rights decision does not exist at that revision'
        );
      }
      return;
    }
    if (current.lifecycle === 'revoked') {
      throw new ContentRightsStoreError('DECISION_REVOKED', 'Rights revocation is terminal');
    }
    assertTargetMatches(current, target);
    if (current.revision !== expectedRevision || current.recordDigest !== expectedRecordDigest) {
      throw new ContentRightsStoreError(
        'STALE_REVISION',
        'Rights revision or record digest changed'
      );
    }
  }
}

export function contentRightsStoreContractIssues(): readonly string[] {
  const issues: string[] = [];
  if (CONTENT_RIGHTS_RECORD_SCHEMA !== 'factorywager.content-rights-decision')
    issues.push('schema drift');
  if (CONTENT_RIGHTS_RECORD_VERSION !== 1) issues.push('version drift');
  if (MAX_CONTENT_RIGHTS_RECORD_BYTES !== 32 * 1024) issues.push('record bound drift');
  return issues;
}
