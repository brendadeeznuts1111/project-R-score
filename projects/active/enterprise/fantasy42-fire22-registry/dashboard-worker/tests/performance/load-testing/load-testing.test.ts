#!/usr/bin/env bun

/**
 * 🚀 Fire22 Load Testing Infrastructure
 *
 * High-performance load testing for HTTP endpoints
 * Integrates with bombardier/oha for stress testing
 */

import { $ } from 'bun';
import BenchmarkSuite from './benchmark-suite';
import MemoryProfiler from './memory-profiler';

interface LoadTestResult {
  endpoint: string;
  duration: number;
  requests: number;
  successRate: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errors: number;
  timeouts: number;
}

interface LoadTestScenario {
  name: string;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  duration: number;
  connections: number;
  rps?: number;
}

export class LoadTester {
  private server: any = null;
  private baseUrl: string = '';
  private results: LoadTestResult[] = [];
  private profiler: MemoryProfiler;

  constructor() {
    this.profiler = new MemoryProfiler('Load Test Memory');
  }

  /**
   * Start test server
   */
  async startTestServer(port: number = 3456): Promise<void> {
    console.info(`🚀 Starting test server on port ${port}...`);

    this.server = Bun.serve({
      port,
      fetch: req => this.handleTestRequest(req),
      websocket: {
        open(ws) {
          ws.send(JSON.stringify({ type: 'connected' }));
        },
        message(ws, message) {
          ws.send(message);
        },
        close(ws) {
          // Handle close
        },
      },
    });

    this.baseUrl = `http://localhost:${port}`;
    console.info(`✅ Test server running at ${this.baseUrl}`);
  }

  /**
   * Handle test server requests
   */
  private async handleTestRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Simulate different endpoint behaviors
    switch (path) {
      case '/api/fast':
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }));

      case '/api/slow':
        await Bun.sleep(100); // 100ms delay
        return new Response(JSON.stringify({ status: 'ok', delayed: true }));

      case '/api/heavy':
        const data = Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            data: `Item ${i}`,
            metadata: { created: Date.now() },
          }));
        return new Response(JSON.stringify(data));

      case '/api/echo':
        const body = await req.text();
        return new Response(body);

      case '/api/error':
        if (Math.random() > 0.5) {
          return new Response('Internal Server Error', { status: 500 });
        }
        return new Response(JSON.stringify({ status: 'ok' }));

      case '/api/auth':
        const auth = req.headers.get('Authorization');
        if (!auth || !auth.startsWith('Bearer ')) {
          return new Response('Unauthorized', { status: 401 });
        }
        return new Response(JSON.stringify({ authenticated: true }));

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  /**
   * Check if bombardier is installed
   */
  private async checkBombardier(): Promise<boolean> {
    try {
      await $`which bombardier`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if oha is installed
   */
  private async checkOha(): Promise<boolean> {
    try {
      await $`which oha`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install load testing tools
   */
  async installTools(): Promise<void> {
    console.info('🔧 Checking load testing tools...');

    const hasBombardier = await this.checkBombardier();
    const hasOha = await this.checkOha();

    if (!hasBombardier && !hasOha) {
      console.info('📦 Installing load testing tools...');
      console.info('   Please install one of the following:');
      console.info('   - bombardier: go install -a github.com/codesenberg/bombardier@latest');
      console.info('   - oha: cargo install oha');
      console.info('   - Or use homebrew: brew install bombardier oha');
    } else {
      console.info('✅ Load testing tools available');
      if (hasBombardier) console.info('   - bombardier ✓');
      if (hasOha) console.info('   - oha ✓');
    }
  }

  /**
   * Run load test using Bun's built-in capabilities
   */
  async runBunLoadTest(scenario: LoadTestScenario): Promise<LoadTestResult> {
    console.info(`\n🎯 Load Test: ${scenario.name}`);
    console.info(`   Endpoint: ${scenario.endpoint}`);
    console.info(`   Method: ${scenario.method}`);
    console.info(`   Duration: ${scenario.duration}s`);
    console.info(`   Connections: ${scenario.connections}`);

    const url = this.baseUrl + scenario.endpoint;
    const startTime = Date.now();
    const endTime = startTime + scenario.duration * 1000;

    let totalRequests = 0;
    let successfulRequests = 0;
    let errors = 0;
    let timeouts = 0;
    const latencies: number[] = [];

    // Create worker threads for concurrent connections
    const workers = Array(scenario.connections)
      .fill(null)
      .map(async () => {
        while (Date.now() < endTime) {
          const requestStart = Bun.nanoseconds();

          try {
            const response = await fetch(url, {
              method: scenario.method,
              headers: scenario.headers,
              body: scenario.body ? JSON.stringify(scenario.body) : undefined,
              signal: AbortSignal.timeout(5000),
            });

            const requestEnd = Bun.nanoseconds();
            const latency = Number(requestEnd - requestStart) / 1_000_000; // Convert to ms

            totalRequests++;
            if (response.ok) {
              successfulRequests++;
            } else {
              errors++;
            }

            latencies.push(latency);

            // Rate limiting if specified
            if (scenario.rps) {
              const delay = 1000 / (scenario.rps / scenario.connections);
              await Bun.sleep(delay);
            }
          } catch (error: any) {
            totalRequests++;
            if (error.name === 'AbortError') {
              timeouts++;
            } else {
              errors++;
            }
          }
        }
      });

    // Wait for all workers to complete
    await Promise.all(workers);

    // Calculate statistics
    latencies.sort((a, b) => a - b);

    const result: LoadTestResult = {
      endpoint: scenario.endpoint,
      duration: scenario.duration,
      requests: totalRequests,
      successRate: (successfulRequests / totalRequests) * 100,
      avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      p50Latency: latencies[Math.floor(latencies.length * 0.5)],
      p95Latency: latencies[Math.floor(latencies.length * 0.95)],
      p99Latency: latencies[Math.floor(latencies.length * 0.99)],
      throughput: totalRequests / scenario.duration,
      errors,
      timeouts,
    };

    this.results.push(result);
    this.printResult(result);

    return result;
  }

  /**
   * Run load test with bombardier
   */
  async runBombardierTest(scenario: LoadTestScenario): Promise<LoadTestResult> {
    if (!(await this.checkBombardier())) {
      console.info('⚠️  bombardier not installed, using Bun load test');
      return this.runBunLoadTest(scenario);
    }

    console.info(`\n🎯 Bombardier Load Test: ${scenario.name}`);

    const url = this.baseUrl + scenario.endpoint;
    const args = [
      '-c',
      scenario.connections.toString(),
      '-d',
      `${scenario.duration}s`,
      '-m',
      scenario.method,
      '--print',
      'result',
      '--format',
      'json',
    ];

    if (scenario.headers) {
      for (const [key, value] of Object.entries(scenario.headers)) {
        args.push('-H', `${key}: ${value}`);
      }
    }

    if (scenario.body) {
      args.push('-b', JSON.stringify(scenario.body));
    }

    if (scenario.rps) {
      args.push('-r', scenario.rps.toString());
    }

    args.push(url);

    try {
      const result = await $`bombardier ${args}`.json();

      return {
        endpoint: scenario.endpoint,
        duration: scenario.duration,
        requests:
          result.result.req1xx +
          result.result.req2xx +
          result.result.req3xx +
          result.result.req4xx +
          result.result.req5xx,
        successRate: (result.result.req2xx / result.result.requests) * 100,
        avgLatency: result.result.latency.mean / 1000,
        p50Latency: result.result.latency.percentiles['50'] / 1000,
        p95Latency: result.result.latency.percentiles['95'] / 1000,
        p99Latency: result.result.latency.percentiles['99'] / 1000,
        throughput: result.result.rps.mean,
        errors: result.result.req4xx + result.result.req5xx,
        timeouts: result.result.timeouts || 0,
      };
    } catch (error) {
      console.error('❌ Bombardier test failed:', error);
      return this.runBunLoadTest(scenario);
    }
  }

  /**
   * Run comprehensive load test suite
   */
  async runLoadTestSuite(): Promise<void> {
    console.info('\n🚀 Fire22 Load Test Suite');
    console.info('='.repeat(50));

    const scenarios: LoadTestScenario[] = [
      {
        name: 'Fast Endpoint',
        endpoint: '/api/fast',
        method: 'GET',
        duration: 10,
        connections: 10,
      },
      {
        name: 'Slow Endpoint',
        endpoint: '/api/slow',
        method: 'GET',
        duration: 10,
        connections: 5,
      },
      {
        name: 'Heavy Payload',
        endpoint: '/api/heavy',
        method: 'GET',
        duration: 10,
        connections: 10,
      },
      {
        name: 'Echo Service',
        endpoint: '/api/echo',
        method: 'POST',
        body: { test: 'data', timestamp: Date.now() },
        duration: 10,
        connections: 10,
      },
      {
        name: 'Error Handling',
        endpoint: '/api/error',
        method: 'GET',
        duration: 10,
        connections: 5,
      },
      {
        name: 'Auth Required',
        endpoint: '/api/auth',
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
        duration: 10,
        connections: 10,
      },
    ];

    for (const scenario of scenarios) {
      await this.runBunLoadTest(scenario);

      // Cool down between tests
      await Bun.sleep(1000);
    }

    this.printSummary();
  }

  /**
   * Stress test with increasing load
   */
  async runStressTest(endpoint: string, maxConnections: number = 100): Promise<void> {
    console.info('\n💪 Stress Test');
    console.info('='.repeat(50));
    console.info(`Endpoint: ${endpoint}`);
    console.info(`Max Connections: ${maxConnections}`);

    const steps = [1, 5, 10, 25, 50, 75, 100];
    const stressResults: LoadTestResult[] = [];

    for (const connections of steps) {
      if (connections > maxConnections) break;

      console.info(`\n📊 Testing with ${connections} connections...`);

      const result = await this.runBunLoadTest({
        name: `Stress Test - ${connections} connections`,
        endpoint,
        method: 'GET',
        duration: 10,
        connections,
      });

      stressResults.push(result);

      // Check if system is degrading
      if (result.successRate < 95 || result.p95Latency > 1000) {
        console.info('⚠️  Performance degradation detected!');
        console.info(`   Success Rate: ${result.successRate.toFixed(2)}%`);
        console.info(`   P95 Latency: ${result.p95Latency.toFixed(2)}ms`);
        break;
      }
    }

    // Find breaking point
    const breakingPoint = stressResults.find(r => r.successRate < 95);
    if (breakingPoint) {
      console.info(`\n🔴 Breaking point: ${breakingPoint.requests / breakingPoint.duration} rps`);
    } else {
      console.info(`\n✅ System stable up to ${maxConnections} connections`);
    }
  }

  /**
   * WebSocket load test
   */
  async runWebSocketTest(connections: number = 100, duration: number = 10): Promise<void> {
    console.info('\n🔌 WebSocket Load Test');
    console.info('='.repeat(50));
    console.info(`Connections: ${connections}`);
    console.info(`Duration: ${duration}s`);

    const wsUrl = this.baseUrl.replace('http://', 'ws://') + '/ws';
    const sockets: WebSocket[] = [];
    let messagesReceived = 0;
    let connectionErrors = 0;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    // Create WebSocket connections
    const connectionPromises = Array(connections)
      .fill(null)
      .map(async () => {
        try {
          const ws = new WebSocket(wsUrl);

          ws.onmessage = () => {
            messagesReceived++;
          };

          ws.onerror = () => {
            connectionErrors++;
          };

          await new Promise(resolve => {
            ws.onopen = resolve;
            setTimeout(resolve, 5000); // Timeout after 5s
          });

          sockets.push(ws);

          // Send messages until duration ends
          while (Date.now() < endTime && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ timestamp: Date.now() }));
            await Bun.sleep(100); // Send every 100ms
          }
        } catch (error) {
          connectionErrors++;
        }
      });

    await Promise.all(connectionPromises);

    // Close all connections
    sockets.forEach(ws => ws.close());

    console.info('\n📊 WebSocket Test Results:');
    console.info(`   Successful Connections: ${sockets.length}`);
    console.info(`   Connection Errors: ${connectionErrors}`);
    console.info(`   Messages Received: ${messagesReceived}`);
    console.info(`   Messages/sec: ${(messagesReceived / duration).toFixed(2)}`);
  }

  /**
   * Print load test result
   */
  private printResult(result: LoadTestResult): void {
    console.info('\n📊 Results:');
    console.info(`   Total Requests: ${result.requests.toLocaleString()}`);
    console.info(`   Success Rate: ${result.successRate.toFixed(2)}%`);
    console.info(`   Throughput: ${result.throughput.toFixed(2)} req/s`);
    console.info(`   Latency:`);
    console.info(`     Average: ${result.avgLatency.toFixed(2)}ms`);
    console.info(`     P50: ${result.p50Latency.toFixed(2)}ms`);
    console.info(`     P95: ${result.p95Latency.toFixed(2)}ms`);
    console.info(`     P99: ${result.p99Latency.toFixed(2)}ms`);
    if (result.errors > 0) {
      console.info(`   Errors: ${result.errors}`);
    }
    if (result.timeouts > 0) {
      console.info(`   Timeouts: ${result.timeouts}`);
    }
  }

  /**
   * Print summary of all tests
   */
  private printSummary(): void {
    console.info('\n' + '='.repeat(50));
    console.info('📈 Load Test Summary');
    console.info('='.repeat(50));

    const table: any[] = [];

    for (const result of this.results) {
      table.push({
        Endpoint: result.endpoint,
        Requests: result.requests.toLocaleString(),
        'Success %': result.successRate.toFixed(1),
        'Avg (ms)': result.avgLatency.toFixed(2),
        'P95 (ms)': result.p95Latency.toFixed(2),
        RPS: result.throughput.toFixed(0),
      });
    }

    console.table(table);

    // Find best and worst performers
    const bestLatency = this.results.reduce((prev, current) =>
      prev.avgLatency < current.avgLatency ? prev : current
    );
    const bestThroughput = this.results.reduce((prev, current) =>
      prev.throughput > current.throughput ? prev : current
    );

    console.info('\n🏆 Best Performers:');
    console.info(
      `   Lowest Latency: ${bestLatency.endpoint} (${bestLatency.avgLatency.toFixed(2)}ms)`
    );
    console.info(
      `   Highest Throughput: ${bestThroughput.endpoint} (${bestThroughput.throughput.toFixed(0)} req/s)`
    );
  }

  /**
   * Stop test server
   */
  stopServer(): void {
    if (this.server) {
      this.server.stop();
      console.info('✅ Test server stopped');
    }
  }
}

// Run load tests if executed directly
if (import.meta.main) {
  const tester = new LoadTester();

  try {
    await tester.installTools();
    await tester.startTestServer();
    await tester.runLoadTestSuite();
    await tester.runStressTest('/api/fast', 50);
    await tester.runWebSocketTest(50, 10);
  } finally {
    tester.stopServer();
  }
}

export default LoadTester;
