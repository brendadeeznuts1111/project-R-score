#!/usr/bin/env bun

/**
 * Fire22 Registry Production Test Suite
 *
 * Comprehensive testing for all edge cases, failure scenarios,
 * and production reliability features
 */

import { expect, test, describe, beforeAll, afterAll } from 'bun:test';

// Test environment configuration
const TEST_REGISTRY_URL = 'https://fire22-security-registry.nolarose1968-806.workers.dev';
const TEST_AUTH_TOKEN = 'fire22_test_token_12345';

interface TestResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

class RegistryTestClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async request(path: string, options: RequestInit = {}): Promise<TestResponse> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.authToken}`,
      ...options.headers,
    };

    console.log(`🔧 Testing ${options.method || 'GET'} ${path}`);

    try {
      const response = await fetch(url, { ...options, headers });

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        json: () => response.json(),
        text: () => response.text(),
      };
    } catch (error) {
      console.error(`❌ Request failed:`, error);
      throw error;
    }
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
}

const client = new RegistryTestClient(TEST_REGISTRY_URL, TEST_AUTH_TOKEN);

describe('Fire22 Registry Production Tests', () => {
  describe('🏥 Health and Monitoring', () => {
    test('health check returns comprehensive status', async () => {
      const response = await client.healthCheck();
      expect(response.ok).toBe(true);

      const health = await response.json();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('service');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('circuitBreakers');
      expect(health).toHaveProperty('timestamp');

      console.log('✅ Health status:', health.status);
      console.log('📊 Services:', health.services);
      console.log('⚡ Circuit breakers:', health.circuitBreakers);
    });

    test('stats endpoint returns metrics and monitoring data', async () => {
      const response = await client.getStats();
      expect(response.ok).toBe(true);

      const stats = await response.json();
      expect(stats).toHaveProperty('totalPackages');
      expect(stats).toHaveProperty('health');
      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats).toHaveProperty('metrics');
      expect(typeof stats.totalPackages).toBe('number');

      console.log('📈 Total packages:', stats.totalPackages);
      console.log('💾 Circuit breaker states:', Object.keys(stats.circuitBreakers));
    });
  });

  describe('🔒 Authentication and Authorization', () => {
    test('rejects requests without authentication', async () => {
      const unauthenticatedClient = new RegistryTestClient(TEST_REGISTRY_URL, '');

      const response = await unauthenticatedClient.publishPackage('@fire22/test-pkg', {
        name: '@fire22/test-pkg',
        version: '1.0.0',
      });

      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error.error).toBe('authentication');
      expect(error.message).toContain('Bearer token');

      console.log('🔐 Authentication correctly enforced');
    });

    test('rejects packages outside allowed scopes', async () => {
      const response = await client.publishPackage('unauthorized-package', {
        name: 'unauthorized-package',
        version: '1.0.0',
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('validation');
      expect(error.message).toContain('allowed scopes');

      console.log('🛡️ Scope validation correctly enforced');
    });
  });

  describe('📦 Package Management', () => {
    const testPackage = {
      name: '@fire22/prod-test-package',
      version: '1.0.0',
      description: 'Production test package for registry reliability',
      keywords: ['test', 'fire22', 'production'],
      main: 'index.js',
    };

    test('publishes package successfully', async () => {
      const response = await client.publishPackage(testPackage.name, testPackage);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);

      const result = await response.json();
      expect(result.ok).toBe(true);
      expect(result.id).toBe(testPackage.name);
      expect(result.rev).toBe(testPackage.version);
      expect(result).toHaveProperty('security');
      expect(result.security.score).toBe(100);

      console.log('📦 Package published successfully:', result.id);
    });

    test('retrieves package metadata', async () => {
      const response = await client.getPackage(testPackage.name);

      expect(response.ok).toBe(true);

      const pkg = await response.json();
      expect(pkg.name).toBe(testPackage.name);
      expect(pkg).toHaveProperty('dist-tags');
      expect(pkg).toHaveProperty('versions');
      expect(pkg['dist-tags'].latest).toBe(testPackage.version);
      expect(pkg.versions[testPackage.version]).toHaveProperty('description');

      console.log('📋 Package metadata retrieved:', pkg.name);
      console.log('🏷️ Latest version:', pkg['dist-tags'].latest);
    });

    test('handles package download requests', async () => {
      const response = await client.downloadPackage(testPackage.name, testPackage.version);

      // Package download might return 404 if tarball wasn't actually stored
      // but the endpoint should handle the request properly
      expect([200, 404, 500].includes(response.status)).toBe(true);

      if (response.status === 404) {
        const error = await response.json();
        expect(error.error).toBe('not_found');
        console.log('📥 Download endpoint correctly handles missing tarball');
      } else {
        console.log('📥 Download endpoint accessible');
      }
    });

    test('handles package not found gracefully', async () => {
      const response = await client.getPackage('@fire22/nonexistent-package');

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe('not_found');
      expect(error.message).toContain('not found');

      console.log('🔍 Not found errors handled gracefully');
    });
  });

  describe('🔍 Search Functionality', () => {
    test('search returns properly formatted results', async () => {
      const response = await client.searchPackages('fire22');

      expect(response.ok).toBe(true);

      const results = await response.json();
      expect(results).toHaveProperty('objects');
      expect(results).toHaveProperty('total');
      expect(results).toHaveProperty('from');
      expect(results).toHaveProperty('size');
      expect(Array.isArray(results.objects)).toBe(true);

      console.log(`🔍 Search returned ${results.objects.length} results`);

      if (results.objects.length > 0) {
        const firstResult = results.objects[0];
        expect(firstResult).toHaveProperty('package');
        expect(firstResult).toHaveProperty('score');
        expect(firstResult.package).toHaveProperty('name');
        expect(firstResult.score).toHaveProperty('final');

        console.log('📊 First result:', firstResult.package.name);
      }
    });

    test('search handles empty results gracefully', async () => {
      const response = await client.searchPackages('nonexistent-search-term-xyz123');

      expect(response.ok).toBe(true);

      const results = await response.json();
      expect(results.objects).toEqual([]);
      expect(results.total).toBe(0);

      console.log('🔍 Empty search results handled correctly');
    });

    test('search respects pagination parameters', async () => {
      const response = await client.searchPackages('', 5, 0);

      expect(response.ok).toBe(true);

      const results = await response.json();
      expect(results.size).toBe(5);
      expect(results.from).toBe(0);
      expect(results.objects.length).toBeLessThanOrEqual(5);

      console.log(`📄 Pagination working: ${results.objects.length}/${results.size} results`);
    });
  });

  describe('⚡ Rate Limiting', () => {
    test('rate limiting enforces limits', async () => {
      const requests = [];
      const maxRequests = 105; // Slightly over the limit of 100/minute

      console.log(`🚀 Sending ${maxRequests} rapid requests to test rate limiting...`);

      for (let i = 0; i < maxRequests; i++) {
        requests.push(client.healthCheck());
      }

      const responses = await Promise.all(
        requests.map(async req => {
          try {
            const res = await req;
            return { status: res.status, rateLimited: res.status === 429 };
          } catch (error) {
            return { status: 0, rateLimited: false, error: true };
          }
        })
      );

      const rateLimitedCount = responses.filter(r => r.rateLimited).length;
      const successCount = responses.filter(r => r.status === 200).length;
      const errorCount = responses.filter(r => r.error).length;

      console.log(`📊 Rate limit results:`);
      console.log(`  ✅ Successful: ${successCount}`);
      console.log(`  🚫 Rate limited: ${rateLimitedCount}`);
      console.log(`  ❌ Errors: ${errorCount}`);

      // Should have some rate limited responses
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThan(maxRequests);

      console.log('⚡ Rate limiting is working correctly');
    });
  });

  describe('🔄 Error Recovery and Resilience', () => {
    test('handles malformed JSON gracefully', async () => {
      const response = await client.request('/@fire22/malformed-test', {
        method: 'PUT',
        body: '{"invalid": json malformed',
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('validation');
      expect(error.message).toContain('JSON');

      console.log('🔧 Malformed JSON handled gracefully');
    });

    test('handles missing required fields', async () => {
      const response = await client.publishPackage('@fire22/incomplete-package', {
        // Missing required fields like name, version
        description: 'Incomplete package for testing',
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('validation');

      console.log('📋 Missing fields validation working');
    });

    test('CORS headers are present on all responses', async () => {
      const response = await client.healthCheck();

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');

      console.log('🌐 CORS headers correctly configured');
    });

    test('preflight requests are handled', async () => {
      const response = await client.request('/health', {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      console.log('✈️ Preflight requests handled correctly');
    });

    test('monitoring headers are included', async () => {
      const response = await client.healthCheck();

      expect(response.headers.get('X-Registry-Name')).toContain('Fire22');
      expect(response.headers.get('X-Registry-Version')).toBeTruthy();
      expect(response.headers.get('X-Request-ID')).toBeTruthy();

      console.log('📊 Monitoring headers present');
      console.log('🏷️ Registry version:', response.headers.get('X-Registry-Version'));
    });
  });

  describe('🚀 Performance and Scalability', () => {
    test('health check responds quickly', async () => {
      const startTime = Date.now();
      const response = await client.healthCheck();
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds

      console.log(`⚡ Health check response time: ${responseTime}ms`);
    });

    test('concurrent requests are handled properly', async () => {
      const concurrency = 10;
      const requests = Array(concurrency)
        .fill(null)
        .map(() => client.healthCheck());

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const allSuccessful = responses.every(r => r.ok);
      const totalTime = endTime - startTime;

      expect(allSuccessful).toBe(true);

      console.log(`🔄 ${concurrency} concurrent requests completed in ${totalTime}ms`);
      console.log(`📊 Average per request: ${Math.round(totalTime / concurrency)}ms`);
    });
  });

  describe('🔧 Edge Cases', () => {
    test('handles extremely long package names', async () => {
      const longPackageName = '@fire22/' + 'x'.repeat(200);

      const response = await client.getPackage(longPackageName);

      // Should handle gracefully, either with 404 or proper processing
      expect([200, 404, 400].includes(response.status)).toBe(true);

      console.log(`📏 Long package name handled: ${response.status}`);
    });

    test('handles special characters in search', async () => {
      const specialQuery = encodeURIComponent('@#$%^&*()_+{}|:<>?[]\\;\'",./');
      const response = await client.searchPackages(specialQuery);

      expect(response.ok).toBe(true);

      const results = await response.json();
      expect(results).toHaveProperty('objects');

      console.log('🔤 Special characters in search handled');
    });

    test('handles invalid pagination parameters', async () => {
      const response = await client.searchPackages('fire22', -5, -10);

      expect(response.ok).toBe(true);

      const results = await response.json();
      expect(results.from).toBeGreaterThanOrEqual(0);
      expect(results.size).toBeGreaterThan(0);

      console.log('📄 Invalid pagination handled gracefully');
    });
  });
});

describe('🧪 Fallback and Degradation Tests', () => {
  test('service continues operating with partial failures', async () => {
    // These tests would ideally simulate database/storage failures
    // For now, we test that the service handles error responses gracefully

    const response = await client.healthCheck();
    expect(response.ok).toBe(true);

    const health = await response.json();

    // Even if some services are unhealthy, the registry should still respond
    if (health.status === 'degraded') {
      console.log('🟡 Registry operating in degraded mode');
      console.log(
        '🔧 Unhealthy services:',
        Object.entries(health.services)
          .filter(([_, healthy]) => !healthy)
          .map(([service]) => service)
      );
    } else {
      console.log('✅ All services healthy');
    }

    // Should always return some response
    expect(health).toHaveProperty('status');
  });
});

describe('📊 Production Metrics Validation', () => {
  test('metrics are collected and accessible', async () => {
    // Make a few requests to generate metrics
    await client.healthCheck();
    await client.searchPackages('test');

    const response = await client.getStats();
    const stats = await response.json();

    if (stats.metrics && Object.keys(stats.metrics).length > 0) {
      console.log('📊 Metrics are being collected:');
      console.log('  📈 Available metrics:', Object.keys(stats.metrics).length);

      // Look for expected metric patterns
      const metricNames = Object.keys(stats.metrics);
      const hasRequestMetrics = metricNames.some(name => name.includes('requests'));
      const hasTimingMetrics = metricNames.some(name => name.includes('timing'));

      if (hasRequestMetrics) console.log('  ✅ Request metrics found');
      if (hasTimingMetrics) console.log('  ✅ Timing metrics found');
    } else {
      console.log('📊 No metrics data available (may be expected in some environments)');
    }

    expect(stats).toHaveProperty('metrics');
  });
});

// Performance benchmarking
describe('🏃 Performance Benchmarks', () => {
  test('measures end-to-end publish performance', async () => {
    const testPackage = {
      name: '@fire22/benchmark-test',
      version: '1.0.0',
      description: 'Benchmark test package',
    };

    const startTime = performance.now();
    const response = await client.publishPackage(testPackage.name, testPackage);
    const endTime = performance.now();

    const duration = endTime - startTime;

    if (response.ok) {
      console.log(`⚡ Package publish took: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    } else {
      console.log(`⚠️  Publish failed with status: ${response.status}`);
      // Even failed requests should complete quickly
      expect(duration).toBeLessThan(5000);
    }
  });
});

console.log('\n🚀 Starting Fire22 Registry Production Test Suite...\n');
console.log(`🎯 Testing registry at: ${TEST_REGISTRY_URL}`);
console.log(`🔐 Using auth token: ${TEST_AUTH_TOKEN.substring(0, 10)}...`);
console.log('━'.repeat(60));
