/**
 * Operations — sports betting platform core (SSOT).
 *
 * @see https://bun.com/docs/runtime/sqlite — bun:sqlite
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 */

export { initSchema, migrateSchema } from './schema.ts';
export { openOperationsDb, DEFAULT_OPS_DB_PATH, type OpenOperationsDbOpts } from './db.ts';
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
