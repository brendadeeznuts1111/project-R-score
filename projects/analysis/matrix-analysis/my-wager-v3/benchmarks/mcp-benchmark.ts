#!/usr/bin/env bun
// MCP Server Benchmark Suite
// [TENSION-MCP-BENCH-001] [TENSION-PERFORMANCE-002]

import { TensionMCPClient } from '../examples/mcp-client-demo';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

class MCPBenchmark {
  private client: TensionMCPClient;
  private results: BenchmarkResult[] = [];

  constructor(host: string = 'localhost', port: number = 3005) {
    this.client = new TensionMCPClient(host, port);
  }

  async runBenchmark(name: string, fn: () => Promise<any>, iterations: number = 100): Promise<BenchmarkResult> {
    const times: number[] = [];

    console.log(`\n🏃 Running ${name} (${iterations} iterations)...`);

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / avgTime; // requests per second

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      throughput
    };

    this.results.push(result);
    this.printResult(result);

    return result;
  }

  private printResult(result: BenchmarkResult): void {
    console.log(`   Average: ${result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.throughput.toFixed(2)} req/s`);
  }

  async runAllBenchmarks(): Promise<void> {
    console.log('🚀 MCP Server Benchmark Suite');
    console.log('===============================\n');

    // Warm up
    console.log('🔥 Warming up...');
    for (let i = 0; i < 10; i++) {
      await this.client.callTool('get_system_status');
    }

    // Benchmark 1: System Status
    await this.runBenchmark(
      'System Status Request',
      () => this.client.callTool('get_system_status'),
      100
    );

    // Benchmark 2: Error Query
    await this.runBenchmark(
      'Error Query',
      () => this.client.callTool('get_errors', { limit: 10 }),
      50
    );

    // Benchmark 3: History Query
    await this.runBenchmark(
      'History Query',
      () => this.client.callTool('query_history', {
        timeRange: {
          start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        limit: 20
      }),
      30
    );

    // Benchmark 4: Tension Analysis
    await this.runBenchmark(
      'Tension Analysis',
      () => this.client.callTool('analyze_tension', { depth: 2 }),
      20
    );

    // Benchmark 5: Concurrent Requests
    await this.runBenchmark(
      'Concurrent Requests (10)',
      async () => {
        const promises = Array(10).fill(null).map(() =>
          this.client.callTool('get_system_status')
        );
        await Promise.all(promises);
      },
      20
    );

    // Benchmark 6: Mixed Workload
    await this.runBenchmark(
      'Mixed Workload',
      async () => {
        const operations = [
          () => this.client.callTool('get_system_status'),
          () => this.client.callTool('get_errors', { limit: 5 }),
          () => this.client.callTool('analyze_tension')
        ];
        const randomOp = operations[Math.floor(Math.random() * operations.length)];
        await randomOp();
      },
      100
    );

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Benchmark Summary');
    console.log('====================\n');

    console.table(this.results.map(r => ({
      'Test': r.name,
      'Avg (ms)': r.avgTime.toFixed(2),
      'Min (ms)': r.minTime.toFixed(2),
      'Max (ms)': r.maxTime.toFixed(2),
      'Throughput': `${r.throughput.toFixed(2)} req/s`
    })));

    // Performance analysis
    console.log('\n🎯 Performance Analysis:');
    console.log('========================\n');

    const fastest = this.results.reduce((prev, curr) =>
      prev.avgTime < curr.avgTime ? prev : curr
    );
    console.log(`Fastest operation: ${fastest.name} (${fastest.avgTime.toFixed(2)}ms)`);

    const slowest = this.results.reduce((prev, curr) =>
      prev.avgTime > curr.avgTime ? prev : curr
    );
    console.log(`Slowest operation: ${slowest.name} (${slowest.avgTime.toFixed(2)}ms)`);

    const highestThroughput = this.results.reduce((prev, curr) =>
      prev.throughput > curr.throughput ? prev : curr
    );
    console.log(`Highest throughput: ${highestThroughput.name} (${highestThroughput.throughput.toFixed(2)} req/s)`);

    // Performance recommendations
    console.log('\n💡 Recommendations:');
    console.log('==================\n');

    if (fastest.avgTime < 10) {
      console.log('✅ Excellent response times for basic operations');
    }

    if (highestThroughput.throughput > 100) {
      console.log('✅ High throughput achieved');
    }

    if (slowest.avgTime > 100) {
      console.log(`⚠️ Consider optimizing ${slowest.name} - currently averaging ${slowest.avgTime.toFixed(2)}ms`);
    }

    // Save results
    this.saveResults();
  }

  private saveResults(): void {
    const report = {
      timestamp: new Date().toISOString(),
      benchmarks: this.results,
      summary: {
        totalTests: this.results.length,
        fastestOp: this.results.reduce((prev, curr) =>
          prev.avgTime < curr.avgTime ? prev : curr
        ).name,
        slowestOp: this.results.reduce((prev, curr) =>
          prev.avgTime > curr.avgTime ? prev : curr
        ).name,
        highestThroughput: Math.max(...this.results.map(r => r.throughput))
      }
    };

    Bun.write('./mcp-benchmark-results.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Results saved to: ./mcp-benchmark-results.json');
  }
}

// Load Test
async function loadTest(): Promise<void> {
  console.log('\n⚡ Load Testing');
  console.log('===============\n');

  const client = new TensionMCPClient('localhost', 3005);
  const concurrentUsers = [1, 5, 10, 20, 50];

  for (const users of concurrentUsers) {
    console.log(`\nTesting with ${users} concurrent users...`);

    const promises = Array(users).fill(null).map(async (_, i) => {
      const startTime = performance.now();
      let requests = 0;
      let errors = 0;

      // Run for 5 seconds
      const endTime = Date.now() + 5000;

      while (Date.now() < endTime) {
        try {
          await client.callTool('get_system_status');
          requests++;
        } catch {
          errors++;
        }
      }

      const totalTime = performance.now() - startTime;

      return {
        user: i,
        requests,
        errors,
        totalTime,
        throughput: requests / (totalTime / 1000)
      };
    });

    const results = await Promise.all(promises);
    const totalRequests = results.reduce((sum, r) => sum + r.requests, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / users;

    console.log(`   Total requests: ${totalRequests}`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Average throughput per user: ${avgThroughput.toFixed(2)} req/s`);
    console.log(`   Combined throughput: ${(totalRequests / 5).toFixed(2)} req/s`);
  }
}

// Main execution
async function main() {
  console.log('Starting MCP Server Benchmark...');

  // Start server on dedicated port
  const serverProcess = Bun.spawn([process.execPath, 'mcp-server.ts'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { MCP_PORT: '3005' }
  });

  // Wait for server to start
  await Bun.sleep(3000);

  try {
    const benchmark = new MCPBenchmark();
    await benchmark.runAllBenchmarks();

    // Run load test
    await loadTest();

    console.log('\n✅ All benchmarks completed successfully!');

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  } finally {
    // Clean up
    serverProcess.kill();
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { MCPBenchmark };
