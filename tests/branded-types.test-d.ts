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
  AccessKeyId,
  AccountId,
  AnyBrandedValue,
  AnyId,
  AuditId,
  AuditFindingId,
  AuditConceptId,
  AuditEntryId,
  ChallengeId,
  CorrelationId,
  DeploymentId,
  DocumentId,
  FeedId,
  IdentityId,
  JobId,
  OperationId,
  PartnerProfileKey,
  PipelineId,
  PolicyId,
  PortalAccountId,
  PortalTenantId,
  ProjectId,
  RequestId,
  ResourceId,
  SessionId,
  SnapshotId,
  StateCode,
  StepId,
  TerminalId,
  TokenId,
  UserId,
  VersionId,
  WebhookId,
  ZoneId,
} from '../lib/types/branded.ts';
import {
  BRAND_GUARDS,
  asAccessKeyId,
  asAccountId,
  asAuditId,
  asAuditFindingId,
  asAuditConceptId,
  asAuditEntryId,
  asEvidenceId,
  asChallengeId,
  asCorrelationId,
  asDecisionId,
  asDeploymentId,
  asDocumentId,
  asDocTokenId,
  asExperimentAssignmentId,
  asExperimentId,
  asExperimentVariantId,
  asFeedId,
  asIdentityId,
  asJobId,
  asGateDecisionId,
  asLinkNonceId,
  asLoopId,
  asOperationId,
  asOpsChannelEventId,
  asPartnerProfileKey,
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
  asStepId,
  asStateCode,
  asTerminalId,
  asTokenId,
  asTelegramUserId,
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
const requestId: RequestId = asRequestId('req-1');
const documentId: DocumentId = asDocumentId('doc-1');
const portalTenantId: PortalTenantId = asPortalTenantId('factory');
const portalAccountId: PortalAccountId = asPortalAccountId('account-1');
const partnerProfileKey: PartnerProfileKey = asPartnerProfileKey('profile-1');

// @ts-expect-error — SessionId is not a UserId
const crossAsUser: UserId = sessionId;
// @ts-expect-error — UserId is not a SessionId
const crossAsSession: SessionId = userId;

// @ts-expect-error — AccountId is not an AccessKeyId
const crossAsAccessKey: AccessKeyId = accountId;

// @ts-expect-error — AccessKeyId is not an AccountId
const crossAsAccount: AccountId = accessKeyId;

// @ts-expect-error — OperationId is not a JobId
const crossAsJob: JobId = operationId;

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

const auditFindingId: AuditFindingId = asAuditFindingId('finding-1');
const auditConceptId: AuditConceptId = asAuditConceptId('concept-1');
const auditEntryId: AuditEntryId = asAuditEntryId('entry-1');
const auditLogId: AuditId = asAuditId('au-1');

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

// ─── 6. Aggregate unions cover the complete 47-value catalog ────────────────

const everyId: readonly AnyId[] = [
  asSessionId('s'),
  asTerminalId('t'),
  asRequestId('r'),
  asCorrelationId('c'),
  asSnapshotId('sn'),
  asUserId('u'),
  asAccountId('a'),
  asIdentityId('i'),
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
  asPortalTenantId('factory'),
  asTelegramUserId('telegram-user'),
  asPortalAccountId('portal-account'),
  asLinkNonceId('nonce'),
];

const everyBrandedValue: readonly AnyBrandedValue[] = [
  ...everyId,
  asPartnerProfileKey('profile-key'),
  asStateCode('MA'),
  asZipCode('02139'),
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
