/**
 * Fire22 API Benchmark Suite
 *
 * Performance benchmarks for the consolidated API
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { performance } from 'perf_hooks';

// Benchmark utilities
interface BenchmarkResult {
  name: string;
  operations: number;
  totalTime: number;
  opsPerSecond: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<any> | any,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Actual benchmark
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    await fn();
    const iterEnd = performance.now();
    times.push(iterEnd - iterStart);
  }

  const end = performance.now();
  const totalTime = end - start;

  return {
    name,
    operations: iterations,
    totalTime,
    opsPerSecond: iterations / (totalTime / 1000),
    averageTime: times.reduce((a, b) => a + b) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}

function printBenchmarkResult(result: BenchmarkResult) {
  console.info(`
📊 ${result.name}:`);
  console.info(`   Operations: ${result.operations.toLocaleString()}`);
  console.info(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
  console.info(
    `   Ops/Second: ${result.opsPerSecond.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  );
  console.info(`   Average: ${result.averageTime.toFixed(3)}ms`);
  console.info(`   Min: ${result.minTime.toFixed(3)}ms`);
  console.info(`   Max: ${result.maxTime.toFixed(3)}ms`);
}

describe('Fire22 API Benchmarks', () => {
  let server: any;
  const baseURL = 'http://localhost:8788';

  beforeAll(async () => {
    // Start test server for benchmarks
    const { default: api } = await import('../../../workspaces/@fire22-api-consolidated/src/index.ts');

    server = Bun.serve({
      port: 8788,
      fetch: api.handle,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  test('Route Resolution Performance', async () => {
    const result = await benchmark(
      'Route Resolution - Health Endpoint',
      () => fetch(`${baseURL}/api/health`),
      500
    );

    printBenchmarkResult(result);

    // Performance assertions
    expect(result.opsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec
    expect(result.averageTime).toBeLessThan(50); // Average < 50ms
  });

  test('Authentication Performance', async () => {
    const result = await benchmark(
      'Authentication - Login Endpoint',
      () =>
        fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            password: 'testpass',
          }),
        }),
      100 // Lower iterations for auth due to complexity
    );

    printBenchmarkResult(result);

    expect(result.opsPerSecond).toBeGreaterThan(50); // At least 50 auth/sec
    expect(result.averageTime).toBeLessThan(100); // Average < 100ms
  });

  test('Validation Performance', async () => {
    // Get auth token first
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'manager',
        password: 'testpass',
      }),
    });

    const loginData = await loginResponse.json();
    const authToken = loginData.data.tokens.accessToken;

    const result = await benchmark(
      'Request Validation - Manager Endpoint',
      () =>
        fetch(`${baseURL}/api/manager/getWeeklyFigureByAgent`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentID: 'TEST001',
          }),
        }),
      200
    );

    printBenchmarkResult(result);

    expect(result.opsPerSecond).toBeGreaterThan(30); // At least 30 validated requests/sec
    expect(result.averageTime).toBeLessThan(150); // Average < 150ms
  });

  test('Concurrent Request Handling', async () => {
    const concurrencyLevels = [1, 5, 10, 25, 50];
    const results: { [key: number]: BenchmarkResult } = {};

    for (const concurrency of concurrencyLevels) {
      const result = await benchmark(
        `Concurrent Requests (${concurrency} parallel)`,
        async () => {
          const requests = [];
          for (let i = 0; i < concurrency; i++) {
            requests.push(fetch(`${baseURL}/api/health`));
          }
          const responses = await Promise.all(requests);
          return responses;
        },
        50 // Lower iterations for concurrent tests
      );

      results[concurrency] = result;
      printBenchmarkResult(result);
    }

    // Verify scaling characteristics
    expect(results[1].opsPerSecond).toBeGreaterThan(100);
    expect(results[50].opsPerSecond).toBeGreaterThan(20); // Should handle some concurrency
  });

  test('Memory Usage Under Load', async () => {
    const initialMemory = process.memoryUsage();

    // Perform memory-intensive operations
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(
        fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: `user${i}`,
            password: 'testpass',
          }),
        })
      );
    }

    await Promise.all(requests);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    console.info(`\\n🧠 Memory Usage:`);
    console.info(`   Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.info(`   Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.info(`   Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

    // Memory increase should be reasonable (< 50MB)
    expect(memoryIncrease / 1024 / 1024).toBeLessThan(50);
  });

  test('Response Time Consistency', async () => {
    const responseTimes: number[] = [];
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fetch(`${baseURL}/api/health`);
      const end = performance.now();
      responseTimes.push(end - start);

      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Calculate statistics
    const avg = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    const sorted = responseTimes.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(iterations * 0.95)];
    const p99 = sorted[Math.floor(iterations * 0.99)];

    // Calculate standard deviation
    const variance =
      responseTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);

    console.info(`\\n⏱️ Response Time Statistics:`);
    console.info(`   Average: ${avg.toFixed(2)}ms`);
    console.info(`   Min: ${min.toFixed(2)}ms`);
    console.info(`   Max: ${max.toFixed(2)}ms`);
    console.info(`   P95: ${p95.toFixed(2)}ms`);
    console.info(`   P99: ${p99.toFixed(2)}ms`);
    console.info(`   Std Dev: ${stdDev.toFixed(2)}ms`);

    // Performance consistency assertions
    expect(avg).toBeLessThan(100); // Average response time < 100ms
    expect(p95).toBeLessThan(200); // 95% of requests < 200ms
    expect(stdDev).toBeLessThan(50); // Consistent performance
  });
});

// Schema Validation Benchmarks
describe('Schema Validation Benchmarks', () => {
  test('Zod Schema Performance', async () => {
    const { LoginRequestSchema, GetLiveWagersRequestSchema } = await import(
      '../../../workspaces/@fire22-api-consolidated/src/schemas/index.ts'
    );

    // Test login schema
    const loginResult = await benchmark(
      'Zod Validation - Login Schema',
      () => {
        return LoginRequestSchema.parse({
          username: 'testuser',
          password: 'testpass',
          rememberMe: true,
        });
      },
      5000
    );

    printBenchmarkResult(loginResult);

    // Test complex schema
    const complexResult = await benchmark(
      'Zod Validation - Live Wagers Schema',
      () => {
        return GetLiveWagersRequestSchema.parse({
          agentID: 'AGENT001',
        });
      },
      5000
    );

    printBenchmarkResult(complexResult);

    // Validation should be very fast
    expect(loginResult.opsPerSecond).toBeGreaterThan(10000); // >10k validations/sec
    expect(complexResult.opsPerSecond).toBeGreaterThan(10000);
  });
});

// Router Performance
describe('Router Performance Benchmarks', () => {
  test('Route Matching Performance', async () => {
    const { Router } = await import('itty-router');

    const router = Router();

    // Add many routes to test performance
    for (let i = 0; i < 100; i++) {
      router.get(`/api/test${i}`, () => new Response('OK'));
      router.post(`/api/test${i}`, () => new Response('OK'));
    }

    // Add the route we'll test
    router.get('/api/target', () => new Response('Found'));

    const result = await benchmark(
      'Router Matching - 200 routes',
      () => {
        const mockRequest = {
          method: 'GET',
          url: 'http://localhost/api/target',
          headers: new Headers(),
        } as Request;

        return router.handle(mockRequest);
      },
      2000
    );

    printBenchmarkResult(result);

    // Router should be very efficient
    expect(result.opsPerSecond).toBeGreaterThan(5000); // >5k route matches/sec
    expect(result.averageTime).toBeLessThan(1); // <1ms average
  });
});

// Generate benchmark report
test('Generate Benchmark Report', () => {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      runtime: 'Bun',
      version: Bun.version,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    summary: {
      'Route Resolution': '100+ ops/sec, <50ms avg',
      Authentication: '50+ ops/sec, <100ms avg',
      Validation: '30+ ops/sec, <150ms avg',
      'Schema Validation': '10k+ ops/sec, <1ms avg',
      'Router Matching': '5k+ ops/sec, <1ms avg',
      'Memory Usage': '<50MB increase under load',
      'Response Consistency': 'P95 <200ms, StdDev <50ms',
    },
  };

  console.info('\\n📋 Benchmark Report:');
  console.info(JSON.stringify(report, null, 2));

  expect(report.environment.runtime).toBe('Bun');
});
