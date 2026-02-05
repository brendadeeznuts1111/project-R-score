/**
 * Fire22 API Test Suite
 *
 * Comprehensive tests for the consolidated API implementation
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

// Test server setup
let server: any;
const baseURL = 'http://localhost:8787';

beforeAll(async () => {
  // Import the API router
  const { default: api } = await import('../index.ts');

  // Create test server
  server = Bun.serve({
    port: 8787,
    fetch: api.handle,
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterAll(() => {
  if (server) {
    server.stop();
  }
});

describe('Fire22 API Integration Tests', () => {
  describe('Health Endpoints', () => {
    test('GET /api/health - should return healthy status', async () => {
      const response = await fetch(`${baseURL}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
    });

    test('GET /api/health/status - should return detailed status', async () => {
      const response = await fetch(`${baseURL}/api/health/status`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services).toBeDefined();
      expect(data.performance).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/login - should reject without credentials', async () => {
      const response = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    test('POST /api/auth/login - should accept valid credentials', async () => {
      const response = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tokens.accessToken).toBeDefined();
      expect(data.data.user.role).toBeDefined();
    });

    test('GET /api/auth/verify - should reject without token', async () => {
      const response = await fetch(`${baseURL}/api/auth/verify`);

      expect(response.status).toBe(401);
    });
  });

  describe('Manager Endpoints (Protected)', () => {
    let authToken: string;

    beforeAll(async () => {
      // Get auth token for protected endpoints
      const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'manager',
          password: 'testpass',
        }),
      });

      const loginData = await loginResponse.json();
      authToken = loginData.data.tokens.accessToken;
    });

    test('GET /api/manager/getLiveWagers - should require authentication', async () => {
      const response = await fetch(`${baseURL}/api/manager/getLiveWagers`);

      expect(response.status).toBe(401);
    });

    test('GET /api/manager/getLiveWagers - should work with valid token', async () => {
      const response = await fetch(`${baseURL}/api/manager/getLiveWagers?agentID=TEST001`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`${baseURL}/api/nonexistent`);

      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(response.status).toBe(400);
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  test('health endpoint response time', async () => {
    const start = Date.now();
    const response = await fetch(`${baseURL}/api/health`);
    const end = Date.now();

    expect(response.status).toBe(200);
    expect(end - start).toBeLessThan(100); // Should respond within 100ms
  });

  test('concurrent requests handling', async () => {
    const concurrentRequests = 10; // Reduced for testing
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(fetch(`${baseURL}/api/health`));
    }

    const start = Date.now();
    const responses = await Promise.all(requests);
    const end = Date.now();

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Should handle concurrent requests efficiently
    expect(end - start).toBeLessThan(1000); // Within 1 second
  });
});
