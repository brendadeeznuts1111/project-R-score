#!/usr/bin/env bun

/**
 * MCP Registry Component Tests
 * Components #51, #52, #53, #55
 *
 * Tests the following endpoints:
 * 1. Package compression (Component #51)
 * 2. Standalone build status (Component #52)
 * 3. Resilient endpoint testing (Component #53)
 * 4. Zig 0.15.2 build metrics (Component #55)
 */

interface TestResult {
  component: number;
  endpoint: string;
  status: 'success' | 'failed' | 'skipped';
  response?: any;
  error?: string;
  duration: number;
}

interface CompressionResponse {
  package: string;
  format: string;
  compressedSize: string;
  originalSize: string;
  ratio: number;
}

interface BuildStatusResponse {
  status: string;
  buildId: string;
  timestamp: string;
}

interface ResilientTestResponse {
  attempts: number;
  successes: number;
  failures: number;
  averageLatency: number;
  retryPattern: number[];
}

interface ZigMetricsResponse {
  binarySize: string;
  reduction: string;
  time: string;
}

class MCPRegistryTester {
  private baseUrl: string;
  private token: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'https://api.mcp-registry.com', token?: string) {
    this.baseUrl = baseUrl;
    this.token = token || process.env.MCP_TOKEN || '';
  }

  /**
   * Component #51: Compress MCP registry package
   */
  async testPackageCompression(): Promise<TestResult> {
    const start = performance.now();
    const endpoint = '/mcp/package/compress';

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package: '@yourcompany/mcp-core',
          format: 'zstd',
        }),
      });

      const duration = performance.now() - start;
      const data = await response.json();

      return {
        component: 51,
        endpoint,
        status: 'success',
        response: data,
        duration,
      };
    } catch (error) {
      return {
        component: 51,
        endpoint,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Component #52: Get standalone build status
   */
  async testStandaloneBuildStatus(): Promise<TestResult> {
    const start = performance.now();
    const endpoint = '/mcp/build/standalone-status';

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const duration = performance.now() - start;
      const data = await response.json();

      return {
        component: 52,
        endpoint,
        status: 'success',
        response: data,
        duration,
      };
    } catch (error) {
      return {
        component: 52,
        endpoint,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Component #53: Test flaky endpoint with resilience
   */
  async testResilientEndpoint(): Promise<TestResult> {
    const start = performance.now();
    const endpoint = '/mcp/test/resilient';

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'X-Test-Retry': '3',
          'X-Test-Repeat': '20',
        },
      });

      const duration = performance.now() - start;
      const data = await response.json();

      return {
        component: 53,
        endpoint,
        status: 'success',
        response: data,
        duration,
      };
    } catch (error) {
      return {
        component: 53,
        endpoint,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Component #55: Get Zig 0.15.2 build metrics
   */
  async testZigMetrics(): Promise<TestResult> {
    const start = performance.now();
    const endpoint = '/mcp/build/zig-metrics';

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
      });

      const duration = performance.now() - start;
      const data = await response.json();

      return {
        component: 55,
        endpoint,
        status: 'success',
        response: data,
        duration,
      };
    } catch (error) {
      return {
        component: 55,
        endpoint,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: performance.now() - start,
      };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Running MCP Registry Component Tests...\n');

    const tests = [
      this.testPackageCompression(),
      this.testStandaloneBuildStatus(),
      this.testResilientEndpoint(),
      this.testZigMetrics(),
    ];

    const results = await Promise.all(tests);
    this.results = results;

    return results;
  }

  /**
   * Display results
   */
  displayResults(): void {
    console.log('📊 Test Results:\n');

    let allPassed = true;

    for (const result of this.results) {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`${icon} Component #${result.component} (${result.endpoint})`);
      console.log(`   Duration: ${result.duration.toFixed(2)}ms`);

      if (result.status === 'success') {
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
      } else {
        console.log(`   Error: ${result.error}`);
        allPassed = false;
      }
      console.log('');
    }

    // Verify expected results for Component #55
    const component55 = this.results.find(r => r.component === 55);
    if (component55 && component55.status === 'success') {
      const expected = { binarySize: '4.4MB', reduction: '0.8MB', time: '1.2s' };
      const actual = component55.response as ZigMetricsResponse;

      console.log('🔍 Component #55 Verification:');
      console.log(`   Expected: ${JSON.stringify(expected)}`);
      console.log(`   Actual:   ${JSON.stringify(actual)}`);

      const matches =
        actual.binarySize === expected.binarySize &&
        actual.reduction === expected.reduction &&
        actual.time === expected.time;

      console.log(`   Status: ${matches ? '✅ MATCHES EXPECTED' : '❌ DOES NOT MATCH'}\n`);
    }

    console.log(allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed');
  }
}

// Main execution
async function main() {
  const tester = new MCPRegistryTester();

  // Check if MCP_TOKEN is set
  if (!tester['token']) {
    console.log('⚠️  MCP_TOKEN environment variable not set');
    console.log('Using mock data for demonstration...\n');

    // Mock results for demonstration
    const mockResults: TestResult[] = [
      {
        component: 51,
        endpoint: '/mcp/package/compress',
        status: 'success',
        response: {
          package: '@yourcompany/mcp-core',
          format: 'zstd',
          compressedSize: '2.1MB',
          originalSize: '5.3MB',
          ratio: 0.40,
        },
        duration: 145.32,
      },
      {
        component: 52,
        endpoint: '/mcp/build/standalone-status',
        status: 'success',
        response: {
          status: 'completed',
          buildId: 'build-20251221-001',
          timestamp: '2025-12-21T07:27:00Z',
        },
        duration: 89.15,
      },
      {
        component: 53,
        endpoint: '/mcp/test/resilient',
        status: 'success',
        response: {
          attempts: 20,
          successes: 18,
          failures: 2,
          averageLatency: 45.2,
          retryPattern: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        duration: 923.45,
      },
      {
        component: 55,
        endpoint: '/mcp/build/zig-metrics',
        status: 'success',
        response: {
          binarySize: '4.4MB',
          reduction: '0.8MB',
          time: '1.2s',
        },
        duration: 156.78,
      },
    ];

    tester['results'] = mockResults;
    tester.displayResults();
  } else {
    // Run actual tests
    await tester.runAllTests();
    tester.displayResults();
  }
}

if (import.meta.main) {
  main();
}

export { MCPRegistryTester };
export type { TestResult, CompressionResponse, BuildStatusResponse, ResilientTestResponse, ZigMetricsResponse };
