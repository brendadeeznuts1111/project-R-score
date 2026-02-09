export type BrandBenchStatus = 'ok' | 'warn' | 'fail';
export type BrandBenchSeverity = 'ok' | 'warn' | 'fail';

export type MetricSummary = {
  iterations: number;
  warmup: number;
  totalMs: number;
  opsPerSec: number;
  p50Ms: number;
  p95Ms: number;
};

export type DomainScenarioMetrics = {
  withPerformanceMs: MetricSummary;
  loadResourcesMs: MetricSummary;
  avgMemoryFootprint: number;
};

export type BrandBenchViolation = {
  metric: string;
  kind: 'throughput_drop' | 'latency_spike' | 'memory_increase';
  severity: BrandBenchSeverity;
  baseline: number;
  current: number;
  deltaAbs: number;
  deltaPct: number;
  message: string;
};

export type BrandBenchReport = {
  runId: string;
  createdAt: string;
  bunVersion: string;
  platform: string;
  arch: string;
  seedSet: number[];
  iterations: number;
  warmup: number;
  operations: Record<string, MetricSummary>;
  domainInstrumentation: Record<string, DomainScenarioMetrics>;
  profileFiles: string[];
  status: BrandBenchStatus;
  violations: BrandBenchViolation[];
};

export type BrandBenchPinnedBaseline = {
  pinnedAt: string;
  baselineRunId: string | null;
  previousBaselineRunId: string | null;
  rationale: string;
  fromPath: string;
  report: BrandBenchReport | null;
};

export type BrandBenchEvaluation = {
  ok: boolean;
  strict: boolean;
  gateMode?: 'warn' | 'strict';
  warnCycle?: number;
  warnCyclesTotal?: number;
  status: BrandBenchStatus;
  anomalyType: 'stable' | 'latency_spike' | 'throughput_drop' | 'memory_increase';
  baselinePath: string;
  currentPath: string;
  baselineRunId: string | null;
  currentRunId: string | null;
  violations: BrandBenchViolation[];
  thresholds: {
    warn: {
      throughputDropPct: number;
      latencyIncreasePct: number;
      memoryIncreasePct: number;
    };
    fail: {
      throughputDropPct: number;
      latencyIncreasePct: number;
      memoryIncreasePct: number;
    };
    minAbsoluteDelta: {
      latencyMs: number;
      memoryFootprint: number;
    };
  };
};
