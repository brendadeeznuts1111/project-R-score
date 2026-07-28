export { ensurePredictionSchema } from './schema.ts';
export {
  getPredictionAccuracy,
  runCoverageBacktest,
  runDailyCoveragePredictionCycle,
  simulateCoveragePrediction,
  type AccuracySummary,
  type DailyCoverageCycleResult,
  type PredictionContext,
  type PredictionTest,
  type PredictionType,
} from './tester.ts';
export {
  buildCoverageChartSvg,
  buildErrorChartSvg,
  buildErrorHistogramSvg,
  buildPredictionReportSummary,
  buildReportHtml,
  buildRollingMaeSvg,
  captureReportWithWebView,
  computeReportDiagnostics,
  loadCoverageSeries,
  writePredictionReport,
  type PredictionReportResult,
  type PredictionReportSummary,
  type ReportDiagnostics,
  type ReportSeriesPoint,
} from './report.ts';
export {
  LIMIT_PREDICTION_MODEL,
  predictLimitRaise,
  recordLimitPrediction,
  backfillLimitPredictions,
  runLimitPredictionCycle,
  formatLimitPrediction,
  ensureLimitPredictionSchema,
  type LimitPrediction,
  type LimitPredictionInput,
} from './limit-prediction.ts';
export { LimitPredictionReport, printLimitPredictionReport } from './limit-prediction-report.ts';
export { runGranularAnalysis } from './granular-analysis.ts';
