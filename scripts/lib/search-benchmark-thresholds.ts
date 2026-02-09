import type { ScoreThresholdsPolicy } from '../../lib/docs/canonical-family';

export type StrictWarningMetrics = {
  qualityDelta: number | null;
  slopDelta: number | null;
  reliabilityDelta: number | null;
  reliabilityNow: number | null;
  latencyP95Ms: number | null;
  peakHeapUsedMB: number | null;
  peakRssMB: number | null;
};

export function evaluateStrictWarnings(
  metrics: StrictWarningMetrics,
  thresholds: Required<ScoreThresholdsPolicy>
): string[] {
  const warnings: string[] = [];
  if (metrics.qualityDelta !== null && metrics.qualityDelta < thresholds.qualityDropWarn) {
    warnings.push('quality_drop_warn');
  }
  if (metrics.slopDelta !== null && metrics.slopDelta > thresholds.slopRiseWarn) {
    warnings.push('slop_rise_warn');
  }
  if (metrics.reliabilityDelta !== null && metrics.reliabilityDelta < thresholds.reliabilityDropWarn) {
    warnings.push('reliability_drop_warn');
  }
  if (metrics.latencyP95Ms !== null && metrics.latencyP95Ms > thresholds.strictLatencyP95WarnMs) {
    warnings.push('latency_p95_warn');
  }
  if (metrics.peakHeapUsedMB !== null && metrics.peakHeapUsedMB > thresholds.strictPeakHeapWarnMB) {
    warnings.push('heap_peak_warn');
  }
  if (metrics.peakRssMB !== null && metrics.peakRssMB > thresholds.strictPeakRssWarnMB) {
    warnings.push('rss_peak_warn');
  }
  if (metrics.reliabilityNow !== null && metrics.reliabilityNow < thresholds.strictReliabilityFloor) {
    warnings.push('strict_reliability_floor_warn');
  }
  return warnings;
}
