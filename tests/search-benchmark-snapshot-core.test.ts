import { describe, expect, test } from 'bun:test';
import {
  buildBenchmarkArgs,
  parseArgs,
  parseJsonFromStdout,
  renderSummaryMarkdown,
} from '../scripts/search-benchmark-snapshot';

describe('search benchmark snapshot core helpers', () => {
  test('parseJsonFromStdout extracts payload from noisy stdout', () => {
    const text = 'warmup log\n{"path":"./lib","limit":40,"queries":["q"],"rankedProfiles":[]}\ntrailer';
    const parsed = parseJsonFromStdout(text) as { path: string; limit: number };
    expect(parsed.path).toBe('./lib');
    expect(parsed.limit).toBe(40);
  });

  test('renderSummaryMarkdown includes warning context and thresholds', () => {
    const payload = {
      path: './lib',
      limit: 40,
      queryPack: 'core_delivery_wide',
      overlap: 'remove',
      concurrency: 2,
      queries: ['authorize middleware', 'Bun.serve'],
      warnings: ['latency_p95_warn'],
      thresholdsApplied: {
        qualityDropWarn: -1.5,
        slopRiseWarn: 2,
        reliabilityDropWarn: -2,
        strictLatencyP95WarnMs: 1100,
        strictReliabilityFloor: 45,
        strictPeakHeapWarnMB: 60,
        strictPeakRssWarnMB: 260,
      },
      warningContext: {
        queryPack: 'core_delivery_wide',
        strictMetrics: {
          qualityDelta: -0.2,
          slopDelta: 0.4,
          reliabilityDelta: -0.1,
          reliabilityNow: 62.4,
          latencyP95Ms: 1120,
          peakHeapUsedMB: 38,
          peakRssMB: 184,
        },
        thresholds: {
          qualityDropWarn: -1.5,
          slopRiseWarn: 2,
          reliabilityDropWarn: -2,
          strictLatencyP95WarnMs: 1100,
          strictReliabilityFloor: 45,
          strictPeakHeapWarnMB: 60,
          strictPeakRssWarnMB: 260,
        },
      },
      rankedProfiles: [
        {
          profile: 'strict',
          label: 'Strict',
          latencyP50Ms: 100,
          latencyP95Ms: 1120,
          latencyMaxMs: 1300,
          peakRssMB: 184,
          peakHeapUsedMB: 38,
          avgRssMB: 180,
          avgHeapUsedMB: 36,
          avgSignalPct: 91,
          avgSlopPct: 4,
          avgDuplicatePct: 2,
          avgUniqueFamilyPct: 62,
          avgMirrorsPerHit: 1.2,
          qualityScore: 87.4,
        },
      ],
      coverage: {
        files: 100,
        lines: 2000,
        uniqueFiles: 90,
        uniqueLines: 1700,
        roots: ['./lib', './packages/docs-tools/src'],
        overlapMode: 'remove',
      },
    };

    const summary = renderSummaryMarkdown(
      'snap-1',
      '2026-02-12T00:00:00.000Z',
      payload,
      {
        topQuality: 1.2,
        familyCoverage: 0.6,
        avgSlop: -0.1,
        noiseRatio: 0.2,
        reliability: 0.5,
      },
      ['latency_p95_warn'],
      'same-pack',
      'snap-0'
    );

    expect(summary).toContain('warningContext.queryPack: `core_delivery_wide`');
    expect(summary).toContain('Strict p95 Threshold: `1100ms`');
    expect(summary).toContain('- latency_p95_warn');
    expect(summary).toContain('Baseline Snapshot: `snap-0`');
  });

  test('parseArgs and buildBenchmarkArgs propagate query timeout/retries', () => {
    const options = parseArgs([
      '--path',
      './lib',
      '--query-pack',
      'core_delivery_wide',
      '--query-timeout-ms',
      '9000',
      '--query-retries',
      '2',
      '--overlap',
      'remove',
    ]);
    expect(options.queryTimeoutMs).toBe(9000);
    expect(options.queryRetries).toBe(2);

    const args = buildBenchmarkArgs(options);
    expect(args).toContain('--query-timeout-ms');
    expect(args).toContain('9000');
    expect(args).toContain('--query-retries');
    expect(args).toContain('2');
  });
});
