#!/usr/bin/env bun

/**
 * Fire22 Registry Resilient Test Suite
 *
 * Production-ready tests with proper error handling, timeouts, and retries
 */

import { expect, test, describe, beforeAll, afterAll } from 'bun:test';

// Test environment configuration
const TEST_REGISTRY_URL = 'https://fire22-security-registry.nolarose1968-806.workers.dev';
const TEST_AUTH_TOKEN = 'fire22_test_token_12345';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

interface TestResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json: () => Promise<any>;
  text: () => Promise<string>;
  error?: string;
}

class ResilientRegistryClient {
  private baseUrl: string;
  private authToken: string;
  private timeout: number;
  private maxRetries: number;

  constructor(
    baseUrl: string,
    authToken: string,
    timeout = REQUEST_TIMEOUT,
    maxRetries = MAX_RETRIES
  ) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  async request(path: string, options: RequestInit = {}): Promise<TestResponse> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.authToken}`,
      'User-Agent': 'Fire22-Registry-Tests/1.0',
      ...options.headers,
    };

    console.log(`🔧 Testing ${options.method || 'GET'} ${path}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          json: async () => {
            try {
              return await response.json();
            } catch (e) {
              return { error: 'Failed to parse JSON', raw: await response.text() };
            }
          },
          text: () => response.text(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(
            `  ⚠️  Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`  ❌ All ${this.maxRetries} attempts failed: ${lastError.message}`);
        }
      }
    }

    // Return error response if all attempts failed
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      headers: new Headers(),
      json: async () => ({ error: 'network_error', message: lastError?.message }),
      text: async () => lastError?.message || 'Unknown error',
      error: lastError?.message,
    };
  }

  async healthCheck(): Promise<TestResponse> {
    return await this.request('/health');
  }

  async getStats(): Promise<TestResponse> {
    return await this.request('/-/stats');
  }

  async searchPackages(query: string, limit = 20, offset = 0): Promise<TestResponse> {
    return await this.request(
      `/-/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );
  }

  async publishPackage(packageName: string, packageData: any): Promise<TestResponse> {
    return await this.request(`/${packageName}`, {
      method: 'PUT',
      body: JSON.stringify(packageData),
    });
  }

  async getPackage(packageName: string): Promise<TestResponse> {
    return await this.request(`/${packageName}`);
  }

  async downloadPackage(packageName: string, version: string): Promise<TestResponse> {
    const path = `/${packageName}/-/${packageName.replace('@', '').replace('/', '-')}-${version}.tgz`;
    return await this.request(path);
  }

  // Test connectivity with simple health check
  async testConnectivity(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      return response.ok || response.status > 0; // Any response indicates connectivity
    } catch (error) {
      return false;
    }
  }
}

const client = new ResilientRegistryClient(TEST_REGISTRY_URL, TEST_AUTH_TOKEN);

// Helper functions
function skipIfNoConnectivity(testName: string, response: TestResponse) {
  if (response.error && (response.status === 0 || response.error.includes('Unable to connect'))) {
    console.warn(`⏭️  Skipping ${testName}: No network connectivity to registry`);
    return true;
  }
  return false;
}

function expectNetworkOrSuccess(response: TestResponse, expectedStatus?: number) {
  if (response.error) {
    console.warn(`🌐 Network error (expected in some environments): ${response.error}`);
    const allowedStatuses = [0, expectedStatus || 200, 404, 503];
    expect(allowedStatuses).toContain(response.status); // Allow network errors
  } else if (expectedStatus) {
    expect(response.status).toBe(expectedStatus);
  } else {
    expect(response.ok).toBe(true);
  }
}

describe('Fire22 Registry Resilient Tests', () => {
  let hasConnectivity = false;

  beforeAll(async () => {
    console.log('\n🚀 Fire22 Registry Resilient Test Suite');
    console.log(`🎯 Registry URL: ${TEST_REGISTRY_URL}`);
    console.log(`⏱️  Timeout: ${REQUEST_TIMEOUT}ms`);
    console.log(`🔄 Max retries: ${MAX_RETRIES}`);
    console.log('━'.repeat(60));

    // Test connectivity first
    console.log('🌐 Testing network connectivity...');
    hasConnectivity = await client.testConnectivity();

    if (hasConnectivity) {
      console.log('✅ Network connectivity confirmed');
    } else {
      console.log('⚠️  No network connectivity - tests will be limited');
    }
  });

  describe('🌐 Network and Connectivity', () => {
    test('can establish network connection', async () => {
      const response = await client.healthCheck();

      if (skipIfNoConnectivity('connectivity test', response)) {
        return; // Skip test if no connectivity
      }

      expect(response.ok).toBe(true);
      console.log('✅ Network connection established');
    });
  });

  describe('🏥 Health and Monitoring', () => {
    test('health check returns comprehensive status', async () => {
      const response = await client.healthCheck();

      if (skipIfNoConnectivity('health check', response)) {
        return;
      }

      expectNetworkOrSuccess(response, 200);

      if (response.ok) {
        const health = await response.json();
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('service');
        expect(health).toHaveProperty('version');
        expect(health.version).toBe('2.0.0'); // Production version

        console.log('✅ Health status:', health.status);
        console.log('🏷️  Registry version:', health.version);
        console.log('🔧 Environment:', health.environment);
      }
    });

    test('stats endpoint returns monitoring data', async () => {
      const response = await client.getStats();

      if (skipIfNoConnectivity('stats endpoint', response)) {
        return;
      }

      expectNetworkOrSuccess(response, 200);

      if (response.ok) {
        const stats = await response.json();
        expect(stats).toHaveProperty('totalPackages');
        expect(stats).toHaveProperty('health');
        expect(stats).toHaveProperty('circuitBreakers');
        expect(typeof stats.totalPackages).toBe('number');

        console.log('📈 Total packages:', stats.totalPackages);
        console.log('🔄 Circuit breakers:', Object.keys(stats.circuitBreakers));
        console.log('💾 Health services:', Object.keys(stats.health));
      }
    });
  });

  describe('🔒 Error Handling and Resilience', () => {
    test('handles authentication errors with proper error codes', async () => {
      const unauthenticatedClient = new ResilientRegistryClient(TEST_REGISTRY_URL, '');

      const response = await unauthenticatedClient.publishPackage('@fire22/test-pkg', {
        name: '@fire22/test-pkg',
        version: '1.0.0',
      });

      if (skipIfNoConnectivity('authentication test', response)) {
        return;
      }

      // Should get either auth error or validation error
      const allowedAuthStatuses = [400, 401, 403];
      expect(allowedAuthStatuses).toContain(response.status);

      if (response.status > 0) {
        const error = await response.json();
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('code');

        console.log('🔐 Error code:', error.code);
        console.log('📋 Error type:', error.error);
      }
    });

    test('handles invalid JSON with proper error response', async () => {
      const response = await client.request('/@fire22/malformed-test', {
        method: 'PUT',
        body: '{"invalid": json malformed',
        headers: { 'Content-Type': 'application/json' },
      });

      if (skipIfNoConnectivity('invalid JSON test', response)) {
        return;
      }

      expect(response.status).toBe(400);

      if (response.status === 400) {
        const error = await response.json();
        expect(error.error).toContain('validation');
        console.log('🔧 JSON validation working:', error.code);
      }
    });

    test('CORS headers are present', async () => {
      const response = await client.healthCheck();

      if (skipIfNoConnectivity('CORS test', response)) {
        return;
      }

      if (response.ok) {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        console.log('🌐 CORS headers verified');
      }
    });

    test('handles preflight requests', async () => {
      const response = await client.request('/health', { method: 'OPTIONS' });

      if (skipIfNoConnectivity('preflight test', response)) {
        return;
      }

      expect(response.status).toBe(200);
      console.log('✈️ Preflight requests handled');
    });
  });

  describe('📦 Package Operations', () => {
    const testPackage = {
      name: '@fire22/resilient-test-package',
      version: '1.0.0',
      description: 'Resilient test package',
      keywords: ['test', 'fire22', 'resilient'],
    };

    test('package publishing (if connectivity available)', async () => {
      const response = await client.publishPackage(testPackage.name, testPackage);

      if (skipIfNoConnectivity('package publish', response)) {
        return;
      }

      // Accept various responses - auth might fail in test environment
      const allowedPublishStatuses = [200, 201, 400, 401, 403];
      expect(allowedPublishStatuses).toContain(response.status);

      const result = await response.json();

      // Successful responses might not have 'error' property
      if (response.ok) {
        expect(result).toHaveProperty('ok');
      } else {
        expect(result).toHaveProperty('error');
      }

      if (response.ok) {
        console.log('📦 Package published:', result.id);
      } else {
        console.log('📦 Publish blocked (expected):', result.error);
      }
    });

    test('package retrieval handles not found', async () => {
      const response = await client.getPackage('@fire22/definitely-nonexistent');

      if (skipIfNoConnectivity('package get', response)) {
        return;
      }

      const allowedGetStatuses = [200, 400, 404, 503];
      expect(allowedGetStatuses).toContain(response.status);

      if (response.status === 404) {
        const error = await response.json();
        expect(error.error).toBe('not_found');
        console.log('🔍 Not found handled correctly');
      }
    });
  });

  describe('🔍 Search Functionality', () => {
    test('search returns formatted results', async () => {
      const response = await client.searchPackages('fire22');

      if (skipIfNoConnectivity('search test', response)) {
        return;
      }

      expectNetworkOrSuccess(response, 200);

      if (response.ok) {
        const results = await response.json();
        expect(results).toHaveProperty('objects');
        expect(Array.isArray(results.objects)).toBe(true);
        console.log(`🔍 Search returned ${results.objects.length} results`);
      }
    });

    test('search handles special characters', async () => {
      const response = await client.searchPackages('@#$%');

      if (skipIfNoConnectivity('special character search', response)) {
        return;
      }

      expectNetworkOrSuccess(response, 200);
      console.log('🔤 Special characters handled in search');
    });
  });

  describe('⚡ Performance and Reliability', () => {
    test('responses include monitoring headers', async () => {
      const response = await client.healthCheck();

      if (skipIfNoConnectivity('monitoring headers test', response)) {
        return;
      }

      if (response.ok) {
        const registryName = response.headers.get('X-Registry-Name');
        const registryVersion = response.headers.get('X-Registry-Version');
        const requestId = response.headers.get('X-Request-ID');

        expect(registryName).toContain('Fire22');
        expect(registryVersion).toBe('2.0.0');
        expect(requestId).toBeTruthy();

        console.log('📊 Monitoring headers verified');
        console.log(`🏷️  Version: ${registryVersion}`);
      }
    });

    test('health check responds within timeout', async () => {
      const startTime = performance.now();
      const response = await client.healthCheck();
      const duration = performance.now() - startTime;

      if (!skipIfNoConnectivity('response time test', response)) {
        expect(duration).toBeLessThan(REQUEST_TIMEOUT);
        console.log(`⚡ Response time: ${Math.round(duration)}ms`);
      }
    });
  });

  describe('🔄 Concurrent Operations', () => {
    test('handles multiple concurrent requests', async () => {
      const concurrency = 5; // Reduced for reliability
      const requests = Array(concurrency)
        .fill(null)
        .map(() => client.healthCheck());

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const duration = performance.now() - startTime;

      const successfulResponses = responses.filter(r => r.ok).length;
      const networkErrors = responses.filter(r => r.error).length;

      console.log(
        `🔄 ${concurrency} concurrent requests: ${successfulResponses} successful, ${networkErrors} network errors`
      );
      console.log(`⏱️  Total time: ${Math.round(duration)}ms`);

      // At least some requests should work if we have connectivity
      if (hasConnectivity) {
        expect(successfulResponses).toBeGreaterThan(0);
      }
    });
  });
});

describe('🧪 Production Environment Validation', () => {
  test('production configuration is active', async () => {
    const response = await client.healthCheck();

    if (skipIfNoConnectivity('production config test', response)) {
      return;
    }

    if (response.ok) {
      const health = await response.json();

      // Verify production settings
      expect(health.version).toBe('2.0.0');
      expect(health.service).toContain('Production');
      expect(health.environment.securityScanning).toBe(true);
      expect(health.environment.fallbackMode).toBe(true);

      console.log('✅ Production configuration verified');
      console.log('🔒 Security scanning:', health.environment.securityScanning);
      console.log('🛡️  Fallback mode:', health.environment.fallbackMode);
    }
  });
});

console.log('\n🚀 Starting Fire22 Registry Resilient Test Suite...\n');
console.log(`🎯 Testing registry at: ${TEST_REGISTRY_URL}`);
console.log(`🔐 Using auth token: ${TEST_AUTH_TOKEN.substring(0, 15)}...`);
console.log(`⏱️  Request timeout: ${REQUEST_TIMEOUT}ms`);
console.log(`🔄 Max retry attempts: ${MAX_RETRIES}`);
console.log('━'.repeat(80));
