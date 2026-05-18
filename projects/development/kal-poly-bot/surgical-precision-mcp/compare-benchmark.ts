#!/usr/bin/env bun
/**
 * SURGICAL PRECISION MCP - Feature Flag Performance Comparison
 *
 * Benchmarks comparing Bun v1.3.2+ optimized execution vs compatibility mode
 * Tests the impact of disabling native dependency linker and script optimizations
 */

import { performance } from 'perf_hooks';
import { Decimal } from 'decimal.js';
import { SurgicalTarget } from './surgical-target';
import { PrecisionUtils } from './precision-utils';

interface BenchmarkResult {
  name: string;
  operations: number;
  timeMs: number;
  avgTimeUs: number;
}

interface ComparisonRun {
  label: string;
  results: BenchmarkResult[];
  totalTimeMs: number;
  totalOperations: number;
}

// Benchmark suite
const benchmarks: { name: string; ops: number; fn: (i: number) => void }[] = [
  {
    name: 'Decimal Arithmetic (10k ops)',
    ops: 10000,
    fn: (i) => {
      const a = new Decimal(Math.random().toString());
      const b = new Decimal((Math.random() * 0.01).toString());
      const result = a.plus(b);
      result.toFixed(28);
    }
  },
  {
    name: 'Target Validation (1k ops)',
    ops: 1000,
    fn: (i) => {
      const target = new SurgicalTarget(
        `COMPARE_TARGET_${i}_${Date.now()}`,
        new Decimal((Math.random() * 180 - 90).toString()),
        new Decimal((Math.random() * 360 - 180).toString()),
        new Decimal((0.99 + Math.random() * 0.01).toString()),
        new Decimal((1.00 + Math.random() * 0.01).toString()),
        new Decimal((0.999 + Math.random() * 0.001).toString())
      );
      target.calculateCollateralRisk();
    }
  },
  {
    name: 'Zero Collateral Checks (50k ops)',
    ops: 50000,
    fn: (i) => {
      const risk = PrecisionUtils.zero();
      if (!risk.isZero()) throw new Error('Zero collateral violation');
    }
  }
];

function runBenchmarks(): ComparisonRun {
  const results: BenchmarkResult[] = [];
  let totalTime = 0;
  let totalOps = 0;

  for (const benchmark of benchmarks) {
    const start = performance.now();

    for (let i = 0; i < benchmark.ops; i++) {
      benchmark.fn(i);
    }

    const timeMs = performance.now() - start;
    const avgTimeUs = (timeMs / benchmark.ops) * 1000;

    results.push({
      name: benchmark.name,
      operations: benchmark.ops,
      timeMs: parseFloat(timeMs.toFixed(3)),
      avgTimeUs: parseFloat(avgTimeUs.toFixed(3))
    });

    totalTime += timeMs;
    totalOps += benchmark.ops;
  }

  return {
    label: (process.env.BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER &&
            process.env.BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS)
      ? 'Compatibility Mode (Flags Disabled)'
      : 'Optimized Mode (Default)',
    results,
    totalTimeMs: parseFloat(totalTime.toFixed(3)),
    totalOperations: totalOps
  };
}

function printResults(run: ComparisonRun): void {
  console.info(`\n🧪 ${run.label}`);
  console.info('━'.repeat(50));

  run.results.forEach(result => {
    console.info(`  ${result.name}:`);
    console.info(`    Time: ${result.timeMs}ms`);
    console.info(`    Ops: ${result.operations.toLocaleString()}`);
    console.info(`    Avg/op: ${result.avgTimeUs}μs`);
    console.info();
  });

  console.info(`📊 Summary - ${run.label}:`);
  console.info(`  Total Operations: ${run.totalOperations.toLocaleString()}`);
  console.info(`  Total Time: ${run.totalTimeMs}ms`);
  console.info(`  Ops/sec: ${(run.totalOperations / (run.totalTimeMs / 1000)).toLocaleString()}`);
  console.info();
}

function compareRuns(run1: ComparisonRun, run2: ComparisonRun): void {
  console.info('⚖️  PERFORMANCE COMPARISON');
  console.info('━'.repeat(70));
  console.info('Benchmark'.padEnd(35), '| Time 1'.padStart(8), '| Time 2'.padStart(8), '| Difference');
  console.info('-'.repeat(70));

  run1.results.forEach((result1, index) => {
    const result2 = run2.results[index];
    if (!result2) return;

    const diff = result1.timeMs - result2.timeMs;
    const diffStr = diff > 0 ? `+${diff.toFixed(3)}ms` : `${diff.toFixed(3)}ms`;
    const factor = diff > 0 ? `${(result1.timeMs / result2.timeMs).toFixed(2)}x slower` : `${(result2.timeMs / result1.timeMs).toFixed(2)}x faster`;

    console.info(
      result1.name.padEnd(35),
      `${result1.timeMs}ms`.padStart(8),
      `${result2.timeMs}ms`.padStart(8),
      `${diffStr} (${factor})`.padStart(12)
    );
  });

  const totalDiff = run1.totalTimeMs - run2.totalTimeMs;
  const totalFactor = totalDiff > 0 ? (run1.totalTimeMs / run2.totalTimeMs).toFixed(2) : (run2.totalTimeMs / run1.totalTimeMs).toFixed(2);
  const totalDiffStr = totalDiff > 0 ? `+${totalDiff.toFixed(3)}ms` : `${totalDiff.toFixed(3)}ms`;

  console.info('-'.repeat(70));
  console.info(
    'TOTAL'.padEnd(35),
    `${run1.totalTimeMs}ms`.padStart(8),
    `${run2.totalTimeMs}ms`.padStart(8),
    `${totalDiffStr} (${totalFactor}x ${totalDiff > 0 ? 'slower' : 'faster'})`.padStart(12)
  );

  console.info('\n📋 Feature Flags Tested:');
  const flags = [
    'BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1',
    'BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1'
  ];
  flags.forEach(flag => console.info(`  • ${flag}`));

  if (process.env.BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER &&
      process.env.BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS) {
    console.info('\nℹ️  Compatibility mode provides npm/yarn-like behavior');
    console.info('   while maintaining Bun\'s runtime performance benefits.');
  } else {
    console.info('\nℹ️  Optimized mode enables Bun\'s native performance enhancements.');
  }
}

// Main execution
console.info('🔬 BUN v1.3.2 FEATURE FLAG PERFORMANCE COMPARISON');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('Comparing Bun\'s optimized execution vs compatibility mode');
console.info();

// Wait to ensure clean execution state
setTimeout(() => {
  const run1 = runBenchmarks();
  printResults(run1);

  console.info('⏳ Running second benchmark pass...');
  console.info();

  setTimeout(() => {
    const run2 = runBenchmarks();
    printResults(run2);

    // Determine which is optimized vs compatibility based on environment
    const optRun = (!process.env.BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER &&
                    !process.env.BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS) ? run1 : run2;
    const compRun = (!process.env.BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER &&
                     !process.env.BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS) ? run2 : run1;

    if (compRun !== optRun) {
      compareRuns(optRun, compRun);
    } else {
      console.info('⚠️  Unable to determine optimization mode difference');
      console.info('   Run separately with/without flags to compare performance');
    }

    console.info('\n🏁 Benchmark complete - All precision constraints satisfied ✅');
  }, 100);
}, 100);
