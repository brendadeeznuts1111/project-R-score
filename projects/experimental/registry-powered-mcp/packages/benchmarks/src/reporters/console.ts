/**
 * Console Reporter - Pretty terminal output for benchmarks
 */

import type { BenchResult } from '../harness';
import { BenchmarkStats } from '../stats';

/**
 * Report benchmark results to console
 */
export function reportToConsole(results: BenchResult[]) {
  console.info('\n' + '═'.repeat(80));
  console.info('📊 BENCHMARK RESULTS');
  console.info('═'.repeat(80));

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
    console.info(`\n🏷️  ${category.toUpperCase()}`);
    console.info('─'.repeat(80));

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

      console.info(
        `  ${icon} ${name.padEnd(40)} ${color}${meanStr}${resetColor}${targetStr}${tierLabel}`
      );

      // Additional stats for failed benchmarks
      if (!passed) {
        console.info(`     ├─ p50: ${BenchmarkStats.formatTime(stats.p50)}`);
        console.info(`     ├─ p95: ${BenchmarkStats.formatTime(stats.p95)}`);
        console.info(`     ├─ p99: ${BenchmarkStats.formatTime(stats.p99)}`);
        console.info(`     └─ σ:   ${BenchmarkStats.formatTime(stats.stdDev)}`);
      }
    }
  }

  // Summary
  console.info('\n' + '─'.repeat(80));
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.info(`\n📈 SUMMARY:`);
  console.info(`   Total:  ${total} benchmarks`);
  console.info(`   Passed: ${passed} ✓`);
  console.info(`   Failed: ${failed} ✗`);

  if (failed > 0) {
    console.info(`\n⚠️  ${failed} benchmark(s) exceeded target performance`);
  } else {
    console.info(`\n🎉 All benchmarks passed!`);
  }

  console.info('═'.repeat(80) + '\n');

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
  console.info(`\n📊 ${result.name}`);
  console.info('─'.repeat(60));
  console.info(`   Mean:   ${BenchmarkStats.formatTime(result.stats.mean)}`);
  console.info(`   Median: ${BenchmarkStats.formatTime(result.stats.p50)}`);
  console.info(`   p95:    ${BenchmarkStats.formatTime(result.stats.p95)}`);
  console.info(`   p99:    ${BenchmarkStats.formatTime(result.stats.p99)}`);
  console.info(`   Min:    ${BenchmarkStats.formatTime(result.stats.min)}`);
  console.info(`   Max:    ${BenchmarkStats.formatTime(result.stats.max)}`);
  console.info(`   StdDev: ${BenchmarkStats.formatTime(result.stats.stdDev)}`);
  console.info(`   CV:     ${result.stats.cv.toFixed(2)}%`);
  console.info(`   Samples: ${result.stats.count}`);

  if (result.target) {
    const icon = result.passed ? '✓' : '✗';
    console.info(`   Target: ${BenchmarkStats.formatTime(result.target)} ${icon}`);
  }
}
