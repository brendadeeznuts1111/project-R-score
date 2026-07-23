/**
 * Ops factorial experiments — design, sticky assign, analyze, predict.
 *
 * Lane: C4 (ops dual-mode experiments skill).
 */
export {
  configKey,
  fullFactorial,
  fullRunCount,
  generateDesign,
  balancedSubset,
  regularTwoLevelFraction,
  stickyVariantIndex,
  type Factor,
  type FactorLevel,
  type VariantConfig,
  type FactorialDesignResult,
  type DesignMethod,
} from './design.ts';
export {
  analyzeFactorial,
  predictFromEffects,
  type AnalyzeOpts,
  type EffectEstimate,
  type FactorialAnalysis,
  type PartnerMetricRow,
} from './analyze.ts';
export { ensureExperimentsSchema } from './schema.ts';
export {
  FactorialEngine,
  resolveExperimentCoverageFloor,
  COVERAGE_FLOOR_KEYS,
  type ExperimentStatus,
  type ExperimentRow,
  type AssignmentResult,
} from './engine.ts';
export {
  resolveExperimentSubject,
  winRateFromResult,
  ensureAssignedToActiveExperiments,
  recordPlaySettlementOutcomes,
  canOfferStakeForNode,
  listActiveExperimentIds,
  type PlaySettleResult,
  type RecordSettlementInput,
  type SettlementOutcomeRecord,
  type SettlementMetricWrite,
} from './outcomes.ts';
