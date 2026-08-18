// @see https://bun.com/docs/test/parallel#isolate — --isolate
// @released --isolate · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --isolate · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/test/parallel#parallel — --parallel
// @released --parallel · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --parallel · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --parallel · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated --parallel · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/test/parallel#one-timings-file-per-shard — --shard
// @released --shard · released v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated --shard · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/blog/bun-v1.3.14#no-orphans-exit-when-the-parent-process-dies — --no-orphans
// @see https://bun.com/blog/bun-v1.3.14#http-3-quic-support-in-bun-serve — Bun.serve http3
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Reviewed Bun capability declarations.
 *
 * This file is the authority for semantic relationships. Source observation is
 * supporting evidence only and must never infer a brand from file co-occurrence.
 */

import { asDocTokenId } from '../types/branded/documents.ts';
import { defineBunBrandUsages } from './bun-brand-contract.ts';

const none = (rationale: string) =>
  [{ direction: 'none' as const, brand: null, rationale }] as const;

const packageScripts = (...symbols: string[]) =>
  symbols.map(symbol => ({ path: 'package.json', symbol }));

export const BUN_BRAND_USAGES = defineBunBrandUsages([
  {
    key: 'bun-image-dod-evidence',
    token: asDocTokenId('Bun.Image'),
    variant: 'image-processing',
    scope: 'production',
    policy: 'production-approved',
    ownerLane: 'audit',
    implementations: [
      { path: 'lib/dod/evidence.ts', symbol: 'averageHash' },
      { path: 'lib/dod/evidence.ts', symbol: 'storePreviewWebp' },
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.process' },
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.applyWatermark' },
    ],
    consumers: [
      { path: 'lib/dod/evidence.ts', symbol: 'buildDodEvidencePackage' },
      { path: 'tools/dod-evidence.ts', symbol: 'cmdPack' },
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.process' },
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.process' },
    ],
    relationships: [
      {
        direction: 'evidence',
        brand: 'EvidenceId',
        rationale: 'Decoded and resized image bytes are stored in an EvidenceId-addressed record.',
      },
    ],
    proofs: [
      {
        source: 'public/registry/release-features.json',
        key: 'result:terminal-methods',
        maxAgeDays: 45,
      },
    ],
  },
  {
    key: 'bun-webview-dod-evidence',
    token: asDocTokenId('Bun.WebView'),
    variant: 'headless',
    scope: 'production',
    policy: 'lab-only',
    ownerLane: 'audit',
    implementations: [
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.applyWatermark' },
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.extractText' },
    ],
    consumers: [
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.process' },
      { path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.process' },
    ],
    relationships: [
      {
        direction: 'evidence',
        brand: 'EvidenceId',
        rationale: 'Headless rendering prepares the visual payload in the DOD evidence flow.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-evidence-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'audit',
    implementations: [
      { path: 'lib/time.ts', symbol: 'randomUUIDv7' },
      { path: 'lib/time.ts', symbol: 'uuidV7WithTimestamp' },
    ],
    consumers: [
      { path: 'lib/time.ts', symbol: 'mintEvidenceId' },
      { path: 'lib/time.ts', symbol: 'mintEvidenceIdAt' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'EvidenceId',
        rationale: 'The owned mint converts a UUIDv7 result into EvidenceId.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-limit-forecast-issue',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/prediction/limit-forecast-evidence.ts', symbol: 'issueLimitForecast' },
    ],
    consumers: [
      { path: 'lib/prediction/limit-forecast-evidence.ts', symbol: 'issueLimitForecast' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'LimitForecastIssueId',
        rationale: 'Forecast issue rows mint LimitForecastIssueId from UUIDv7.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-phone-sportsbook-journal',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [{ path: 'lib/operations/phone-sportsbook-journal.ts', symbol: 'mintId' }],
    consumers: [{ path: 'lib/operations/phone-sportsbook-journal.ts', symbol: 'addPhone' }],
    relationships: none(
      'Journal row ids are opaque SQLite primary keys (brand-ok strings), not a domain *Id yet.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-funding-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [{ path: 'lib/operations/rail-limits.ts', symbol: 'fundViaRail' }],
    consumers: [{ path: 'lib/operations/rail-limits.ts', symbol: 'fundViaRail' }],
    relationships: [
      {
        direction: 'output',
        brand: 'FundingId',
        rationale: 'Rail funding rows mint FundingId from UUIDv7 before insert.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-ops-channel-event',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [{ path: 'lib/channels/outbox.ts', symbol: 'enqueueOpsChannelEvent' }],
    consumers: [{ path: 'lib/channels/outbox.ts', symbol: 'enqueueOpsChannelEvent' }],
    relationships: [
      {
        direction: 'output',
        brand: 'OpsChannelEventId',
        rationale: 'Ops channel outbox events mint OpsChannelEventId from UUIDv7.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-command-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/ai/ai-operations-manager.ts', symbol: 'AIOperationsManager.generateId' },
    ],
    consumers: [
      { path: 'lib/ai/ai-operations-manager.ts', symbol: 'AIOperationsManager.generateId' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'CommandId',
        rationale: 'AI command handles mint CommandId from a UUIDv7-backed string.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-correlation-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'session',
    implementations: [
      {
        path: 'lib/ai/ai-operations-manager.ts',
        symbol: 'AIOperationsManager.generateCorrelationId',
      },
      { path: 'tools/concept-inventory.ts', symbol: 'parseConceptInventoryOptions' },
    ],
    consumers: [
      {
        path: 'lib/ai/ai-operations-manager.ts',
        symbol: 'AIOperationsManager.generateCorrelationId',
      },
      { path: 'tools/concept-inventory.ts', symbol: 'parseConceptInventoryOptions' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'CorrelationId',
        rationale:
          'Trace correlation ids and concept-inventory run ids mint CorrelationId from UUIDv7.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-toc-tree-node',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/operations/toc-identity-bridge.ts', symbol: 'ensureAgent' },
      { path: 'lib/operations/toc-identity-bridge.ts', symbol: 'ensureNovPartner' },
    ],
    consumers: [
      { path: 'lib/operations/toc-identity-bridge.ts', symbol: 'seedTocIdentityBindings' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'TreeNodeId',
        rationale: 'TOC identity seeding mints TreeNodeId for new agent and NOV partner nodes.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-toc-opaque-rows',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/operations/toc-identity-bridge.ts', symbol: 'ensureHardrockAccount' },
      { path: 'lib/operations/toc-identity-bridge.ts', symbol: 'ensureRail' },
    ],
    consumers: [
      { path: 'lib/operations/toc-identity-bridge.ts', symbol: 'seedTocIdentityBindings' },
    ],
    relationships: none(
      'sb_accounts and rails row ids are opaque SQLite primary keys (brand-ok strings), not domain *Id values.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-partner-ledger-opaque',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/partner-profile/ledger.ts', symbol: 'insertLedgerEntry' },
      { path: 'lib/partner-profile/deposit-import.ts', symbol: 'importDeposits' },
    ],
    consumers: [
      { path: 'lib/partner-profile/ledger.ts', symbol: 'insertLedgerEntry' },
      { path: 'lib/partner-profile/deposit-import.ts', symbol: 'importDeposits' },
    ],
    relationships: none(
      'Partner ledger row ids and deposit batch ids are opaque strings (brand-ok), not domain *Id values.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-scratch-temp-dirs',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [
      { path: 'scripts/bun-test-changed-staged.ts', symbol: 'main' },
      { path: 'scripts/lib/index-tree.ts', symbol: 'materializeIndexTree' },
    ],
    consumers: [
      { path: 'scripts/bun-test-changed-staged.ts', symbol: 'main' },
      { path: 'scripts/lib/index-tree.ts', symbol: 'materializeIndexTree' },
    ],
    relationships: none(
      'UUIDv7 suffixes only uniquify ephemeral scratch directories for staged test isolation.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-token-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'identity',
    implementations: [{ path: 'lib/identity/identity.ts', symbol: 'mintBearerToken' }],
    consumers: [{ path: 'lib/identity/identity.ts', symbol: 'mintBearerToken' }],
    relationships: [
      {
        direction: 'output',
        brand: 'TokenId',
        rationale: 'Bearer token mint concatenates UUIDv7 with a hex secret into TokenId.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-identity-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'identity',
    implementations: [{ path: 'lib/identity/identity.ts', symbol: 'IdentitySystem.logAuthEvent' }],
    consumers: [{ path: 'lib/identity/identity.ts', symbol: 'IdentitySystem.logAuthEvent' }],
    relationships: [
      {
        direction: 'output',
        brand: 'IdentityId',
        rationale: 'Auth audit rows mint IdentityId from UUIDv7 before insert.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-gate-decision',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/operations/partner-profile-bridge.ts', symbol: 'evaluateForNode' },
      { path: 'lib/operations/play-dispatcher.ts', symbol: 'publishAndDispatch' },
      { path: 'lib/operations/ops-loop-gate-backfill.ts', symbol: 'insertLegacyGateAllow' },
    ],
    consumers: [
      { path: 'lib/operations/partner-profile-bridge.ts', symbol: 'evaluateForNode' },
      { path: 'lib/operations/play-dispatcher.ts', symbol: 'publishAndDispatch' },
      { path: 'lib/operations/ops-loop-gate-backfill.ts', symbol: 'insertLegacyGateAllow' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'GateDecisionId',
        rationale: 'Partner policy and play-dispatch paths mint GateDecisionId from UUIDv7.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-experiment-mints',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.createExperiment' },
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.assignBalanced' },
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.assignToConfig' },
    ],
    consumers: [
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.createExperiment' },
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.assignBalanced' },
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.assignToConfig' },
    ],
    relationships: [
      {
        direction: 'output',
        brand: 'ExperimentId',
        rationale: 'Factorial experiment creation mints ExperimentId from UUIDv7.',
      },
      {
        direction: 'output',
        brand: 'ExperimentVariantId',
        rationale: 'Factorial experiment creation mints ExperimentVariantId per design variant.',
      },
      {
        direction: 'output',
        brand: 'ExperimentAssignmentId',
        rationale: 'Balanced and config assignment paths mint ExperimentAssignmentId from UUIDv7.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-tree-node-account',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [{ path: 'lib/accounts/accounts.ts', symbol: 'AccountSystem.create' }],
    consumers: [{ path: 'lib/accounts/accounts.ts', symbol: 'AccountSystem.create' }],
    relationships: [
      {
        direction: 'output',
        brand: 'TreeNodeId',
        rationale: 'Account tree node creation mints TreeNodeId from UUIDv7.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-ops-seed-demo',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [{ path: 'lib/operations/ops-seed.ts', symbol: 'seedOperationsDemo' }],
    consumers: [{ path: 'lib/operations/ops-seed.ts', symbol: 'seedOperationsDemo' }],
    relationships: none(
      'Operations demo seed rows use bare UUIDv7 primary keys for fixtures, not domain *Id mints.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-ops-oneliners-demo',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'tools/bun-ops-oneliners.ts', symbol: 'seedOpsDb' },
      { path: 'tools/bun-ops-oneliners.ts', symbol: 'run' },
    ],
    consumers: [
      { path: 'tools/bun-ops-oneliners.ts', symbol: 'seedOpsDb' },
      { path: 'tools/bun-ops-oneliners.ts', symbol: 'run' },
    ],
    relationships: none(
      'Ops oneliner demos mint ephemeral SQLite fixture ids; they are not domain *Id values.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-anomaly-opaque',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.createAnomaly' },
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.createRuleBasedAnomaly' },
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.checkImmediateAnomalies' },
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.findRelatedEvents' },
    ],
    consumers: [
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.createAnomaly' },
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.createRuleBasedAnomaly' },
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.checkImmediateAnomalies' },
      { path: 'lib/ai/anomaly-detector.ts', symbol: 'AnomalyDetector.findRelatedEvents' },
    ],
    relationships: none(
      'Anomaly and related-event ids are prefixed opaque strings, not branded domain *Id values.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-ops-loop-fixture',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/operations/ops-loop-fixture.ts', symbol: 'runOpsLoopFixture' },
      { path: 'lib/operations/ops-loop-fixture.ts', symbol: 'runOpsLoopMultiNodeFixture' },
    ],
    consumers: [
      { path: 'lib/operations/ops-loop-fixture.ts', symbol: 'runOpsLoopFixture' },
      { path: 'lib/operations/ops-loop-fixture.ts', symbol: 'runOpsLoopMultiNodeFixture' },
    ],
    relationships: none(
      'Ops-loop fixtures mint bare node ids for in-memory demos; branding happens at bind sites.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-telegram-broadcast-opaque',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/telegram/broadcast.ts', symbol: 'broadcastToKnownChats' },
      { path: 'lib/telegram/broadcast.ts', symbol: 'enqueueBroadcastToOutbox' },
      { path: 'lib/telegram/broadcast-log.ts', symbol: 'recordBroadcastOutboxSend' },
    ],
    consumers: [
      { path: 'lib/telegram/broadcast.ts', symbol: 'broadcastToKnownChats' },
      { path: 'lib/telegram/broadcast.ts', symbol: 'enqueueBroadcastToOutbox' },
      { path: 'lib/telegram/broadcast-log.ts', symbol: 'recordBroadcastOutboxSend' },
    ],
    relationships: none(
      'Broadcast batch and log row ids are opaque strings (brand-ok), not domain *Id values.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-time-encoding-hex',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-hex',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'audit',
    implementations: [{ path: 'lib/time.ts', symbol: 'randomUUIDv7' }],
    consumers: [{ path: 'lib/time.ts', symbol: 'randomUUIDv7' }],
    relationships: none(
      'The hex encoding overload reshapes UUIDv7 bytes for callers; EvidenceId mint is the uuid-string path.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-time-encoding-buffer',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-buffer',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'audit',
    implementations: [{ path: 'lib/time.ts', symbol: 'randomUUIDv7' }],
    consumers: [{ path: 'lib/time.ts', symbol: 'randomUUIDv7' }],
    relationships: none(
      'The buffer encoding overload returns raw UUIDv7 bytes; EvidenceId mint is the uuid-string path.'
    ),
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-experiment-ab-opaque',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'operations',
    implementations: [
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.recordMetric' },
      { path: 'lib/experiments/engine.ts', symbol: 'createExperiment' },
      { path: 'lib/experiments/engine.ts', symbol: 'assignVariant' },
    ],
    consumers: [
      { path: 'lib/experiments/engine.ts', symbol: 'FactorialEngine.recordMetric' },
      { path: 'lib/experiments/engine.ts', symbol: 'createExperiment' },
      { path: 'lib/experiments/engine.ts', symbol: 'assignVariant' },
    ],
    relationships: none(
      'Legacy A/B helpers and metric rows mint bare UUID strings without asExperiment* branding.'
    ),
    proofs: [],
  },
  {
    key: 'bun-cron-in-process-monitoring',
    token: asDocTokenId('Bun.cron'),
    variant: 'in-process',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/factory/monitoring.ts', symbol: 'registerRegistryCrons' }],
    consumers: [{ path: 'lib/factory/server.ts', symbol: 'registerRegistryCrons' }],
    relationships: none(
      'The scheduler controls runtime callbacks; no domain identity crosses this boundary.'
    ),
    proofs: [],
  },
  {
    key: 'bun-cron-os-persistent',
    token: asDocTokenId('Bun.cron'),
    variant: 'os-persistent',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/harness/cron.ts', symbol: 'registerOsCron' }],
    consumers: [{ path: 'tools/portal-cli.ts', symbol: 'dispatchSnapshot' }],
    relationships: none(
      'The operating-system job title is scheduler metadata and is not a FactoryWager domain ID.'
    ),
    proofs: [],
  },
  {
    key: 'bun-cron-brand-status-watch',
    token: asDocTokenId('Bun.cron'),
    variant: 'in-process',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'tools/brand-status.ts', symbol: 'startWatch' }],
    consumers: [{ path: 'tools/brand-status.ts', symbol: 'main' }],
    relationships: none(
      'The watch scheduler controls periodic terminal refreshes; no domain identity crosses this boundary.'
    ),
    proofs: [],
  },
  {
    key: 'bun-cron-factory-template-preview',
    token: asDocTokenId('Bun.cron'),
    variant: 'parse',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [
      {
        path: '.bun-create/factory-library/scripts/cron-preview.ts',
        symbol: 'parseNextCronOccurrence',
      },
    ],
    consumers: [
      { path: '.bun-create/factory-library/package.json', symbol: 'scripts.cron:preview' },
    ],
    relationships: none(
      'The preview parses a UTC schedule without registering work or transporting a domain identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-sliceansi-terminal-output',
    token: asDocTokenId('Bun.sliceAnsi'),
    variant: 'display-width',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [
      { path: 'lib/console-depth.ts', symbol: 'truncateWidth' },
      { path: 'lib/console-depth.ts', symbol: 'fitVisible' },
    ],
    consumers: [
      { path: 'lib/factory/cli.ts', symbol: 'truncateDesc' },
      { path: 'lib/console-depth.ts', symbol: 'fitVisible' },
    ],
    relationships: none(
      'ANSI-aware slicing transforms display text and does not create or consume an identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-terminal-pty',
    token: asDocTokenId('Bun.Terminal'),
    variant: 'pty',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/terminal.ts', symbol: 'createCapturingTerminal' }],
    consumers: [{ path: 'tools/monorepo-health.ts', symbol: 'runInteractive' }],
    relationships: none(
      'The PTY object is native process infrastructure; terminal identity remains separately branded.'
    ),
    proofs: [
      {
        source: 'public/registry/release-features.json',
        key: 'result:Bun.spawn PTY (echo capture)',
        maxAgeDays: 45,
      },
    ],
  },
  {
    key: 'bun-test-parallel',
    token: asDocTokenId('--parallel'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: packageScripts(
      'test:shard:parallel',
      'test:ci:shard:parallel',
      'test:parallel',
      'test:dev',
      'test:watch',
      'test:watch:full',
      'test:watch:shard1',
      'test:watch:shard2',
      'test:watch:shard3',
      'test:state-compliance',
      'test:state-compliance:watch'
    ),
    consumers: [{ path: '.github/workflows/test-sharded.yml', symbol: 'tests shard' }],
    relationships: none(
      'Test scheduling changes execution topology but does not transport domain identities.'
    ),
    proofs: [],
  },
  {
    key: 'bun-no-orphans-factory-template',
    token: asDocTokenId('--no-orphans'),
    variant: 'bun-config',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [
      { path: '.bun-create/factory-library/harness.toml', symbol: 'noOrphans' },
      { path: '.bun-create/factory-library/bunfig.toml', symbol: 'noOrphans' },
    ],
    consumers: [{ path: '.bun-create/factory-library/bunfig.toml', symbol: 'run.noOrphans' }],
    relationships: none(
      'Parent-death behavior is runtime lifecycle configuration and does not create a domain identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-test-isolate',
    token: asDocTokenId('--isolate'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: packageScripts('test:isolate'),
    consumers: [{ path: 'package.json', symbol: 'scripts' }],
    relationships: none(
      'Per-file test isolation is harness configuration without a domain identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-test-shard',
    token: asDocTokenId('--shard'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: packageScripts(
      'test:shard:parallel',
      'test:shard',
      'test:ci:shard',
      'test:ci:shard:parallel',
      'test:watch:shard1',
      'test:watch:shard2',
      'test:watch:shard3'
    ),
    consumers: [{ path: '.github/workflows/test-sharded.yml', symbol: 'tests shard' }],
    relationships: none(
      'Shard coordinates are CI configuration rather than a FactoryWager domain value.'
    ),
    proofs: [],
  },
  {
    key: 'bun-test-changed',
    token: asDocTokenId('--changed'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: packageScripts('test:watch'),
    consumers: [{ path: 'package.json', symbol: 'scripts' }],
    relationships: none('Changed-test selection consumes repository state, not a domain identity.'),
    proofs: [],
  },
  {
    key: 'fetch-http2-client',
    token: asDocTokenId('fetch protocol http2'),
    variant: 'fetch-client',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [
      {
        path: 'projects/active/sports-terminal-os/src/utils/h2-fetch.ts',
        symbol: 'h2Fetch',
      },
    ],
    consumers: [
      {
        path: 'projects/active/sports-terminal-os/src/utils/h2-fetch.ts',
        symbol: 'h2Fetch',
      },
    ],
    relationships: none(
      'The negotiated transport protocol changes network behavior without changing request identity.'
    ),
    proofs: [],
  },
] as const);
