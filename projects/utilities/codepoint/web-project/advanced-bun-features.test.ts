#!/usr/bin/env bun

/**
 * Advanced Bun Test Features Demonstration
 * Showcasing advanced Bun test capabilities with enhanced naming conventions
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
  WebSocketProxyOperationalError,
} from "./index";

// Import custom matchers
import "./custom-matchers";

// Test configuration with enhanced naming
const TEST_WEB_SOCKET_PROXY_CONFIGURATION = {
  targetUrl: "ws://localhost:8080/ws",
  listenPort: 3001,
  debug: true,
  maxConnections: 100,
  idleTimeout: 60000,
};

// Platform-specific test conditions
const isMacOS = process.platform === "darwin";
const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";

describe("Advanced Bun Test Features", () => {
  let webSocketProxyServer: BunProxyServer;
  let proxyServerConfiguration: ProxyServerConfig;

  beforeAll(async () => {
    console.log("🚀 Setting up advanced test environment...");
  });

  afterAll(async () => {
    console.log("🧹 Cleaning up advanced test environment...");
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

  describe("Test Modifiers and Conditional Testing", () => {
    // Platform-specific tests
    if (isMacOS) {
      test("should run only on macOS", () => {
        expect(process.platform).toBe("darwin");
      });
    }

    if (!isWindows) {
      test("should skip on Windows", () => {
        expect(true).toBe(true); // This won't run on Windows
      });
    }

    if (!isLinux) {
      test.todo("TODO: Linux-specific features", () => {
        // Marked as TODO on Linux, will run on other platforms
        expect(true).toBe(true);
      });
    }

    // Failing test example (known issue tracking)
    test.failing("known floating point precision issue", () => {
      expect(0.1 + 0.2).toBe(0.3); // This fails as expected
    });

    // Skip example
    test.skip("temporary disabled test", () => {
      expect(true).toBe(true); // Currently skipped
    });

    // TODO example
    test.todo("feature not yet implemented", () => {
      // Marked as TODO, won't run
      expect(true).toBe(true);
    });
  });

  describe("Parametrized Tests with test.each", () => {
    // Test multiple configuration scenarios
    test.each([
      {
        name: "minimal config",
        config: { targetUrl: "ws://localhost:8080/ws" },
      },
      { name: "full config", config: TEST_WEB_SOCKET_PROXY_CONFIGURATION },
      {
        name: "debug config",
        config: { targetUrl: "ws://localhost:8080/ws", debug: true },
      },
    ])("should create ProxyServerConfig with $name", ({ config }) => {
      expect(() => {
        new ProxyServerConfig(config);
      }).not.toThrow();
    });

    // Test port validation with multiple values
    test.each([
      [80, true],
      [3000, true],
      [8080, true],
      [65535, true],
      [-1, false],
      [65536, false],
      [70000, false],
    ])("port %i should be valid: %s", (port, isValid) => {
      if (isValid) {
        expect(port).toBeValidPort();
      } else {
        expect(port).not.toBeValidPort();
      }
    });

    // Test URL validation with multiple values
    test.each([
      ["ws://localhost:8080/ws", true],
      ["wss://secure.example.com/ws", true],
      ["http://localhost:8080", false],
      ["ftp://example.com", false],
      ["not-a-url", false],
    ])("URL '%s' should be valid WebSocket: %s", (url, isValid) => {
      if (isValid) {
        expect(url).toBeValidWebSocketUrl();
      } else {
        expect(url).not.toBeValidWebSocketUrl();
      }
    });
  });

  describe("Advanced Assertion Counting", () => {
    test("should verify exact assertion count", () => {
      expect.assertions(3); // Expect exactly 3 assertions

      expect(1 + 1).toBe(2);
      expect("hello").toContain("ell");
      expect([1, 2, 3]).toHaveLength(3);
    });

    test("should verify at least one assertion", async () => {
      expect.hasAssertions(); // Expect at least one assertion

      const config = new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);
      expect(config).toHaveEnhancedWebSocketProperties();
    });
  });

  describe("Timeout and Retry Testing", () => {
    // Test with custom timeout
    test("should complete within timeout", async () => {
      const config = new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);
      const server = new BunProxyServer(config);

      // This should complete quickly
      expect(server.isRunning()).toBe(false);
    }, 1000); // 1 second timeout

    // Test with retry (for potentially flaky operations)
    test(
      "should handle configuration creation reliably",
      () => {
        expect(() => {
          new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);
        }).not.toThrow();
      },
      { retry: 3 } // Retry up to 3 times if it fails
    );

    // Test with repeats for stability testing
    test(
      "should consistently validate enhanced properties",
      () => {
        const config = new ProxyServerConfig(
          TEST_WEB_SOCKET_PROXY_CONFIGURATION
        );
        expect(config).toHaveEnhancedWebSocketProperties();
        expect(config).toFollowEnhancedNamingConventions();
      },
      { repeats: 5 } // Run 6 times total (1 initial + 5 repeats)
    );
  });

  describe("Error Testing with Enhanced Matchers", () => {
    test("should throw enhanced configuration error", () => {
      expect(() => {
        new ProxyServerConfig({ targetUrl: "" } as any);
      }).toThrow(expect.toBeEnhancedWebSocketProxyError());
    });

    test("should handle async errors", async () => {
      const asyncError = async () => {
        throw new WebSocketProxyOperationalError(
          "Async operation failed",
          "ASYNC_ERROR"
        );
      };

      await expect(asyncError()).rejects.toThrow("Async operation failed");
    });

    test("should validate error types", () => {
      try {
        new ProxyServerConfig({ targetUrl: "" } as any);
      } catch (error) {
        expect(error).toBeEnhancedWebSocketProxyError();
        expect(error).toBeInstanceOf(WebSocketProxyConfigurationError);
      }
    });
  });

  describe("Type Testing with TypeScript", () => {
    test("should validate configuration object types", () => {
      const config = new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);

      // Type assertions using built-in matchers
      expect(typeof config.targetUrl).toBe("string");
      expect(typeof config.listenPort).toBe("number");
      expect(typeof config.debug).toBe("boolean");
      expect(config).toBeInstanceOf(ProxyServerConfig);
    });
  });

  describe("Snapshot Testing", () => {
    test("should snapshot configuration object", () => {
      const config = new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);

      // Snapshot the configuration structure
      expect(config.toObject()).toMatchSnapshot();
    });

    test("should snapshot performance metrics", () => {
      const config = new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);
      const server = new BunProxyServer(config);

      const metrics = server.getStats();

      // Snapshot the metrics structure
      expect(metrics).toMatchSnapshot();
    });
  });

  describe("Promise Testing", () => {
    test("should resolve promises correctly", async () => {
      const configPromise = Promise.resolve(
        new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION)
      );

      await expect(configPromise).resolves.toBeInstanceOf(ProxyServerConfig);
      await expect(configPromise).resolves.toHaveEnhancedWebSocketProperties();
    });

    test("should reject promises correctly", async () => {
      const errorPromise = Promise.reject(
        new WebSocketProxyConfigurationError("Invalid configuration")
      );

      await expect(errorPromise).rejects.toBeEnhancedWebSocketProxyError();
      await expect(errorPromise).rejects.toThrow("Invalid configuration");
    });
  });

  describe("Advanced Custom Matcher Usage", () => {
    test("should combine custom matchers with built-in matchers", () => {
      const config = new ProxyServerConfig(TEST_WEB_SOCKET_PROXY_CONFIGURATION);

      // Complex validation combining multiple matchers
      expect(config).toHaveEnhancedWebSocketProperties();
      expect(config.targetUrl).toBeValidWebSocketUrl();
      expect(config.listenPort).toBeValidPort();
      expect(config).toFollowEnhancedNamingConventions();
      expect(config).toBeInstanceOf(ProxyServerConfig);
    });

    test("should use custom matchers with negation", () => {
      expect({}).not.toHaveEnhancedWebSocketProperties();
      expect("http://localhost:8080").not.toBeValidWebSocketUrl();
      expect(70000).not.toBeValidPort();
      expect("invalid-error").not.toBeEnhancedWebSocketProxyError();
    });

    test("should use custom matchers in throw expectations", () => {
      expect(() => {
        new ProxyServerConfig({ targetUrl: "" } as any);
      }).toThrow(expect.toBeEnhancedWebSocketProxyError());
    });
  });

  // Conditional describe blocks
  if (isMacOS) {
    describe("macOS-Specific Features", () => {
      test("should handle macOS-specific behavior", () => {
        expect(process.platform).toBe("darwin");
        // Add macOS-specific tests here
      });
    });
  }

  if (!isWindows) {
    describe("Unix Features", () => {
      test("should work on Unix-like systems", () => {
        expect(["darwin", "linux"]).toContain(process.platform);
        // Add Unix-specific tests here
      });
    });
  }

  if (isLinux) {
    describe.todo("Upcoming Linux Support", () => {
      test("future Linux implementation", () => {
        // Marked as TODO on Linux, will run on other platforms
        expect(true).toBe(true);
      });
    });
  }
});

// Example of test.only for focused testing (commented out to avoid affecting normal test runs)
/*
describeOnly("Focused Test Suite", () => {
  testOnly("this test will run exclusively", () => {
    expect(true).toBe(true);
  });

  test("this test will also run", () => {
    expect(true).toBe(true);
  });
});
*/

// Example of describe.only for focused suite testing (commented out)
/*
describeOnly("Focused Suite", () => {
  test("test 1", () => {
    expect(true).toBe(true);
  });

  test("test 2", () => {
    expect(true).toBe(true);
  });
});
*/

console.log("✅ Advanced Bun test features demonstration completed!");
