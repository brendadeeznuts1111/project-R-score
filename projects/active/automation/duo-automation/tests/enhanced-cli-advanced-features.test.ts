/**
 * Comprehensive Test Suite for Enhanced CLI with Security and Performance
 * 
 * Tests the advanced features including security redaction, audit logging,
 * performance optimization, and regex filtering.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { inspectScope } from "../enhanced-cli.js";
import { redactSensitive, redactSensitiveObject, AuditLogger, applySecurityMeasures, validateInspectSecurity } from "../utils/security.js";
import { filterInspectionTreeOptimized, filterLargeInspectionAsync, PerformanceMonitor, InspectionBenchmark } from "../utils/performance.js";
import { parseFilterConfig, applyFilterConfig, validateFilterConfig, filterWithRegex, filterByField, filterByPath } from "../utils/advanced-filter.js";

describe("Security Enhancements", () => {
  test("redactSensitive removes PII patterns", () => {
    const text = `
      Contact: john.doe@example.com
      Phone: +1-555-123-4567
      Credit Card: 4111-1111-1111-1111
      SSN: 123-45-6789
      Bitcoin: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
      API Key: sk_test_4242424242424242
    `;
    
    const redacted = redactSensitive(text);
    
    expect(redacted).toContain("[REDACTED_EMAIL]");
    expect(redacted).toContain("[REDACTED_PHONE]");
    expect(redacted).toContain("[REDACTED_CREDIT_CARD]");
    expect(redacted).toContain("[REDACTED_SSN]");
    expect(redacted).toContain("[REDACTED_BITCOIN]");
    expect(redacted).toContain("[REDACTED_API_KEY]");
    expect(redacted).not.toContain("john.doe@example.com");
    expect(redacted).not.toContain("4111-1111-1111-1111");
  });

  test("redactSensitiveObject handles nested objects", () => {
    const obj = {
      user: {
        email: "user@example.com",
        phone: "+1-555-123-4567",
        profile: {
          ssn: "123-45-6789",
          creditCard: "4111111111111111"
        }
      },
      config: {
        apiKey: "sk_test_4242424242424242",
        publicKey: "pk_test_4242424242424242"
      }
    };
    
    const redacted = redactSensitiveObject(obj);
    
    expect(redacted.user.email).toBe("[REDACTED_EMAIL]");
    expect(redacted.user.phone).toBe("[REDACTED_PHONE]");
    expect(redacted.user.profile.ssn).toBe("[REDACTED_SSN]");
    expect(redacted.config.apiKey).toBe("[REDACTED_API_KEY]");
    expect(redacted.config.publicKey).toBe("[REDACTED_API_KEY]");
  });

  test("AuditLogger tracks inspection events", async () => {
    const auditLogger = new AuditLogger();
    
    const event = {
      userId: "test_user",
      command: "scope --inspect",
      flags: { filter: "venmo", includeUser: true },
      timestamp: new Date().toISOString(),
      success: true
    };
    
    await auditLogger.log(event);
    
    const recentEvents = auditLogger.getRecentEvents(10);
    expect(recentEvents).toHaveLength(1);
    expect(recentEvents[0].userId).toBe("test_user");
    expect(recentEvents[0].success).toBe(true);
  });

  test("validateInspectSecurity catches dangerous combinations", () => {
    const validation = validateInspectSecurity(
      { enableRedaction: false, enableAuditLogging: true },
      { includeUser: true, format: "json", depth: 20, filter: "secret" }
    );
    
    expect(validation.valid).toBe(true);
    expect(validation.warnings).toContain(
      "User context included without redaction - PII may be exposed"
    );
    expect(validation.warnings).toContain(
      "JSON format with user context - ensure proper handling of sensitive data"
    );
    expect(validation.warnings).toContain(
      "Deep inspection depth may expose sensitive nested data"
    );
  });

  test("applySecurityMeasures redacts blocked patterns", () => {
    const output = `
      {
        "password": "secret123",
        "token": "abc123",
        "public": "visible"
      }
    `;
    
    const secured = applySecurityMeasures(output, {
      enableRedaction: true,
      blockedPatterns: ["password", "secret", "token", "key"]
    });
    
    expect(secured).toContain('"password": "[REDACTED]"');
    expect(secured).toContain('"token": "[REDACTED]"');
    expect(secured).toContain('"public": "visible"');
    expect(secured).not.toContain("secret123");
    expect(secured).not.toContain("abc123");
  });
});

describe("Performance Optimizations", () => {
  test("filterInspectionTreeOptimized respects limits", () => {
    const largeObj = createLargeObject(1000);
    
    const { result, terminated, terminationReason, metrics } = filterInspectionTreeOptimized(
      largeObj,
      "test",
      {
        maxDepth: 5,
        maxNodes: 100,
        maxDuration: 1000,
        maxMemory: 10 * 1024 * 1024
      }
    );
    
    expect(terminated).toBe(true);
    expect(terminationReason).toContain("Max nodes");
    expect(metrics.duration).toBeGreaterThan(0);
  });

  test("PerformanceMonitor tracks operations", () => {
    const monitor = new PerformanceMonitor();
    
    monitor.start();
    monitor.incrementOperation('filters');
    monitor.incrementOperation('excludes');
    monitor.setNodeCount(100);
    monitor.setDepth(5);
    
    const metrics = monitor.end();
    
    expect(metrics.duration).toBeGreaterThan(0);
    expect(metrics.nodeCount).toBe(100);
    expect(metrics.depth).toBe(5);
    expect(metrics.operations.filters).toBe(1);
    expect(metrics.operations.excludes).toBe(1);
  });

  test("InspectionBenchmark measures performance", async () => {
    const benchmark = new InspectionBenchmark();
    
    const results = await benchmark.benchmark("test_filter", () => {
      const obj = { test: "value", nested: { test: "deep" } };
      return filterInspectionTreeOptimized(obj, "test");
    }, 3);
    
    expect(results.averageDuration).toBeGreaterThan(0);
    expect(results.iterations).toBe(3);
    expect(results.minDuration).toBeLessThanOrEqual(results.maxDuration);
    
    const report = benchmark.generateReport();
    expect(report).toContain("Performance Benchmark Report");
    expect(report).toContain("test_filter");
  });

  test("filterLargeInspectionAsync handles large datasets", async () => {
    const largeObj = createLargeObject(15000);
    
    const result = await filterLargeInspectionAsync(largeObj, "test");
    
    expect(result).toBeDefined();
    // Should process the large object without blocking
  });
});

describe("Advanced Filtering", () => {
  test("parseFilterConfig handles different filter types", () => {
    // Regex pattern
    const regexConfig = parseFilterConfig("/venmo|cashapp/i");
    expect(regexConfig.type).toBe("regex");
    expect(regexConfig.value).toBe("venmo|cashapp");
    expect(regexConfig.flags).toBe("i");
    
    // Field-specific
    const fieldConfig = parseFilterConfig("email=user@example.com");
    expect(fieldConfig.type).toBe("field");
    expect(fieldConfig.field).toBe("email");
    expect(fieldConfig.value).toBe("user@example.com");
    
    // Path-based
    const pathConfig = parseFilterConfig("user.paymentApps.venmo");
    expect(pathConfig.type).toBe("path");
    expect(pathConfig.path).toBe("user.paymentApps.venmo");
    
    // Keyword
    const keywordConfig = parseFilterConfig("venmo");
    expect(keywordConfig.type).toBe("keyword");
    expect(keywordConfig.value).toBe("venmo");
  });

  test("validateFilterConfig validates patterns", () => {
    // Valid regex
    const validRegex = validateFilterConfig({
      type: "regex",
      value: "test.*pattern",
      flags: "i"
    });
    expect(validRegex.valid).toBe(true);
    
    // Invalid regex
    const invalidRegex = validateFilterConfig({
      type: "regex",
      value: "[invalid",
      flags: "i"
    });
    expect(invalidRegex.valid).toBe(false);
    expect(invalidRegex.error).toContain("Invalid regex");
    
    // Missing field
    const missingField = validateFilterConfig({
      type: "field",
      value: "test"
    });
    expect(missingField.valid).toBe(false);
    expect(missingField.error).toContain("Field name is required");
  });

  test("filterWithRegex applies regex patterns", () => {
    const obj = {
      venmo: { status: "connected" },
      cashapp: { status: "connected" },
      crypto: { status: "disconnected" }
    };
    
    const result = filterWithRegex(obj, "venmo|cashapp", "i");
    
    expect(result).toEqual({
      venmo: { status: "connected" },
      cashapp: { status: "connected" }
    });
  });

  test("filterByField filters specific fields", () => {
    const obj = {
      email: "user@example.com",
      phone: "+1-555-1234",
      name: "John Doe",
      backupEmail: "backup@example.com"
    };
    
    // Filter all email fields
    const result = filterByField(obj, "email");
    
    expect(result).toEqual({
      email: "user@example.com",
      backupEmail: "backup@example.com"
    });
  });

  test("filterByPath uses path patterns", () => {
    const obj = {
      user: {
        paymentApps: {
          venmo: { status: "connected" },
          cashapp: { status: "connected" }
        },
        profile: {
          venmo: "@user"
        }
      },
      config: {
        venmo: { enabled: true }
      }
    };
    
    // Filter all venmo-related paths
    const result = filterByPath(obj, "*.venmo");
    
    expect(result).toEqual({
      user: {
        paymentApps: {
          venmo: { status: "connected" }
        },
        profile: {
          venmo: "@user"
        }
      },
      config: {
        venmo: { enabled: true }
      }
    });
  });
});

describe("Integration Tests with Enhanced Features", () => {
  test("inspectScope with security and performance options", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({
      filter: "domain",
      enableRedaction: true,
      enableAuditLogging: false, // Disable for test
      maxDepth: 10
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toContain("domain");
    expect(output).toContain("⚡ Processed in");
  });

  test("inspectScope with regex filter", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({
      filter: "/domain|user/i",
      enableRedaction: true,
      enableAuditLogging: false
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toContain("domain");
  });

  test("inspectScope handles security validation failures", async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error("process.exit called");
    });

    try {
      await inspectScope({
        filter: "secret",
        enableRedaction: false,
        enableAuditLogging: false
      });
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });

  test("inspectScope with async processing", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({
      filter: "test",
      asyncProcessing: true,
      enableAuditLogging: false
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toBeDefined();
  });
});

describe("Error Handling and Edge Cases", () => {
  test("handles invalid regex patterns gracefully", () => {
    const result = filterWithRegex({ test: "value" }, "[invalid");
    expect(result).toEqual({ test: "value" });
  });

  test("handles empty objects in performance optimization", () => {
    const { result, terminated } = filterInspectionTreeOptimized({}, "test");
    expect(result).toBeUndefined();
    expect(terminated).toBe(false);
  });

  test("handles circular references in redaction", () => {
    const obj: any = { name: "test" };
    obj.self = obj;
    
    const redacted = redactSensitiveObject(obj);
    expect(redacted.name).toBe("test");
    expect(redacted.self).toBe(redacted); // Circular reference preserved
  });

  test("handles malformed filter configurations", () => {
    const invalidConfig = {
      type: "invalid" as any,
      value: "test"
    };
    
    // Should fall back to keyword filtering
    const result = applyFilterConfig({ test: "value" }, invalidConfig);
    expect(result).toEqual({ test: "value" });
  });
});

// Helper function to create large test objects
function createLargeObject(size: number): any {
  const obj: any = {};
  
  for (let i = 0; i < size; i++) {
    obj[`key${i}`] = {
      id: i,
      value: `test${i}`,
      nested: {
        deep: `value${i}`,
        data: `test${i}`
      }
    };
  }
  
  return obj;
}
