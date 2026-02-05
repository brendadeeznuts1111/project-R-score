#!/usr/bin/env bun
/**
 * File Search Utility Benchmarks
 * 
 * Performance benchmarks for memory-efficient file search utilities:
 * - Search speed across different file sizes
 * - Memory usage validation
 * - Concurrent operation performance
 * - Regex vs string pattern performance
 * - Large file handling efficiency
 */

import { performance } from 'perf_hooks';
import { 
  searchLargeFile, 
  searchMultipleFiles, 
  countMatchesInFile,
  getFileStats
} from '../utils/file-search';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// BENCHMARK CONFIGURATION
// =============================================================================

const BENCH_CONFIG = {
  iterations: 10,
  warmupRounds: 3,
  fileSizes: {
    small: 1000,      // 1K lines
    medium: 10000,    // 10K lines
    large: 100000,    // 100K lines
    xlarge: 1000000   // 1M lines
  },
  patterns: [
    'ERROR',
    'error|warning',
    '\\[ERROR\\]',
    'test',
    'nonexistent'
  ]
};

interface BenchmarkResult {
  name: string;
  duration: number;
  memoryUsed: number;
  throughput: number; // lines per second
  matchesFound: number;
  success: boolean;
  error?: string;
}

// =============================================================================
// BENCHMARK SETUP
// =============================================================================

const BENCH_DIR = join(process.cwd(), '.bench-files');
const BENCH_FILES: Map<string, string> = new Map();

async function setupBenchmarkFiles() {
  console.log('🔧 Setting up benchmark files...');
  
  try {
    await mkdir(BENCH_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Create files of different sizes
  for (const [sizeName, lineCount] of Object.entries(BENCH_CONFIG.fileSizes)) {
    const filePath = join(BENCH_DIR, `bench-${sizeName}.txt`);
    
    // Create content with some matches
    const lines: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      if (i % 100 === 0) {
        lines.push(`Line ${i + 1}: ERROR occurred here\n`);
      } else if (i % 200 === 0) {
        lines.push(`Line ${i + 1}: WARNING message here\n`);
      } else {
        lines.push(`Line ${i + 1}: Normal content here\n`);
      }
    }
    
    await writeFile(filePath, lines.join(''));
    BENCH_FILES.set(sizeName, filePath);
    
    const stats = await getFileStats(filePath);
    console.log(`  Created ${sizeName} file: ${stats.lineCount} lines, ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }
}

async function cleanupBenchmarkFiles() {
  console.log('🧹 Cleaning up benchmark files...');
  
  for (const filePath of BENCH_FILES.values()) {
    try {
      await unlink(filePath);
    } catch (error) {
      // File might not exist
    }
  }
  
  try {
    await Bun.spawn(['rmdir', BENCH_DIR]).exited;
  } catch (error) {
    // Directory might not be empty
  }
}

// =============================================================================
// BENCHMARK UTILITIES
// =============================================================================

function measureMemory(): number {
  return process.memoryUsage().heapUsed;
}

async function warmup(operation: () => Promise<any>, rounds: number) {
  for (let i = 0; i < rounds; i++) {
    await operation();
  }
}

async function benchmarkOperation(
  name: string,
  operation: () => Promise<any>,
  iterations: number = BENCH_CONFIG.iterations
): Promise<BenchmarkResult> {
  // Warmup
  await warmup(operation, BENCH_CONFIG.warmupRounds);
  
  const durations: number[] = [];
  const memoryUsages: number[] = [];
  let matchesFound = 0;
  let success = true;
  let error: string | undefined;

  for (let i = 0; i < iterations; i++) {
    const memBefore = measureMemory();
    const start = performance.now();
    
    try {
      const result = await operation();
      matchesFound = Array.isArray(result) ? result.length : result;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      break;
    }
    
    const end = performance.now();
    const memAfter = measureMemory();
    
    durations.push(end - start);
    memoryUsages.push(memAfter - memBefore);
  }

  if (!success) {
    return { name, duration: 0, memoryUsed: 0, throughput: 0, matchesFound: 0, success: false, error };
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  return {
    name,
    duration: avgDuration,
    memoryUsed: avgMemory,
    throughput: 0, // Will be calculated based on file size
    matchesFound,
    success: true
  };
}

// =============================================================================
// BENCHMARK SUITE
// =============================================================================

class FileSearchBenchmark {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks() {
    console.log('\n🚀 Starting File Search Benchmarks\n');
    console.log('=' .repeat(80));

    await setupBenchmarkFiles();

    try {
      await this.benchmarkSearchSpeed();
      await this.benchmarkMemoryUsage();
      await this.benchmarkRegexVsString();
      await this.benchmarkConcurrentSearches();
      await this.benchmarkCountVsSearch();
      await this.benchmarkLargeFileHandling();

      this.printResults();
    } finally {
      await cleanupBenchmarkFiles();
    }
  }

  async benchmarkSearchSpeed() {
    console.log('\n📊 Benchmark: Search Speed Across File Sizes\n');

    for (const [sizeName, filePath] of BENCH_FILES.entries()) {
      const stats = await getFileStats(filePath);
      
      const result = await benchmarkOperation(
        `Search-${sizeName}`,
        () => searchLargeFile(filePath, 'ERROR', { maxMatches: 100 })
      );

      result.throughput = stats.lineCount / (result.duration / 1000);
      this.results.push(result);

      console.log(`  ${result.name}:`);
      console.log(`    Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`    Throughput: ${result.throughput.toLocaleString()} lines/sec`);
      console.log(`    Matches: ${result.matchesFound}`);
    }
  }

  async benchmarkMemoryUsage() {
    console.log('\n💾 Benchmark: Memory Usage\n');

    for (const [sizeName, filePath] of BENCH_FILES.entries()) {
      const initialMemory = measureMemory();
      
      await searchLargeFile(filePath, 'ERROR', { maxMatches: 100 });
      
      const finalMemory = measureMemory();
      const memoryUsed = finalMemory - initialMemory;
      const stats = await getFileStats(filePath);
      const memoryPerLine = memoryUsed / stats.lineCount;

      console.log(`  ${sizeName} file:`);
      console.log(`    Memory used: ${(memoryUsed / 1024).toFixed(2)} KB`);
      console.log(`    Memory per line: ${memoryPerLine.toFixed(4)} bytes`);
      console.log(`    File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  async benchmarkRegexVsString() {
    console.log('\n🔍 Benchmark: Regex vs String Pattern Performance\n');

    const filePath = BENCH_FILES.get('medium')!;
    const pattern = 'ERROR';

    const stringResult = await benchmarkOperation(
      'Pattern-String',
      () => searchLargeFile(filePath, pattern, { useRegex: false })
    );

    const regexResult = await benchmarkOperation(
      'Pattern-Regex',
      () => searchLargeFile(filePath, pattern, { useRegex: true })
    );

    this.results.push(stringResult, regexResult);

    console.log(`  String search: ${stringResult.duration.toFixed(2)}ms`);
    console.log(`  Regex search: ${regexResult.duration.toFixed(2)}ms`);
    console.log(`  Speed difference: ${((regexResult.duration / stringResult.duration - 1) * 100).toFixed(1)}%`);
  }

  async benchmarkConcurrentSearches() {
    console.log('\n⚡ Benchmark: Concurrent Search Performance\n');

    const filePath = BENCH_FILES.get('medium')!;
    const concurrentCounts = [1, 5, 10, 20];

    for (const count of concurrentCounts) {
      const start = performance.now();
      
      const promises = Array.from({ length: count }, () =>
        searchLargeFile(filePath, 'ERROR', { maxMatches: 10 })
      );
      
      await Promise.all(promises);
      
      const duration = performance.now() - start;
      const throughput = count / (duration / 1000);

      console.log(`  ${count} concurrent searches:`);
      console.log(`    Total time: ${duration.toFixed(2)}ms`);
      console.log(`    Throughput: ${throughput.toFixed(2)} searches/sec`);
      console.log(`    Avg per search: ${(duration / count).toFixed(2)}ms`);
    }
  }

  async benchmarkCountVsSearch() {
    console.log('\n🔢 Benchmark: Count vs Search Performance\n');

    const filePath = BENCH_FILES.get('large')!;

    const searchResult = await benchmarkOperation(
      'Count-Search',
      () => searchLargeFile(filePath, 'ERROR', { maxMatches: Infinity })
    );

    const countResult = await benchmarkOperation(
      'Count-Only',
      () => countMatchesInFile(filePath, 'ERROR')
    );

    this.results.push(searchResult, countResult);

    console.log(`  Search (with results): ${searchResult.duration.toFixed(2)}ms`);
    console.log(`  Count (no results): ${countResult.duration.toFixed(2)}ms`);
    console.log(`  Speedup: ${(searchResult.duration / countResult.duration).toFixed(2)}x faster`);
    console.log(`  Memory saved: ${((searchResult.memoryUsed - countResult.memoryUsed) / 1024).toFixed(2)} KB`);
  }

  async benchmarkLargeFileHandling() {
    console.log('\n📈 Benchmark: Large File Handling\n');

    const xlargeFile = BENCH_FILES.get('xlarge');
    if (!xlargeFile) return;

    const stats = await getFileStats(xlargeFile);
    console.log(`  File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Lines: ${stats.lineCount.toLocaleString()}`);

    const start = performance.now();
    const initialMemory = measureMemory();

    const results = await searchLargeFile(xlargeFile, 'ERROR', {
      maxMatches: 1000,
      onProgress: (lines, matches) => {
        if (lines % 100000 === 0) {
          console.log(`    Progress: ${lines.toLocaleString()} lines, ${matches} matches`);
        }
      }
    });

    const duration = performance.now() - start;
    const finalMemory = measureMemory();
    const memoryUsed = finalMemory - initialMemory;
    const throughput = stats.lineCount / (duration / 1000);

    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  Throughput: ${throughput.toLocaleString()} lines/sec`);
    console.log(`  Memory used: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Memory per line: ${(memoryUsed / stats.lineCount).toFixed(4)} bytes`);
    console.log(`  Matches found: ${results.length}`);
  }

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 Benchmark Summary\n');

    const successfulResults = this.results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      console.log('No successful benchmarks to report.');
      return;
    }

    console.log('Average Performance:');
    successfulResults.forEach(result => {
      console.log(`  ${result.name}:`);
      console.log(`    Duration: ${result.duration.toFixed(2)}ms`);
      if (result.throughput > 0) {
        console.log(`    Throughput: ${result.throughput.toLocaleString()} lines/sec`);
      }
      console.log(`    Memory: ${(result.memoryUsed / 1024).toFixed(2)} KB`);
    });

    // Performance comparison
    const searchResults = successfulResults.filter(r => r.name.startsWith('Search-'));
    if (searchResults.length > 1) {
      console.log('\nPerformance Scaling:');
      searchResults.forEach((result, i) => {
        if (i > 0) {
          const prev = searchResults[i - 1];
          const speedup = prev.throughput / result.throughput;
          console.log(`  ${result.name} vs ${prev.name}: ${speedup.toFixed(2)}x slower`);
        }
      });
    }
  }
}

// =============================================================================
// RUN BENCHMARKS
// =============================================================================

if (import.meta.main) {
  const benchmark = new FileSearchBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

export { FileSearchBenchmark };
