#!/usr/bin/env bun
// Benchmark Runner Script
// Executes all benchmark suites and generates performance reports

import { runComprehensiveBenchmarks } from '../bench/comprehensive.bench';

async function runAllBenchmarks() {
  console.log('🎯 Sovereign Unit [01] Benchmark Runner');
  console.log('📊 Executing comprehensive performance monitoring suite');
  console.log('');

  try {
    await runComprehensiveBenchmarks();

    console.log('');
    console.log('✅ All benchmarks completed successfully');
    console.log('📈 Performance data collected for analysis');
    console.log('🎯 Health Report Generation: Ready');

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