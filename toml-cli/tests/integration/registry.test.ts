import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { PrivateRegistryClient, createDuoPlusRegistryClient } from '../src/services/PrivateRegistryClient';
import { ScopeContext } from '../src/types/scope.types';

/**
 * Private Registry Tests
 * 
 * Tests for PrivateRegistryClient with mock registry server
 * Covers:
 * - Bearer token authentication
 * - Cookie handling (Set-Cookie parsing)
 * - Scope-based registry routing
 * - Cache management
 * - Health checks
 * - Error handling
 */

// Mock registry server
let mockServer: ReturnType<typeof Bun.serve>;
const TEST_PORT = 9999;
const MOCK_REGISTRY_URL = `http://localhost:${TEST_PORT}`;
const TEST_TOKEN = 'test-bearer-token-12345';

// Test scope contexts
const enterpriseScope: ScopeContext = {
  domain: 'enterprise.duoplus.io',
  platform: 'duoplus',
  scopeId: 'ENTERPRISE',
  overridden: false
};

const developmentScope: ScopeContext = {
  domain: 'dev.duoplus.io',
  platform: 'duoplus',
  scopeId: 'DEVELOPMENT',
  overridden: false
};

// Setup mock registry before tests
beforeAll(async () => {
  // Simulate a real registry with Set-Cookie, auth checks, etc.
  mockServer = Bun.serve({
    port: TEST_PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const authHeader = req.headers.get('Authorization');
      const cookieHeader = req.headers.get('Cookie');

      console.log(`Mock registry: ${req.method} ${url.pathname}`);
      console.log(`  Auth: ${authHeader ? '✓' : '✗'}`);
      console.log(`  Cookie: ${cookieHeader ? '✓' : '✗'}`);

      // Test 1: Require authentication
      if (!authHeader && !cookieHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'www-authenticate': 'Bearer realm="test"'
            }
          }
        );
      }

      // Test 2: Validate token
      if (authHeader && !authHeader.includes(TEST_TOKEN)) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Test 3: Serve package metadata
      if (url.pathname === '/@duoplus/core') {
        return new Response(
          JSON.stringify({
            name: '@duoplus/core',
            version: '3.7.0',
            description: 'DuoPlus Core Library',
            dist: {
              tarball: `${MOCK_REGISTRY_URL}/@duoplus/core/-/core-3.7.0.tgz`,
              shasum: 'abc123',
              integrity: 'sha512-xyz'
            }
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': 'registry_session=session_abc123; Path=/; HttpOnly'
            }
          }
        );
      }

      // Test 4: Multiple versions
      if (url.pathname === '/@duoplus/analytics') {
        return new Response(
          JSON.stringify({
            name: '@duoplus/analytics',
            version: '2.5.1',
            versions: {
              '1.0.0': { version: '1.0.0' },
              '2.0.0': { version: '2.0.0' },
              '2.5.1': { version: '2.5.1' }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Test 5: Not found
      if (url.pathname === '/@duoplus/nonexistent') {
        return new Response(
          JSON.stringify({ error: 'Package not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Test 6: Health check endpoint
      if (url.pathname === '/health' || url.pathname === '/-/health') {
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterAll(() => {
  mockServer.stop();
});

// ============================================================================
// Test Suite
// ============================================================================

describe('PrivateRegistryClient', () => {
  describe('Bearer Token Authentication', () => {
    test('should fetch with valid bearer token', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(true);
      expect(response.data?.name).toBe('@duoplus/core');
      expect(response.data?.version).toBe('3.7.0');
      expect(response.statusCode).toBe(200);
    });

    test('should fail with invalid token', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: 'invalid-token-xyz',
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(403);
    });

    test('should fail without authentication', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        // No token provided
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Cookie Handling', () => {
    test('should parse Set-Cookie from response', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(true);
      expect(response.headers['set-cookie']).toContain('registry_session');
    });

    test('should send Cookie header with subsequent requests', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        cookies: {
          registry_session: 'session_abc123'
        },
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/analytics',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Scope-Based Routing', () => {
    test('should route ENTERPRISE scope correctly', async () => {
      const client = createDuoPlusRegistryClient();
      const config = client.getRegistryConfig(enterpriseScope);

      expect(config).not.toBeNull();
      expect(config?.scope).toBe('@duoplus');
    });

    test('should route DEVELOPMENT scope correctly', async () => {
      const client = createDuoPlusRegistryClient();
      const config = client.getRegistryConfig(developmentScope);

      expect(config).not.toBeNull();
      expect(config?.scope).toBe('@duoplus-dev');
    });

    test('should handle multiple scopes', async () => {
      const client = new PrivateRegistryClient();

      // Register multiple registries
      client.registerRegistry('SCOPE1', {
        registry: MOCK_REGISTRY_URL,
        scope: '@scope1',
        token: TEST_TOKEN
      });

      client.registerRegistry('SCOPE2', {
        registry: MOCK_REGISTRY_URL,
        scope: '@scope2',
        token: TEST_TOKEN
      });

      const config1 = client.getRegistryConfig({
        domain: 'test1.io',
        platform: 'duoplus',
        scopeId: 'SCOPE1',
        overridden: false
      });

      const config2 = client.getRegistryConfig({
        domain: 'test2.io',
        platform: 'duoplus',
        scopeId: 'SCOPE2',
        overridden: false
      });

      expect(config1?.scope).toBe('@scope1');
      expect(config2?.scope).toBe('@scope2');
    });
  });

  describe('Package Metadata', () => {
    test('should fetch package metadata', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(true);
      expect(response.data?.name).toBe('@duoplus/core');
      expect(response.data?.version).toBe('3.7.0');
      expect(response.data?.description).toBe('DuoPlus Core Library');
    });

    test('should handle package with multiple versions', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/analytics',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(true);
      expect(response.data?.versions).toBeDefined();
      expect(Object.keys(response.data?.versions || {})).toContain('2.5.1');
    });

    test('should return 404 for nonexistent package', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/nonexistent',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Caching', () => {
    test('should cache package metadata', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      // First request - from network
      const response1 = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        true
      );

      const stats1 = client.getCacheStats();

      // Second request - from cache
      const response2 = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        true
      );

      const stats2 = client.getCacheStats();

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(stats2.entries).toBeGreaterThan(stats1.entries);
    });

    test('should skip cache when requested', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response1 = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false // useCache=false
      );

      expect(response1.success).toBe(true);
    });

    test('should clear cache', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      // Prime cache
      await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        true
      );

      let stats = client.getCacheStats();
      expect(stats.entries).toBeGreaterThan(0);

      // Clear
      client.clearCache();

      stats = client.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    test('should get cache statistics', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const stats = client.getCacheStats();

      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('size');
      expect(typeof stats.entries).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Health Checks', () => {
    test('should check registry health', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const healthy = await client.healthCheck(enterpriseScope);

      expect(typeof healthy).toBe('boolean');
    });

    test('should handle unhealthy registry', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: 'http://localhost:1', // Invalid port
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 1000
      });

      const healthy = await client.healthCheck(enterpriseScope);

      expect(healthy).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeout', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: MOCK_REGISTRY_URL,
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 1 // Very short timeout
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      // Response should indicate failure
      expect(response.success).toBe(false);
    });

    test('should handle invalid URL', async () => {
      const client = new PrivateRegistryClient();
      client.registerRegistry('TEST', {
        registry: 'not-a-valid-url',
        scope: '@duoplus',
        token: TEST_TOKEN,
        timeout: 5000
      });

      const response = await client.fetchPackageMeta(
        '@duoplus/core',
        enterpriseScope,
        false
      );

      expect(response.success).toBe(false);
    });

    test('should handle missing registry config', async () => {
      const client = new PrivateRegistryClient();

      const config = client.getRegistryConfig({
        domain: 'unknown.io',
        platform: 'duoplus',
        scopeId: 'UNKNOWN',
        overridden: false
      });

      expect(config).toBeNull();
    });
  });

  describe('Factory Function', () => {
    test('should create client with default registries', async () => {
      const client = createDuoPlusRegistryClient();

      const enterpriseConfig = client.getRegistryConfig(enterpriseScope);
      const developmentConfig = client.getRegistryConfig(developmentScope);

      expect(enterpriseConfig).not.toBeNull();
      expect(developmentConfig).not.toBeNull();
      expect(enterpriseConfig?.scope).toBe('@duoplus');
      expect(developmentConfig?.scope).toBe('@duoplus-dev');
    });
  });
});

describe('Registry Integration Scenarios', () => {
  test('complete workflow: register -> fetch -> cache -> health', async () => {
    const client = new PrivateRegistryClient();

    // 1. Register registry
    client.registerRegistry('TEST', {
      registry: MOCK_REGISTRY_URL,
      scope: '@duoplus',
      token: TEST_TOKEN,
      timeout: 5000
    });

    // 2. Check health
    const healthy = await client.healthCheck(enterpriseScope);
    expect(healthy).toBe(true);

    // 3. Fetch with caching
    const response1 = await client.fetchPackageMeta(
      '@duoplus/core',
      enterpriseScope,
      true
    );
    expect(response1.success).toBe(true);

    // 4. Fetch from cache
    const response2 = await client.fetchPackageMeta(
      '@duoplus/core',
      enterpriseScope,
      true
    );
    expect(response2.success).toBe(true);

    // 5. Check stats
    const stats = client.getCacheStats();
    expect(stats.entries).toBeGreaterThan(0);
  });

  test('should handle multiple scopes in production', async () => {
    const client = createDuoPlusRegistryClient();

    // Both scopes should work independently
    const healthyE = await client.healthCheck(enterpriseScope);
    const healthyD = await client.healthCheck(developmentScope);

    // (In test, both would be false since we use production URLs)
    expect(typeof healthyE).toBe('boolean');
    expect(typeof healthyD).toBe('boolean');
  });
});
