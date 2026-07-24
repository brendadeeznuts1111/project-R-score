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
  loadActiveSbAccounts,
  scrapeBookBalance,
  applyBookScrapes,
  runBookReconciliation,
  type SbAccountRow,
  type BookScrapeResult,
} from './book-reconcile.ts';
export { exportPostgresDdl, probePostgresOps } from './postgres-bridge.ts';
