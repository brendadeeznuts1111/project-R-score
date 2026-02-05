/**
 * Performance Benchmark Suite for HistoryCLI Manager
 * 
 * Benchmarks cover:
 * - History load performance (10ms target for 10k commands)
 * - Tab completion performance (50ms target)
 * - Search performance
 * - Cache effectiveness
 * - Memory usage patterns
 * - Zero-collateral overhead
 * 
 * Reference: Surgical Precision Development with 98.5%+ success rates
 */

import { HistoryCLIManager } from '../history-cli-manager';
import { TableUtils, PrecisionUtils } from '../precision-utils';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// ============================================================================
// BENCHMARK UTILITIES
// ============================================================================

interface BenchmarkResult {
  name: string;
  category: string;
  iterations: number;
  totalTimeMs: number;
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  opsPerSec: number;
  successRate: number;
  timestamp: string;
}

const results: BenchmarkResult[] = [];

function recordResult(result: BenchmarkResult): void {
  results.push(result);
  const status = result.averageTimeMs < 50 ? '✅' : '⚠️ ';
  console.log(
    `${status} ${result.category.padEnd(20)} - ${result.name.padEnd(40)} ` +
    `${result.averageTimeMs.toFixed(2)}ms (${result.opsPerSec.toFixed(0)} ops/sec)`
  );
}

async function runBenchmark(
  name: string,
  category: string,
  iterations: number,
  fn: () => Promise<void>
): Promise<BenchmarkResult> {
  const times: number[] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    try {
      await fn();
      times.push(performance.now() - startTime);
      successCount++;
    } catch {
      times.push(performance.now() - startTime);
    }
  }

  const totalTimeMs = times.reduce((a, b) => a + b, 0);
  const averageTimeMs = totalTimeMs / iterations;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);
  const opsPerSec = (iterations * 1000) / totalTimeMs;
  const successRate = (successCount / iterations) * 100;

  const result: BenchmarkResult = {
    name,
    category,
    iterations,
    totalTimeMs,
    averageTimeMs,
    minTimeMs,
    maxTimeMs,
    opsPerSec,
    successRate,
    timestamp: PrecisionUtils.timestamp(),
  };

  recordResult(result);
  return result;
}

// ============================================================================
// SETUP & CLEANUP
// ============================================================================

let testHistoryPath: string;

function setupTest(): string {
  testHistoryPath = join(tmpdir(), `.bench_${Date.now()}_${Math.random()}.history`);
  return testHistoryPath;
}

function cleanupTest(): void {
  if (existsSync(testHistoryPath)) {
    try {
      unlinkSync(testHistoryPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ============================================================================
// BENCHMARK: History Loading
// ============================================================================

console.log('\n🔬 HISTORY LOADING BENCHMARKS');
console.log('━'.repeat(80));

// Create test data with increasing entry counts
const loadSizes = [100, 500, 1000, 5000, 10000];

for (const size of loadSizes) {
  const path = setupTest();

  // Pre-create history file
  const entries = Array.from({ length: size }).map((_, i) => ({
    command: `command_${i}_with_some_data_${Math.random()}`,
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    exitCode: Math.random() > 0.1 ? 0 : 1,
    durationMs: Math.random() * 5000,
    workingDir: '/tmp',
  }));

  const content = entries.map(e => JSON.stringify(e)).join('\n');
  writeFileSync(path, content);

  await runBenchmark(
    `Load ${size} entries`,
    'History Load',
    3,
    async () => {
      const manager = new HistoryCLIManager(path);
      await manager.YAML.parse();
    }
  );

  cleanupTest();
}

// ============================================================================
// BENCHMARK: Tab Completion
// ============================================================================

console.log('\n💡 TAB COMPLETION BENCHMARKS');
console.log('━'.repeat(80));

// Test completion with different data sizes
const completionTests = [
  { size: 100, prefix: 'cmd' },
  { size: 500, prefix: 'npm' },
  { size: 1000, prefix: 'test' },
  { size: 5000, prefix: 'docker' },
];

for (const { size, prefix } of completionTests) {
  const path = setupTest();
  const manager = new HistoryCLIManager(path);
  await manager.YAML.parse();

  // Populate history
  for (let i = 0; i < size; i++) {
    const cmd = `${prefix}_command_${i}`;
    manager.addEntry(cmd, Math.random() > 0.1 ? 0 : 1, Math.random() * 1000);
  }

  await runBenchmark(
    `Completion (${size} entries, prefix='${prefix}')`,
    'Tab Completion',
    10,
    async () => {
      await manager.getCompletions(prefix, prefix.length, prefix);
    }
  );

  cleanupTest();
}

// ============================================================================
// BENCHMARK: History Search
// ============================================================================

console.log('\n🔍 HISTORY SEARCH BENCHMARKS');
console.log('━'.repeat(80));

const searchTests = [
  { size: 100, pattern: 'npm' },
  { size: 500, pattern: 'test' },
  { size: 1000, pattern: 'build' },
  { size: 5000, pattern: 'deploy' },
];

for (const { size, pattern } of searchTests) {
  const path = setupTest();
  const manager = new HistoryCLIManager(path);
  await manager.YAML.parse();

  // Populate history with repeated patterns
  for (let i = 0; i < size; i++) {
    const cmd = Math.random() > 0.7 ? `${pattern}_cmd_${i}` : `other_${i}`;
    manager.addEntry(cmd, 0, Math.random() * 500);
  }

  await runBenchmark(
    `Search (${size} entries, pattern='${pattern}')`,
    'History Search',
    20,
    async () => {
      manager.searchHistory(pattern, 50);
    }
  );

  cleanupTest();
}

// ============================================================================
// BENCHMARK: Cache Effectiveness
// ============================================================================

console.log('\n⚡ CACHE EFFECTIVENESS BENCHMARKS');
console.log('━'.repeat(80));

const path = setupTest();
const manager = new HistoryCLIManager(path);
await manager.YAML.parse();

// Populate with 1000 entries
for (let i = 0; i < 1000; i++) {
  manager.addEntry(`npm_${i}`, 0, Math.random() * 1000);
}

// First completion (cache miss)
let cacheTime = 0;
const uncachedResult = await runBenchmark(
  'First completion (cache miss)',
  'Cache Effectiveness',
  5,
  async () => {
    cacheTime = await (async () => {
      const start = performance.now();
      await manager.getCompletions('npm', 3, 'npm');
      return performance.now() - start;
    })();
  }
);

// Repeated completion (cache hit)
await runBenchmark(
  'Repeated completion (cache hit)',
  'Cache Effectiveness',
  50,
  async () => {
    await manager.getCompletions('npm', 3, 'npm');
  }
);

cleanupTest();

// ============================================================================
// BENCHMARK: Adding Entries
// ============================================================================

console.log('\n📝 ENTRY ADDITION BENCHMARKS');
console.log('━'.repeat(80));

const path2 = setupTest();
const manager2 = new HistoryCLIManager(path2);
await manager2.YAML.parse();

await runBenchmark(
  'Add entry to history',
  'Entry Addition',
  1000,
  async () => {
    manager2.addEntry('test_command', 0, Math.random() * 1000);
  }
);

cleanupTest();

// ============================================================================
// BENCHMARK: Statistics Calculation
// ============================================================================

console.log('\n📊 STATISTICS CALCULATION BENCHMARKS');
console.log('━'.repeat(80));

const statSizes = [100, 500, 1000, 5000];

for (const size of statSizes) {
  const path3 = setupTest();
  const manager3 = new HistoryCLIManager(path3);
  await manager3.YAML.parse();

  for (let i = 0; i < size; i++) {
    manager3.addEntry(`cmd_${i}`, Math.random() > 0.1 ? 0 : 1, Math.random() * 1000);
  }

  await runBenchmark(
    `Calculate stats (${size} entries)`,
    'Statistics',
    100,
    async () => {
      manager3.getStats();
    }
  );

  cleanupTest();
}

// ============================================================================
// BENCHMARK: Memory Usage
// ============================================================================

console.log('\n💾 MEMORY USAGE BENCHMARKS');
console.log('━'.repeat(80));

const memSizes = [100, 500, 1000, 5000, 10000];

for (const size of memSizes) {
  const path4 = setupTest();
  const manager4 = new HistoryCLIManager(path4);
  await manager4.YAML.parse();

  for (let i = 0; i < size; i++) {
    manager4.addEntry(`memory_test_command_${i}`, 0, Math.random() * 1000);
  }

  const stats = manager4.getStats();
  const memoryMB = stats.memorySizeBytes / (1024 * 1024);

  console.log(
    `💾 Memory (${size} entries): ${TableUtils.color.blue(memoryMB.toFixed(2))}MB ` +
    `(${(stats.memorySizeBytes / size).toFixed(0)} bytes/entry)`
  );

  cleanupTest();
}

// ============================================================================
// BENCHMARK: Zero-Collateral Verification
// ============================================================================

console.log('\n✅ ZERO-COLLATERAL VERIFICATION BENCHMARKS');
console.log('━'.repeat(80));

const path5 = setupTest();
const manager5 = new HistoryCLIManager(path5);
await manager5.YAML.parse();

for (let i = 0; i < 500; i++) {
  manager5.addEntry(`verify_${i}`, 0, Math.random() * 1000);
}

await runBenchmark(
  'Zero-collateral verification',
  'Security',
  100,
  async () => {
    manager5.verifyZeroCollateral();
  }
);

cleanupTest();

// ============================================================================
// BENCHMARK SUMMARY
// ============================================================================

console.log('\n📈 BENCHMARK SUMMARY');
console.log('━'.repeat(80));

const categories = [...new Set(results.map(r => r.category))];

for (const category of categories) {
  const categoryResults = results.filter(r => r.category === category);
  const avgTime = categoryResults.reduce((sum, r) => sum + r.averageTimeMs, 0) / categoryResults.length;
  const avgOps = categoryResults.reduce((sum, r) => sum + r.opsPerSec, 0) / categoryResults.length;
  const avgSuccess = categoryResults.reduce((sum, r) => sum + r.successRate, 0) / categoryResults.length;

  console.log(`\n${category}:`);
  console.log(`  • Tests: ${categoryResults.length}`);
  console.log(`  • Avg Time: ${TableUtils.color.yellow(avgTime.toFixed(2))}ms`);
  console.log(`  • Avg Ops/Sec: ${TableUtils.color.green(avgOps.toFixed(0))}`);
  console.log(`  • Success Rate: ${TableUtils.color.bob(avgSuccess.toFixed(1))}%`);
}

// Performance targets check
console.log('\n🎯 PERFORMANCE TARGETS:');
console.log('━'.repeat(80));

const historyLoadResults = results.filter(r => r.category === 'History Load');
const loadTarget = historyLoadResults.filter(r => r.averageTimeMs < 10);
const loadSuccess = (loadTarget.length / historyLoadResults.length) * 100;
console.log(
  `History Load (<10ms): ${loadSuccess === 100 ? '✅' : '⚠️ '} ${loadSuccess.toFixed(1)}% ` +
  `(${loadTarget.length}/${historyLoadResults.length})`
);

const completionResults = results.filter(r => r.category === 'Tab Completion');
const completionTarget = completionResults.filter(r => r.averageTimeMs < 50);
const completionSuccess = (completionTarget.length / completionResults.length) * 100;
console.log(
  `Tab Completion (<50ms): ${completionSuccess >= 80 ? '✅' : '⚠️ '} ${completionSuccess.toFixed(1)}% ` +
  `(${completionTarget.length}/${completionResults.length})`
);

const allSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
const targetMet = allSuccessRate >= 98.5;
console.log(
  `Overall Success Rate (≥98.5%): ${targetMet ? '✅' : '⚠️ '} ${allSuccessRate.toFixed(2)}%`
);

console.log('\n✨ Benchmark Suite Complete');
console.log(`Total tests: ${results.length}`);
console.log(`Timestamp: ${results[0]?.timestamp || 'N/A'}`);

// Export results as JSON
console.log('\n📊 Raw Results (JSON):');
console.log('─'.repeat(80));
console.log(JSON.stringify(results, null, 2));
