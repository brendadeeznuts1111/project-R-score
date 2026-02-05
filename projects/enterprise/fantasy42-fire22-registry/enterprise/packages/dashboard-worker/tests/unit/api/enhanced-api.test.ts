#!/usr/bin/env bun

/**
 * 🚀 Fire22 Enhanced API Test Suite
 *
 * Enhanced version using our new enterprise-grade patterns:
 * - Performance monitoring with ScriptRunner
 * - Enhanced error handling and recovery
 * - Configuration validation with schemas
 * - Comprehensive logging and metrics
 *
 * @version 2.0.0
 * @author Fire22 Development Team
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { runScript } from '../../scripts/core/script-runner';
import { handleError, createError } from '../../scripts/core/error-handler';
import { validateConfig } from '../../scripts/core/config-validator';

// Enhanced test configuration schema
const testConfigSchema = {
  baseURL: {
    type: 'string',
    required: true,
    pattern: /^https?:\/\/.+/,
    custom: (value: string) => value.includes('localhost') || value.includes('127.0.0.1'),
  },
  port: {
    type: 'number',
    required: true,
    min: 1024,
    max: 65535,
  },
  timeout: {
    type: 'number',
    required: true,
    min: 1000,
    max: 30000,
  },
  concurrentRequests: {
    type: 'number',
    required: true,
    min: 1,
    max: 100,
  },
};

// Enhanced test configuration
const testConfig = {
  baseURL: 'http://localhost:8787',
  port: 8787,
  timeout: 5000,
  concurrentRequests: 10,
};

// Test server setup
let server: any;

// Enhanced server initialization
async function initializeTestServer() {
  return await runScript(
    'test-server-init',
    async () => {
      // Import the API router
      const { default: api } = await import('../index.ts');

      // Create test server
      server = Bun.serve({
        port: testConfig.port,
        fetch: api.handle,
      });

      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      return { server, status: 'ready' };
    },
    {
      tags: ['test', 'api', 'server-init'],
      logLevel: 'info',
      timeout: 10000,
    }
  );
}

// Enhanced server cleanup
async function cleanupTestServer() {
  return await runScript(
    'test-server-cleanup',
    async () => {
      if (server) {
        server.stop();
        return { status: 'stopped' };
      }
      return { status: 'no-server' };
    },
    {
      tags: ['test', 'api', 'server-cleanup'],
      logLevel: 'info',
    }
  );
}

// Enhanced test utilities
async function performAuthenticatedRequest(endpoint: string, token: string, options: any = {}) {
  return await runScript(
    'authenticated-request',
    async () => {
      const response = await fetch(`${testConfig.baseURL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();
      return { response, data, status: response.status };
    },
    {
      tags: ['test', 'api', 'auth', 'request'],
      logLevel: 'info',
      timeout: testConfig.timeout,
    }
  );
}

async function performHealthCheck() {
  return await runScript(
    'health-check',
    async () => {
      const start = Date.now();
      const response = await fetch(`${testConfig.baseURL}/api/health`);
      const end = Date.now();

      const data = await response.json();
      return {
        response,
        data,
        status: response.status,
        responseTime: end - start,
      };
    },
    {
      tags: ['test', 'api', 'health'],
      logLevel: 'info',
      timeout: testConfig.timeout,
    }
  );
}

async function performConcurrentRequests(endpoint: string, count: number) {
  return await runScript(
    'concurrent-requests',
    async () => {
      const requests = [];

      for (let i = 0; i < count; i++) {
        requests.push(fetch(`${testConfig.baseURL}${endpoint}`));
      }

      const start = Date.now();
      const responses = await Promise.all(requests);
      const end = Date.now();

      const results = await Promise.all(
        responses.map(async (response, index) => ({
          index,
          status: response.status,
          data: await response.json(),
        }))
      );

      return {
        results,
        totalTime: end - start,
        averageTime: (end - start) / count,
        successCount: results.filter(r => r.status === 200).length,
        failureCount: results.filter(r => r.status !== 200).length,
      };
    },
    {
      tags: ['test', 'api', 'concurrent', 'performance'],
      logLevel: 'info',
      timeout: testConfig.timeout * 2,
    }
  );
}

// Enhanced test setup
beforeAll(async () => {
  try {
    // Validate test configuration
    const validation = validateConfig(testConfig, testConfigSchema);
    if (!validation.isValid) {
      throw createError(
        'Test configuration validation failed',
        {
          scriptName: 'enhanced-api-test',
          operation: 'config-validation',
        },
        {
          type: 'validation',
          severity: 'high',
          recoverable: false,
          suggestedActions: [
            'Check test configuration values',
            'Verify port availability',
            'Ensure baseURL is accessible',
          ],
        }
      );
    }

    console.log('✅ Test configuration validated successfully');
    console.log(`   Base URL: ${testConfig.baseURL}`);
    console.log(`   Port: ${testConfig.port}`);
    console.log(`   Timeout: ${testConfig.timeout}ms`);
    console.log(`   Concurrent Requests: ${testConfig.concurrentRequests}\n`);

    // Initialize test server
    const initResult = await initializeTestServer();
    if (initResult.data) {
      console.log('🚀 Test server initialized successfully');
    }
  } catch (error) {
    await handleError(error, {
      scriptName: 'enhanced-api-test',
      operation: 'beforeAll-setup',
      environment: 'test',
    });
    throw error;
  }
});

afterAll(async () => {
  try {
    await cleanupTestServer();
    console.log('🧹 Test server cleaned up successfully');
  } catch (error) {
    await handleError(error, {
      scriptName: 'enhanced-api-test',
      operation: 'afterAll-cleanup',
      environment: 'test',
    });
  }
});

// Enhanced test suites
describe('🚀 Fire22 Enhanced API Integration Tests', () => {
  describe('📋 Configuration & Setup', () => {
    test('should have valid test configuration', () => {
      const validation = validateConfig(testConfig, testConfigSchema);
      expect(validation.isValid).toBe(true);
    });

    test('should have test server running', async () => {
      const healthResult = await performHealthCheck();
      expect(healthResult.data.status).toBe(200);
    });
  });

  describe('🏥 Health Endpoints', () => {
    test('GET /api/health - should return healthy status with performance metrics', async () => {
      const result = await performHealthCheck();

      expect(result.data.response.status).toBe(200);
      expect(result.data.data.status).toBe('healthy');
      expect(result.data.data.timestamp).toBeDefined();
      expect(result.data.data.version).toBeDefined();
      expect(result.data.responseTime).toBeLessThan(100); // Should respond within 100ms
    });

    test('GET /api/health/status - should return detailed status information', async () => {
      const result = await runScript(
        'health-status-check',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/health/status`);
          const data = await response.json();
          return { response, data };
        },
        {
          tags: ['test', 'api', 'health', 'detailed'],
          logLevel: 'info',
        }
      );

      expect(result.data.response.status).toBe(200);
      expect(result.data.data.status).toBe('healthy');
      expect(result.data.data.services).toBeDefined();
      expect(result.data.data.performance).toBeDefined();
    });
  });

  describe('🔐 Authentication Endpoints', () => {
    test('POST /api/auth/login - should reject without credentials', async () => {
      const result = await runScript(
        'login-no-credentials',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          const data = await response.json();
          return { response, data };
        },
        {
          tags: ['test', 'api', 'auth', 'login', 'validation'],
          logLevel: 'info',
        }
      );

      expect(result.data.response.status).toBe(400);
    });

    test('POST /api/auth/login - should accept valid credentials', async () => {
      const result = await runScript(
        'login-valid-credentials',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'testuser',
              password: 'testpass',
            }),
          });

          const data = await response.json();
          return { response, data };
        },
        {
          tags: ['test', 'api', 'auth', 'login', 'success'],
          logLevel: 'info',
        }
      );

      expect(result.data.response.status).toBe(200);
      expect(result.data.data.success).toBe(true);
      expect(result.data.data.data.tokens.accessToken).toBeDefined();
      expect(result.data.data.data.user.role).toBeDefined();
    });

    test('GET /api/auth/verify - should reject without token', async () => {
      const result = await runScript(
        'verify-no-token',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/auth/verify`);
          return { response, status: response.status };
        },
        {
          tags: ['test', 'api', 'auth', 'verify', 'unauthorized'],
          logLevel: 'info',
        }
      );

      expect(result.data.status).toBe(401);
    });
  });

  describe('👨‍💼 Manager Endpoints (Protected)', () => {
    let authToken: string;

    beforeAll(async () => {
      const result = await runScript(
        'manager-auth-setup',
        async () => {
          // Get auth token for protected endpoints
          const loginResponse = await fetch(`${testConfig.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'manager',
              password: 'testpass',
            }),
          });

          const loginData = await loginResponse.json();
          return { token: loginData.data.tokens.accessToken };
        },
        {
          tags: ['test', 'api', 'manager', 'auth-setup'],
          logLevel: 'info',
        }
      );

      authToken = result.data.token;
    });

    test('GET /api/manager/getLiveWagers - should require authentication', async () => {
      const result = await runScript(
        'manager-unauthorized',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/manager/getLiveWagers`);
          return { response, status: response.status };
        },
        {
          tags: ['test', 'api', 'manager', 'unauthorized'],
          logLevel: 'info',
        }
      );

      expect(result.data.status).toBe(401);
    });

    test('GET /api/manager/getLiveWagers - should work with valid token', async () => {
      const result = await performAuthenticatedRequest(
        '/api/manager/getLiveWagers?agentID=TEST001',
        authToken
      );

      expect(result.data.status).toBe(200);
    });
  });

  describe('🛡️ Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const result = await runScript(
        'unknown-endpoint',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/nonexistent`);
          return { response, status: response.status };
        },
        {
          tags: ['test', 'api', 'error', 'not-found'],
          logLevel: 'info',
        }
      );

      expect(result.data.status).toBe(404);
    });

    test('should handle malformed JSON gracefully', async () => {
      const result = await runScript(
        'malformed-json',
        async () => {
          const response = await fetch(`${testConfig.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json',
          });

          return { response, status: response.status };
        },
        {
          tags: ['test', 'api', 'error', 'malformed-json'],
          logLevel: 'info',
        }
      );

      expect(result.data.status).toBe(400);
    });
  });
});

// Enhanced Performance Tests
describe('⚡ Enhanced Performance Tests', () => {
  test('health endpoint response time with monitoring', async () => {
    const result = await performHealthCheck();

    expect(result.data.response.status).toBe(200);
    expect(result.data.responseTime).toBeLessThan(100); // Should respond within 100ms

    // Log performance metrics
    console.log(`📊 Health endpoint performance:`);
    console.log(`   Response time: ${result.data.responseTime}ms`);
    console.log(`   Status: ${result.data.status}`);
  });

  test('concurrent requests handling with enhanced monitoring', async () => {
    const result = await performConcurrentRequests('/api/health', testConfig.concurrentRequests);

    // All requests should succeed
    result.data.results.forEach((response: any, index: number) => {
      expect(response.status).toBe(200);
    });

    // Should handle concurrent requests efficiently
    expect(result.data.totalTime).toBeLessThan(1000); // Within 1 second
    expect(result.data.successCount).toBe(testConfig.concurrentRequests);
    expect(result.data.failureCount).toBe(0);

    // Log performance metrics
    console.log(`📊 Concurrent requests performance:`);
    console.log(`   Total time: ${result.data.totalTime}ms`);
    console.log(`   Average time: ${result.data.averageTime.toFixed(2)}ms`);
    console.log(
      `   Success rate: ${((result.data.successCount / testConfig.concurrentRequests) * 100).toFixed(1)}%`
    );
  });

  test('stress test with increasing load', async () => {
    const loadLevels = [5, 10, 20];

    for (const load of loadLevels) {
      const result = await performConcurrentRequests('/api/health', load);

      expect(result.data.successCount).toBe(load);
      expect(result.data.failureCount).toBe(0);

      console.log(`📊 Load test (${load} requests):`);
      console.log(`   Total time: ${result.data.totalTime}ms`);
      console.log(`   Average time: ${result.data.averageTime.toFixed(2)}ms`);
    }
  });
});

// Enhanced Integration Tests
describe('🔗 Enhanced Integration Tests', () => {
  test('full authentication flow with performance tracking', async () => {
    const result = await runScript(
      'full-auth-flow',
      async () => {
        // 1. Login
        const loginStart = Date.now();
        const loginResponse = await fetch(`${testConfig.baseURL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            password: 'testpass',
          }),
        });
        const loginData = await loginResponse.json();
        const loginTime = Date.now() - loginStart;

        // 2. Verify token
        const verifyStart = Date.now();
        const verifyResponse = await fetch(`${testConfig.baseURL}/api/auth/verify`, {
          headers: {
            Authorization: `Bearer ${loginData.data.tokens.accessToken}`,
          },
        });
        const verifyTime = Date.now() - verifyStart;

        return {
          login: { response: loginResponse, data: loginData, time: loginTime },
          verify: { response: verifyResponse, time: verifyTime },
          totalTime: loginTime + verifyTime,
        };
      },
      {
        tags: ['test', 'api', 'integration', 'auth-flow'],
        logLevel: 'info',
        timeout: testConfig.timeout * 2,
      }
    );

    expect(result.data.login.response.status).toBe(200);
    expect(result.data.verify.response.status).toBe(200);
    expect(result.data.totalTime).toBeLessThan(500); // Full flow should complete within 500ms

    console.log(`📊 Full auth flow performance:`);
    console.log(`   Login time: ${result.data.login.time}ms`);
    console.log(`   Verify time: ${result.data.verify.time}ms`);
    console.log(`   Total time: ${result.data.totalTime}ms`);
  });
});

// Enhanced reporting
describe('📊 Enhanced Test Reporting', () => {
  test('should generate comprehensive performance report', async () => {
    const result = await runScript(
      'performance-report-generation',
      async () => {
        const runner = (await import('../../scripts/core/script-runner')).default.getInstance();
        const report = runner.generatePerformanceReport();
        return { report, timestamp: new Date().toISOString() };
      },
      {
        tags: ['test', 'api', 'reporting', 'performance'],
        logLevel: 'info',
      }
    );

    expect(result.data.report).toContain('Fire22 Script Performance Report');
    expect(result.data.timestamp).toBeDefined();

    console.log('\n📈 Enhanced API Test Performance Report:');
    console.log('!==!==!==!==!==!==!==!==');
    console.log(result.data.report);
  });
});

export {
  testConfig,
  testConfigSchema,
  performAuthenticatedRequest,
  performHealthCheck,
  performConcurrentRequests,
};
