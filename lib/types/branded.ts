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
 * Detector (smart triage — no `// brand-ok` sweeps):
 *   bun tools/branded-id-check.ts --smart
 *   → role clusters: auth-credential · named-domain · new-brand · opaque-pk
 *   → auto-suppresses bare `id`/`_id` DTO properties (~76 of ~191)
 *   → actionable set is the migration queue (not directory order)
 *
 * TODO(brand-rollout) by detector role (not directory):
 *   DONE: lib/security (all) · r2-session-manager · utils telemetry spine
 *   DONE Phase 1: [auth-credential] AccessKeyId · AccountId · ZoneId (declarations)
 *   DONE Phase 1.5: empty never branded · asZoneId on wire · no hardcoded CF tokens
 *   DONE Phase 2: [named-domain] 5c9cf6dc (telemetry/ai/profile/pooling)
 *                   + d204d69b (core/mcp/r2/registry/remainder — 69 hits)
 *   DONE Phase 3: [new-brand] brands added 828553d7 (26 total);
 *                   instances branded d204d69b; singletons brand-ok
 *   DONE Phase 4: actionable → 0 (core-errors resourceId ×3 → ResourceId,
 *                   r2-integration-fixed userId → UserId, cloudflare legacy_id
 *                   and wiki-generator bare id suppressed wire-format/opaque)
 * ROLLOUT COMPLETE — `bun tools/branded-id-check.ts --smart` reports 0
 * actionable; pre-commit blocks new violations on added lines. The detector
 * is now the permanent gate (`--smart --strict` for CI).
 * Pre-commit enforces zero NEW violations (added lines only); staged mode
 * also skips opaque PKs outside high-trust paths.
 *
 * Empty-brand policy (why): `makeId` rejects `''`. Forging `'' as AccountId`
 * makes missing credentials look valid to the type system. Unresolved IDs
 * must be `undefined` (use try*) or throw at a hard boundary (use as* / parse*).
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

// ── Operations / resources ───────────────────────────────────────────────
export type OperationId = BrandedString<'OperationId'>;
export type ResourceId = BrandedString<'ResourceId'>;
export type ProjectId = BrandedString<'ProjectId'>;
export type PipelineId = BrandedString<'PipelineId'>;
export type JobId = BrandedString<'JobId'>;
export type StepId = BrandedString<'StepId'>;
export type WebhookId = BrandedString<'WebhookId'>;
export type FeedId = BrandedString<'FeedId'>;

/** Union of every branded ID — for telemetry/serialization edges that accept any ID. */
export type AnyId =
  | SessionId
  | TerminalId
  | RequestId
  | CorrelationId
  | SnapshotId
  | UserId
  | AccountId
  | IdentityId
  | AccessKeyId
  | TokenId
  | DocumentId
  | ZoneId
  | ChallengeId
  | PolicyId
  | DeploymentId
  | VersionId
  | AuditId
  | OperationId
  | ResourceId
  | ProjectId
  | PipelineId
  | JobId
  | StepId
  | WebhookId
  | FeedId;

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

// ── Soft boundary: missing → undefined (never brand empty) ───────────────

/**
 * Brand only non-empty strings. Returns undefined when missing/blank.
 * Prefer this at soft config merge; use as* when the ID is required.
 */
export function tryBrandId<B extends string>(
  value: string | undefined | null,
  brandFn: (v: string) => BrandedString<B>
): BrandedString<B> | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return brandFn(s);
}

export const tryAccountId = (v: string | undefined | null): AccountId | undefined =>
  tryBrandId(v, asAccountId);
export const tryAccessKeyId = (v: string | undefined | null): AccessKeyId | undefined =>
  tryBrandId(v, asAccessKeyId);
export const tryZoneId = (v: string | undefined | null): ZoneId | undefined =>
  tryBrandId(v, asZoneId);
export const trySessionId = (v: string | undefined | null): SessionId | undefined =>
  tryBrandId(v, asSessionId);
export const tryUserId = (v: string | undefined | null): UserId | undefined =>
  tryBrandId(v, asUserId);
export const tryRequestId = (v: string | undefined | null): RequestId | undefined =>
  tryBrandId(v, asRequestId);
export const tryCorrelationId = (v: string | undefined | null): CorrelationId | undefined =>
  tryBrandId(v, asCorrelationId);
export const tryDocumentId = (v: string | undefined | null): DocumentId | undefined =>
  tryBrandId(v, asDocumentId);

/**
 * Wire/API ingress — fail closed (throw BrandValidationError), never a
 * silent empty brand. Takes `unknown`, trims, validates, brands.
 */
export function parseBrandId<B extends string>(
  value: unknown,
  kind: B,
  brandFn: (v: string) => BrandedString<B>
): BrandedString<B> {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError(kind, value);
  }
  return brandFn(value.trim());
}

export const parseZoneId = (value: unknown): ZoneId => parseBrandId(value, 'ZoneId', asZoneId);
export const parseAccountId = (value: unknown): AccountId =>
  parseBrandId(value, 'AccountId', asAccountId);
export const parseAccessKeyId = (value: unknown): AccessKeyId =>
  parseBrandId(value, 'AccessKeyId', asAccessKeyId);
export const parseSessionId = (value: unknown): SessionId =>
  parseBrandId(value, 'SessionId', asSessionId);
export const parseUserId = (value: unknown): UserId => parseBrandId(value, 'UserId', asUserId);
export const asOperationId = (v: string): OperationId => makeId(v, 'OperationId');
export const asResourceId = (v: string): ResourceId => makeId(v, 'ResourceId');
export const asProjectId = (v: string): ProjectId => makeId(v, 'ProjectId');
export const asPipelineId = (v: string): PipelineId => makeId(v, 'PipelineId');
export const asJobId = (v: string): JobId => makeId(v, 'JobId');
export const asStepId = (v: string): StepId => makeId(v, 'StepId');
export const asWebhookId = (v: string): WebhookId => makeId(v, 'WebhookId');
export const asFeedId = (v: string): FeedId => makeId(v, 'FeedId');
