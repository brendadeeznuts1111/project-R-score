/**
 * Load Testing Module
 * High-performance load testing for HTTP endpoints
 */

export interface LoadTestResult {
  url: string;
  duration: number;
  requests: number;
  rps: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errors: number;
  errorRate: number;
}

export interface LoadTestScenario {
  name: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  connections?: number;
  duration?: number;
  rps?: number;
}

export default class LoadTester {
  private scenarios: LoadTestScenario[] = [];

  constructor(private name: string = 'Load Test') {}

  addScenario(scenario: LoadTestScenario): void {
    this.scenarios.push(scenario);
  }

  async run(scenario: LoadTestScenario): Promise<LoadTestResult> {
    const { url, method = 'GET', headers = {}, connections = 10, duration = 10 } = scenario;

    console.log(`🔄 Running load test: ${scenario.name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Connections: ${connections}`);
    console.log(`   Duration: ${duration}s`);

    const startTime = Bun.nanoseconds();
    const results: number[] = [];
    let errorCount = 0;
    let requestCount = 0;

    // Create parallel connections
    const workers = Array.from({ length: connections }, async () => {
      const endTime = Date.now() + duration * 1000;

      while (Date.now() < endTime) {
        const reqStart = Bun.nanoseconds();
        try {
          const response = await fetch(url, {
            method,
            headers,
          });

          if (!response.ok) {
            errorCount++;
          }

          const reqEnd = Bun.nanoseconds();
          results.push((reqEnd - reqStart) / 1_000_000); // Convert to ms
          requestCount++;
        } catch (error) {
          errorCount++;
          requestCount++;
        }
      }
    });

    await Promise.all(workers);

    const endTime = Bun.nanoseconds();
    const totalDuration = (endTime - startTime) / 1_000_000_000; // Convert to seconds

    // Calculate statistics
    results.sort((a, b) => a - b);
    const avgLatency = results.reduce((a, b) => a + b, 0) / results.length || 0;
    const p50Latency = results[Math.floor(results.length * 0.5)] || 0;
    const p95Latency = results[Math.floor(results.length * 0.95)] || 0;
    const p99Latency = results[Math.floor(results.length * 0.99)] || 0;

    const result: LoadTestResult = {
      url,
      duration: totalDuration,
      requests: requestCount,
      rps: requestCount / totalDuration,
      avgLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      errors: errorCount,
      errorRate: (errorCount / requestCount) * 100,
    };

    this.printResults(scenario.name, result);

    return result;
  }

  async runAll(): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];

    for (const scenario of this.scenarios) {
      const result = await this.run(scenario);
      results.push(result);
    }

    return results;
  }

  private printResults(name: string, result: LoadTestResult): void {
    console.log(`\n✅ ${name} Complete:`);
    console.log(`   Requests: ${result.requests.toLocaleString()}`);
    console.log(`   RPS: ${result.rps.toFixed(2)}`);
    console.log(`   Avg Latency: ${result.avgLatency.toFixed(2)}ms`);
    console.log(`   P50 Latency: ${result.p50Latency.toFixed(2)}ms`);
    console.log(`   P95 Latency: ${result.p95Latency.toFixed(2)}ms`);
    console.log(`   P99 Latency: ${result.p99Latency.toFixed(2)}ms`);
    console.log(`   Errors: ${result.errors} (${result.errorRate.toFixed(2)}%)`);
  }
}
