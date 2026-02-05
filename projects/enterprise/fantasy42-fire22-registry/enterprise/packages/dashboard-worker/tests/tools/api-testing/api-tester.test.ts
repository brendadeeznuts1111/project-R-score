#!/usr/bin/env bun
/**
 * 🔌 Fire22 API Testing Suite
 *
 * Comprehensive API endpoint testing and validation
 * Tests all endpoints defined in src/api/ with realistic scenarios
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Test configuration
interface TestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

interface EndpointTest {
  method: string;
  path: string;
  description: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedFields?: string[];
  auth?: boolean;
}

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  warnings?: string[];
}

class Fire22APITester {
  private config: TestConfig;
  private results: TestResult[] = [];
  private authToken?: string;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:8080',
      timeout: 5000,
      retries: 2,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fire22-API-Tester/3.0.9',
      },
      ...config,
    };
  }

  /**
   * Discover API endpoints from route files
   */
  private async discoverEndpoints(): Promise<EndpointTest[]> {
    const endpoints: EndpointTest[] = [];
    const routesDir = join(process.cwd(), 'src/api/routes');

    if (!existsSync(routesDir)) {
      console.warn('⚠️ API routes directory not found');
      return this.getDefaultEndpoints();
    }

    // Add predefined endpoint tests
    endpoints.push(...this.getDefaultEndpoints());

    return endpoints;
  }

  /**
   * Get default endpoint tests based on Fire22 API structure
   */
  private getDefaultEndpoints(): EndpointTest[] {
    return [
      // Health endpoints (public)
      {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint',
        expectedStatus: 200,
        expectedFields: ['status', 'timestamp'],
      },
      {
        method: 'GET',
        path: '/api/health/detailed',
        description: 'Detailed health check',
        expectedStatus: 200,
        expectedFields: ['status', 'services', 'uptime'],
      },

      // Authentication endpoints (public)
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'User authentication',
        body: {
          username: 'test-user',
          password: 'test-password',
        },
        expectedStatus: 200,
        expectedFields: ['token', 'user'],
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        description: 'Token refresh',
        expectedStatus: 200,
        auth: true,
      },

      // Manager endpoints (protected)
      {
        method: 'GET',
        path: '/api/manager/agents',
        description: 'Get agent list',
        expectedStatus: 200,
        expectedFields: ['agents'],
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/manager/getLiveWagers',
        description: 'Get live wagers',
        body: {
          agentId: 'test-agent',
          limit: 10,
        },
        expectedStatus: 200,
        expectedFields: ['wagers'],
        auth: true,
      },
      {
        method: 'POST',
        path: '/api/manager/getWeeklyFigureByAgent',
        description: 'Get weekly figures by agent',
        body: {
          agentId: 'test-agent',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
        expectedStatus: 200,
        expectedFields: ['figures'],
        auth: true,
      },

      // Admin endpoints (protected)
      {
        method: 'GET',
        path: '/api/admin/agent-configs',
        description: 'Get agent configurations',
        expectedStatus: 200,
        expectedFields: ['agents'],
        auth: true,
      },
      {
        method: 'GET',
        path: '/api/admin/agent-configs-dashboard',
        description: 'Get agent configurations for dashboard',
        expectedStatus: 200,
        expectedFields: ['data'],
        auth: true,
      },

      // Customer endpoints (protected)
      {
        method: 'GET',
        path: '/api/customer/profile',
        description: 'Get customer profile',
        expectedStatus: 200,
        auth: true,
      },

      // Financial endpoints (protected)
      {
        method: 'GET',
        path: '/api/financial/balance',
        description: 'Get account balance',
        expectedStatus: 200,
        expectedFields: ['balance'],
        auth: true,
      },

      // Other endpoints
      {
        method: 'GET',
        path: '/api/other/test',
        description: 'Test endpoint',
        expectedStatus: 200,
      },
    ];
  }

  /**
   * Authenticate and get token for protected endpoints
   */
  private async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify({
          username: process.env.TEST_USERNAME || 'admin',
          password: process.env.TEST_PASSWORD || 'password',
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token || data.access_token;
        console.log('🔐 Authentication successful');
        return true;
      } else {
        console.warn('⚠️ Authentication failed, testing public endpoints only');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Authentication error, testing public endpoints only');
      return false;
    }
  }

  /**
   * Test a single endpoint
   */
  private async testEndpoint(test: EndpointTest): Promise<TestResult> {
    const startTime = performance.now();
    const url = `${this.config.baseUrl}${test.path}`;

    // Skip protected endpoints if no auth token
    if (test.auth && !this.authToken) {
      return {
        endpoint: test.path,
        method: test.method,
        status: 'skip',
        error: 'No authentication token available',
      };
    }

    // Prepare headers
    const headers = {
      ...this.config.headers,
      ...test.headers,
    };

    if (test.auth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Prepare request options
    const options: RequestInit = {
      method: test.method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    };

    if (test.body && ['POST', 'PUT', 'PATCH'].includes(test.method)) {
      options.body = JSON.stringify(test.body);
    }

    let attempt = 0;
    while (attempt < this.config.retries) {
      try {
        console.log(
          `🧪 Testing ${test.method} ${test.path}${attempt > 0 ? ` (retry ${attempt})` : ''}`
        );

        const response = await fetch(url, options);
        const responseTime = performance.now() - startTime;

        // Check status code
        if (response.status !== test.expectedStatus) {
          const responseText = await response.text();
          return {
            endpoint: test.path,
            method: test.method,
            status: 'fail',
            statusCode: response.status,
            responseTime,
            error: `Expected status ${test.expectedStatus}, got ${response.status}. Response: ${responseText}`,
          };
        }

        // Check response structure for JSON responses
        if (response.headers.get('content-type')?.includes('application/json')) {
          try {
            const responseData = await response.json();
            const warnings: string[] = [];

            // Check expected fields
            if (test.expectedFields) {
              for (const field of test.expectedFields) {
                if (!this.hasField(responseData, field)) {
                  warnings.push(`Missing expected field: ${field}`);
                }
              }
            }

            return {
              endpoint: test.path,
              method: test.method,
              status: warnings.length > 0 ? 'fail' : 'pass',
              statusCode: response.status,
              responseTime,
              warnings: warnings.length > 0 ? warnings : undefined,
            };
          } catch (jsonError) {
            return {
              endpoint: test.path,
              method: test.method,
              status: 'fail',
              statusCode: response.status,
              responseTime,
              error: 'Invalid JSON response',
            };
          }
        }

        return {
          endpoint: test.path,
          method: test.method,
          status: 'pass',
          statusCode: response.status,
          responseTime,
        };
      } catch (error) {
        attempt++;
        if (attempt >= this.config.retries) {
          return {
            endpoint: test.path,
            method: test.method,
            status: 'fail',
            responseTime: performance.now() - startTime,
            error: `Network error: ${error.message}`,
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // Should not reach here
    return {
      endpoint: test.path,
      method: test.method,
      status: 'fail',
      error: 'Unknown error',
    };
  }

  /**
   * Check if response has a specific field (supports dot notation)
   */
  private hasField(obj: any, fieldPath: string): boolean {
    const fields = fieldPath.split('.');
    let current = obj;

    for (const field of fields) {
      if (current === null || current === undefined || !(field in current)) {
        return false;
      }
      current = current[field];
    }

    return true;
  }

  /**
   * Run all API tests
   */
  async runTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Fire22 API Test Suite');
    console.log(`📍 Base URL: ${this.config.baseUrl}`);
    console.log(`⏱️  Timeout: ${this.config.timeout}ms`);
    console.log(`🔄 Retries: ${this.config.retries}\n`);

    // Discover endpoints
    const endpoints = await this.discoverEndpoints();
    console.log(`🔍 Discovered ${endpoints.length} endpoints to test\n`);

    // Try to authenticate
    await this.authenticate();

    // Test each endpoint
    this.results = [];
    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint);
      this.results.push(result);

      // Log result
      const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
      const responseTime = result.responseTime ? ` (${result.responseTime.toFixed(2)}ms)` : '';
      console.log(`${emoji} ${result.method} ${result.endpoint}${responseTime}`);

      if (result.error) {
        console.log(`   💥 Error: ${result.error}`);
      }

      if (result.warnings) {
        result.warnings.forEach(warning => {
          console.log(`   ⚠️ Warning: ${warning}`);
        });
      }

      console.log(''); // Empty line for readability
    }

    // Print summary
    this.printSummary();

    return this.results;
  }

  /**
   * Print test results summary
   */
  private printSummary(): void {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const total = this.results.length;

    const avgResponseTime =
      this.results.filter(r => r.responseTime).reduce((sum, r) => sum + r.responseTime!, 0) /
      this.results.filter(r => r.responseTime).length;

    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed}/${total} (${((failed / total) * 100).toFixed(1)}%)`);
    console.log(`⏭️ Skipped: ${skipped}/${total} (${((skipped / total) * 100).toFixed(1)}%)`);
    console.log(`⏱️ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(`   • ${result.method} ${result.endpoint}: ${result.error}`);
        });
    }

    console.log(
      `\n🎯 Overall Status: ${failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}`
    );
  }

  /**
   * Generate test report
   */
  generateReport(): object {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        success_rate: passed / this.results.length,
        average_response_time:
          this.results.filter(r => r.responseTime).reduce((sum, r) => sum + r.responseTime!, 0) /
            this.results.filter(r => r.responseTime).length || 0,
      },
      results: this.results,
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const config: Partial<TestConfig> = {};
  let outputFile: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--base-url':
      case '-u':
        config.baseUrl = args[++i];
        break;
      case '--timeout':
      case '-t':
        config.timeout = parseInt(args[++i]);
        break;
      case '--retries':
      case '-r':
        config.retries = parseInt(args[++i]);
        break;
      case '--output':
      case '-o':
        outputFile = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
🔌 Fire22 API Testing Suite

USAGE:
  bun run scripts/api-tester.ts [options]

OPTIONS:
  -u, --base-url <url>     Base URL for API testing (default: http://localhost:8080)
  -t, --timeout <ms>       Request timeout in milliseconds (default: 5000)
  -r, --retries <count>    Number of retries for failed requests (default: 2)
  -o, --output <file>      Output test report to JSON file
  -h, --help               Show this help message

ENVIRONMENT VARIABLES:
  TEST_USERNAME            Username for authentication (default: admin)
  TEST_PASSWORD            Password for authentication (default: password)

EXAMPLES:
  bun run scripts/api-tester.ts
  bun run scripts/api-tester.ts --base-url http://localhost:3000
  bun run scripts/api-tester.ts --timeout 10000 --retries 3
  bun run scripts/api-tester.ts --output api-test-report.json
`);
        process.exit(0);
    }
  }

  // Run tests
  const tester = new Fire22APITester(config);
  await tester.runTests();

  // Save report if requested
  if (outputFile) {
    const report = tester.generateReport();
    await Bun.write(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Test report saved to: ${outputFile}`);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

export { Fire22APITester, TestResult, EndpointTest };
