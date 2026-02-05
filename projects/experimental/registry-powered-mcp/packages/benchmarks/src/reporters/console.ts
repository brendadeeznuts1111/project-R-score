/**
 * Console Reporter - Pretty terminal output for benchmarks
 */

import type { BenchResult } from '../harness';
import { BenchmarkStats } from '../stats';

/**
 * Report benchmark results to console
 */
export function reportToConsole(results: BenchResult[]) {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 BENCHMARK RESULTS');
  console.log('═'.repeat(80));

  // Group by category
  const byCategory = new Map<string, BenchResult[]>();

  for (const result of results) {
    const category = result.category || 'Uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(result);
  }

  // Print each category
  for (const [category, categoryResults] of byCategory) {
    console.log(`\n🏷️  ${category.toUpperCase()}`);
    console.log('─'.repeat(80));

    for (const result of categoryResults) {
      const { name, stats, target, passed, tier } = result;

      // Status icon
      const icon = passed ? '✓' : '✗';
      const color = getColor(tier.color);

      // Format mean time
      const meanStr = BenchmarkStats.formatTime(stats.mean);

      // Target comparison
      const targetStr = target
        ? ` (target: ${BenchmarkStats.formatTime(target)})`
        : '';

      // Tier label
      const tierLabel = tier.label !== 'N/A' ? ` [${tier.label}]` : '';

      console.log(
        `  ${icon} ${name.padEnd(40)} ${color}${meanStr}${resetColor}${targetStr}${tierLabel}`
      );

      // Additional stats for failed benchmarks
      if (!passed) {
        console.log(`     ├─ p50: ${BenchmarkStats.formatTime(stats.p50)}`);
        console.log(`     ├─ p95: ${BenchmarkStats.formatTime(stats.p95)}`);
        console.log(`     ├─ p99: ${BenchmarkStats.formatTime(stats.p99)}`);
        console.log(`     └─ σ:   ${BenchmarkStats.formatTime(stats.stdDev)}`);
      }
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total:  ${total} benchmarks`);
  console.log(`   Passed: ${passed} ✓`);
  console.log(`   Failed: ${failed} ✗`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} benchmark(s) exceeded target performance`);
  } else {
    console.log(`\n🎉 All benchmarks passed!`);
  }

  console.log('═'.repeat(80) + '\n');

  return {
    total,
    passed,
    failed,
  };
}

/**
 * ANSI color codes
 */
const colors: Record<string, string> = {
  '#10b981': '\x1b[32m', // Green
  '#3b82f6': '\x1b[34m', // Blue
  '#f59e0b': '\x1b[33m', // Yellow
  '#ef4444': '\x1b[31m', // Red
  '#666': '\x1b[90m',    // Gray
};

const resetColor = '\x1b[0m';

function getColor(hex: string): string {
  return colors[hex] || '';
}

/**
 * Print a detailed breakdown of a single benchmark
 */
export function printBenchmarkDetail(result: BenchResult) {
  console.log(`\n📊 ${result.name}`);
  console.log('─'.repeat(60));
  console.log(`   Mean:   ${BenchmarkStats.formatTime(result.stats.mean)}`);
  console.log(`   Median: ${BenchmarkStats.formatTime(result.stats.p50)}`);
  console.log(`   p95:    ${BenchmarkStats.formatTime(result.stats.p95)}`);
  console.log(`   p99:    ${BenchmarkStats.formatTime(result.stats.p99)}`);
  console.log(`   Min:    ${BenchmarkStats.formatTime(result.stats.min)}`);
  console.log(`   Max:    ${BenchmarkStats.formatTime(result.stats.max)}`);
  console.log(`   StdDev: ${BenchmarkStats.formatTime(result.stats.stdDev)}`);
  console.log(`   CV:     ${result.stats.cv.toFixed(2)}%`);
  console.log(`   Samples: ${result.stats.count}`);

  if (result.target) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`   Target: ${BenchmarkStats.formatTime(result.target)} ${icon}`);
  }
}
