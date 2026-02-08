import { describe, expect, test } from 'bun:test';
import { evaluateStrictWarnings, type StrictWarningMetrics } from '../scripts/lib/search-benchmark-thresholds';

const baseMetrics: StrictWarningMetrics = {
  qualityDelta: 0,
  slopDelta: 0,
  reliabilityDelta: 0,
  reliabilityNow: 60,
  latencyP95Ms: 1032,
  peakHeapUsedMB: 45,
  peakRssMB: 220,
};

describe('search benchmark strict warning thresholds', () => {
  test('core_delivery latency threshold still warns at 900ms', () => {
    const warnings = evaluateStrictWarnings(baseMetrics, {
      qualityDropWarn: -1.5,
      slopRiseWarn: 2,
      reliabilityDropWarn: -2,
      strictLatencyP95WarnMs: 900,
      strictReliabilityFloor: 45,
      strictPeakHeapWarnMB: 60,
      strictPeakRssWarnMB: 240,
    });
    expect(warnings).toContain('latency_p95_warn');
  });

  test('core_delivery_wide threshold at 1100ms suppresses false latency warn', () => {
    const warnings = evaluateStrictWarnings(baseMetrics, {
      qualityDropWarn: -1.5,
      slopRiseWarn: 2,
      reliabilityDropWarn: -2,
      strictLatencyP95WarnMs: 1100,
      strictReliabilityFloor: 45,
      strictPeakHeapWarnMB: 60,
      strictPeakRssWarnMB: 240,
    });
    expect(warnings).not.toContain('latency_p95_warn');
  });
});
