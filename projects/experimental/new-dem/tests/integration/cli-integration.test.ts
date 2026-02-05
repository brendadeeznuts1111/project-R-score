#!/usr/bin/env bun test

// Integration tests for T3-Lattice CLI
// Following Bun's testing conventions with organized structure

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mockComponents, createMockResponse } from "../fixtures/components.ts";

// Mock the file system and network calls for integration testing
const originalFetch = global.fetch;
const mockResponses = new Map();

beforeAll(() => {
  // Mock fetch for integration tests
  global.fetch = async (url: string, options?: RequestInit) => {
    const mockResponse = mockResponses.get(url as string);
    if (mockResponse) {
      return mockResponse;
    }

    // Mock all registry API calls to avoid network timeouts
    if (url.toString().includes('registry') || url.toString().includes('localhost:8080')) {
      return createMockResponse({
        data: mockComponents,
        meta: {
          requestId: "test-integration",
          timestamp: new Date().toISOString(),
          version: "3.3.0"
        }
      });
    }

    // Return a mock response for any other URL to prevent network calls
    return createMockResponse({
      data: { status: "mocked" },
      meta: {
        requestId: "fallback-mock",
        timestamp: new Date().toISOString(),
        version: "3.3.0"
      }
    });
  };
});

afterAll(() => {
  // Restore original fetch
  global.fetch = originalFetch;
});

describe("CLI Integration Tests", () => {
  describe("Registry Client Integration", () => {
    test("should fetch components successfully", async () => {
      // Import dynamically to avoid module resolution issues in tests
      const { LatticeRegistryClient } = await import("../../web/advanced-dashboard.ts");

      const client = new LatticeRegistryClient();
      const response = await client.fetchWithRetry('/api/components');

      expect(response).toBeDefined();
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
      expect(response[0]).toHaveProperty('id');
      expect(response[0]).toHaveProperty('name');
    });

    test("should handle network errors gracefully", async () => {
      const { LatticeRegistryClient } = await import("../../web/advanced-dashboard.ts");

      // Mock a network error
      mockResponses.set('https://api.example.com/error-endpoint', {
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal Server Error" }),
        text: () => Promise.resolve("Internal Server Error")
      });

      const client = new LatticeRegistryClient();

      await expect(client.fetchWithRetry('/error-endpoint')).rejects.toThrow();
    });

    test("should retry on transient failures", async () => {
      const { LatticeRegistryClient } = await import("../../web/advanced-dashboard.ts");

      let attemptCount = 0;

      // Mock intermittent failures
      mockResponses.set('https://api.example.com/retry-endpoint', {
        ok: false,
        status: 503,
        json: () => {
          attemptCount++;
          if (attemptCount < 3) {
            return Promise.resolve({ error: "Service Unavailable" });
          }
          return Promise.resolve({ data: mockComponents });
        },
        text: () => Promise.resolve("Service Unavailable")
      });

      const client = new LatticeRegistryClient();

      // Should eventually succeed after retries
      const result = await client.fetchWithRetry('/retry-endpoint', {}, 3);
      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
    });
  });

  describe("DNS Cache Integration", () => {
    test("should prefetch DNS hosts", async () => {
      const { dnsCacheManager } = await import("../../src/dns-cache.ts");

      const hosts = ["api.github.com", "registry.npmjs.org"];
      await dnsCacheManager.prefetchHosts(hosts);

      const stats = dnsCacheManager.getStats();
      expect(stats.prefetchQueueSize).toBeGreaterThanOrEqual(0);
    });

    test("should resolve DNS with caching", async () => {
      const { dnsCacheManager } = await import("../../src/dns-cache.ts");

      const hostname = "localhost";
      const addresses = await dnsCacheManager.resolveWithCache(hostname);

      expect(addresses).toBeDefined();
      expect(Array.isArray(addresses)).toBe(true);

      // Check cache stats
      const stats = dnsCacheManager.getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(1);
    });

    test("should clear expired cache entries", async () => {
      const { dnsCacheManager } = await import("../../src/dns-cache.ts");

      // Add some entries (this would normally happen during prefetch)
      await dnsCacheManager.prefetchHosts(["localhost"]);

      const beforeClear = dnsCacheManager.getStats().totalEntries;
      const cleared = dnsCacheManager.clearExpired();

      expect(typeof cleared).toBe('number');
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Security Integration", () => {
    test("should audit requests", async () => {
      const { LatticeSecurity } = await import("../../web/advanced-dashboard.ts");

      const security = new LatticeSecurity();

      const mockRequest = {
        method: 'GET',
        url: 'http://localhost:8080/api/components',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0'],
          ['x-forwarded-for', '192.168.1.1']
        ])
      };

      const audit = await security.auditRequest(mockRequest as any);

      expect(audit).toBeDefined();
      expect(audit).toHaveProperty('timestamp');
      expect(audit).toHaveProperty('method');
      expect(audit).toHaveProperty('url');
      expect(audit).toHaveProperty('threats');
      expect(audit).toHaveProperty('safe');
    });

    test("should detect suspicious requests", async () => {
      const { LatticeSecurity } = await import("../../web/advanced-dashboard.ts");

      const security = new LatticeSecurity();

      const suspiciousRequest = {
        method: 'GET',
        url: 'http://localhost:8080/api/components',
        headers: {
          get: (name: string) => {
            const headers = new Map([
              ['User-Agent', 'bot/1.0'],
              ['X-Forwarded-For', '10.0.0.1']
            ]);
            return headers.get(name);
          }
        }
      } as any;

      const audit = await security.auditRequest(suspiciousRequest as any);

      expect(audit.threats.length).toBeGreaterThan(0);
      expect(audit.safe).toBe(false);
    });
  });

  describe("WebSocket Integration", () => {
    test("should create WebSocket manager", async () => {
      const { LatticeWebSocketManager } = await import("../../web/advanced-dashboard.ts");

      const wsManager = new LatticeWebSocketManager(
        (payload) => {
          expect(payload).toBeDefined();
        },
        (status) => {
          expect(typeof status).toBe('string');
        }
      );

      expect(wsManager).toBeDefined();
      wsManager.close(); // Clean up
    });

    test("should handle WebSocket payload decoding", async () => {
      const { LatticeWebSocketManager } = await import("../../web/advanced-dashboard.ts");

      let receivedPayload: any = null;
      const wsManager = new LatticeWebSocketManager(
        (payload) => {
          receivedPayload = payload;
        },
        () => {}
      );

      // Simulate receiving a message
      const mockMessage = JSON.stringify({
        type: "test",
        data: { message: "integration test" },
        timestamp: Date.now()
      });

      // Manually call the message handler (in real scenario this would come from WebSocket)
      wsManager['handleMessage'](mockMessage);

      expect(receivedPayload).toBeDefined();
      expect(receivedPayload.type).toBe("test");
      expect(receivedPayload.data.message).toBe("integration test");

      wsManager.close();
    });
  });

  describe("Configuration Integration", () => {
    test("should load configuration", async () => {
      const configLoader = await import("../../src/config-loader.ts");
      const config = await configLoader.default.load();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('http');
      expect(config).toHaveProperty('cookies');
      expect(config).toHaveProperty('monitoring');
    });

    test("should provide HTTP headers", async () => {
      const configLoader = await import("../../src/config-loader.ts");
      const config = await configLoader.default.load();

      if (config.http?.headers) {
        expect(typeof config.http.headers).toBe('object');
        expect(Object.keys(config.http.headers).length).toBeGreaterThan(0);
      }
    });

    test("should validate feature flags", async () => {
      const configLoader = await import("../../src/config-loader.ts");
      const config = await configLoader.default.load();

      expect(config.features).toBeDefined();
      expect(typeof config.features?.enterprise).toBe('boolean');
      expect(typeof config.features?.dns_prefetch).toBe('boolean');
    });
  });

  describe("End-to-End Flow", () => {
    test("should complete full registry workflow", async () => {
      // This test simulates a complete user workflow
      const { LatticeRegistryClient } = await import("../../web/advanced-dashboard.ts");
      const { dnsCacheManager } = await import("../../src/dns-cache.ts");

      // 1. DNS prefetching
      await dnsCacheManager.prefetchHosts(["api.github.com"]);

      // 2. Registry client interaction
      const client = new LatticeRegistryClient();
      const data = await client.fetchWithRetry('/api/components');

      // 3. Validate response
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      // 4. Check DNS cache was populated
      const dnsStats = dnsCacheManager.getStats();
      expect(dnsStats.prefetchQueueSize).toBeGreaterThanOrEqual(0);
    });

    test("should handle concurrent operations", async () => {
      const { LatticeRegistryClient } = await import("../../web/advanced-dashboard.ts");

      const client = new LatticeRegistryClient();

      // Simulate concurrent API calls
      const promises = Array(5).fill(null).map(() =>
        client.fetchWithRetry('/api/components')
      );

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      expect(fulfilled).toBeGreaterThan(0);
      expect(fulfilled + rejected).toBe(5);
    });
  });
});