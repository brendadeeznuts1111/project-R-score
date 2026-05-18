#!/usr/bin/env bun
// Benchmark Runner Script
// Executes all benchmark suites and generates performance reports

import { runComprehensiveBenchmarks } from '../bench/comprehensive.bench';

async function runAllBenchmarks() {
  console.info('🎯 Sovereign Unit [01] Benchmark Runner');
  console.info('📊 Executing comprehensive performance monitoring suite');
  console.info('');

  try {
    await runComprehensiveBenchmarks();

    console.info('');
    console.info('✅ All benchmarks completed successfully');
    console.info('📈 Performance data collected for analysis');
    console.info('🎯 Health Report Generation: Ready');

  } catch (error) {
    console.error('❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.main) {
  runAllBenchmarks();
}

export { runAllBenchmarks };