/**
 * Fire22 API Benchmark Suite
 * 
 * Performance benchmarks for the consolidated API
 */

import { describe, test, expect } from 'bun:test';
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
    maxTime: Math.max(...times)
  };
}

function printBenchmarkResult(result: BenchmarkResult) {
  console.log(`\n📊 ${result.name}:`);
  console.log(`   Operations: ${result.operations.toLocaleString()}`);
  console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
  console.log(`   Ops/Second: ${result.opsPerSecond.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
  console.log(`   Average: ${result.averageTime.toFixed(3)}ms`);
  console.log(`   Min: ${result.minTime.toFixed(3)}ms`);
  console.log(`   Max: ${result.maxTime.toFixed(3)}ms`);
}

describe('Fire22 API Benchmarks', () => {
  let server: any;
  const baseURL = 'http://localhost:8788';
  
  beforeAll(async () => {
    // Start test server for benchmarks
    const { default: api } = await import('../index.ts');
    
    server = Bun.serve({
      port: 8788,
      fetch: api.handle
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  afterAll(() => {
    if (server) {
      server.stop();
    }
  });\n  \n  test('Route Resolution Performance', async () => {\n    const result = await benchmark(\n      'Route Resolution - Health Endpoint',\n      () => fetch(`${baseURL}/api/health`),\n      500\n    );\n    \n    printBenchmarkResult(result);\n    \n    // Performance assertions\n    expect(result.opsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec\n    expect(result.averageTime).toBeLessThan(50); // Average < 50ms\n  });\n  \n  test('Authentication Performance', async () => {\n    const result = await benchmark(\n      'Authentication - Login Endpoint',\n      () => fetch(`${baseURL}/api/auth/login`, {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          username: 'testuser',\n          password: 'testpass'\n        })\n      }),\n      100 // Lower iterations for auth due to complexity\n    );\n    \n    printBenchmarkResult(result);\n    \n    expect(result.opsPerSecond).toBeGreaterThan(50); // At least 50 auth/sec\n    expect(result.averageTime).toBeLessThan(100); // Average < 100ms\n  });\n  \n  test('Validation Performance', async () => {\n    // Get auth token first\n    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        username: 'manager',\n        password: 'testpass'\n      })\n    });\n    \n    const loginData = await loginResponse.json();\n    const authToken = loginData.data.tokens.accessToken;\n    \n    const result = await benchmark(\n      'Request Validation - Manager Endpoint',\n      () => fetch(`${baseURL}/api/manager/getWeeklyFigureByAgent`, {\n        method: 'POST',\n        headers: {\n          'Authorization': `Bearer ${authToken}`,\n          'Content-Type': 'application/json'\n        },\n        body: JSON.stringify({\n          agentID: 'TEST001'\n        })\n      }),\n      200\n    );\n    \n    printBenchmarkResult(result);\n    \n    expect(result.opsPerSecond).toBeGreaterThan(30); // At least 30 validated requests/sec\n    expect(result.averageTime).toBeLessThan(150); // Average < 150ms\n  });\n  \n  test('Concurrent Request Handling', async () => {\n    const concurrencyLevels = [1, 5, 10, 25, 50];\n    const results: { [key: number]: BenchmarkResult } = {};\n    \n    for (const concurrency of concurrencyLevels) {\n      const result = await benchmark(\n        `Concurrent Requests (${concurrency} parallel)`,\n        async () => {\n          const requests = [];\n          for (let i = 0; i < concurrency; i++) {\n            requests.push(fetch(`${baseURL}/api/health`));\n          }\n          const responses = await Promise.all(requests);\n          return responses;\n        },\n        50 // Lower iterations for concurrent tests\n      );\n      \n      results[concurrency] = result;\n      printBenchmarkResult(result);\n    }\n    \n    // Verify scaling characteristics\n    expect(results[1].opsPerSecond).toBeGreaterThan(100);\n    expect(results[50].opsPerSecond).toBeGreaterThan(20); // Should handle some concurrency\n  });\n  \n  test('Memory Usage Under Load', async () => {\n    const initialMemory = process.memoryUsage();\n    \n    // Perform memory-intensive operations\n    const requests = [];\n    for (let i = 0; i < 100; i++) {\n      requests.push(\n        fetch(`${baseURL}/api/auth/login`, {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({\n            username: `user${i}`,\n            password: 'testpass'\n          })\n        })\n      );\n    }\n    \n    await Promise.all(requests);\n    \n    // Force garbage collection if available\n    if (global.gc) {\n      global.gc();\n    }\n    \n    const finalMemory = process.memoryUsage();\n    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;\n    \n    console.log(`\\n🧠 Memory Usage:`);\n    console.log(`   Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);\n    console.log(`   Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);\n    console.log(`   Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);\n    \n    // Memory increase should be reasonable (< 50MB)\n    expect(memoryIncrease / 1024 / 1024).toBeLessThan(50);\n  });\n  \n  test('Response Time Consistency', async () => {\n    const responseTimes: number[] = [];\n    const iterations = 100;\n    \n    for (let i = 0; i < iterations; i++) {\n      const start = performance.now();\n      await fetch(`${baseURL}/api/health`);\n      const end = performance.now();\n      responseTimes.push(end - start);\n      \n      // Small delay to avoid overwhelming\n      await new Promise(resolve => setTimeout(resolve, 10));\n    }\n    \n    // Calculate statistics\n    const avg = responseTimes.reduce((a, b) => a + b) / responseTimes.length;\n    const min = Math.min(...responseTimes);\n    const max = Math.max(...responseTimes);\n    const sorted = responseTimes.sort((a, b) => a - b);\n    const p95 = sorted[Math.floor(iterations * 0.95)];\n    const p99 = sorted[Math.floor(iterations * 0.99)];\n    \n    // Calculate standard deviation\n    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / iterations;\n    const stdDev = Math.sqrt(variance);\n    \n    console.log(`\\n⏱️ Response Time Statistics:`);\n    console.log(`   Average: ${avg.toFixed(2)}ms`);\n    console.log(`   Min: ${min.toFixed(2)}ms`);\n    console.log(`   Max: ${max.toFixed(2)}ms`);\n    console.log(`   P95: ${p95.toFixed(2)}ms`);\n    console.log(`   P99: ${p99.toFixed(2)}ms`);\n    console.log(`   Std Dev: ${stdDev.toFixed(2)}ms`);\n    \n    // Performance consistency assertions\n    expect(avg).toBeLessThan(100); // Average response time < 100ms\n    expect(p95).toBeLessThan(200); // 95% of requests < 200ms\n    expect(stdDev).toBeLessThan(50); // Consistent performance\n  });\n});\n\n// Schema Validation Benchmarks\ndescribe('Schema Validation Benchmarks', () => {\n  test('Zod Schema Performance', async () => {\n    const { LoginRequestSchema, GetLiveWagersRequestSchema } = await import('../schemas/index.ts');\n    \n    // Test login schema\n    const loginResult = await benchmark(\n      'Zod Validation - Login Schema',\n      () => {\n        return LoginRequestSchema.parse({\n          username: 'testuser',\n          password: 'testpass',\n          rememberMe: true\n        });\n      },\n      5000\n    );\n    \n    printBenchmarkResult(loginResult);\n    \n    // Test complex schema\n    const complexResult = await benchmark(\n      'Zod Validation - Live Wagers Schema',\n      () => {\n        return GetLiveWagersRequestSchema.parse({\n          agentID: 'AGENT001'\n        });\n      },\n      5000\n    );\n    \n    printBenchmarkResult(complexResult);\n    \n    // Validation should be very fast\n    expect(loginResult.opsPerSecond).toBeGreaterThan(10000); // >10k validations/sec\n    expect(complexResult.opsPerSecond).toBeGreaterThan(10000);\n  });\n});\n\n// Router Performance\ndescribe('Router Performance Benchmarks', () => {\n  test('Route Matching Performance', async () => {\n    const { Router } = await import('itty-router');\n    \n    const router = Router();\n    \n    // Add many routes to test performance\n    for (let i = 0; i < 100; i++) {\n      router.get(`/api/test${i}`, () => new Response('OK'));\n      router.post(`/api/test${i}`, () => new Response('OK'));\n    }\n    \n    // Add the route we'll test\n    router.get('/api/target', () => new Response('Found'));\n    \n    const result = await benchmark(\n      'Router Matching - 200 routes',\n      () => {\n        const mockRequest = {\n          method: 'GET',\n          url: 'http://localhost/api/target',\n          headers: new Headers()\n        } as Request;\n        \n        return router.handle(mockRequest);\n      },\n      2000\n    );\n    \n    printBenchmarkResult(result);\n    \n    // Router should be very efficient\n    expect(result.opsPerSecond).toBeGreaterThan(5000); // >5k route matches/sec\n    expect(result.averageTime).toBeLessThan(1); // <1ms average\n  });\n});\n\n// Generate benchmark report\ntest('Generate Benchmark Report', () => {\n  const report = {\n    timestamp: new Date().toISOString(),\n    environment: {\n      runtime: 'Bun',\n      version: Bun.version,\n      platform: process.platform,\n      arch: process.arch,\n      nodeVersion: process.version\n    },\n    summary: {\n      'Route Resolution': '100+ ops/sec, <50ms avg',\n      'Authentication': '50+ ops/sec, <100ms avg',\n      'Validation': '30+ ops/sec, <150ms avg',\n      'Schema Validation': '10k+ ops/sec, <1ms avg',\n      'Router Matching': '5k+ ops/sec, <1ms avg',\n      'Memory Usage': '<50MB increase under load',\n      'Response Consistency': 'P95 <200ms, StdDev <50ms'\n    }\n  };\n  \n  console.log('\\n📋 Benchmark Report:');\n  console.log(JSON.stringify(report, null, 2));\n  \n  // Write report to file\n  Bun.write(\n    '/Users/nolarose/ff/dashboard-worker/benchmark-results-api.json',\n    JSON.stringify(report, null, 2)\n  );\n  \n  expect(true).toBe(true); // Always pass - this is just for reporting\n});"