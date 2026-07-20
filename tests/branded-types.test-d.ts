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
  AnyId,
  AuditId,
  ChallengeId,
  CorrelationId,
  DeploymentId,
  DocumentId,
  FeedId,
  IdentityId,
  JobId,
  OperationId,
  PipelineId,
  PolicyId,
  ProjectId,
  RequestId,
  ResourceId,
  SessionId,
  SnapshotId,
  StepId,
  TerminalId,
  TokenId,
  UserId,
  VersionId,
  WebhookId,
  ZoneId,
} from '../lib/types/branded.ts';
import {
  asAccessKeyId,
  asAccountId,
  asAuditId,
  asChallengeId,
  asCorrelationId,
  asDeploymentId,
  asDocumentId,
  asFeedId,
  asIdentityId,
  asJobId,
  asOperationId,
  asPipelineId,
  asPolicyId,
  asProjectId,
  asRequestId,
  asResourceId,
  asSessionId,
  asSnapshotId,
  asStepId,
  asTerminalId,
  asTokenId,
  asUserId,
  asVersionId,
  asWebhookId,
  asZoneId,
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

// ─── 6. AnyId accepts every one of the 25 brands ────────────────────────────

const anySession: AnyId = asSessionId('s');
const anyTerminal: AnyId = asTerminalId('t');
const anyRequest: AnyId = asRequestId('r');
const anyCorrelation: AnyId = asCorrelationId('c');
const anySnapshot: AnyId = asSnapshotId('sn');
const anyUser: AnyId = asUserId('u');
const anyAccount: AnyId = asAccountId('a');
const anyIdentity: AnyId = asIdentityId('i');
const anyAccessKey: AnyId = asAccessKeyId('ak');
const anyToken: AnyId = asTokenId('tk');
const anyDocument: AnyId = asDocumentId('d');
const anyZone: AnyId = asZoneId('z');
const anyChallenge: AnyId = asChallengeId('ch');
const anyPolicy: AnyId = asPolicyId('p');
const anyDeployment: AnyId = asDeploymentId('dep');
const anyVersion: AnyId = asVersionId('v');
const anyAudit: AnyId = asAuditId('au');
const anyOperation: AnyId = asOperationId('op');
const anyResource: AnyId = asResourceId('res');
const anyProject: AnyId = asProjectId('pr');
const anyPipeline: AnyId = asPipelineId('pl');
const anyJob: AnyId = asJobId('j');
const anyStep: AnyId = asStepId('st');
const anyWebhook: AnyId = asWebhookId('wh');
const anyFeed: AnyId = asFeedId('f');

// @ts-expect-error — a plain string is not any branded ID
const plainAsAny: AnyId = 'plain';

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
  unbranded,
] as const;
