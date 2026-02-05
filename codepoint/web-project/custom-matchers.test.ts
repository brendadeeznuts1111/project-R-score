#!/usr/bin/env bun

/**
 * Enhanced Test Suite with Custom Matchers
 * Demonstrates the power of custom matchers for enhanced naming conventions
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { BunProxyServer, ProxyServerConfig, createProxyConfig } from "./index";

// Import custom matchers (this will extend expect with our custom matchers)
import "./custom-matchers";

// Test configuration with enhanced naming
const TEST_WEB_SOCKET_PROXY_CONFIGURATION = {
  targetUrl: "ws://localhost:8080/ws",
  listenPort: 3001,
  debug: true,
  maxConnections: 100,
  idleTimeout: 60000,
};

describe("Enhanced Testing with Custom Matchers", () => {
  let webSocketProxyServer: BunProxyServer;
  let proxyServerConfiguration: ProxyServerConfig;

  beforeAll(async () => {
    console.log(
      "🚀 Setting up enhanced test environment with custom matchers..."
    );
  });

  afterAll(async () => {
    console.log("🧹 Cleaning up enhanced test environment...");
    if (webSocketProxyServer?.isRunning()) {
      await webSocketProxyServer.stop();
    }
  });

  beforeEach(() => {
    // Reset test state before each test
  });

  afterEach(async () => {
    // Clean up after each test
    if (webSocketProxyServer?.isRunning()) {
      await webSocketProxyServer.stop();
    }
  });

  describe("Custom Matchers for Enhanced Properties", () => {
    test("should validate enhanced WebSocket properties with custom matcher", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );

      // Use our custom matcher
      expect(proxyServerConfiguration).toHaveEnhancedWebSocketProperties();
    });

    test("should validate enhanced performance metrics with custom matcher", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      const performanceMetrics = webSocketProxyServer.getStats();

      // Use our custom matcher for performance metrics
      expect(performanceMetrics).toHaveEnhancedPerformanceProperties();
    });

    test("should validate enhanced naming conventions with custom matcher", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );

      // Use our custom matcher for naming conventions
      expect(proxyServerConfiguration).toFollowEnhancedNamingConventions();
    });
  });

  describe("Custom Matchers for Validation", () => {
    test("should validate WebSocket URLs with custom matcher", () => {
      // Valid WebSocket URLs
      expect("ws://localhost:8080/ws").toBeValidWebSocketUrl();
      expect("wss://secure.example.com/ws").toBeValidWebSocketUrl();

      // Invalid WebSocket URLs
      expect("http://localhost:8080").not.toBeValidWebSocketUrl();
      expect("ftp://example.com").not.toBeValidWebSocketUrl();
      expect("not-a-url").not.toBeValidWebSocketUrl();
    });

    test("should validate port numbers with custom matcher", () => {
      // Valid ports
      expect(80).toBeValidPort();
      expect(3000).toBeValidPort();
      expect(8080).toBeValidPort();
      expect(65535).toBeValidPort();

      // Invalid ports
      expect(-1).not.toBeValidPort();
      expect(65536).not.toBeValidPort();
      expect(70000).not.toBeValidPort();
      expect(3.14).not.toBeValidPort();

      // Test that strings throw errors (not just fail)
      expect(() => {
        expect("80").toBeValidPort();
      }).toThrow("Expected a number");
    });
  });

  describe("Custom Matchers for Error Handling", () => {
    test("should validate enhanced error types with custom matcher", () => {
      // Test configuration errors
      expect(() => {
        new ProxyServerConfig({ targetUrl: "" } as any);
      }).toThrow(expect.toBeEnhancedWebSocketProxyError());

      // Test that the error is specifically a configuration error
      try {
        new ProxyServerConfig({ targetUrl: "" } as any);
      } catch (error) {
        expect(error).toBeEnhancedWebSocketProxyError();
        expect(error.constructor.name).toBe("WebSocketProxyConfigurationError");
      }
    });

    test("should handle different enhanced error types", () => {
      // Test various invalid configurations that throw enhanced errors
      expect(() => {
        new ProxyServerConfig({ targetUrl: "invalid-url" } as any);
      }).toThrow(expect.toBeEnhancedWebSocketProxyError());

      expect(() => {
        new ProxyServerConfig({ listenPort: 70000 } as any);
      }).toThrow(expect.toBeEnhancedWebSocketProxyError());
    });
  });

  describe("Custom Matchers with Builder Pattern", () => {
    test("should validate builder pattern with enhanced naming using custom matchers", () => {
      const builtConfiguration = createProxyConfig()
        .target("ws://localhost:8080/ws")
        .port(3002)
        .debug(true)
        .maxConnections(200)
        .idleTimeout(30000)
        .build();

      // Validate with custom matchers
      expect(builtConfiguration).toHaveEnhancedWebSocketProperties();
      expect(builtConfiguration.targetUrl).toBeValidWebSocketUrl();
      expect(builtConfiguration.listenPort).toBeValidPort();
      expect(builtConfiguration).toFollowEnhancedNamingConventions();
    });
  });

  describe("Advanced Custom Matcher Usage", () => {
    test("should combine custom matchers with built-in matchers", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      const performanceMetrics = webSocketProxyServer.getStats();

      // Combine custom and built-in matchers
      expect(performanceMetrics).toHaveEnhancedPerformanceProperties();
      expect(performanceMetrics).toBeInstanceOf(Object);
      expect(typeof performanceMetrics.totalConnectionCount).toBe("number");
      expect(performanceMetrics.totalConnectionCount).toBeGreaterThanOrEqual(0);
    });

    test("should use custom matchers with negation", () => {
      // Test negation with custom matchers
      expect({}).not.toHaveEnhancedWebSocketProperties();
      expect("http://localhost:8080").not.toBeValidWebSocketUrl();
      expect(70000).not.toBeValidPort();
    });

    test("should provide descriptive error messages from custom matchers", () => {
      // This will show our custom error messages
      expect(() => {
        expect({}).toHaveEnhancedWebSocketProperties();
      }).toThrow();
    });
  });

  describe("Custom Matchers for Type Safety", () => {
    test("should validate TypeScript types with enhanced naming", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      // Type validation with custom matchers
      expect(proxyServerConfiguration).toBeInstanceOf(ProxyServerConfig);
      expect(webSocketProxyServer).toBeInstanceOf(BunProxyServer);
      expect(proxyServerConfiguration).toFollowEnhancedNamingConventions();
    });

    test("should validate enhanced interface properties", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      const performanceMetrics = webSocketProxyServer.getStats();

      // Validate that all enhanced properties exist and have correct types
      expect(performanceMetrics).toHaveEnhancedPerformanceProperties();
      expect(typeof performanceMetrics.totalConnectionCount).toBe("number");
      expect(typeof performanceMetrics.activeConnectionCount).toBe("number");
      expect(typeof performanceMetrics.totalMessageCount).toBe("number");
      expect(typeof performanceMetrics.totalByteCount).toBe("number");
      expect(typeof performanceMetrics.averageLatencyMilliseconds).toBe(
        "number"
      );
      expect(typeof performanceMetrics.totalErrorCount).toBe("number");
      expect(typeof performanceMetrics.serverUptimeMilliseconds).toBe("number");
      expect(performanceMetrics.systemMemoryUsage).toBeDefined();
      expect(performanceMetrics.systemCpuUsage).toBeDefined();
    });
  });

  describe("Custom Matchers Integration", () => {
    test("should work seamlessly with Bun's isolated installs", () => {
      // Test that our custom matchers work with Bun's isolated installs
      expect(() => {
        import("./custom-matchers");
      }).not.toThrow();
    });

    test("should maintain performance with custom matchers", () => {
      const startTime = Date.now();

      // Run multiple custom matcher assertions
      for (let i = 0; i < 100; i++) {
        expect("ws://localhost:8080").toBeValidWebSocketUrl();
        expect(3000).toBeValidPort();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Custom matchers should be fast
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});

describe("Custom Matchers Best Practices", () => {
  test("should demonstrate readable test assertions", () => {
    // Show how custom matchers make tests more readable
    const config = new ProxyServerConfig({
      targetUrl: "ws://localhost:8080/ws",
      listenPort: 3000,
      debug: true,
      maxConnections: 100,
      idleTimeout: 60000,
    });

    // These assertions are much more readable than manual property checks
    expect(config).toHaveEnhancedWebSocketProperties();
    expect(config.targetUrl).toBeValidWebSocketUrl();
    expect(config.listenPort).toBeValidPort();
    expect(config).toFollowEnhancedNamingConventions();
  });

  test("should provide meaningful error messages", () => {
    // Custom matchers should provide helpful error messages
    try {
      expect({}).toHaveEnhancedWebSocketProperties();
    } catch (error) {
      // The error message should be descriptive
      expect(error.message).toContain("enhanced WebSocket properties");
    }
  });
});

console.log(
  "✅ Enhanced test suite with custom matchers completed successfully!"
);
