/**
 * API Test Runner
 * Comprehensive testing framework for API endpoints
 */

import { ResponseManager } from '../responses/response-manager';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedResponse?: any;
  timeout?: number;
  skip?: boolean;
  tags?: string[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
}

export interface TestResult {
  testId: string;
  suiteId: string;
  success: boolean;
  duration: number;
  statusCode?: number;
  response?: any;
  error?: string;
  assertions: TestAssertion[];
  timestamp: Date;
}

export interface TestAssertion {
  type: 'status' | 'header' | 'body' | 'schema' | 'performance';
  description: string;
  success: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  enableContractTesting: boolean;
  enablePerformanceTesting: boolean;
  enableLoadTesting: boolean;
  authToken?: string;
  headers: Record<string, string>;
}

export class APITestRunner {
  private config: TestConfig;
  private responseManager: ResponseManager;
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: TestResult[] = [];

  constructor(config: TestConfig, responseManager: ResponseManager) {
    this.config = config;
    this.responseManager = responseManager;
  }

  /**
   * Register a test suite
   */
  registerSuite(suite: TestSuite): void {
    this.testSuites.set(suite.id, suite);
  }

  /**
   * Run all test suites
   */
  async runAllSuites(): Promise<{
    results: TestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
    };
  }> {
    const startTime = Date.now();
    this.testResults = [];

    for (const suite of this.testSuites.values()) {
      await this.runSuite(suite);
    }

    const duration = Date.now() - startTime;
    const summary = this.generateSummary();

    return { results: this.testResults, summary: { ...summary, duration } };
  }

  /**
   * Run a specific test suite
   */
  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    console.log(`🧪 Running test suite: ${suite.name}`);

    const results: TestResult[] = [];

    // Suite setup
    if (suite.setup) {
      try {
        await suite.setup();
      } catch (error) {
        console.error(`Suite setup failed for ${suite.id}:`, error);
        return results;
      }
    }

    // Run each test
    for (const test of suite.tests) {
      if (test.skip) {
        results.push(this.createSkippedResult(test, suite.id));
        continue;
      }

      const result = await this.runTest(test, suite.id, suite.timeout);
      results.push(result);
      this.testResults.push(result);
    }

    // Suite teardown
    if (suite.teardown) {
      try {
        await suite.teardown();
      } catch (error) {
        console.error(`Suite teardown failed for ${suite.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Run a single test case
   */
  private async runTest(
    test: TestCase,
    suiteId: string,
    suiteTimeout?: number
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test setup
      if (test.setup) {
        await test.setup();
      }

      // Create request
      const url = `${this.config.baseUrl}${test.path}`;
      const headers = {
        ...this.config.headers,
        ...test.headers,
      };

      // Add auth token if configured
      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }

      const requestInit: RequestInit = {
        method: test.method,
        headers,
      };

      // Add body for non-GET requests
      if (test.body && test.method !== 'GET') {
        requestInit.body = JSON.stringify(test.body);
      }

      // Execute request with timeout
      const controller = new AbortController();
      const timeout = test.timeout || suiteTimeout || this.config.timeout;

      const timeoutId = setTimeout(() => controller.abort(), timeout);
      requestInit.signal = controller.signal;

      const response = await fetch(url, requestInit);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseBody = await this.parseResponse(response);

      // Run assertions
      const assertions = await this.runAssertions(test, response, responseBody);

      // Test teardown
      if (test.teardown) {
        await test.teardown();
      }

      return {
        testId: test.id,
        suiteId,
        success: assertions.every(a => a.success),
        duration,
        statusCode: response.status,
        response: responseBody,
        assertions,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Test teardown (even on error)
      if (test.teardown) {
        try {
          await test.teardown();
        } catch (teardownError) {
          console.error('Test teardown error:', teardownError);
        }
      }

      return {
        testId: test.id,
        suiteId,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        assertions: [],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run assertions for a test
   */
  private async runAssertions(
    test: TestCase,
    response: Response,
    responseBody: any
  ): Promise<TestAssertion[]> {
    const assertions: TestAssertion[] = [];

    // Status code assertion
    assertions.push({
      type: 'status',
      description: 'HTTP status code matches expected',
      success: response.status === test.expectedStatus,
      expected: test.expectedStatus,
      actual: response.status,
    });

    // Response body assertions
    if (test.expectedResponse) {
      assertions.push({
        type: 'body',
        description: 'Response body matches expected structure',
        success: this.deepEqual(responseBody, test.expectedResponse),
        expected: test.expectedResponse,
        actual: responseBody,
      });
    }

    // Header assertions
    if (test.headers) {
      for (const [header, expectedValue] of Object.entries(test.headers)) {
        const actualValue = response.headers.get(header);
        assertions.push({
          type: 'header',
          description: `Header '${header}' matches expected value`,
          success: actualValue === expectedValue,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }

    // Schema validation (if enabled)
    if (this.config.enableContractTesting && test.expectedResponse) {
      const schemaValidation = this.validateSchema(responseBody, test.expectedResponse);
      assertions.push({
        type: 'schema',
        description: 'Response matches expected schema',
        success: schemaValidation.valid,
        error: schemaValidation.errors?.join(', '),
      });
    }

    return assertions;
  }

  /**
   * Parse response body
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType.includes('text/')) {
      return await response.text();
    }

    return await response.blob();
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a == null || b == null) return a === b;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Validate response schema
   */
  private validateSchema(data: any, schema: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Simple schema validation (could be enhanced with libraries like Joi)
    if (typeof schema === 'object' && schema !== null) {
      if (typeof data !== 'object' || data === null) {
        errors.push('Expected object, got ' + typeof data);
        return { valid: false, errors };
      }

      for (const [key, expectedType] of Object.entries(schema)) {
        if (!(key in data)) {
          errors.push(`Missing required field: ${key}`);
          continue;
        }

        const actualValue = data[key];
        if (typeof expectedType === 'string') {
          if (typeof actualValue !== expectedType) {
            errors.push(`Field '${key}' expected ${expectedType}, got ${typeof actualValue}`);
          }
        } else if (Array.isArray(expectedType)) {
          if (!Array.isArray(actualValue)) {
            errors.push(`Field '${key}' expected array, got ${typeof actualValue}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Create skipped test result
   */
  private createSkippedResult(test: TestCase, suiteId: string): TestResult {
    return {
      testId: test.id,
      suiteId,
      success: true, // Skipped tests are considered successful
      duration: 0,
      assertions: [
        {
          type: 'status',
          description: 'Test skipped',
          success: true,
        },
      ],
      timestamp: new Date(),
    };
  }

  /**
   * Generate test summary
   */
  private generateSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const skipped = this.testResults.filter(r =>
      r.assertions.some(a => a.description === 'Test skipped')
    ).length;

    return { total, passed, failed, skipped };
  }

  /**
   * Load test suites from configuration
   */
  loadSuitesFromConfig(config: any): void {
    if (config.suites) {
      config.suites.forEach((suite: TestSuite) => {
        this.registerSuite(suite);
      });
    }
  }

  /**
   * Export test results
   */
  exportResults(format: 'json' | 'junit' | 'html' = 'json'): string {
    switch (format) {
      case 'junit':
        return this.exportJUnit();
      case 'html':
        return this.exportHTML();
      default:
        return JSON.stringify(this.testResults, null, 2);
    }
  }

  /**
   * Export results in JUnit XML format
   */
  private exportJUnit(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites>\n';

    const suites = new Map<string, TestResult[]>();
    this.testResults.forEach(result => {
      if (!suites.has(result.suiteId)) {
        suites.set(result.suiteId, []);
      }
      suites.get(result.suiteId)!.push(result);
    });

    for (const [suiteId, results] of suites) {
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      xml += `  <testsuite name="${suiteId}" tests="${results.length}" failures="${failed}" time="${results.reduce((sum, r) => sum + r.duration, 0) / 1000}">\n`;

      results.forEach(result => {
        xml += `    <testcase name="${result.testId}" time="${result.duration / 1000}">\n`;
        if (!result.success && result.error) {
          xml += `      <failure message="${result.error}"></failure>\n`;
        }
        xml += '    </testcase>\n';
      });

      xml += '  </testsuite>\n';
    }

    xml += '</testsuites>';
    return xml;
  }

  /**
   * Export results in HTML format
   */
  private exportHTML(): string {
    const summary = this.generateSummary();

    return `
<!DOCTYPE html>
<html>
<head>
    <title>API Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .test { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .test.passed { border-color: #28a745; }
        .test.failed { border-color: #dc3545; }
        .assertion { margin: 5px 0; }
        .assertion.failed { color: #dc3545; }
    </style>
</head>
<body>
    <h1>API Test Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total: ${summary.total}</p>
        <p class="passed">Passed: ${summary.passed}</p>
        <p class="failed">Failed: ${summary.failed}</p>
        <p class="skipped">Skipped: ${summary.skipped}</p>
    </div>
    <h2>Test Details</h2>
    ${this.testResults
      .map(
        result => `
        <div class="test ${result.success ? 'passed' : 'failed'}">
            <h3>${result.testId}</h3>
            <p>Duration: ${result.duration}ms</p>
            <p>Status: ${result.success ? 'PASSED' : 'FAILED'}</p>
            ${result.error ? `<p>Error: ${result.error}</p>` : ''}
            <div class="assertions">
                ${result.assertions
                  .map(
                    assertion => `
                    <div class="assertion ${assertion.success ? '' : 'failed'}">
                        ${assertion.description}: ${assertion.success ? '✓' : '✗'}
                        ${assertion.error ? ` (${assertion.error})` : ''}
                    </div>
                `
                  )
                  .join('')}
            </div>
        </div>
    `
      )
      .join('')}
</body>
</html>`;
  }

  /**
   * Get test statistics
   */
  getStats(): {
    totalSuites: number;
    totalTests: number;
    averageDuration: number;
    slowestTest: { id: string; duration: number };
    fastestTest: { id: string; duration: number };
  } {
    const totalSuites = this.testSuites.size;
    const totalTests = this.testResults.length;
    const averageDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    const sortedByDuration = [...this.testResults].sort((a, b) => b.duration - a.duration);
    const slowestTest = sortedByDuration[0]
      ? {
          id: sortedByDuration[0].testId,
          duration: sortedByDuration[0].duration,
        }
      : { id: '', duration: 0 };

    const fastestTest = sortedByDuration[totalTests - 1]
      ? {
          id: sortedByDuration[totalTests - 1].testId,
          duration: sortedByDuration[totalTests - 1].duration,
        }
      : { id: '', duration: 0 };

    return {
      totalSuites,
      totalTests,
      averageDuration,
      slowestTest,
      fastestTest,
    };
  }
}

// Default test configuration
export const defaultTestConfig: TestConfig = {
  baseUrl: 'http://localhost:8787',
  timeout: 30000,
  retries: 3,
  enableContractTesting: true,
  enablePerformanceTesting: false,
  enableLoadTesting: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};
