// tests/bun-anti-detection-matrix.test.ts - Enhanced test suite with matrix integration

import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { BunAntiDetection } from "../automation/enhanced-bun-anti-detection";
import { getTestEnvironment, getTestTimeout, getTestParallel } from "./test-matrix.config";

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

// Matrix-aware test configuration
const MATRIX_CONFIG = {
  timeout: getTestTimeout('core-user-agent'),
  parallel: getTestParallel('core-user-agent'),
  environment: getTestEnvironment('core-user-agent')
};

// Apply matrix environment
Object.assign(process.env, MATRIX_CONFIG.environment);

describe("BunAntiDetection - Matrix Enhanced", () => {
  let detector: BunAntiDetection;

  beforeEach(() => {
    // Use matrix configuration
    detector = new BunAntiDetection({
      maxRequestsPerMinute: 5,
      minDelayMs: 100,
      metricsEnabled: process.env.LOG_LEVEL === 'debug'
    });
  });

  afterEach(() => {
    if (detector) {
      detector.destroy();
    }
  });

  // Core User Agent Tests - Matrix Controlled
  describe("User Agent Generation", () => {
    const testTimeout = getTestTimeout('core-user-agent');
    
    test(
      "generates valid user agents",
      () => {
        const userAgent = detector.userAgent('test-agent');
        expect(userAgent).toBeValidUserAgent();
        expect(userAgent).toContain("Mozilla");
        expect(userAgent).toMatch(/\d+\.\d+/);
      },
      testTimeout
    );

    test(
      "generates consistent user agents for same agent",
      () => {
        const userAgent1 = detector.userAgent('test-agent');
        const userAgent2 = detector.userAgent('test-agent');
        expect(userAgent1).toBe(userAgent2);
      },
      testTimeout
    );

    test(
      "generates different user agents for different agents",
      () => {
        const userAgent1 = detector.userAgent('agent-1');
        const userAgent2 = detector.userAgent('agent-2');
        expect(userAgent1).not.toBe(userAgent2);
      },
      testTimeout
    );
  });

  // Core Proxy Management Tests - Matrix Controlled
  describe("Proxy Management", () => {
    const testTimeout = getTestTimeout('core-proxy-management');
    
    test(
      "returns valid proxy URLs",
      () => {
        const proxy = detector.proxy('test-agent');
        expect(proxy).toBeValidProxyUrl();
      },
      testTimeout
    );

    test(
      "returns null when all proxies failed",
      async () => {
        // Simulate proxy failures
        for (let i = 0; i < 20; i++) {
          detector.failProxy('http://proxy-primary.provider.com:8000');
          detector.failProxy('http://proxy-secondary.provider.com:8000');
          detector.failProxy('http://proxy-tertiary.provider.com:8000');
          detector.failProxy('http://proxy-backup.provider.com:8000');
          detector.failProxy('http://proxy-emergency.provider.com:8000');
        }
        
        const proxy = detector.proxy('test-agent');
        expect(proxy).toBeNull();
      },
      testTimeout
    );

    test(
      "tracks proxy health correctly",
      () => {
        const stats = detector.stats();
        expect(stats).toBeDefined();
        expect(typeof stats.activeAgents).toBe('number');
        expect(typeof stats.healthyProxies).toBe('number');
      },
      testTimeout
    );
  });

  // Core Rate Limiting Tests - Matrix Controlled
  describe("Rate Limiting", () => {
    const testTimeout = getTestTimeout('core-rate-limiting');
    
    test(
      "allows requests within rate limit",
      async () => {
        const agentId = 'test-agent';
        
        // Should allow first request immediately
        const startTime = Date.now();
        await detector.delay(agentId);
        const firstDelay = Date.now() - startTime;
        
        expect(firstDelay).toBeLessThan(200);
        
        // Check stats
        const stats = detector.stats();
        expect(stats.totalRequests).toBe(1);
      },
      testTimeout
    );

    test(
      "tracks request statistics",
      async () => {
        const agentId = 'test-agent';
        
        // Make multiple requests
        for (let i = 0; i < 3; i++) {
          await detector.delay(agentId);
        }
        
        const stats = detector.stats();
        expect(stats.totalRequests).toBe(3);
        expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
      },
      testTimeout
    );

    test(
      "handles concurrent requests safely",
      async () => {
        const agentId = 'test-agent';
        
        // Make concurrent requests
        const promises = Array.from({ length: 3 }, () => detector.delay(agentId));
        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(3);
        
        const stats = detector.stats();
        expect(stats.totalRequests).toBe(3);
      },
      testTimeout
    );
  });

  // Core Input Validation Tests - Matrix Controlled
  describe("Input Validation", () => {
    const testTimeout = getTestTimeout('core-input-validation');
    
    test(
      "accepts valid agent IDs",
      () => {
        const validIds = ['agent-1', 'test_agent', 'agent123', 'a'];
        
        validIds.forEach(id => {
          expect(() => detector.userAgent(id)).not.toThrow();
          expect(id).toBeValidAgentId();
        });
      },
      testTimeout
    );

    test(
      "rejects invalid agent IDs",
      () => {
        const invalidIds = ['', 'agent with spaces', 'agent@symbol', 'a'.repeat(101)];
        
        invalidIds.forEach(id => {
          expect(() => detector.userAgent(id)).toThrow();
        });
      },
      testTimeout
    );

    test(
      "throws errors for invalid agent IDs",
      () => {
        expect(() => detector.userAgent('')).toThrow("Invalid agent ID: must be non-empty string");
        expect(() => detector.userAgent('invalid id')).toThrow("Invalid agent ID: only alphanumeric characters, underscore, and hyphen allowed");
      },
      testTimeout
    );
  });

  // Core Integration Tests - Matrix Controlled
  describe("Integration", () => {
    const testTimeout = getTestTimeout('core-integration');
    
    test(
      "complete workflow",
      async () => {
        const agentId = 'integration-agent';
        
        // Generate user agent
        const userAgent = detector.userAgent(agentId);
        expect(userAgent).toBeValidUserAgent();
        
        // Get proxy
        const proxy = detector.proxy(agentId);
        expect(proxy).toBeValidProxyUrl();
        
        // Make request with rate limiting
        await detector.delay(agentId);
        
        // Check final stats
        const stats = detector.stats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
        
        // Cleanup
        detector.destroy();
      },
      testTimeout
    );
  });

  // Matrix-specific tests
  describe("Matrix Configuration", () => {
    test("respects matrix timeout configuration", () => {
      const timeout = getTestTimeout('core-user-agent');
      expect(timeout).toBeGreaterThan(0);
      expect(timeout).toBeLessThanOrEqual(60000);
    });

    test("respects matrix parallel configuration", () => {
      const parallel = getTestParallel('core-user-agent');
      expect(typeof parallel).toBe('boolean');
    });

    test("applies matrix environment variables", () => {
      const env = getTestEnvironment('core-user-agent');
      expect(env).toBeDefined();
      expect(env.TEST_MODE).toBe('user-agent');
    });
  });
});

// Export for matrix runner
export default describe;
