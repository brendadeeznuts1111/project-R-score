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
    console.log(`🚀 Starting performance test...`);
    console.log(`   Target: ${this.config.targetUrl}`);
    console.log(`   Duration: ${this.config.duration}s`);
    console.log(`   Connections: ${this.config.connections}`);
    console.log(`   Method: ${this.config.method}`);

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
    console.log('\n📊 Performance Test Results');
    console.log('='.repeat(50));
    console.log(`Duration: ${result.duration.toFixed(2)}s`);
    console.log(`Total Requests: ${result.totalRequests.toLocaleString()}`);
    console.log(`Successful Requests: ${result.successfulRequests.toLocaleString()}`);
    console.log(`Failed Requests: ${result.failedRequests.toLocaleString()}`);
    console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);

    console.log('\n⚡ Throughput:');
    console.log(`Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);

    console.log('\n⏱️  Response Times (ms):');
    console.log(`Average: ${result.averageResponseTime.toFixed(2)}`);
    console.log(`Min: ${result.minResponseTime.toFixed(2)}`);
    console.log(`Max: ${result.maxResponseTime.toFixed(2)}`);
    console.log(`P50: ${result.p50ResponseTime.toFixed(2)}`);
    console.log(`P95: ${result.p95ResponseTime.toFixed(2)}`);
    console.log(`P99: ${result.p99ResponseTime.toFixed(2)}`);

    // Performance validation against targets
    console.log('\n🎯 Performance Validation:');
    const targets = {
      throughput: 100, // Minimum acceptable req/sec
      p95: 10, // Maximum acceptable p95 response time (ms)
      errorRate: 1, // Maximum acceptable error rate (%)
    };

    const throughputOk = result.requestsPerSecond >= targets.throughput;
    const latencyOk = result.p95ResponseTime <= targets.p95;
    const errorsOk = result.errorRate <= targets.errorRate;

    console.log(`Throughput (>=${targets.throughput} req/sec): ${throughputOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Latency (P95 <=${targets.p95}ms): ${latencyOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Error Rate (<=${targets.errorRate}%): ${errorsOk ? '✅ PASS' : '❌ FAIL'}`);

    const overallPass = throughputOk && latencyOk && errorsOk;
    console.log(`\n🏆 Overall Performance: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

    if (!overallPass) {
      console.log('\n💡 Recommendations:');
      if (!throughputOk) console.log('  - Optimize database queries or add caching');
      if (!latencyOk) console.log('  - Review middleware performance or add load balancing');
      if (!errorsOk) console.log('  - Check error handling and service dependencies');
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Sample Errors (${Math.min(5, this.errors.length)}):`);
      this.errors.slice(0, 5).forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
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
        console.log('Usage: performance-test [options]');
        console.log('');
        console.log('Options:');
        console.log('  -d, --duration <seconds>    Test duration (default: 60)');
        console.log('  -c, --connections <num>     Number of concurrent connections (default: 100)');
        console.log('  -u, --url <url>             Target URL (default: http://localhost:3000/health)');
        console.log('  -m, --method <method>       HTTP method (default: GET)');
        console.log('  -h, --help                  Show this help');
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