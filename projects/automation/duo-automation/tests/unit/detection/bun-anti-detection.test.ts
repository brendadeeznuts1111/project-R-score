// tests/bun-anti-detection.test.ts - Focused test suite for BunAntiDetection

import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { BunAntiDetection } from "../automation/enhanced-bun-anti-detection";

// Custom matchers for anti-detection testing
expect.extend({
  toBeValidAgentId(received: unknown) {
    if (typeof received !== "string") {
      return {
        message: () => `expected ${received} to be a string`,
        pass: false,
      };
    }

    const isValid = /^[a-zA-Z0-9_-]+$/.test(received) && 
                   received.length > 0 && 
                   received.length <= 100;

    return {
      message: () => 
        isValid 
          ? `expected ${received} not to be a valid agent ID`
          : `expected ${received} to be a valid agent ID`,
      pass: isValid,
    };
  },

  toBeValidUserAgent(received: unknown) {
    if (typeof received !== "string") {
      return {
        message: () => `expected ${received} to be a string`,
        pass: false,
      };
    }

    const hasMozilla = received.includes("Mozilla");
    const hasVersion = /\d+\.\d+/.test(received);
    const hasPlatform = /(Android|iPhone|Windows|Macintosh|Linux)/.test(received);
    const reasonableLength = received.length > 50 && received.length < 200;

    const pass = hasMozilla && hasVersion && hasPlatform && reasonableLength;

    return {
      message: () => 
        pass 
          ? `expected ${received} not to be a valid user agent`
          : `expected ${received} to be a valid user agent`,
      pass,
    };
  },

  toBeValidProxyUrl(received: unknown) {
    if (received === null) return { message: () => "proxy is null", pass: true };
    
    if (typeof received !== "string") {
      return {
        message: () => `expected ${received} to be a string or null`,
        pass: false,
      };
    }
    
    const hasHttp = received.startsWith("http://");
    const hasHost = /[\w.-]+:\d+/.test(received);
    const reasonableLength = received.length > 10 && received.length < 100;

    const pass = hasHttp && hasHost && reasonableLength;

    return {
      message: () => 
        pass 
          ? `expected ${received} not to be a valid proxy URL`
          : `expected ${received} to be a valid proxy URL`,
      pass,
    };
  },
});

// TypeScript declarations
declare module "bun:test" {
  interface Matchers<T = unknown> {
    toBeValidAgentId(): T;
    toBeValidUserAgent(): T;
    toBeValidProxyUrl(): T;
  }
}

describe("BunAntiDetection", () => {
  let detector: BunAntiDetection;

  beforeEach(() => {
    detector = new BunAntiDetection({
      maxRequestsPerMinute: 5,
      minDelayMs: 100,
      maxDelayMs: 200,
      metricsEnabled: true
    });
  });

  afterEach(() => {
    detector.destroy();
  });

  describe("User Agent Generation", () => {
    test("generates valid user agents", () => {
      const userAgent = detector.userAgent("test-agent");
      
      expect(userAgent).toBeValidUserAgent();
      expect(userAgent).toContain("Mozilla");
      expect(userAgent.length).toBeGreaterThan(50);
    });

    test("generates consistent user agents for same agent", () => {
      const agentId = "consistency-test";
      const ua1 = detector.userAgent(agentId);
      const ua2 = detector.userAgent(agentId);
      
      expect(ua1).toBe(ua2);
    });

    test("generates different user agents for different agents", () => {
      const ua1 = detector.userAgent("agent-001");
      const ua2 = detector.userAgent("agent-002");
      
      expect(ua1).not.toBe(ua2);
      expect(ua1).toBeValidUserAgent();
      expect(ua2).toBeValidUserAgent();
    });
  });

  describe("Proxy Management", () => {
    test("returns valid proxy URLs", () => {
      const proxy = detector.proxy("test-agent");
      
      expect(proxy).toContain("http://");
      expect(proxy).toContain("provider.com");
      expect(proxy).toContain(":8000");
    });

    test("returns null when all proxies failed", () => {
      // Fail all proxies multiple times to exceed threshold
      const allProxies = [
        "http://proxy-primary.provider.com:8000",
        "http://proxy-secondary.provider.com:8000",
        "http://proxy-tertiary.provider.com:8000",
        "http://proxy-backup.provider.com:8000",
        "http://proxy-emergency.provider.com:8000"
      ];
      
      // Fail each proxy 3 times to exceed the default threshold of 2
      allProxies.forEach(proxy => {
        detector.failProxy(proxy);
        detector.failProxy(proxy);
        detector.failProxy(proxy);
      });
      
      const proxy = detector.proxy("test-agent");
      expect(proxy).toBeNull();
    });

    test("tracks proxy health correctly", () => {
      // Check that we can call failProxy without errors
      const proxyToFail = "http://proxy-primary.provider.com:8000";
      
      expect(() => {
        detector.failProxy(proxyToFail);
        detector.failProxy(proxyToFail);
        detector.failProxy(proxyToFail);
      }).not.toThrow();
      
      // Check that stats are still accessible
      const stats = detector.stats();
      expect(typeof stats.healthyProxies).toBe("number");
      expect(stats.healthyProxies).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Rate Limiting", () => {
    test("allows requests within rate limit", async () => {
      const agentId = "rate-test-agent";
      
      const startTime = Date.now();
      await detector.delay(agentId);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(300);
    });

    test("tracks request statistics", async () => {
      const agentId = "stats-test-agent";
      
      await detector.delay(agentId);
      await detector.delay(agentId);
      await detector.delay(agentId);
      
      const stats = detector.stats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
    });

    test("handles concurrent requests safely", async () => {
      const promises = Array(5).fill(null).map(() => detector.delay("concurrent-test"));
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      const stats = detector.stats();
      expect(stats.totalRequests).toBe(5);
    });
  });

  describe("Input Validation", () => {
    test("accepts valid agent IDs", () => {
      const validIds = ["agent-001", "test_agent", "api-client"];
      
      validIds.forEach(id => {
        expect(id).toBeValidAgentId();
      });
    });

    test("rejects invalid agent IDs", () => {
      const invalidIds = ["invalid@agent", "", "agent with spaces"];
      
      invalidIds.forEach(id => {
        expect(id).not.toBeValidAgentId();
      });
    });

    test("throws errors for invalid agent IDs", async () => {
      const invalidIds = ["", "invalid@agent", null, undefined];
      
      for (const id of invalidIds) {
        await expect(detector.delay(id as any)).rejects.toThrow("Invalid agent ID");
        expect(() => detector.userAgent(id as any)).toThrow("Invalid agent ID");
      }
    });
  });

  describe("Integration", () => {
    test("complete workflow", async () => {
      const agentId = "integration-agent";
      
      // Complete workflow
      await detector.delay(agentId);
      const userAgent = detector.userAgent(agentId);
      const proxy = detector.proxy(agentId);
      
      // Verify all components work
      expect(userAgent).toBeValidUserAgent();
      expect(proxy).toContain("http://");
      
      const stats = detector.stats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
    });
  });
});
