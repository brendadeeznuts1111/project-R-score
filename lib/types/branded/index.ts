/**
 * Branded ID forge — public barrel.
 *
 * Prefer importing from `lib/types/branded.ts` (stable path) or this index.
 * Domain modules teach by repetition: each exports type + as* + try* + parse* + SPECS.
 *
 * @see ./README.md — agent routing
 * @see ../brand-manifest.json — living institutional record
 */

export type { Brand, BrandedString, BrandSpec, ConstructorTier, MintAuthority } from './_core.ts';
export { unbrand, makeId, tryBrandId, parseBrandId, defineBrandConstructors } from './_core.ts';

export * from './session.ts';
export * from './identity.ts';
export * from './documents.ts';
export * from './security.ts';
export * from './deployment.ts';
export * from './audit.ts';
export * from './operations.ts';

import type { BrandSpec } from './_core.ts';
import { SESSION_BRAND_SPECS } from './session.ts';
import { IDENTITY_BRAND_SPECS } from './identity.ts';
import { DOCUMENT_BRAND_SPECS } from './documents.ts';
import { SECURITY_BRAND_SPECS } from './security.ts';
import { DEPLOYMENT_BRAND_SPECS } from './deployment.ts';
import { AUDIT_BRAND_SPECS } from './audit.ts';
import { OPERATIONS_BRAND_SPECS } from './operations.ts';

import type { SessionId, TerminalId, RequestId, CorrelationId, SnapshotId } from './session.ts';
import type { UserId, AccountId, IdentityId, AccessKeyId, TokenId } from './identity.ts';
import type { DocumentId, ZoneId, DocTokenId } from './documents.ts';
import type { ChallengeId, PolicyId } from './security.ts';
import type { DeploymentId } from './deployment.ts';
import type {
  VersionId,
  AuditId,
  AuditFindingId,
  AuditConceptId,
  AuditEntryId,
  EvidenceId,
} from './audit.ts';
import type {
  OperationId,
  ResourceId,
  ProjectId,
  PipelineId,
  JobId,
  StepId,
  WebhookId,
  FeedId,
  RunId,
  DecisionId,
  LoopId,
} from './operations.ts';

/** Full institutional catalog — SSOT for brand-manifest generation. */
export const BRAND_CATALOG: readonly BrandSpec[] = [
  ...SESSION_BRAND_SPECS,
  ...IDENTITY_BRAND_SPECS,
  ...DOCUMENT_BRAND_SPECS,
  ...SECURITY_BRAND_SPECS,
  ...DEPLOYMENT_BRAND_SPECS,
  ...AUDIT_BRAND_SPECS,
  ...OPERATIONS_BRAND_SPECS,
] as const;

/** Union of every branded ID — telemetry/serialization edges that accept any ID. */
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
  | DocTokenId
  | ChallengeId
  | PolicyId
  | DeploymentId
  | VersionId
  | AuditId
  | AuditFindingId
  | AuditConceptId
  | AuditEntryId
  | EvidenceId
  | OperationId
  | ResourceId
  | ProjectId
  | PipelineId
  | JobId
  | StepId
  | WebhookId
  | FeedId
  | RunId
  | DecisionId
  | LoopId;
