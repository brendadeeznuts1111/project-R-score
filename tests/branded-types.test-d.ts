/**
 * branded-types.test-d.ts — compile-only type assertions for the branded-ID system.
 *
 * This file is NEVER executed. It exists so `tsc --noEmit` proves the
 * type-level claim the regex/pre-commit gate cannot: a SessionId cannot be
 * assigned where a UserId is expected (nominal brands are distinct types).
 *
 * Verify:
 *   bun x tsc --noEmit --strict --skipLibCheck --target esnext --module esnext \
 *     --moduleResolution bundler --allowImportingTsExtensions tests/branded-types.test-d.ts
 * Exit 0 = every `@ts-expect-error` is a real error and every plain assignment compiles.
 */

import type {
  AccessDomainId,
  AccessKeyId,
  AccountId,
  AdapterId,
  AttentionReasonCode,
  AnyBrandedValue,
  AnyId,
  ApexDomainId,
  AuditId,
  AuditFindingId,
  AuditConceptId,
  AuditEntryId,
  ChallengeId,
  CorrelationId,
  CurrencyCode,
  DeploymentId,
  DocumentId,
  DomId,
  EdgeId,
  EventId,
  ExternalAccountId,
  ExternalPartnerId,
  FeedId,
  HostId,
  GithubIssueArtifactId,
  GithubIssueConceptId,
  GithubIssueLabelKey,
  IdentityId,
  JobId,
  LedgerEntryId,
  LimitForecastIssueId,
  OperationId,
  OidcClientId,
  OutId,
  PartnerCallSignCode,
  PartnerCode,
  PartnerProfileKey,
  PartnerProfileVersionCode,
  PipelineId,
  PolicyId,
  PortalAccountId,
  PortalTenantId,
  ProjectId,
  RequestId,
  ResourceId,
  SessionId,
  SnapshotId,
  SourceSystemId,
  SportsbookId,
  StateCode,
  StepId,
  SubdomainId,
  SurfaceId,
  TerminalId,
  TokenId,
  UserId,
  VersionId,
  WebhookId,
  ZoneId,
} from '../lib/types/branded.ts';
import {
  BRAND_GUARDS,
  asAccessDomainId,
  asAccessKeyId,
  asAccountId,
  asAdapterId,
  asAttentionReasonCode,
  asApexDomainId,
  asAuditId,
  asAuditFindingId,
  asAuditConceptId,
  asAuditEntryId,
  asEvidenceId,
  asChallengeId,
  asCorrelationId,
  asCurrencyCode,
  asDecisionId,
  asDeploymentId,
  asDocumentId,
  asDomId,
  asDocTokenId,
  asEdgeId,
  asEventId,
  asExternalAccountId,
  asExternalPartnerId,
  asExperimentAssignmentId,
  asExperimentId,
  asExperimentVariantId,
  asFeedId,
  asHostId,
  asGithubIssueArtifactId,
  asGithubIssueConceptId,
  asGithubIssueLabelKey,
  asGithubIssuePriorityCode,
  asIdentityId,
  asJobId,
  asLedgerEntryId,
  asLimitForecastIssueId,
  asGateDecisionId,
  asLinkNonceId,
  asLoopId,
  asOperationId,
  asOutId,
  asOidcClientId,
  asOpsChannelEventId,
  asPagesProjectId,
  asPublishLaneId,
  asSurfaceBackendCode,
  asPartnerProfileKey,
  asPartnerCallSignCode,
  asPartnerCode,
  asPartnerProfileVersionCode,
  asPartnerTemplateId,
  asPipelineId,
  asPolicyId,
  asPortalAccountId,
  asPortalTenantId,
  asProjectId,
  asRequestId,
  asResourceId,
  asRunId,
  asSessionId,
  asSnapshotId,
  asSourceSystemId,
  asSportsbookId,
  asStepId,
  asStateCode,
  asSubdomainId,
  asSurfaceAccessCode,
  asSurfaceId,
  asSurfaceStatusCode,
  asTerminalId,
  asTokenId,
  asTelegramUserId,
  asTelegramChatId,
  asTreeNodeId,
  asUserId,
  asVersionId,
  asWebhookId,
  asZipCode,
  asZoneId,
  isBrandedValue,
  parseZoneId,
  trySessionId,
  unbrand,
} from '../lib/types/branded.ts';

// ─── 1. Cross-brand rejection (the core claim) ──────────────────────────────

const sessionId: SessionId = asSessionId('sess-1');
const userId: UserId = asUserId('user-1');
const accountId: AccountId = asAccountId('acct-1');
const accessKeyId: AccessKeyId = asAccessKeyId('ak-1');
const operationId: OperationId = asOperationId('op-1');
const forecastIssueId: LimitForecastIssueId = asLimitForecastIssueId('forecast-1');
const sportsbookId: SportsbookId = asSportsbookId('draftkings');
const requestId: RequestId = asRequestId('req-1');
const documentId: DocumentId = asDocumentId('doc-1');
const portalTenantId: PortalTenantId = asPortalTenantId('factory');
const portalAccountId: PortalAccountId = asPortalAccountId('account-1');
const partnerProfileKey: PartnerProfileKey = asPartnerProfileKey('profile-1');
const partnerCode: PartnerCode = asPartnerCode('SPEN');
const partnerCallSign: PartnerCallSignCode = asPartnerCallSignCode('SPEN-001');
const partnerProfileVersion: PartnerProfileVersionCode = asPartnerProfileVersionCode('v1.0');
const outId: OutId = asOutId('out-SPEN-1');
const ledgerEntryId: LedgerEntryId = asLedgerEntryId('ledger-entry-1');
const currencyCode: CurrencyCode = asCurrencyCode('USD');
const attentionReason: AttentionReasonCode = asAttentionReasonCode(
  'partner.profile.migration_required'
);
const sourceSystemId: SourceSystemId = asSourceSystemId('factorywager-partner-profile');
const adapterId: AdapterId = asAdapterId('legacy-seat-adapter');
const externalPartnerId: ExternalPartnerId = asExternalPartnerId('external-partner-1');
const externalAccountId: ExternalAccountId = asExternalAccountId('external-account-1');
const domId: DomId = asDomId('section:onboard');

// @ts-expect-error — SessionId is not a UserId
const crossAsUser: UserId = sessionId;
// @ts-expect-error — UserId is not a SessionId
const crossAsSession: SessionId = userId;

// @ts-expect-error — a DOM mount id is not a user identity
const crossDomAsUser: UserId = domId;

// @ts-expect-error — AccountId is not an AccessKeyId
const crossAsAccessKey: AccessKeyId = accountId;

// @ts-expect-error — AccessKeyId is not an AccountId
const crossAsAccount: AccountId = accessKeyId;

const hostId: HostId = asHostId('ledger.factory-wager.com');
const apexDomainId: ApexDomainId = asApexDomainId('factory-wager.com');
const subdomainId: SubdomainId = asSubdomainId('ledger');
const accessDomainId: AccessDomainId = asAccessDomainId('score.factory-wager.com/portal');
const surfaceId: SurfaceId = asSurfaceId('ledger');

// @ts-expect-error — HostId is not an AccessDomainId (path-bearing Access domain stays separate)
const crossHostAsAccessDomain: AccessDomainId = hostId;
// @ts-expect-error — AccessDomainId is not a HostId
const crossAccessDomainAsHost: HostId = accessDomainId;
// @ts-expect-error — SurfaceId is not a HostId
const crossSurfaceAsHost: HostId = surfaceId;
// @ts-expect-error — ApexDomainId is not a HostId
const crossApexAsHost: HostId = apexDomainId;
// @ts-expect-error — HostId is not an ApexDomainId
const crossHostAsApex: ApexDomainId = hostId;
// @ts-expect-error — SubdomainId is not a SurfaceId (DNS label ≠ inventory key)
const crossSubdomainAsSurface: SurfaceId = subdomainId;
// @ts-expect-error — SurfaceId is not a SubdomainId
const crossSurfaceAsSubdomain: SubdomainId = surfaceId;
// @ts-expect-error — SubdomainId is not a HostId
const crossSubdomainAsHost: HostId = subdomainId;

const pagesProjectId = asPagesProjectId('project-r-score');
const opsProjectId = asProjectId('project-r-score');
// @ts-expect-error — PagesProjectId is not operations ProjectId (Pages shortcode ≠ workspace PK)
const crossPagesAsOpsProject: typeof opsProjectId = pagesProjectId;
// @ts-expect-error — ProjectId is not PagesProjectId
const crossOpsAsPagesProject: typeof pagesProjectId = opsProjectId;
// @ts-expect-error — SurfaceStatusCode is a code, not an AnyId
const statusCodeAsId: AnyId = asSurfaceStatusCode('live');

// @ts-expect-error — OperationId is not a JobId
const crossAsJob: JobId = operationId;

// @ts-expect-error — LimitForecastIssueId is not a generic OperationId
const forecastAsOperation: OperationId = forecastIssueId;

// @ts-expect-error — SportsbookId is not a generic OperationId
const sportsbookAsOperation: OperationId = sportsbookId;

// @ts-expect-error — RequestId is not a CorrelationId
const crossAsCorrelation: CorrelationId = requestId;

// @ts-expect-error — SessionId is not a TokenId
const crossAsToken: TokenId = sessionId;

// @ts-expect-error — DocumentId is not a FeedId
const crossAsFeed: FeedId = documentId;

// @ts-expect-error — PortalTenantId is not a PortalAccountId
const crossPortalTenantAsAccount: PortalAccountId = portalTenantId;

// @ts-expect-error — PortalAccountId is not a PortalTenantId
const crossPortalAccountAsTenant: PortalTenantId = portalAccountId;

// @ts-expect-error — a partner business code is not an out identity
const crossPartnerCodeAsOut: OutId = partnerCode;

// @ts-expect-error — an external source account is not a canonical ledger entry
const crossExternalAccountAsLedger: LedgerEntryId = externalAccountId;

const auditFindingId: AuditFindingId = asAuditFindingId('finding-1');
const auditConceptId: AuditConceptId = asAuditConceptId('concept-1');
const auditEntryId: AuditEntryId = asAuditEntryId('entry-1');
const auditLogId: AuditId = asAuditId('au-1');
const githubIssueArtifactId: GithubIssueArtifactId =
  asGithubIssueArtifactId('github-issue-taxonomy');
const githubIssueConceptId: GithubIssueConceptId = asGithubIssueConceptId(
  'governance.issue_taxonomy'
);
const githubIssueLabelKey: GithubIssueLabelKey = asGithubIssueLabelKey('priority.p1');

// @ts-expect-error — AuditFindingId is not an AuditConceptId
const crossFindingAsConcept: AuditConceptId = auditFindingId;
// @ts-expect-error — AuditConceptId is not an AuditFindingId
const crossConceptAsFinding: AuditFindingId = auditConceptId;
// @ts-expect-error — AuditFindingId is not AuditId (log entry)
const crossFindingAsLog: AuditId = auditFindingId;
// @ts-expect-error — AuditEntryId is not an AuditFindingId
const crossEntryAsFinding: AuditFindingId = auditEntryId;
// @ts-expect-error — AuditId is not an AuditEntryId
const crossLogAsEntry: AuditEntryId = auditLogId;
// @ts-expect-error — AuditConceptId is not an AuditEntryId
const crossConceptAsEntry: AuditEntryId = auditConceptId;
// @ts-expect-error — AuditConceptId is not AuditId (log entry)
const crossConceptAsLog: AuditId = auditConceptId;

// @ts-expect-error — an issue artifact identity is not its concept identity
const crossIssueArtifactAsConcept: GithubIssueConceptId = githubIssueArtifactId;
// @ts-expect-error — a semantic label key is not an issue artifact identity
const crossIssueLabelAsArtifact: GithubIssueArtifactId = githubIssueLabelKey;

// ─── 2. Same-brand assignment compiles ──────────────────────────────────────

const sameSession: SessionId = sessionId;
const sameUser: UserId = userId;
const sameJob: JobId = asJobId('job-1');

// ─── 3. Branded value IS assignable to plain string ─────────────────────────

const brandedAsString: string = sessionId;
function takesString(value: string): string {
  return value;
}
const viaParam: string = takesString(userId);

// ─── 4. Plain string is NOT assignable to branded ───────────────────────────

// @ts-expect-error — a plain string is not a SessionId
const plainAsSession: SessionId = 'plain';

// ─── 5. Constructor signatures ──────────────────────────────────────────────

// as* hard-mints the right brand (runtime throws on empty — not a type-level rule).
const asReturnsUser: UserId = asUserId('u-2');
const asReturnsOidcClient: OidcClientId = asOidcClientId('client-2');

// @ts-expect-error — an OIDC client is not a federated identity record
const oidcClientAsIdentity: IdentityId = asReturnsOidcClient;

// try* soft-mints: brand or undefined, never a forged empty brand.
const tryReturnsMaybeSession: SessionId | undefined = trySessionId('s-2');
const tryReturnsUndefined: SessionId | undefined = trySessionId(undefined);

// parse* is fail-closed wire ingress: unknown in, brand out.
const wireValue: unknown = JSON.parse('"zone-1"');
const parseReturnsZone: ZoneId = parseZoneId(wireValue);

// @ts-expect-error — asUserId mints a UserId, never a SessionId
const wrongBrandFromCtor: SessionId = asUserId('u-3');

// Generated guards narrow unknown values to the selected catalog brand.
const guardInput: unknown = JSON.parse('"MA"');
if (BRAND_GUARDS.isStateCode(guardInput)) {
  const guardedState: StateCode = guardInput;
  void guardedState;
}
if (isBrandedValue('SessionId', guardInput)) {
  const guardedSession: SessionId = guardInput;
  void guardedSession;
}

// ─── 6. Aggregate unions cover the complete 92-value catalog ─────────────────

const everyId: readonly AnyId[] = [
  asSessionId('s'),
  asTerminalId('t'),
  asRequestId('r'),
  asCorrelationId('c'),
  asSnapshotId('sn'),
  asUserId('u'),
  asAccountId('a'),
  asIdentityId('i'),
  asOidcClientId('oidc-client'),
  asAccessKeyId('ak'),
  asTokenId('tk'),
  asDocumentId('d'),
  asZoneId('z'),
  asDocTokenId('dt'),
  asChallengeId('ch'),
  asPolicyId('p'),
  asDeploymentId('dep'),
  asVersionId('v'),
  asAuditId('au'),
  asAuditFindingId('af'),
  asAuditConceptId('ac'),
  asAuditEntryId('ae'),
  asEvidenceId('ev'),
  asOperationId('op'),
  asResourceId('res'),
  asProjectId('pr'),
  asPipelineId('pl'),
  asJobId('j'),
  asStepId('st'),
  asWebhookId('wh'),
  asFeedId('f'),
  asRunId('run'),
  asDecisionId('dec'),
  asLoopId('loop'),
  asTreeNodeId('tree'),
  asExperimentId('exp'),
  asExperimentVariantId('variant'),
  asExperimentAssignmentId('assignment'),
  asPartnerTemplateId('template'),
  asGateDecisionId('gate'),
  asOpsChannelEventId('event'),
  asEventId('event-1'),
  asEdgeId('edge-1'),
  asSportsbookId('draftkings'),
  asPortalTenantId('factory'),
  asTelegramUserId('telegram-user'),
  asTelegramChatId('telegram-chat'),
  asPortalAccountId('portal-account'),
  asLinkNonceId('nonce'),
  asDomId('section:onboard'),
  asHostId('ledger.factory-wager.com'),
  asApexDomainId('factory-wager.com'),
  asSubdomainId('ledger'),
  asSurfaceId('ledger'),
  asPagesProjectId('project-r-score'),
  asPublishLaneId('prod-write'),
  asAccessDomainId('score.factory-wager.com/portal'),
  outId,
  ledgerEntryId,
  sourceSystemId,
  adapterId,
  externalPartnerId,
  externalAccountId,
  githubIssueArtifactId,
  githubIssueConceptId,
];

const everyBrandedValue: readonly AnyBrandedValue[] = [
  ...everyId,
  githubIssueLabelKey,
  asGithubIssuePriorityCode('p1'),
  asPartnerProfileKey('profile-key'),
  asStateCode('MA'),
  asZipCode('02139'),
  asSurfaceStatusCode('live'),
  asSurfaceAccessCode('public'),
  asSurfaceBackendCode('cloudflare-pages'),
  partnerCode,
  partnerCallSign,
  partnerProfileVersion,
  currencyCode,
  attentionReason,
];

// @ts-expect-error — a key is a branded value, not an ID
const profileKeyAsId: AnyId = partnerProfileKey;

// @ts-expect-error — a validated code is a branded value, not an ID
const stateCodeAsId: AnyId = asStateCode('NJ');

// @ts-expect-error — a plain string is not any branded ID
const plainAsAny: AnyId = 'plain';

// @ts-expect-error — a plain string is not any branded domain value
const plainAsAnyBrandedValue: AnyBrandedValue = 'plain';

// ─── 7. unbrand() ───────────────────────────────────────────────────────────
//
// unbrand<B>(value: BrandedString<B>): string — strips the brand at the type
// level (fixed in _core.ts after type tests exposed that Brand<T, unknown>
// inference preserved it).

const unbranded: string = unbrand(asUserId('u-4')); // branded → string ✓

// @ts-expect-error — brand is stripped: result is no longer a UserId
const unbrandStripsBrand: UserId = unbrand(asUserId('u-5'));

// @ts-expect-error — and certainly not a different brand
const unbrandedNotSession: SessionId = unbrand(asUserId('u-6'));

// Reference remaining fixtures so the file stays tidy under noUnusedLocals.
export const brandedTypeAssertions = [
  sameSession,
  sameUser,
  sameJob,
  brandedAsString,
  viaParam,
  asReturnsUser,
  tryReturnsMaybeSession,
  tryReturnsUndefined,
  parseReturnsZone,
  everyId,
  everyBrandedValue,
  unbranded,
] as const;
