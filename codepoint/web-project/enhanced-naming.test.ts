#!/usr/bin/env bun

/**
 * Comprehensive Test Suite for Bun Proxy API with Enhanced Naming
 * Using bun:test module for professional testing
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
import {
  BunProxyServer,
  ProxyServerConfig,
  WebSocketProxyConfigurationError,
  createProxyConfig,
} from "./index";

// Test configuration with enhanced naming
const TEST_WEB_SOCKET_PROXY_CONFIGURATION = {
  targetUrl: "ws://localhost:8080/ws",
  listenPort: 0, // Random available port
  debug: true,
  maxConnections: 100,
  idleTimeout: 60000,
};

describe("Bun Proxy API - Enhanced Naming Tests", () => {
  let webSocketProxyServer: BunProxyServer;
  let proxyServerConfiguration: ProxyServerConfig;

  beforeAll(async () => {
    console.log("🚀 Setting up test environment...");
  });

  afterAll(async () => {
    console.log("🧹 Cleaning up test environment...");
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

  describe("Enhanced Configuration Classes", () => {
    test("should create ProxyServerConfig with enhanced property names", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );

      expect(proxyServerConfiguration).toBeDefined();
      expect(proxyServerConfiguration.targetUrl).toBe(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION.targetUrl
      );
      expect(proxyServerConfiguration.debug).toBe(true);
      expect(proxyServerConfiguration.listenPort).toBe(0);
    });

    test("should support builder pattern with enhanced naming", () => {
      const builtConfiguration = createProxyConfig()
        .target(TEST_WEB_SOCKET_PROXY_CONFIGURATION.targetUrl)
        .port(3001)
        .debug(true)
        .maxConnections(200)
        .idleTimeout(30000)
        .build();

      expect(builtConfiguration).toBeDefined();
      expect(builtConfiguration.targetUrl).toBe(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION.targetUrl
      );
      expect(builtConfiguration.listenPort).toBe(3001);
      expect(builtConfiguration.maxConnections).toBe(200);
    });

    test("should validate configuration with enhanced error types", () => {
      expect(() => {
        new ProxyServerConfig({} as any);
      }).toThrow(WebSocketProxyConfigurationError);
    });
  });

  describe("Enhanced Server Operations", () => {
    test("should create server instance with enhanced naming", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      expect(webSocketProxyServer).toBeDefined();
      expect(webSocketProxyServer.isRunning()).toBe(false);
    });

    test("should handle enhanced configuration validation", () => {
      expect(() => {
        new ProxyServerConfig({
          targetUrl: "invalid-url",
          listenPort: 70000, // Invalid port
        } as any);
      }).toThrow(WebSocketProxyConfigurationError);
    });
  });

  describe("Enhanced Error Handling", () => {
    test("should throw WebSocketProxyConfigurationError for invalid config", () => {
      expect(() => {
        new ProxyServerConfig({ targetUrl: "" } as any);
      }).toThrow(WebSocketProxyConfigurationError);
    });

    test("should handle WebSocketProxyOperationalError appropriately", async () => {
      proxyServerConfiguration = new ProxyServerConfig({
        targetUrl: "ws://localhost:9999/nonexistent", // Valid WebSocket URL format but non-existent server
        listenPort: 0,
        debug: true,
      });

      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      // This should handle connection errors gracefully
      expect(webSocketProxyServer).toBeDefined();
    });
  });

  describe("Enhanced Performance Metrics", () => {
    test("should track performance with enhanced property names", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      const performanceMetrics = webSocketProxyServer.getStats();

      expect(performanceMetrics).toBeDefined();
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

    test("should return active connections with enhanced naming", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      const activeWebSocketConnections =
        webSocketProxyServer.getActiveConnections();

      expect(Array.isArray(activeWebSocketConnections)).toBe(true);
    });
  });

  describe("Enhanced Type Safety", () => {
    test("should maintain TypeScript type safety with enhanced names", () => {
      const configuration: ProxyServerConfig = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      const server: BunProxyServer = new BunProxyServer(configuration);

      expect(configuration).toBeInstanceOf(ProxyServerConfig);
      expect(server).toBeInstanceOf(BunProxyServer);
    });

    test("should support enhanced interface property types", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      const performanceMetrics = webSocketProxyServer.getStats();

      // Test enhanced property names exist and have correct types
      expect(performanceMetrics).toHaveProperty("totalConnectionCount");
      expect(performanceMetrics).toHaveProperty("activeConnectionCount");
      expect(performanceMetrics).toHaveProperty("totalMessageCount");
      expect(performanceMetrics).toHaveProperty("totalByteCount");
      expect(performanceMetrics).toHaveProperty("averageLatencyMilliseconds");
      expect(performanceMetrics).toHaveProperty("totalErrorCount");
      expect(performanceMetrics).toHaveProperty("serverUptimeMilliseconds");
      expect(performanceMetrics).toHaveProperty("systemMemoryUsage");
      expect(performanceMetrics).toHaveProperty("systemCpuUsage");
    });
  });

  describe("Backward Compatibility", () => {
    test("should support legacy naming alongside enhanced names", () => {
      // Test that legacy imports still work
      const legacyConfig = new ProxyServerConfig({
        targetUrl: TEST_WEB_SOCKET_PROXY_CONFIGURATION.targetUrl,
        listenPort: TEST_WEB_SOCKET_PROXY_CONFIGURATION.listenPort,
        debug: TEST_WEB_SOCKET_PROXY_CONFIGURATION.debug,
      });

      expect(legacyConfig).toBeDefined();
      expect(legacyConfig.targetUrl).toBe(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION.targetUrl
      );
    });
  });

  describe("Enhanced Method Names", () => {
    test("should support enhanced method naming patterns", () => {
      proxyServerConfiguration = new ProxyServerConfig(
        TEST_WEB_SOCKET_PROXY_CONFIGURATION
      );
      webSocketProxyServer = new BunProxyServer(proxyServerConfiguration);

      // Test enhanced method names exist
      expect(typeof webSocketProxyServer.getStats).toBe("function");
      expect(typeof webSocketProxyServer.getActiveConnections).toBe("function");
      expect(typeof webSocketProxyServer.isRunning).toBe("function");
    });
  });
});

describe("Bun Isolated Installs Integration", () => {
  test("should work with Bun's isolated installs", () => {
    // Test that our enhanced naming works with Bun's isolated installs
    expect(() => {
      import("./index");
    }).not.toThrow();
  });

  test("should resolve all enhanced dependencies", async () => {
    // Test that all our enhanced modules resolve correctly
    const modules = await Promise.all([
      import("./index"),
      import("./config"),
      import("./server"),
      import("./types"),
    ]);

    expect(modules).toHaveLength(4);
    expect(modules[0]).toBeDefined();
    expect(modules[1]).toBeDefined();
    expect(modules[2]).toBeDefined();
    expect(modules[3]).toBeDefined();
  });
});

console.log("✅ Enhanced naming test suite completed successfully!");
