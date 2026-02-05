#!/usr/bin/env bun

/**
 * 🤖 Fire22 CI/CD Benchmarking
 *
 * Automated benchmarking for continuous integration
 * Detects performance regressions and generates reports
 */

import { $ } from 'bun';
import BenchmarkSuite from './benchmark-suite';
import MemoryProfiler from './memory-profiler';
import MicroBenchmarks from './micro-benchmarks';
import LoadTester from './load-testing';

interface BenchmarkBaseline {
  commit: string;
  branch: string;
  timestamp: string;
  results: Record<string, number>;
}

interface RegressionReport {
  passed: boolean;
  regressions: Array<{
    name: string;
    baseline: number;
    current: number;
    change: number;
    percentChange: number;
  }>;
  improvements: Array<{
    name: string;
    baseline: number;
    current: number;
    change: number;
    percentChange: number;
  }>;
}

export class CIBenchmarks {
  private baselineFile = '.benchmark-baseline.json';
  private thresholds = {
    regression: 10, // 10% slower is considered a regression
    improvement: 10, // 10% faster is considered an improvement
    memory: 20, // 20% more memory is concerning
  };

  constructor() {}

  /**
   * Run all CI benchmarks
   */
  async runCIBenchmarks(): Promise<boolean> {
    console.log('🤖 Fire22 CI Benchmarking');
    console.log('='.repeat(50));

    const startTime = Date.now();
    let allPassed = true;

    try {
      // Get git info
      const gitInfo = await this.getGitInfo();
      console.log(`📍 Branch: ${gitInfo.branch}`);
      console.log(`📍 Commit: ${gitInfo.commit}`);
      console.log(`📍 Author: ${gitInfo.author}`);
      console.log('');

      // Load baseline
      const baseline = await this.loadBaseline();

      // Run benchmarks
      console.log('🚀 Running benchmarks...\n');

      // 1. Core benchmarks
      const coreResults = await this.runCoreBenchmarks();

      // 2. Memory benchmarks
      const memoryResults = await this.runMemoryBenchmarks();

      // 3. API benchmarks
      const apiResults = await this.runAPIBenchmarks();

      // 4. Build performance
      const buildResults = await this.runBuildBenchmarks();

      // Combine results
      const allResults = {
        ...coreResults,
        ...memoryResults,
        ...apiResults,
        ...buildResults,
      };

      // Compare with baseline
      if (baseline) {
        console.log('\n📊 Comparing with baseline...');
        const regression = this.compareWithBaseline(allResults, baseline);

        if (!regression.passed) {
          console.error('\n❌ Performance regressions detected!');
          this.printRegressionReport(regression);
          allPassed = false;
        } else {
          console.log('\n✅ No regressions detected!');
          if (regression.improvements.length > 0) {
            console.log('\n🎉 Performance improvements:');
            regression.improvements.forEach(imp => {
              console.log(`   ${imp.name}: ${imp.percentChange.toFixed(1)}% faster`);
            });
          }
        }
      } else {
        console.log('\n📝 No baseline found, creating new baseline...');
        await this.saveBaseline(allResults, gitInfo);
      }

      // Generate reports
      await this.generateReports(allResults, gitInfo);

      // Update baseline if on main branch
      if (gitInfo.branch === 'main' && allPassed) {
        await this.saveBaseline(allResults, gitInfo);
        console.log('\n✅ Baseline updated');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n⏱️  Total time: ${duration}s`);

      return allPassed;
    } catch (error) {
      console.error('❌ CI Benchmarking failed:', error);
      return false;
    }
  }

  /**
   * Get git information
   */
  private async getGitInfo(): Promise<{ branch: string; commit: string; author: string }> {
    const branch = await $`git rev-parse --abbrev-ref HEAD`.text();
    const commit = await $`git rev-parse --short HEAD`.text();
    const author = await $`git log -1 --pretty=format:'%an'`.text();

    return {
      branch: branch.trim(),
      commit: commit.trim(),
      author: author.trim(),
    };
  }

  /**
   * Run core performance benchmarks
   */
  private async runCoreBenchmarks(): Promise<Record<string, number>> {
    console.log('📈 Core Benchmarks');
    console.log('-'.repeat(30));

    const results: Record<string, number> = {};

    // JSON operations
    const largeObject = {
      users: Array(1000)
        .fill(null)
        .map((_, i) => ({ id: i, data: `user${i}` })),
    };
    results['json.stringify'] = await this.measureOperation('JSON.stringify (large)', () =>
      JSON.stringify(largeObject)
    );

    const jsonString = JSON.stringify(largeObject);
    results['json.parse'] = await this.measureOperation('JSON.parse (large)', () =>
      JSON.parse(jsonString)
    );

    // Crypto operations
    results['crypto.sha256'] = await this.measureOperation('SHA-256 Hash', () => {
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update('test data');
      hasher.digest();
    });

    results['crypto.uuid'] = await this.measureOperation('UUID Generation', () =>
      crypto.randomUUID()
    );

    // Array operations
    const array = Array(10000)
      .fill(null)
      .map((_, i) => i);
    results['array.map'] = await this.measureOperation('Array.map (10k)', () =>
      array.map(x => x * 2)
    );

    results['array.filter'] = await this.measureOperation('Array.filter (10k)', () =>
      array.filter(x => x % 2 === 0)
    );

    results['array.reduce'] = await this.measureOperation('Array.reduce (10k)', () =>
      array.reduce((sum, x) => sum + x, 0)
    );

    return results;
  }

  /**
   * Run memory benchmarks
   */
  private async runMemoryBenchmarks(): Promise<Record<string, number>> {
    console.log('\n🧠 Memory Benchmarks');
    console.log('-'.repeat(30));

    const results: Record<string, number> = {};
    const profiler = new MemoryProfiler('CI Memory Test');

    // Memory allocation test
    const { memory } = await profiler.profileFunction('Large Array Allocation', () => {
      const arrays = [];
      for (let i = 0; i < 100; i++) {
        arrays.push(new Array(10000).fill(i));
      }
      return arrays;
    });

    results['memory.heap_growth'] = memory.finalMemory.heapSize - memory.initialMemory.heapSize;
    results['memory.object_growth'] =
      memory.finalMemory.objectCount - memory.initialMemory.objectCount;
    results['memory.gc_runs'] = memory.gcRuns;

    console.log(`   Heap Growth: ${(results['memory.heap_growth'] / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Object Growth: ${results['memory.object_growth']} objects`);
    console.log(`   GC Runs: ${results['memory.gc_runs']}`);

    return results;
  }

  /**
   * Run API benchmarks
   */
  private async runAPIBenchmarks(): Promise<Record<string, number>> {
    console.log('\n🌐 API Benchmarks');
    console.log('-'.repeat(30));

    const results: Record<string, number> = {};

    // Start test server
    const server = Bun.serve({
      port: 0,
      fetch: req => {
        const url = new URL(req.url);
        if (url.pathname === '/api/test') {
          return new Response(JSON.stringify({ status: 'ok' }));
        }
        return new Response('Not Found', { status: 404 });
      },
    });

    const serverUrl = `http://localhost:${server.port}`;

    // Response time test
    results['api.response_time'] = await this.measureOperation(
      'API Response Time',
      async () => {
        await fetch(`${serverUrl}/api/test`);
      },
      1000
    );

    // Throughput test
    const throughputStart = Date.now();
    let requestCount = 0;
    const duration = 5000; // 5 seconds

    while (Date.now() - throughputStart < duration) {
      await fetch(`${serverUrl}/api/test`);
      requestCount++;
    }

    results['api.throughput'] = requestCount / (duration / 1000);
    console.log(`   Throughput: ${results['api.throughput'].toFixed(0)} req/s`);

    server.stop();

    return results;
  }

  /**
   * Run build benchmarks
   */
  private async runBuildBenchmarks(): Promise<Record<string, number>> {
    console.log('\n🏗️  Build Benchmarks');
    console.log('-'.repeat(30));

    const results: Record<string, number> = {};

    // TypeScript compilation
    const tsStart = Date.now();
    await $`bun build ./src/index.ts --target=bun --outdir=./dist-test`.quiet();
    results['build.typescript'] = Date.now() - tsStart;
    console.log(`   TypeScript Build: ${results['build.typescript']}ms`);

    // Bundle size
    const bundleInfo = await $`du -sk ./dist-test`.text();
    results['build.bundle_size'] = parseInt(bundleInfo.split('\t')[0]) * 1024; // Convert to bytes
    console.log(`   Bundle Size: ${(results['build.bundle_size'] / 1024).toFixed(2)} KB`);

    // Cleanup
    await $`rm -rf ./dist-test`.quiet();

    // Dependency installation
    const installStart = Date.now();
    await $`bun install --frozen-lockfile`.quiet();
    results['build.install'] = Date.now() - installStart;
    console.log(`   Dependency Install: ${results['build.install']}ms`);

    return results;
  }

  /**
   * Measure a single operation
   */
  private async measureOperation(
    name: string,
    fn: () => void | Promise<void>,
    iterations: number = 10000
  ): Promise<number> {
    process.stdout.write(`   ${name}...`);

    // Warmup
    for (let i = 0; i < 100; i++) {
      await fn();
    }

    // Measure
    const start = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    const end = Bun.nanoseconds();

    const avgTime = Number(end - start) / iterations;
    console.log(` ${(avgTime / 1_000_000).toFixed(3)}ms`);

    return avgTime;
  }

  /**
   * Load baseline from file
   */
  private async loadBaseline(): Promise<BenchmarkBaseline | null> {
    try {
      const file = Bun.file(this.baselineFile);
      if (await file.exists()) {
        return await file.json();
      }
    } catch (error) {
      console.warn('⚠️  Could not load baseline:', error);
    }
    return null;
  }

  /**
   * Save baseline to file
   */
  private async saveBaseline(
    results: Record<string, number>,
    gitInfo: { branch: string; commit: string }
  ): Promise<void> {
    const baseline: BenchmarkBaseline = {
      commit: gitInfo.commit,
      branch: gitInfo.branch,
      timestamp: new Date().toISOString(),
      results,
    };

    await Bun.write(this.baselineFile, JSON.stringify(baseline, null, 2));
  }

  /**
   * Compare current results with baseline
   */
  private compareWithBaseline(
    current: Record<string, number>,
    baseline: BenchmarkBaseline
  ): RegressionReport {
    const report: RegressionReport = {
      passed: true,
      regressions: [],
      improvements: [],
    };

    for (const [key, currentValue] of Object.entries(current)) {
      const baselineValue = baseline.results[key];

      if (!baselineValue) continue; // Skip new benchmarks

      const change = currentValue - baselineValue;
      const percentChange = (change / baselineValue) * 100;

      if (percentChange > this.thresholds.regression) {
        // Performance regression
        report.regressions.push({
          name: key,
          baseline: baselineValue,
          current: currentValue,
          change,
          percentChange,
        });
        report.passed = false;
      } else if (percentChange < -this.thresholds.improvement) {
        // Performance improvement
        report.improvements.push({
          name: key,
          baseline: baselineValue,
          current: currentValue,
          change,
          percentChange: Math.abs(percentChange),
        });
      }
    }

    return report;
  }

  /**
   * Print regression report
   */
  private printRegressionReport(report: RegressionReport): void {
    if (report.regressions.length > 0) {
      console.log('\n🔴 Regressions:');
      for (const reg of report.regressions) {
        console.log(`   ${reg.name}:`);
        console.log(`     Baseline: ${this.formatTime(reg.baseline)}`);
        console.log(`     Current: ${this.formatTime(reg.current)}`);
        console.log(`     Change: +${reg.percentChange.toFixed(1)}% slower`);
      }
    }
  }

  /**
   * Generate benchmark reports
   */
  private async generateReports(
    results: Record<string, number>,
    gitInfo: { branch: string; commit: string; author: string }
  ): Promise<void> {
    // JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      git: gitInfo,
      results,
      environment: {
        bun: process.versions.bun,
        platform: process.platform,
        arch: process.arch,
      },
    };

    await Bun.write('benchmark-ci-results.json', JSON.stringify(jsonReport, null, 2));

    // Markdown report
    const mdReport = [
      '# CI Benchmark Report',
      '',
      `**Date:** ${new Date().toISOString()}`,
      `**Branch:** ${gitInfo.branch}`,
      `**Commit:** ${gitInfo.commit}`,
      `**Author:** ${gitInfo.author}`,
      '',
      '## Results',
      '',
      '| Benchmark | Time/Value |',
      '|-----------|------------|',
    ];

    for (const [key, value] of Object.entries(results)) {
      if (key.includes('memory')) {
        mdReport.push(`| ${key} | ${(value / 1024 / 1024).toFixed(2)} MB |`);
      } else if (key.includes('throughput')) {
        mdReport.push(`| ${key} | ${value.toFixed(0)} req/s |`);
      } else if (key.includes('size')) {
        mdReport.push(`| ${key} | ${(value / 1024).toFixed(2)} KB |`);
      } else {
        mdReport.push(`| ${key} | ${this.formatTime(value)} |`);
      }
    }

    await Bun.write('benchmark-ci-report.md', mdReport.join('\n'));

    console.log('\n📄 Reports generated:');
    console.log('   - benchmark-ci-results.json');
    console.log('   - benchmark-ci-report.md');
  }

  /**
   * Format time value
   */
  private formatTime(ns: number): string {
    if (ns < 1000) return `${ns.toFixed(2)}ns`;
    if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)}μs`;
    if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
    return `${(ns / 1_000_000_000).toFixed(2)}s`;
  }

  /**
   * GitHub Actions integration
   */
  async githubActionsOutput(): Promise<void> {
    const baseline = await this.loadBaseline();
    if (!baseline) return;

    const results: Record<string, number> = {};

    // Run quick benchmarks
    const coreResults = await this.runCoreBenchmarks();
    Object.assign(results, coreResults);

    const report = this.compareWithBaseline(results, baseline);

    // Output for GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      if (!report.passed) {
        console.log('::error::Performance regressions detected');

        for (const reg of report.regressions) {
          console.log(`::warning::${reg.name} is ${reg.percentChange.toFixed(1)}% slower`);
        }

        process.exit(1);
      } else {
        console.log('::notice::All benchmarks passed');

        for (const imp of report.improvements) {
          console.log(`::notice::${imp.name} is ${imp.percentChange.toFixed(1)}% faster`);
        }
      }
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  const ci = new CIBenchmarks();

  // Check if running in CI environment
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    await ci.githubActionsOutput();
  } else {
    const passed = await ci.runCIBenchmarks();
    process.exit(passed ? 0 : 1);
  }
}

export default CIBenchmarks;
