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
