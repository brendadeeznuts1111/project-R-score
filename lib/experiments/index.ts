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
export { assignClustered } from './cluster.ts';
export {
  createSwitchbackSchedule,
  currentSwitchbackPeriod,
  recordSwitchbackMetric,
  analyzeSwitchback,
  type SwitchbackPeriod,
  type SwitchbackAnalysis,
} from './switchback.ts';
export {
  classifyFactor,
  factorLaunchErrors,
  normalizeExperimentPolicy,
  DEFAULT_EXPERIMENT_POLICY,
  type FactorScope,
  type ExperimentPolicy,
} from './policy.ts';
export {
  EXPERIMENT_PHASES,
  getPhase,
  phaseDesignSize,
  type ExperimentProtocol,
  type PhasePreset,
} from './phases.ts';
export {
  clusterKeyForNode,
  dailyCheck,
  dailyCheckById,
  launchPhase,
  type ClusterBy,
  type DailyCheckResult,
  type LaunchPhaseOpts,
  type LaunchPhaseResult,
} from './runner.ts';
export {
  ensurePredictionShadowSchema,
  evaluateShadow,
  resolveShadowActual,
  shadowLog,
  type ShadowEvalResult,
  type ShadowLogInput,
} from './champion-challenger.ts';
export {
  FactorialEngine,
  resolveExperimentCoverageFloor,
  getPartnerVariantConfig,
  createExperiment,
  activateExperiment,
  assignVariant,
  logMetric,
  getResults,
  COVERAGE_FLOOR_KEYS,
  type ExperimentStatus,
  type ExperimentRow,
  type AssignmentResult,
  type AbVariantInput,
  type AbExperiment,
  type AbResultRow,
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
