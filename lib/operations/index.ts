/**
 * Operations — sports betting platform core (SSOT).
 *
 * @see https://bun.com/docs/runtime/sqlite — bun:sqlite
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 */

export { initSchema, migrateSchema } from './schema.ts';
export { openOperationsDb, DEFAULT_OPS_DB_PATH, type OpenOperationsDbOpts } from './db.ts';
export {
  bindPartnerProfile,
  bindTemplate,
  materializePartnerProfile,
  materializeProfile,
  queryPartnersSlice,
  getPartnersSummary,
  templateIdForSource,
  backfillPartnerBindings,
  evaluateForNode,
  recordGateDecision,
  inferSignalTypeFromPlay,
  loadPartnerTemplate,
  DEFAULT_TEMPLATE_ID,
  type GateEvaluation,
  type PartnersSummarySlice,
  type PartnerProfileBinding,
  type MaterializedPartnerProfile,
} from './partner-profile-bridge.ts';
export {
  buildOpsSummary,
  queryGrowth,
  queryBunUtilsProof,
  type OpsSummaryPayload,
  type OpsSummaryGrowth,
  type OpsSummaryBunUtils,
  type OpsSummaryPartners,
} from './ops-summary.ts';
export type { RoutingOpsSlice } from '../routing-proof.ts';
export { PlaySigner } from './play-signing.ts';
export type { PlayInput, PlayRecord } from './play-signing.ts';
export {
  ensurePosition,
  reconcilePositionFromAccounts,
  reservePlay,
  releasePlay,
  reserveOperationsLiquidity,
  canOfferOnPlatform,
  canOfferStakeForNode,
  getPlatformCapacities,
  type ReserveResult,
  type ReservePlayOpts,
  type PlatformCapacity,
} from './liquidity.ts';
export {
  agentHasPlatformAccount,
  coverageTrend,
  detectPlatformFromText,
  ensurePlatformCoverageSchema,
  getAgentPlatformAccounts,
  getCoverageSummary,
  listPlatforms,
  markPlatformVerified,
  minCoveragePct,
  platformSlug,
  recordCoverageSnapshot,
  type AgentPlatformAccount,
  type CoverageSummary,
  type PlatformRow,
} from './platform-coverage.ts';
export { calculateCutCascade, type CutCascadeResult, type CutAllocation } from './cut-engine.ts';
export {
  settlePlay,
  sumCutsForNode,
  type SettlePlayInput,
  type SettlePlayResult,
  type PlayResult,
} from './play-settlement.ts';
export {
  PLAY_GUARDRAILS,
  validatePlay,
  maxStakeForEdge,
  type PlayValidation,
} from './play-validation.ts';
export {
  ensureStateRegulationSchema,
  seedStateRegulations,
  normalizeSportCatalogKey,
  normalizeMarketCatalogKey,
  parseSpecialRules,
  isPartnerIdentityVerified,
  setPartnerIdentityVerified,
  sumDailyStateWagerVolume,
  ScopedRepository,
  ComplianceRepository,
  getPartnerRegulatoryStatus,
  renderRegulatoryPanelHtml,
  requireStateCompliance,
  REGULATED_STATE_CODES,
  type Scope,
  type BetComplianceInput,
  type BetComplianceResult,
  type PartnerRegulatoryStatus,
  type StateComplianceBody,
  type SpecialRules,
} from './state-regulation.ts';
export { FRAUD_GUARDRAILS, detectFraudSignals } from './fraud-guard.ts';
export {
  publishAndDispatch,
  flushOutbox,
  validatePlayFull,
  type PublishDispatchOpts,
  type PublishDispatchResult,
  type FlushOutboxOpts,
} from './play-dispatcher.ts';
export {
  fundViaRail,
  applyDynamicRailLimits,
  calculateRailLimit,
  type FundResult,
  type FundInput,
} from './rail-limits.ts';
export {
  runReconciliation,
  reconcileRailsVsDeposits,
  reconcileAllPositions,
  type ReconciliationReport,
  type ReconcileMismatch,
} from './reconciliation.ts';
export {
  applyOpsSyncEvent,
  getSyncCursor,
  setSyncCursor,
  processOpsSyncQueue,
  type OpsSyncEvent,
} from './ops-sync.ts';
export {
  assignOnboardingDefaults,
  onboardPartnerProfile,
  type AssignOnboardingOpts,
  type AssignOnboardingResult,
} from './partner-onboarding.ts';
export {
  loadOnboardingDefaultsSync,
  templateIdForOnboardingSource,
  resolveDefaultExpertId,
  resetOnboardingDefaultsCache,
  ONBOARDING_DEFAULTS_PATH,
  type OnboardingDefaults,
} from './onboarding-config.ts';
export {
  CALL_SIGN_PATTERN,
  applyPartnerOnboardPackage,
  buildOnboardChecklist,
  displayRef,
  formatOnboardPlanLines,
  formatOnboardStatusLine,
  listUnboundAgentSeats,
  loadOnboardNodeContext,
  planPartnerOnboardPackage,
  resolveOnboardTreeNodeId,
  type OnboardChecklist,
  type OnboardNodeContext,
  type PartnerOnboardApplyResult,
  type PartnerOnboardPackageOpts,
  type PartnerOnboardPlan,
  type UnboundAgentSeat,
} from './partner-onboard-package.ts';
export {
  loadTocRoutingContext,
  rankPlayRecipients,
  type TocPlayRecipient,
  type TocRoutingContext,
} from './toc-play-routing.ts';
export {
  loadActiveSbAccounts,
  scrapeBookBalance,
  applyBookScrapes,
  runBookReconciliation,
  type SbAccountRow,
  type BookScrapeResult,
} from './book-reconcile.ts';
export { exportPostgresDdl, probePostgresOps } from './postgres-bridge.ts';
