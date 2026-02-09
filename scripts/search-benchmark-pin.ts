#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type RankedProfile = {
  profile?: string;
  label?: string;
  latencyP95Ms?: number;
  peakHeapUsedMB?: number;
  peakRssMB?: number;
  qualityScore?: number;
  avgUniqueFamilyPct?: number;
};

type Snapshot = {
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
  maxP95RegressionMs: number;
  maxHeapRegressionMB: number;
  minQualityDelta: number;
  minReliabilityDelta: number;
};

function usage(): void {
  console.log(`
Search Benchmark Pinning

USAGE:
  bun run scripts/search-benchmark-pin.ts pin [options]
  bun run scripts/search-benchmark-pin.ts compare [options]

OPTIONS:
  --from <path>       Source snapshot (default: reports/search-benchmark/latest.json)
  --out <path>        Pinned baseline file (default: .search/search-benchmark-pinned-baseline.json)
  --baseline <path>   Baseline file for compare (default: --out path)
  --json              Print compare payload as JSON
  --strict            Exit non-zero on regression threshold failures (default: true)
  --no-strict         Never fail process in compare mode

THRESHOLDS (env):
  SEARCH_BENCH_PIN_MAX_P95_REGRESSION_MS   default 75
  SEARCH_BENCH_PIN_MAX_HEAP_REGRESSION_MB  default 8
  SEARCH_BENCH_PIN_MIN_QUALITY_DELTA       default -1
  SEARCH_BENCH_PIN_MIN_RELIABILITY_DELTA   default -1.5
`);
}

function num(input: unknown, fallback = 0): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function findStrictProfile(snapshot: Snapshot): RankedProfile {
  const profiles = Array.isArray(snapshot.rankedProfiles) ? snapshot.rankedProfiles : [];
  return (
    profiles.find((p) => String(p.profile || '').toLowerCase() === 'strict') ||
    profiles.find((p) => String(p.label || '').toLowerCase() === 'strict') ||
    profiles[0] ||
    {}
  );
}

function toBaseline(snapshot: Snapshot, source: string): PinnedBaseline {
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

async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as T;
}

function thresholds(): CompareThresholds {
  return {
    maxP95RegressionMs: num(Bun.env.SEARCH_BENCH_PIN_MAX_P95_REGRESSION_MS, 75),
    maxHeapRegressionMB: num(Bun.env.SEARCH_BENCH_PIN_MAX_HEAP_REGRESSION_MB, 8),
    minQualityDelta: num(Bun.env.SEARCH_BENCH_PIN_MIN_QUALITY_DELTA, -1),
    minReliabilityDelta: num(Bun.env.SEARCH_BENCH_PIN_MIN_RELIABILITY_DELTA, -1.5),
  };
}

function parseArgs(argv: string[]): {
  mode: 'pin' | 'compare';
  fromPath: string;
  outPath: string;
  baselinePath: string;
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
  let baselinePath = outPath;
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
      baselinePath = outPath;
      i += 1;
      continue;
    }
    if (arg === '--baseline') {
      baselinePath = resolve(rest[i + 1] || baselinePath);
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

async function pin(fromPath: string, outPath: string): Promise<void> {
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

async function compare(
  fromPath: string,
  baselinePath: string,
  asJson: boolean,
  strict: boolean
): Promise<void> {
  if (!existsSync(fromPath)) {
    throw new Error(`Current snapshot not found: ${fromPath}`);
  }
  if (!existsSync(baselinePath)) {
    throw new Error(`Pinned baseline not found: ${baselinePath}`);
  }

  const current = toBaseline(await readJson<Snapshot>(fromPath), fromPath);
  const baseline = await readJson<PinnedBaseline>(baselinePath);
  const gate = thresholds();

  const diff = {
    latencyP95Ms: Number((current.strict.latencyP95Ms - baseline.strict.latencyP95Ms).toFixed(4)),
    peakHeapUsedMB: Number((current.strict.peakHeapUsedMB - baseline.strict.peakHeapUsedMB).toFixed(4)),
    peakRssMB: Number((current.strict.peakRssMB - baseline.strict.peakRssMB).toFixed(4)),
    qualityScore: Number((current.strict.qualityScore - baseline.strict.qualityScore).toFixed(4)),
    reliabilityPct: Number((current.strict.reliabilityPct - baseline.strict.reliabilityPct).toFixed(4)),
  };

  const failures: string[] = [];
  if (diff.latencyP95Ms > gate.maxP95RegressionMs) {
    failures.push(`latencyP95 regression ${diff.latencyP95Ms}ms > ${gate.maxP95RegressionMs}ms`);
  }
  if (diff.peakHeapUsedMB > gate.maxHeapRegressionMB) {
    failures.push(`heap regression ${diff.peakHeapUsedMB}MB > ${gate.maxHeapRegressionMB}MB`);
  }
  if (diff.qualityScore < gate.minQualityDelta) {
    failures.push(`quality delta ${diff.qualityScore} < ${gate.minQualityDelta}`);
  }
  if (diff.reliabilityPct < gate.minReliabilityDelta) {
    failures.push(`reliability delta ${diff.reliabilityPct} < ${gate.minReliabilityDelta}`);
  }

  const payload = {
    ok: failures.length === 0,
    strict,
    baselinePath,
    currentPath: fromPath,
    baseline: {
      snapshot: baseline.snapshot,
      strict: baseline.strict,
    },
    current: {
      snapshot: current.snapshot,
      strict: current.strict,
    },
    delta: diff,
    thresholds: gate,
    failures,
  };

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`[search:bench:compare] baseline=${baseline.snapshot.id} current=${current.snapshot.id}`);
    console.log(
      `[search:bench:compare] Δp95=${diff.latencyP95Ms}ms Δheap=${diff.peakHeapUsedMB}MB Δquality=${diff.qualityScore} Δreliability=${diff.reliabilityPct}`
    );
    if (failures.length > 0) {
      console.log('[search:bench:compare] regressions:');
      for (const failure of failures) {
        console.log(`  - ${failure}`);
      }
    } else {
      console.log('[search:bench:compare] no threshold regressions');
    }
  }

  if (strict && failures.length > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  if (args.mode === 'pin') {
    await pin(args.fromPath, args.outPath);
    return;
  }

  await compare(args.fromPath, args.baselinePath, args.json, args.strict);
}

await main();
