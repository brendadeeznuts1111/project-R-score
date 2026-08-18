/**
 * Branded domain-value forge — public barrel.
 *
 * Prefer importing from `lib/types/branded.ts` (stable path) or this index.
 * Domain modules teach by repetition: each exports type + as* + try* + parse* + SPECS.
 *
 * @see ./README.md — agent routing
 * @see ../brand-manifest.json — living institutional record
 */

export type {
  Brand,
  BrandedString,
  BrandConstructorNames,
  BrandDomain,
  BrandGuard,
  BrandIngressNormalization,
  BrandKind,
  BrandName,
  BrandSpec,
  BrandValidationSpec,
  ConstructorTier,
  MintAuthority,
} from './_core.ts';
export {
  brandKindFromName,
  constructorNamesForBrand,
  createBrandGuard,
  defineBrandConstructors,
  defineValidatedBrandConstructors,
  makeBrandedString,
  parseBrandedString,
  tryBrandedString,
  unbrand,
  validationForBrand,
  // Compatibility aliases.
  makeId,
  parseBrandId,
  tryBrandId,
} from './_core.ts';

export * from './session.ts';
export * from './identity.ts';
export * from './documents.ts';
export * from './security.ts';
export * from './deployment.ts';
export * from './audit.ts';
export * from './governance.ts';
export * from './operations.ts';
export * from './portal.ts';
export * from './surfaces.ts';

import { createBrandGuard, type BrandGuard, type BrandedString, type BrandSpec } from './_core.ts';
import { SESSION_BRAND_SPECS } from './session.ts';
import { IDENTITY_BRAND_SPECS } from './identity.ts';
import { DOCUMENT_BRAND_SPECS } from './documents.ts';
import { SECURITY_BRAND_SPECS } from './security.ts';
import { DEPLOYMENT_BRAND_SPECS } from './deployment.ts';
import { AUDIT_BRAND_SPECS } from './audit.ts';
import { GOVERNANCE_BRAND_SPECS } from './governance.ts';
import { OPERATIONS_BRAND_SPECS } from './operations.ts';
import { PORTAL_BRAND_SPECS } from './portal.ts';
import { SURFACES_BRAND_SPECS } from './surfaces.ts';

import type { SessionId, TerminalId, RequestId, CorrelationId, SnapshotId } from './session.ts';
import type {
  UserId,
  AccountId,
  IdentityId,
  OidcClientId,
  AccessKeyId,
  TokenId,
} from './identity.ts';
import type { DocumentId, ZoneId, DocTokenId, ReleaseKnowledgeExampleId } from './documents.ts';
import type { ChallengeId, PolicyId } from './security.ts';
import type { DeploymentId } from './deployment.ts';
import type {
  VersionId,
  AuditId,
  AuditFindingId,
  AuditConceptId,
  AuditEntryId,
  EvidenceId,
  DodId,
  RuleId,
} from './audit.ts';
import type {
  GithubIssueArtifactId,
  GithubIssueConceptId,
  GithubIssueLabelKey,
  GithubIssueLabelNameKey,
  GithubIssueDimensionCode,
  GithubIssueTypeCode,
  GithubIssuePriorityCode,
  GithubIssuePlaneCode,
  GithubIssueRuntimeCode,
  GithubIssueTeamCode,
  GithubIssueStatusCode,
  GithubIssueUrgencyCode,
  GithubIssueConcernCode,
} from './governance.ts';
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
  TreeNodeId,
  RailId,
  FundingId,
  CommandId,
  ExperimentId,
  ExperimentVariantId,
  ExperimentAssignmentId,
  PartnerProfileKey,
  PartnerCode,
  PartnerCallSignCode,
  PartnerProfileVersionCode,
  PartnerTemplateId,
  OutId,
  LedgerEntryId,
  CurrencyCode,
  AttentionReasonCode,
  SourceSystemId,
  AdapterId,
  ExternalPartnerId,
  ExternalAccountId,
  GateDecisionId,
  OpsChannelEventId,
  LimitForecastIssueId,
  EventId,
  EdgeId,
  SportsbookId,
  StateCode,
  ZipCode,
} from './operations.ts';
import type {
  PortalTenantId,
  TelegramUserId,
  TelegramChatId,
  PortalAccountId,
  LinkNonceId,
  DomId,
} from './portal.ts';
import type {
  HostId,
  ApexDomainId,
  SubdomainId,
  SurfaceId,
  PagesProjectId,
  PublishLaneId,
  AccessDomainId,
  SurfaceStatusCode,
  SurfaceAccessCode,
  SurfaceBackendCode,
} from './surfaces.ts';

/** Full institutional catalog — SSOT for brand-manifest generation. */
export const BRAND_CATALOG = [
  ...SESSION_BRAND_SPECS,
  ...IDENTITY_BRAND_SPECS,
  ...DOCUMENT_BRAND_SPECS,
  ...SECURITY_BRAND_SPECS,
  ...DEPLOYMENT_BRAND_SPECS,
  ...AUDIT_BRAND_SPECS,
  ...GOVERNANCE_BRAND_SPECS,
  ...OPERATIONS_BRAND_SPECS,
  ...PORTAL_BRAND_SPECS,
  ...SURFACES_BRAND_SPECS,
] as const satisfies readonly BrandSpec[];

export type CatalogBrandName = (typeof BRAND_CATALOG)[number]['name'];
export type BrandGuardRegistry = {
  readonly [Name in CatalogBrandName as `is${Name}`]: BrandGuard<Name>;
};

/** Generated shape guards. Guards validate canonical representation; they do not prove provenance. */
export const BRAND_GUARDS = Object.fromEntries(
  BRAND_CATALOG.map(spec => [`is${spec.name}`, createBrandGuard(spec)])
) as BrandGuardRegistry;

export function isBrandedValue<Name extends CatalogBrandName>(
  name: Name,
  value: unknown
): value is BrandedString<Name> {
  const guard = BRAND_GUARDS[`is${name}`] as BrandGuard<Name>;
  return guard(value);
}

/** Union of every identity brand (all catalog names ending in `Id`). */
export type AnyId =
  | SessionId
  | TerminalId
  | RequestId
  | CorrelationId
  | SnapshotId
  | UserId
  | AccountId
  | IdentityId
  | OidcClientId
  | AccessKeyId
  | TokenId
  | DocumentId
  | ZoneId
  | DocTokenId
  | ReleaseKnowledgeExampleId
  | ChallengeId
  | PolicyId
  | DeploymentId
  | VersionId
  | AuditId
  | AuditFindingId
  | AuditConceptId
  | AuditEntryId
  | EvidenceId
  | DodId
  | RuleId
  | GithubIssueArtifactId
  | GithubIssueConceptId
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
  | LoopId
  | TreeNodeId
  | RailId
  | FundingId
  | CommandId
  | ExperimentId
  | ExperimentVariantId
  | ExperimentAssignmentId
  | OutId
  | LedgerEntryId
  | SourceSystemId
  | AdapterId
  | ExternalPartnerId
  | ExternalAccountId
  | PartnerTemplateId
  | GateDecisionId
  | OpsChannelEventId
  | LimitForecastIssueId
  | EventId
  | EdgeId
  | SportsbookId
  | PortalTenantId
  | TelegramUserId
  | TelegramChatId
  | PortalAccountId
  | LinkNonceId
  | DomId
  | HostId
  | ApexDomainId
  | SubdomainId
  | SurfaceId
  | PagesProjectId
  | PublishLaneId
  | AccessDomainId;

/** Union of all branded strings, including IDs, keys, and validated codes. */
export type AnyBrandedValue =
  | AnyId
  | GithubIssueLabelKey
  | GithubIssueLabelNameKey
  | GithubIssueDimensionCode
  | GithubIssueTypeCode
  | GithubIssuePriorityCode
  | GithubIssuePlaneCode
  | GithubIssueRuntimeCode
  | GithubIssueTeamCode
  | GithubIssueStatusCode
  | GithubIssueUrgencyCode
  | GithubIssueConcernCode
  | PartnerProfileKey
  | PartnerCode
  | PartnerCallSignCode
  | PartnerProfileVersionCode
  | CurrencyCode
  | AttentionReasonCode
  | StateCode
  | ZipCode
  | SurfaceStatusCode
  | SurfaceAccessCode
  | SurfaceBackendCode;
