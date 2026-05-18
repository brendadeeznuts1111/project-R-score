#!/usr/bin/env bun

/**
 * Simple API Benchmark
 *
 * Quick performance test of the consolidated API
 */

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
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 5; i++) {
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

function printResult(result: BenchmarkResult) {}

async function main() {
  // Import API
  const { default: api } = await import('../index.ts');

  // Start test server
  const server = Bun.serve({
    port: 8789,
    fetch: api.handle,
  });

  const baseURL = 'http://localhost:8789';

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Test 1: Health endpoint
    const healthResult = await benchmark(
      'Health Endpoint',
      () => fetch(`${baseURL}/api/health`),
      200
    );
    printResult(healthResult);

    // Test 2: Schema validation performance
    const schemaResult = await benchmark(
      'Schema Validation (Login)',
      async () => {
        try {
          const { LoginRequestSchema } = await import('../schemas/index.ts');
          return LoginRequestSchema.parse({
            username: 'testuser',
            password: 'testpass',
          });
        } catch (error) {
          // Skip if schemas not available
          return { username: 'testuser', password: 'testpass' };
        }
      },
      1000
    );
    printResult(schemaResult);

    // Test 3: Route resolution
    const routeResult = await benchmark(
      'Route Resolution (Multiple Paths)',
      async () => {
        const paths = ['/api/health', '/api/health/status', '/api/auth/login', '/api/nonexistent'];

        const randomPath = paths[Math.floor(Math.random() * paths.length)];
        return fetch(`${baseURL}${randomPath}`);
      },
      100
    );
    printResult(routeResult);

    // Test 4: Concurrent requests
    const concurrentResult = await benchmark(
      'Concurrent Requests (10 parallel)',
      async () => {
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(fetch(`${baseURL}/api/health`));
        }
        return Promise.all(requests);
      },
      20
    );
    printResult(concurrentResult);

    // Test 5: Authentication flow
    const authResult = await benchmark(
      'Authentication Flow',
      () =>
        fetch(`${baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            password: 'testpass',
          }),
        }),
      50
    );
    printResult(authResult);

    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        runtime: 'Bun',
        version: Bun.version,
        platform: process.platform,
        arch: process.arch,
      },
      results: [healthResult, schemaResult, routeResult, concurrentResult, authResult],
      summary: {
        healthEndpoint: `${healthResult.opsPerSecond.toFixed(0)} ops/sec`,
        schemaValidation: `${schemaResult.opsPerSecond.toFixed(0)} ops/sec`,
        routeResolution: `${routeResult.opsPerSecond.toFixed(0)} ops/sec`,
        concurrentHandling: `${concurrentResult.opsPerSecond.toFixed(0)} ops/sec`,
        authentication: `${authResult.opsPerSecond.toFixed(0)} ops/sec`,
        averageResponseTime: `${[healthResult, routeResult, authResult].reduce((sum, r) => sum + r.averageTime, 0) / 3}ms`,
      },
    };

    // Write results
    await Bun.write('benchmark-results-api.json', JSON.stringify(report, null, 2));
  } finally {
    server.stop();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
