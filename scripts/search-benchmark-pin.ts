#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type Severity = 'ok' | 'warn' | 'fail';
type AnomalyType =
  | 'stable'
  | 'latency_spike'
  | 'memory_spike'
  | 'quality_drop'
  | 'mixed_regression'
  | 'pack_mismatch'
  | 'env_noise';

type RankedProfile = {
  profile?: string;
  label?: string;
  latencyP95Ms?: number;
  peakHeapUsedMB?: number;
  peakRssMB?: number;
  qualityScore?: number;
  avgUniqueFamilyPct?: number;
};

export type Snapshot = {
  id?: string;
  createdAt?: string;
  queryPack?: string;
  coverage?: {
    files?: number;
    lines?: number;
    uniqueFiles?: number;
    uniqueLines?: number;
  };
  rankedProfiles?: RankedProfile[];
};

type PinnedBaseline = {
  version: 1;
  pinnedAt: string;
  source: string;
  snapshot: {
    id: string;
    createdAt: string;
    queryPack: string;
  };
  strict: {
    latencyP95Ms: number;
    peakHeapUsedMB: number;
    peakRssMB: number;
    qualityScore: number;
    reliabilityPct: number;
  };
  coverage: {
    files: number;
    lines: number;
    uniqueFiles: number;
    uniqueLines: number;
  };
};

type CompareThresholds = {
  fail: {
    maxP95RegressionMs: number;
    maxHeapRegressionMB: number;
    minQualityDelta: number;
    minReliabilityDelta: number;
  };
  warn: {
    maxP95RegressionMs: number;
    maxHeapRegressionMB: number;
    minQualityDelta: number;
    minReliabilityDelta: number;
  };
};

export type CompareResultPayload = {
  ok: boolean;
  strict: boolean;
  baselinePath: string;
  currentPath: string;
  baseline: {
    snapshot: PinnedBaseline['snapshot'];
    strict: PinnedBaseline['strict'];
  };
  current: {
    snapshot: PinnedBaseline['snapshot'];
    strict: PinnedBaseline['strict'];
  };
  compatibility: {
    queryPackMatch: boolean;
    baselineQueryPack: string;
    currentQueryPack: string;
    note: string;
  };
  delta: {
    absolute: Record<string, number>;
    percent: Record<string, number | null>;
  };
  severity: Record<string, Severity>;
  anomalyType: AnomalyType;
  thresholds: CompareThresholds;
  failures: string[];
  warnings: string[];
  trend: {
    enabled: false;
    window: null;
    note: string;
  };
};

export function usage(): void {
  console.log(`
Search Benchmark Pinning

USAGE:
  bun run scripts/search-benchmark-pin.ts pin [options]
  bun run scripts/search-benchmark-pin.ts compare [options]

OPTIONS:
  --from <path>       Source snapshot (default: reports/search-benchmark/latest.json)
  --out <path>        Pinned baseline file (default: .search/search-benchmark-pinned-baseline.json)
  --baseline <path>   Baseline file for compare (default: auto by query-pack, then canonical)
  --json              Print compare payload as JSON
  --strict            Exit non-zero on regression threshold failures (default: true)
  --no-strict         Never fail process in compare mode

THRESHOLDS (env):
  FAIL:
    SEARCH_BENCH_PIN_MAX_P95_REGRESSION_MS   default 75
    SEARCH_BENCH_PIN_MAX_HEAP_REGRESSION_MB  default 8
    SEARCH_BENCH_PIN_MIN_QUALITY_DELTA       default -1
    SEARCH_BENCH_PIN_MIN_RELIABILITY_DELTA   default -1.5
  WARN:
    SEARCH_BENCH_PIN_WARN_MAX_P95_REGRESSION_MS   default 40
    SEARCH_BENCH_PIN_WARN_MAX_HEAP_REGRESSION_MB  default 4
    SEARCH_BENCH_PIN_WARN_MIN_QUALITY_DELTA       default -0.5
    SEARCH_BENCH_PIN_WARN_MIN_RELIABILITY_DELTA   default -0.75
`);
}

export function num(input: unknown, fallback = 0): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

export function findStrictProfile(snapshot: Snapshot): RankedProfile {
  const profiles = Array.isArray(snapshot.rankedProfiles) ? snapshot.rankedProfiles : [];
  return (
    profiles.find((p) => String(p.profile || '').toLowerCase() === 'strict') ||
    profiles.find((p) => String(p.label || '').toLowerCase() === 'strict') ||
    profiles[0] ||
    {}
  );
}

export function toBaseline(snapshot: Snapshot, source: string): PinnedBaseline {
  const strict = findStrictProfile(snapshot);
  return {
    version: 1,
    pinnedAt: new Date().toISOString(),
    source,
    snapshot: {
      id: String(snapshot.id || ''),
      createdAt: String(snapshot.createdAt || ''),
      queryPack: String(snapshot.queryPack || ''),
    },
    strict: {
      latencyP95Ms: num(strict.latencyP95Ms),
      peakHeapUsedMB: num(strict.peakHeapUsedMB),
      peakRssMB: num(strict.peakRssMB),
      qualityScore: num(strict.qualityScore),
      reliabilityPct: num(strict.avgUniqueFamilyPct),
    },
    coverage: {
      files: num(snapshot.coverage?.files),
      lines: num(snapshot.coverage?.lines),
      uniqueFiles: num(snapshot.coverage?.uniqueFiles),
      uniqueLines: num(snapshot.coverage?.uniqueLines),
    },
  };
}

export async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as T;
}

export function thresholds(): CompareThresholds {
  return {
    fail: {
      maxP95RegressionMs: num(Bun.env.SEARCH_BENCH_PIN_MAX_P95_REGRESSION_MS, 75),
      maxHeapRegressionMB: num(Bun.env.SEARCH_BENCH_PIN_MAX_HEAP_REGRESSION_MB, 8),
      minQualityDelta: num(Bun.env.SEARCH_BENCH_PIN_MIN_QUALITY_DELTA, -1),
      minReliabilityDelta: num(Bun.env.SEARCH_BENCH_PIN_MIN_RELIABILITY_DELTA, -1.5),
    },
    warn: {
      maxP95RegressionMs: num(Bun.env.SEARCH_BENCH_PIN_WARN_MAX_P95_REGRESSION_MS, 40),
      maxHeapRegressionMB: num(Bun.env.SEARCH_BENCH_PIN_WARN_MAX_HEAP_REGRESSION_MB, 4),
      minQualityDelta: num(Bun.env.SEARCH_BENCH_PIN_WARN_MIN_QUALITY_DELTA, -0.5),
      minReliabilityDelta: num(Bun.env.SEARCH_BENCH_PIN_WARN_MIN_RELIABILITY_DELTA, -0.75),
    },
  };
}

function classifyAnomalyType(
  failures: string[],
  warnings: string[],
  compatibility: { queryPackMatch: boolean },
  deltaAbsolute: { latencyP95Ms: number; peakHeapUsedMB: number; qualityScore: number; reliabilityPct: number }
): AnomalyType {
  if (!compatibility.queryPackMatch) return 'pack_mismatch';
  if (failures.length === 0 && warnings.length === 0) return 'stable';

  const latencyFlag = failures.includes('latencyP95Ms') || warnings.includes('latencyP95Ms');
  const memoryFlag = failures.includes('peakHeapUsedMB') || warnings.includes('peakHeapUsedMB');
  const qualityFlag = failures.includes('qualityScore') || failures.includes('reliabilityPct') ||
    warnings.includes('qualityScore') || warnings.includes('reliabilityPct');

  if (latencyFlag && !memoryFlag && !qualityFlag) return 'latency_spike';
  if (!latencyFlag && memoryFlag && !qualityFlag) return 'memory_spike';
  if (!latencyFlag && !memoryFlag && qualityFlag) return 'quality_drop';
  if (latencyFlag || memoryFlag || qualityFlag) return 'mixed_regression';

  // Fallback for edge cases where thresholds are quiet but small absolute drift appears.
  if (
    Math.abs(deltaAbsolute.latencyP95Ms) > 0 ||
    Math.abs(deltaAbsolute.peakHeapUsedMB) > 0 ||
    Math.abs(deltaAbsolute.qualityScore) > 0 ||
    Math.abs(deltaAbsolute.reliabilityPct) > 0
  ) {
    return 'env_noise';
  }
  return 'stable';
}

function safePct(delta: number, baseline: number): number | null {
  if (!Number.isFinite(baseline) || baseline === 0) return null;
  return Number(((delta / baseline) * 100).toFixed(4));
}

function severityForHigherIsWorse(
  delta: number,
  warnThreshold: number,
  failThreshold: number
): Severity {
  if (delta > failThreshold) return 'fail';
  if (delta > warnThreshold) return 'warn';
  return 'ok';
}

function severityForLowerIsWorse(
  delta: number,
  warnFloor: number,
  failFloor: number
): Severity {
  if (delta < failFloor) return 'fail';
  if (delta < warnFloor) return 'warn';
  return 'ok';
}

export function buildPackBaselinePath(defaultPath: string, queryPack: string): string {
  const pack = String(queryPack || '').trim();
  if (!pack) return defaultPath;
  const dir = dirname(defaultPath);
  return resolve(dir, `search-benchmark-pinned-baseline.${pack}.json`);
}

export function resolveBaselinePath(
  explicitBaselinePath: string | undefined,
  defaultPath: string,
  currentQueryPack: string
): string {
  if (explicitBaselinePath) return resolve(explicitBaselinePath);
  const packPath = buildPackBaselinePath(defaultPath, currentQueryPack);
  if (packPath !== defaultPath && existsSync(packPath)) {
    return packPath;
  }
  return defaultPath;
}

export function parseArgs(argv: string[]): {
  mode: 'pin' | 'compare';
  fromPath: string;
  outPath: string;
  baselinePath?: string;
  json: boolean;
  strict: boolean;
} | null {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    return null;
  }

  const first = argv[0];
  const mode: 'pin' | 'compare' = first === 'pin' ? 'pin' : 'compare';
  const rest = first === 'pin' || first === 'compare' ? argv.slice(1) : argv;

  let fromPath = resolve('reports/search-benchmark/latest.json');
  let outPath = resolve('.search/search-benchmark-pinned-baseline.json');
  let baselinePath: string | undefined;
  let json = false;
  let strict = true;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--from') {
      fromPath = resolve(rest[i + 1] || fromPath);
      i += 1;
      continue;
    }
    if (arg === '--out') {
      outPath = resolve(rest[i + 1] || outPath);
      i += 1;
      continue;
    }
    if (arg === '--baseline') {
      baselinePath = resolve(rest[i + 1] || outPath);
      i += 1;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--strict') {
      strict = true;
      continue;
    }
    if (arg === '--no-strict') {
      strict = false;
      continue;
    }
  }

  return { mode, fromPath, outPath, baselinePath, json, strict };
}

export async function pin(fromPath: string, outPath: string): Promise<void> {
  if (!existsSync(fromPath)) {
    throw new Error(`Snapshot not found: ${fromPath}`);
  }
  const snapshot = await readJson<Snapshot>(fromPath);
  const baseline = toBaseline(snapshot, fromPath);
  if (!baseline.snapshot.id) {
    throw new Error('Snapshot missing id; cannot pin baseline');
  }

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');

  console.log(`[search:bench:pin] baseline saved: ${outPath}`);
  console.log(`[search:bench:pin] snapshot=${baseline.snapshot.id} pack=${baseline.snapshot.queryPack}`);
  console.log(
    `[search:bench:pin] strict p95=${baseline.strict.latencyP95Ms.toFixed(2)}ms heap=${baseline.strict.peakHeapUsedMB.toFixed(2)}MB quality=${baseline.strict.qualityScore.toFixed(2)} reliability=${baseline.strict.reliabilityPct.toFixed(2)}`
  );
}

export async function comparePayload(
  fromPath: string,
  baselinePathInput: string | undefined,
  outPath: string,
  strict = false
): Promise<CompareResultPayload> {
  if (!existsSync(fromPath)) {
    throw new Error(`Current snapshot not found: ${fromPath}`);
  }

  const current = toBaseline(await readJson<Snapshot>(fromPath), fromPath);
  return compareResolved(current, baselinePathInput, outPath, strict, fromPath);
}

export async function compareSnapshotPayload(
  snapshot: Snapshot,
  baselinePathInput: string | undefined,
  outPath: string,
  strict = false,
  currentPath = 'snapshot:inline'
): Promise<CompareResultPayload> {
  const current = toBaseline(snapshot, currentPath);
  return compareResolved(current, baselinePathInput, outPath, strict, currentPath);
}

async function compareResolved(
  current: PinnedBaseline,
  baselinePathInput: string | undefined,
  outPath: string,
  strict: boolean,
  currentPath: string
): Promise<CompareResultPayload> {
  const baselinePath = resolveBaselinePath(baselinePathInput, outPath, current.snapshot.queryPack);
  if (!existsSync(baselinePath)) {
    throw new Error(`Pinned baseline not found: ${baselinePath}`);
  }

  const baseline = await readJson<PinnedBaseline>(baselinePath);
  const gate = thresholds();

  const deltaAbsolute = {
    latencyP95Ms: Number((current.strict.latencyP95Ms - baseline.strict.latencyP95Ms).toFixed(4)),
    peakHeapUsedMB: Number((current.strict.peakHeapUsedMB - baseline.strict.peakHeapUsedMB).toFixed(4)),
    peakRssMB: Number((current.strict.peakRssMB - baseline.strict.peakRssMB).toFixed(4)),
    qualityScore: Number((current.strict.qualityScore - baseline.strict.qualityScore).toFixed(4)),
    reliabilityPct: Number((current.strict.reliabilityPct - baseline.strict.reliabilityPct).toFixed(4)),
  };

  const deltaPercent = {
    latencyP95Ms: safePct(deltaAbsolute.latencyP95Ms, baseline.strict.latencyP95Ms),
    peakHeapUsedMB: safePct(deltaAbsolute.peakHeapUsedMB, baseline.strict.peakHeapUsedMB),
    peakRssMB: safePct(deltaAbsolute.peakRssMB, baseline.strict.peakRssMB),
    qualityScore: safePct(deltaAbsolute.qualityScore, baseline.strict.qualityScore),
    reliabilityPct: safePct(deltaAbsolute.reliabilityPct, baseline.strict.reliabilityPct),
  };

  const severity = {
    latencyP95Ms: severityForHigherIsWorse(
      deltaAbsolute.latencyP95Ms,
      gate.warn.maxP95RegressionMs,
      gate.fail.maxP95RegressionMs
    ),
    peakHeapUsedMB: severityForHigherIsWorse(
      deltaAbsolute.peakHeapUsedMB,
      gate.warn.maxHeapRegressionMB,
      gate.fail.maxHeapRegressionMB
    ),
    qualityScore: severityForLowerIsWorse(
      deltaAbsolute.qualityScore,
      gate.warn.minQualityDelta,
      gate.fail.minQualityDelta
    ),
    reliabilityPct: severityForLowerIsWorse(
      deltaAbsolute.reliabilityPct,
      gate.warn.minReliabilityDelta,
      gate.fail.minReliabilityDelta
    ),
  };

  const failures: string[] = [];
  const warnings: string[] = [];
  for (const [metric, level] of Object.entries(severity)) {
    if (level === 'fail') failures.push(metric);
    if (level === 'warn') warnings.push(metric);
  }

  const compatibility = {
    queryPackMatch: baseline.snapshot.queryPack === current.snapshot.queryPack,
    baselineQueryPack: baseline.snapshot.queryPack,
    currentQueryPack: current.snapshot.queryPack,
    note:
      baseline.snapshot.queryPack === current.snapshot.queryPack
        ? 'queryPack aligned'
        : 'queryPack mismatch; comparison may be less representative',
  };

  const payload: CompareResultPayload = {
    ok: failures.length === 0,
    strict,
    baselinePath,
    currentPath,
    baseline: {
      snapshot: baseline.snapshot,
      strict: baseline.strict,
    },
    current: {
      snapshot: current.snapshot,
      strict: current.strict,
    },
    compatibility,
    delta: {
      absolute: deltaAbsolute,
      percent: deltaPercent,
    },
    severity,
    anomalyType: classifyAnomalyType(failures, warnings, compatibility, deltaAbsolute),
    thresholds: gate,
    failures,
    warnings,
    trend: {
      enabled: false,
      window: null,
      note: 'trend hook reserved for N-run rolling analysis',
    },
  };

  return payload;
}

export async function compare(
  fromPath: string,
  baselinePathInput: string | undefined,
  outPath: string,
  asJson: boolean,
  strict: boolean
): Promise<CompareResultPayload> {
  const payload = await comparePayload(fromPath, baselinePathInput, outPath, strict);

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`[search:bench:compare] baseline=${payload.baseline.snapshot.id} current=${payload.current.snapshot.id}`);
    console.log(
      `[search:bench:compare] Δp95=${payload.delta.absolute.latencyP95Ms}ms (${payload.delta.percent.latencyP95Ms ?? 'n/a'}%) Δheap=${payload.delta.absolute.peakHeapUsedMB}MB (${payload.delta.percent.peakHeapUsedMB ?? 'n/a'}%) Δquality=${payload.delta.absolute.qualityScore} Δreliability=${payload.delta.absolute.reliabilityPct}`
    );
    console.log(
      `[search:bench:compare] compatibility=${payload.compatibility.queryPackMatch ? 'aligned' : 'mismatch'} baselinePack=${payload.compatibility.baselineQueryPack || 'none'} currentPack=${payload.compatibility.currentQueryPack || 'none'}`
    );
    console.log(`[search:bench:compare] anomalyType=${payload.anomalyType}`);
    if (payload.failures.length > 0) {
      console.log(`[search:bench:compare] fail metrics: ${payload.failures.join(', ')}`);
    } else {
      console.log('[search:bench:compare] no threshold regressions');
    }
    if (payload.warnings.length > 0) {
      console.log(`[search:bench:compare] warn metrics: ${payload.warnings.join(', ')}`);
    }
  }

  if (strict && payload.failures.length > 0) {
    process.exitCode = 1;
  }
  return payload;
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  if (args.mode === 'pin') {
    await pin(args.fromPath, args.outPath);
    return;
  }

  await compare(args.fromPath, args.baselinePath, args.outPath, args.json, args.strict);
}

if (import.meta.main) {
  await main();
}
