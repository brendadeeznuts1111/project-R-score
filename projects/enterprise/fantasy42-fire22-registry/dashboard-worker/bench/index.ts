#!/usr/bin/env bun

/**
 * 🚀 Fire22 Benchmarking Suite
 *
 * Comprehensive performance testing and analysis tools
 */

export { default as BenchmarkSuite } from './benchmark-suite';
export { default as MemoryProfiler } from './memory-profiler';
export { default as MicroBenchmarks } from './micro-benchmarks';
export { default as LoadTester } from './load-testing';
export { default as CIBenchmarks } from './ci-benchmarks';
export { default as BenchmarkReporter } from './benchmark-reporter';
export { default as BenchmarkFormatter } from './benchmark-formatter';

import BenchmarkSuite from './benchmark-suite';
import MemoryProfiler from './memory-profiler';
import MicroBenchmarks from './micro-benchmarks';
import LoadTester from './load-testing';
import BenchmarkFormatter from './benchmark-formatter';
import BenchmarkReporter from './benchmark-reporter';

/**
 * Run complete benchmark suite
 */
export async function runCompleteBenchmark() {
  const formatter = new BenchmarkFormatter();
  const reporter = new BenchmarkReporter();

  console.log(
    formatter.createBox(
      '🚀 Fire22 Complete Benchmark Suite\n' + 'Running all performance tests...',
      'BENCHMARKING',
      'double'
    )
  );

  // 1. Core benchmarks
  console.log('\n' + formatter.formatTitle('Core Performance'));
  const suite = new BenchmarkSuite('Core Suite');
  await suite.runAll();

  // 2. Memory profiling
  console.log('\n' + formatter.formatTitle('Memory Analysis'));
  const profiler = new MemoryProfiler('Memory Suite');
  await profiler.generateHeapSnapshot('bench-heap.json');

  // 3. Microbenchmarks
  console.log('\n' + formatter.formatTitle('Microbenchmarks'));
  const micro = new MicroBenchmarks();
  await micro.runAll();

  // 4. Generate report
  const report = suite.generateReport();
  await Bun.write('bench/results/benchmark-report.md', report);

  const json = suite.exportJson();
  await Bun.write('bench/results/benchmark-results.json', json);

  console.log(
    '\n' +
      formatter.createBox(
        '✅ Benchmarking Complete!\n' + 'Reports saved to bench/results/',
        'SUCCESS',
        'rounded'
      )
  );
}

// Run if executed directly
if (import.meta.main) {
  await runCompleteBenchmark();
}
