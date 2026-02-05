// Barrel re-exports preserving public API

export type {
  Version, PerfProfile, SecurityScope, BunDocEntry,
  MatrixMetrics, MatrixTotals, PatternAnalysis, PerformanceMetrics,
  SecurityPatterns, EvolutionMetrics, CorrelationMetrics,
  HomeAutomationMetrics, SecurityTrends, StabilityProgression,
  NamingPatterns, DependencyPatterns, BaselineImprovements,
  ThuisIntegrationPatterns, ThuisConfigComplexity,
  MatrixCLIOptions, DisplayStats,
} from "./types";
export { BunMatrixStore } from "./store";
export { BunMatrixViewer, runMatrixCLI, matrixViewer, matrixStore } from "./viewer";
export { calculateMetrics } from "./analytics";
export { parseRSS, updateFromRSS } from "./rss";
export { DEFAULT_ENTRIES } from "./seed-data";
export {
  formatStability,
  formatSecurity,
  getCategoryIcon,
  getPlatformIcon,
  hasErrors,
  getErrors,
  isDefaultConfig,
  percentage,
} from "./formatters";
