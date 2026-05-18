#!/usr/bin/env bun

/**
 * Performance Test Script for Bun 1.3 Betting Platform
 * Load testing with validated performance metrics
 */

import { performance } from 'perf_hooks';
import { spawn } from 'child_process';

interface TestConfig {
  duration: number; // seconds
  connections: number;
  targetUrl: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  duration: number;
}

class PerformanceTester {
  private config: TestConfig;
  private results: number[] = [];
  private errors: string[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      duration: 60,
      connections: 100,
      targetUrl: 'http://localhost:3000/health',
      method: 'GET',
      ...config,
    };
  }

  private async makeRequest(): Promise<number> {
    const startTime = performance.now();

    try {
      const response = await fetch(this.config.targetUrl, {
        method: this.config.method,
        headers: {
          'User-Agent': 'BunPerformanceTest/1.3.1',
          ...this.config.headers,
        },
        body: this.config.body,
      });

      if (!response.ok) {
        this.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        return -1; // Error indicator
      }

      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      this.errors.push(error.message);
      return -1;
    }
  }

  private calculatePercentile(sortedData: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedData.length) {
      return sortedData[sortedData.length - 1];
    }

    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
  }

  public async run(): Promise<TestResult> {
    console.info(`🚀 Starting performance test...`);
    console.info(`   Target: ${this.config.targetUrl}`);
    console.info(`   Duration: ${this.config.duration}s`);
    console.info(`   Connections: ${this.config.connections}`);
    console.info(`   Method: ${this.config.method}`);

    this.startTime = performance.now();
    const endTime = this.startTime + (this.config.duration * 1000);

    // Create concurrent requests
    const promises: Promise<void>[] = [];

    for (let i = 0; i < this.config.connections; i++) {
      promises.push(this.runWorker(endTime));
    }

    await Promise.all(promises);

    this.endTime = performance.now();
    const actualDuration = (this.endTime - this.startTime) / 1000;

    // Calculate results
    const validResults = this.results.filter(r => r >= 0);
    const sortedResults = validResults.sort((a, b) => a - b);

    const result: TestResult = {
      totalRequests: this.results.length,
      successfulRequests: validResults.length,
      failedRequests: this.errors.length,
      averageResponseTime: validResults.reduce((a, b) => a + b, 0) / validResults.length,
      minResponseTime: Math.min(...validResults),
      maxResponseTime: Math.max(...validResults),
      p50ResponseTime: this.calculatePercentile(sortedResults, 50),
      p95ResponseTime: this.calculatePercentile(sortedResults, 95),
      p99ResponseTime: this.calculatePercentile(sortedResults, 99),
      requestsPerSecond: validResults.length / actualDuration,
      errorRate: (this.errors.length / this.results.length) * 100,
      duration: actualDuration,
    };

    return result;
  }

  private async runWorker(endTime: number): Promise<void> {
    while (performance.now() < endTime) {
      const responseTime = await this.makeRequest();
      this.results.push(responseTime);

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  public printResults(result: TestResult): void {
    console.info('\n📊 Performance Test Results');
    console.info('='.repeat(50));
    console.info(`Duration: ${result.duration.toFixed(2)}s`);
    console.info(`Total Requests: ${result.totalRequests.toLocaleString()}`);
    console.info(`Successful Requests: ${result.successfulRequests.toLocaleString()}`);
    console.info(`Failed Requests: ${result.failedRequests.toLocaleString()}`);
    console.info(`Error Rate: ${result.errorRate.toFixed(2)}%`);

    console.info('\n⚡ Throughput:');
    console.info(`Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);

    console.info('\n⏱️  Response Times (ms):');
    console.info(`Average: ${result.averageResponseTime.toFixed(2)}`);
    console.info(`Min: ${result.minResponseTime.toFixed(2)}`);
    console.info(`Max: ${result.maxResponseTime.toFixed(2)}`);
    console.info(`P50: ${result.p50ResponseTime.toFixed(2)}`);
    console.info(`P95: ${result.p95ResponseTime.toFixed(2)}`);
    console.info(`P99: ${result.p99ResponseTime.toFixed(2)}`);

    // Performance validation against targets
    console.info('\n🎯 Performance Validation:');
    const targets = {
      throughput: 100, // Minimum acceptable req/sec
      p95: 10, // Maximum acceptable p95 response time (ms)
      errorRate: 1, // Maximum acceptable error rate (%)
    };

    const throughputOk = result.requestsPerSecond >= targets.throughput;
    const latencyOk = result.p95ResponseTime <= targets.p95;
    const errorsOk = result.errorRate <= targets.errorRate;

    console.info(`Throughput (>=${targets.throughput} req/sec): ${throughputOk ? '✅ PASS' : '❌ FAIL'}`);
    console.info(`Latency (P95 <=${targets.p95}ms): ${latencyOk ? '✅ PASS' : '❌ FAIL'}`);
    console.info(`Error Rate (<=${targets.errorRate}%): ${errorsOk ? '✅ PASS' : '❌ FAIL'}`);

    const overallPass = throughputOk && latencyOk && errorsOk;
    console.info(`\n🏆 Overall Performance: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

    if (!overallPass) {
      console.info('\n💡 Recommendations:');
      if (!throughputOk) console.info('  - Optimize database queries or add caching');
      if (!latencyOk) console.info('  - Review middleware performance or add load balancing');
      if (!errorsOk) console.info('  - Check error handling and service dependencies');
    }

    if (this.errors.length > 0) {
      console.info(`\n❌ Sample Errors (${Math.min(5, this.errors.length)}):`);
      this.errors.slice(0, 5).forEach((error, i) => {
        console.info(`  ${i + 1}. ${error}`);
      });
    }
  }
}

// CLI argument parsing
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--duration':
      case '-d':
        config.duration = parseInt(nextArg);
        i++;
        break;
      case '--connections':
      case '-c':
        config.connections = parseInt(nextArg);
        i++;
        break;
      case '--url':
      case '-u':
        config.targetUrl = nextArg;
        i++;
        break;
      case '--method':
      case '-m':
        config.method = nextArg as 'GET' | 'POST';
        i++;
        break;
      case '--help':
      case '-h':
        console.info('Usage: performance-test [options]');
        console.info('');
        console.info('Options:');
        console.info('  -d, --duration <seconds>    Test duration (default: 60)');
        console.info('  -c, --connections <num>     Number of concurrent connections (default: 100)');
        console.info('  -u, --url <url>             Target URL (default: http://localhost:3000/health)');
        console.info('  -m, --method <method>       HTTP method (default: GET)');
        console.info('  -h, --help                  Show this help');
        process.exit(0);
        break;
    }
  }

  return config as TestConfig;
}

async function main() {
  const config = parseArgs();
  const tester = new PerformanceTester(config);
  const result = await tester.run();
  tester.printResults(result);

  // Exit with appropriate code based on performance
  const pass = result.requestsPerSecond >= 100 &&
               result.p95ResponseTime <= 10 &&
               result.errorRate <= 1;

  process.exit(pass ? 0 : 1);
}

export { PerformanceTester, TestConfig, TestResult };

if (import.meta.main) {
  main().catch(console.error);
}