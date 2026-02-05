// examples/bun-testing-examples.ts - Serviceable Bun testing examples

import { expect, test, describe, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { BunAntiDetection } from "../automation/enhanced-bun-anti-detection";

// =============================================================================
// CUSTOM MATCHERS FOR ANTI-DETECTION SYSTEM
// =============================================================================

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
          : `expected ${received} to be a valid agent ID (alphanumeric, underscore, hyphen only, 1-100 chars)`,
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
          : `expected ${received} to be a valid user agent (Mozilla, version, platform, reasonable length)`,
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
          : `expected ${received} to be a valid proxy URL (http://host:port format)`,
      pass,
    };
  },
});

// TypeScript declarations for custom matchers
declare module "bun:test" {
  interface Matchers<T = unknown> {
    toBeValidAgentId(): T;
    toBeValidUserAgent(): T;
    toBeValidProxyUrl(): T;
  }
}

// =============================================================================
// BASIC FUNCTIONALITY TESTS
// =============================================================================

describe("BunAntiDetection - Basic Tests", () => {
  let detector: BunAntiDetection;

  beforeEach(() => {
    detector = new BunAntiDetection({
      maxRequestsPerMinute: 10,
      minDelayMs: 100,
      maxDelayMs: 200,
      metricsEnabled: true
    });
  });

  afterEach(() => {
    detector.destroy();
  });

  test("creates valid user agents", () => {
    const userAgent = detector.userAgent("test-agent-001");
    
    expect(userAgent).toBeValidUserAgent();
    expect(userAgent).toContain("Mozilla");
    expect(userAgent.length).toBeGreaterThan(50);
  });

  test("generates different user agents for different agents", () => {
    const ua1 = detector.userAgent("agent-001");
    const ua2 = detector.userAgent("agent-002");
    
    expect(ua1).not.toBe(ua2);
    expect(ua1).toBeValidUserAgent();
    expect(ua2).toBeValidUserAgent();
  });

  test("returns valid proxy URLs", () => {
    const proxy = detector.proxy("test-agent");
    
    expect(proxy).toBeValidProxyUrl();
    expect(proxy).toContain("http://");
  });

  test("handles rate limiting", async () => {
    const agentId = "rate-limit-test";
    
    // First few requests should be fast
    const start1 = Date.now();
    await detector.delay(agentId);
    const duration1 = Date.now() - start1;
    expect(duration1).toBeLessThan(300);
    
    // Continue making requests
    await detector.delay(agentId);
    await detector.delay(agentId);
    
    const stats = detector.stats();
    expect(stats.totalRequests).toBeGreaterThan(0);
  });

  test("validates agent IDs correctly", () => {
    const validIds = ["valid-agent-001", "test_agent_002", "api-client-003"];
    const invalidIds = ["invalid@agent", "", "agent with spaces", "a".repeat(101)];
    
    validIds.forEach(id => {
      expect(id).toBeValidAgentId();
    });
    
    invalidIds.forEach(id => {
      expect(id).not.toBeValidAgentId();
    });
  });

  test("rejects invalid agent IDs", async () => {
    const invalidIds = ["", "invalid@agent", null, undefined];
    
    for (const id of invalidIds) {
      await expect(detector.delay(id as any)).rejects.toThrow("Invalid agent ID");
      expect(() => detector.userAgent(id as any)).toThrow("Invalid agent ID");
    }
  });
});

// =============================================================================
// PARAMETERIZED TESTS
// =============================================================================

describe("BunAntiDetection - Parametrized Tests", () => {
  test.each([
    { agentId: "mobile-bot-001", expectedPlatform: /Android|iPhone/ },
    { agentId: "desktop-scraper-002", expectedPlatform: /Windows|Macintosh|Linux/ },
    { agentId: "mixed-agent-003", expectedPlatform: /Mozilla/ },
  ])("$agentId generates appropriate user agent", ({ agentId, expectedPlatform }) => {
    const detector = new BunAntiDetection();
    
    const userAgent = detector.userAgent(agentId);
    
    expect(userAgent).toMatch(expectedPlatform);
    expect(userAgent).toBeValidUserAgent();
    
    detector.destroy();
  });

  test.each([
    { description: "single agent", agents: 1, expectedMaxTime: 300 },
    { description: "multiple agents", agents: 3, expectedMaxTime: 600 },
    { description: "high concurrency", agents: 5, expectedMaxTime: 1000 },
  ])("handles $description with $agents agents", async ({ agents, expectedMaxTime }) => {
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 10,
      minDelayMs: 100,
      maxDelayMs: 200
    });
    
    try {
      const startTime = Date.now();
      
      const promises = Array(agents).fill(null).map((_, i) => 
        detector.delay(`param-test-agent-${i}`)
      );
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(expectedMaxTime);
      
      const stats = detector.stats();
      expect(stats.totalRequests).toBe(agents);
      
    } finally {
      detector.destroy();
    }
  }, { retry: 2 });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("BunAntiDetection - Error Handling", () => {
  test("handles proxy failures gracefully", () => {
    const detector = new BunAntiDetection();
    
    // Fail all proxies
    const allProxies = [
      "http://proxy-primary.provider.com:8000",
      "http://proxy-secondary.provider.com:8000",
      "http://proxy-tertiary.provider.com:8000",
      "http://proxy-backup.provider.com:8000",
      "http://proxy-emergency.provider.com:8000"
    ];
    
    allProxies.forEach(proxy => detector.failProxy(proxy));
    
    // Should return null but not throw
    const proxy = detector.proxy("test-agent");
    expect(proxy).toBeNull();
    
    // Stats should still work
    const stats = detector.stats();
    expect(stats.healthyProxies).toBe(0);
    
    detector.destroy();
  });

  test("handles destroy during active operations", async () => {
    const detector = new BunAntiDetection();
    
    // Start some operations
    const promises = [
      detector.delay("destroy-test-1"),
      detector.delay("destroy-test-2")
    ];
    
    // Destroy should not throw
    expect(() => detector.destroy()).not.toThrow();
    
    // Operations should complete or fail gracefully
    await Promise.allSettled(promises);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("BunAntiDetection - Integration Tests", () => {
  test("complete workflow integration", async () => {
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 5,
      minDelayMs: 50,
      maxDelayMs: 150,
      metricsEnabled: true
    });

    try {
      const agentId = "integration-test-agent";
      
      // Complete workflow
      await detector.delay(agentId);
      const userAgent = detector.userAgent(agentId);
      const proxy = detector.proxy(agentId);
      
      // Verify all components work together
      expect(userAgent).toBeValidUserAgent();
      expect(proxy).toBeValidProxyUrl();
      
      const stats = detector.stats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
      
    } finally {
      detector.destroy();
    }
  });

  test("multiple agents isolation", async () => {
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 5,
      minDelayMs: 100,
      maxDelayMs: 200
    });

    try {
      const agents = ["iso-agent-1", "iso-agent-2", "iso-agent-3"];
      
      // Each agent should have isolated rate limiting
      const promises = agents.map(async (agentId) => {
        await detector.delay(agentId);
        return {
          agentId,
          userAgent: detector.userAgent(agentId),
          proxy: detector.proxy(agentId)
        };
      });
      
      const results = await Promise.all(promises);
      
      // Each agent should get valid results
      results.forEach(result => {
        expect(result.userAgent).toBeValidUserAgent();
        expect(result.proxy).toBeValidProxyUrl();
      });
      
      // Should have different user agents (mostly)
      const userAgents = results.map(r => r.userAgent);
      const uniqueUAs = new Set(userAgents);
      expect(uniqueUAs.size).toBeGreaterThan(1);
      
    } finally {
      detector.destroy();
    }
  });
});

// =============================================================================
// MOCKING EXAMPLES
// =============================================================================

describe("BunAntiDetection - Mocking Examples", () => {
  test("spying on console output", () => {
    const consoleSpy = spyOn(console, "warn");
    const detector = new BunAntiDetection();
    
    // Fail a proxy to trigger warning
    const proxy = "http://proxy-primary.provider.com:8000";
    detector.failProxy(proxy);
    detector.failProxy(proxy);
    detector.failProxy(proxy);
    
    // Should have logged a warning
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("marked as unhealthy")
    );
    
    detector.destroy();
  });

  test("mocking external dependencies", () => {
    // Mock fetch for external API calls
    const mockFetch = mock(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          proxies: ["proxy1.test.com:8080"],
          userAgents: ["Mozilla/5.0 (Test Browser)"]
        })
      })
    );
    
    // Mock the global fetch with proper typing
    global.fetch = mockFetch as any;
    
    const detector = new BunAntiDetection();
    
    const userAgent = detector.userAgent("integration-test");
    expect(userAgent).toContain("Mozilla");
    
    const proxy = detector.proxy("integration-test");
    expect(proxy).toContain("http://");
    
    detector.destroy();
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe("BunAntiDetection - Performance Tests", () => {
  test("user agent generation performance", () => {
    const detector = new BunAntiDetection();
    
    const iterations = 1000;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      detector.userAgent(`perf-agent-${i}`);
    }
    
    const duration = performance.now() - startTime;
    const avgTime = duration / iterations;
    
    // Should be very fast (< 0.1ms per generation)
    expect(avgTime).toBeLessThan(0.1);
    
    detector.destroy();
  });

  test("memory usage stays bounded", async () => {
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 50,
      cleanupIntervalMs: 500,
      metricsEnabled: true
    });

    const initialMemory = process.memoryUsage().heapUsed;
    
    // Generate significant activity
    const agents = Array(100).fill(null).map((_, i) => `mem-agent-${i}`);
    const promises = agents.map(agent => detector.delay(agent));
    
    await Promise.all(promises);
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (< 50MB for 100 agents)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    
    const stats = detector.stats();
    expect(stats.totalRequests).toBe(100);
    
    detector.destroy();
  });
});

// =============================================================================
// CONDITIONAL TESTING EXAMPLES
// =============================================================================

const isPerformanceTest = process.env.PERFORMANCE_TESTS === "true";

describe.if(isPerformanceTest)("Performance Benchmarks", () => {
  test("comprehensive performance benchmark", async () => {
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 100,
      metricsEnabled: true
    });

    try {
      console.log("🚀 Starting performance benchmark...");
      
      // Benchmark user agent generation
      const uaStartTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        detector.userAgent(`benchmark-ua-${i}`);
      }
      const uaDuration = performance.now() - uaStartTime;
      const uaAvgTime = uaDuration / 10000;
      
      console.log(`📱 User Agent Generation: ${uaAvgTime.toFixed(4)}ms per call`);
      expect(uaAvgTime).toBeLessThan(0.05);
      
      // Benchmark proxy selection
      const proxyStartTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        detector.proxy(`benchmark-proxy-${i}`);
      }
      const proxyDuration = performance.now() - proxyStartTime;
      const proxyAvgTime = proxyDuration / 10000;
      
      console.log(`🌐 Proxy Selection: ${proxyAvgTime.toFixed(4)}ms per call`);
      expect(proxyAvgTime).toBeLessThan(0.1);
      
      const finalStats = detector.stats();
      console.log(`📊 Final Stats:`, finalStats);
      
    } finally {
      detector.destroy();
    }
  });
});

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

describe("BunAntiDetection - Usage Examples", () => {
  test("basic usage example", async () => {
    // Create detector with custom configuration
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 5,
      minDelayMs: 1000,
      maxDelayMs: 3000,
      metricsEnabled: true
    });

    try {
      const agentId = "example-agent";
      
      // Apply rate limiting and humanized delay
      await detector.delay(agentId);
      
      // Get randomized user agent
      const userAgent = detector.userAgent(agentId);
      console.log(`User Agent: ${userAgent}`);
      
      // Get healthy proxy
      const proxy = detector.proxy(agentId);
      console.log(`Proxy: ${proxy}`);
      
      // View system stats
      const stats = detector.stats();
      console.log(`Stats:`, stats);
      
      // Verify results
      expect(userAgent).toBeValidUserAgent();
      expect(proxy).toBeValidProxyUrl();
      expect(stats.totalRequests).toBe(1);
      
    } finally {
      detector.destroy();
    }
  });

  test("multi-agent coordination example", async () => {
    const detector = new BunAntiDetection({
      maxRequestsPerMinute: 10,
      minDelayMs: 500,
      maxDelayMs: 1500
    });

    try {
      const agents = ["scraper-001", "scraper-002", "scraper-003"];
      
      // Run multiple agents concurrently
      const promises = agents.map(async (agentId) => {
        console.log(`Starting agent: ${agentId}`);
        
        await detector.delay(agentId);
        const userAgent = detector.userAgent(agentId);
        const proxy = detector.proxy(agentId);
        
        return {
          agentId,
          userAgent: userAgent.substring(0, 30) + "...",
          proxy: proxy || "direct"
        };
      });
      
      const results = await Promise.all(promises);
      
      console.log("Agent Results:");
      results.forEach(result => {
        console.log(`  ${result.agentId}: ${result.proxy} | ${result.userAgent}`);
      });
      
      // Verify all results are valid
      results.forEach(result => {
        expect(result.userAgent.length).toBeGreaterThan(30);
        expect(result.proxy).toMatch(/^(direct|http:\/\/.*)$/);
      });
      
    } finally {
      detector.destroy();
    }
  });
});
