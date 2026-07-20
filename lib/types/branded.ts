/**
 * branded.ts — branded string ID types (nominal typing for identifiers).
 *
 * Why: plain `string` IDs are interchangeable at the type level — a
 * `sessionId` can be passed where a `userId` belongs and the compiler
 * says nothing. Branding makes each ID domain a distinct type while
 * remaining a plain string at runtime (zero cost).
 *
 * Pattern: declare the brand here, use the branded type in interfaces,
 * and construct values ONLY at system boundaries (config load, request
 * parse, external fetch) via the `asXId()` helpers. Inside the system,
 * pass the branded value around unchanged.
 *
 * Reference: TypeScript nominal typing via unique symbol brands
 * (same family as Bun's own `declare const` type tags — bun-types:
 * https://github.com/oven-sh/bun/tree/main/packages/bun-types)
 *
 * TODO(brand-rollout): migration order by violation density (detector:
 * `bun tools/branded-id-check.ts` — 191 declarations remaining, baseline 274):
 *   DONE: lib/core/r2-session-manager.ts (SessionId, TerminalId)
 *         lib/security — ALL 14 files clean (UserId, SessionId, TokenId,
 *              AccountId, AccessKeyId, IdentityId, ChallengeId, PolicyId,
 *              DeploymentId, SnapshotId, VersionId, AuditId)
 *         lib/utils — ALL clean (RequestId/UserId telemetry spine in
 *              logger.ts + error-handler.ts, AuditId in s3-content-encoding)
 *   1. lib/mcp (31)          — id, requestId, documentId
 *   2. lib/core (28)         — sessionId, requestId, snapshotId
 *   3. lib/registry (18)     — accountId, identityId, zone_id
 *   4. lib/r2 (40)           — sessionId, key ids
 *   5. lib/docs + remainder  — entity primary keys (suppress) + singletons
 * Pre-commit enforces zero NEW violations (added lines only) — the
 * baseline only shrinks from here.
 */

declare const brand: unique symbol;

import { BrandValidationError } from '../core/core-errors.ts';

/** Nominal brand wrapper: string at runtime, distinct type at compile time. */
export type Brand<T, B> = T & { readonly [brand]: B };
export type BrandedString<B> = Brand<string, B>;

/** Strip the brand (serialization boundaries: JSON, URLs, R2 keys). */
export function unbrand<T>(value: Brand<T, unknown>): T {
  return value as T;
}

// ── Session / request lifecycle ──────────────────────────────────────────
export type SessionId = BrandedString<'SessionId'>;
export type TerminalId = BrandedString<'TerminalId'>;
export type RequestId = BrandedString<'RequestId'>;
export type CorrelationId = BrandedString<'CorrelationId'>;
export type SnapshotId = BrandedString<'SnapshotId'>;

// ── Identity / accounts ──────────────────────────────────────────────────
export type UserId = BrandedString<'UserId'>;
export type AccountId = BrandedString<'AccountId'>;
export type IdentityId = BrandedString<'IdentityId'>;
export type AccessKeyId = BrandedString<'AccessKeyId'>;
export type TokenId = BrandedString<'TokenId'>;

// ── Documents / zones ────────────────────────────────────────────────────
export type DocumentId = BrandedString<'DocumentId'>;
export type ZoneId = BrandedString<'ZoneId'>;

// ── Security / zero-trust ────────────────────────────────────────────────
export type ChallengeId = BrandedString<'ChallengeId'>;
export type PolicyId = BrandedString<'PolicyId'>;

// ── Deployment ───────────────────────────────────────────────────────────
export type DeploymentId = BrandedString<'DeploymentId'>;

// ── Secrets / audit ──────────────────────────────────────────────────────
export type VersionId = BrandedString<'VersionId'>;
export type AuditId = BrandedString<'AuditId'>;

// ── Boundary constructors (validate + brand in one step) ─────────────────
function makeId<B extends string>(value: string, kind: B): BrandedString<B> {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BrandValidationError(kind, value);
  }
  return value as BrandedString<B>;
}

export const asSessionId = (v: string): SessionId => makeId(v, 'SessionId');
export const asTerminalId = (v: string): TerminalId => makeId(v, 'TerminalId');
export const asRequestId = (v: string): RequestId => makeId(v, 'RequestId');
export const asCorrelationId = (v: string): CorrelationId => makeId(v, 'CorrelationId');
export const asSnapshotId = (v: string): SnapshotId => makeId(v, 'SnapshotId');
export const asUserId = (v: string): UserId => makeId(v, 'UserId');
export const asAccountId = (v: string): AccountId => makeId(v, 'AccountId');
export const asIdentityId = (v: string): IdentityId => makeId(v, 'IdentityId');
export const asAccessKeyId = (v: string): AccessKeyId => makeId(v, 'AccessKeyId');
export const asTokenId = (v: string): TokenId => makeId(v, 'TokenId');
export const asDocumentId = (v: string): DocumentId => makeId(v, 'DocumentId');
export const asZoneId = (v: string): ZoneId => makeId(v, 'ZoneId');
export const asChallengeId = (v: string): ChallengeId => makeId(v, 'ChallengeId');
export const asPolicyId = (v: string): PolicyId => makeId(v, 'PolicyId');
export const asDeploymentId = (v: string): DeploymentId => makeId(v, 'DeploymentId');
export const asVersionId = (v: string): VersionId => makeId(v, 'VersionId');
export const asAuditId = (v: string): AuditId => makeId(v, 'AuditId');
