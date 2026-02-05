/**
 * Comprehensive Test Suite for Regex and Path Filtering
 * 
 * Tests the new regex filtering and field-specific exclusion features
 * with comprehensive coverage including edge cases and security scenarios.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { inspectScope } from "../enhanced-cli.js";
import { 
  filterInspectionTreeWithRegex, 
  excludePathsFromInspectionTree, 
  validateExcludePath, 
  validateRegexPattern, 
  createExcludePathsSummary,
  getRegexSuggestions,
  getPathSuggestions
} from "../utils/regex-filter.js";

describe("Regex Filtering", () => {
  test("filterInspectionTreeWithRegex matches patterns in keys and values", () => {
    const obj = {
      user: {
        email: "test@example.com",
        phone: "555-123-4567"
      },
      config: {
        api_key: "secret123",
        timeout: 5000
      }
    };
    
    const regex = /\w+@\w+\.\w+/; // Email pattern
    const result = filterInspectionTreeWithRegex(obj, regex);
    
    expect(result).toEqual({
      user: {
        email: "test@example.com"
      }
    });
  });

  test("filterInspectionTreeWithRegex handles case-insensitive matching", () => {
    const obj = {
      VENMO: { status: "connected" },
      cashapp: { status: "connected" },
      crypto: { status: "disconnected" }
    };
    
    const regex = /venmo/i;
    const result = filterInspectionTreeWithRegex(obj, regex);
    
    expect(result).toEqual({
      VENMO: { status: "connected" }
    });
  });

  test("filterInspectionTreeWithRegex handles arrays", () => {
    const obj = {
      payments: [
        { type: "venmo", status: "active" },
        { type: "cashapp", status: "active" },
        { type: "crypto", status: "inactive" }
      ]
    };
    
    const regex = /venmo|cashapp/i;
    const result = filterInspectionTreeWithRegex(obj, regex);
    
    expect(result).toEqual({
      payments: [
        { type: "venmo", status: "active" },
        { type: "cashapp", status: "active" }
      ]
    });
  });

  test("filterInspectionTreeWithRegex returns undefined for no matches", () => {
    const obj = {
      user: { name: "John" },
      config: { timeout: 5000 }
    };
    
    const regex = /email/i;
    const result = filterInspectionTreeWithRegex(obj, regex);
    
    expect(result).toBeUndefined();
  });

  test("filterInspectionTreeWithRegex handles primitive values", () => {
    const obj = "test@example.com";
    const regex = /\w+@\w+\.\w+/;
    const result = filterInspectionTreeWithRegex(obj, regex);
    
    expect(result).toBe("test@example.com");
  });
});

describe("Path Exclusion", () => {
  test("excludePathsFromInspectionTree removes specific paths", () => {
    const obj = {
      user: {
        email: "test@example.com",
        phone: "555-123-4567",
        name: "John Doe"
      },
      config: {
        api_key: "secret123",
        timeout: 5000
      }
    };
    
    const result = excludePathsFromInspectionTree(obj, ["user.email", "config.api_key"]);
    
    expect(result).toEqual({
      user: {
        phone: "555-123-4567",
        name: "John Doe"
      },
      config: {
        timeout: 5000
      }
    });
  });

  test("excludePathsFromInspectionTree handles nested paths", () => {
    const obj = {
      paymentApps: {
        venmo: {
          cashtag: "@john",
          token: "secret_token_123",
          status: "connected"
        },
        cashapp: {
          cashtag: "$john",
          token: "secret_token_456",
          status: "connected"
        }
      }
    };
    
    const result = excludePathsFromInspectionTree(obj, [
      "paymentApps.venmo.token",
      "paymentApps.cashapp.token"
    ]);
    
    expect(result).toEqual({
      paymentApps: {
        venmo: {
          cashtag: "@john",
          status: "connected"
        },
        cashapp: {
          cashtag: "$john",
          status: "connected"
        }
      }
    });
  });

  test("excludePathsFromInspectionTree handles arrays", () => {
    const obj = {
      users: [
        { id: 1, email: "user1@example.com", name: "User 1" },
        { id: 2, email: "user2@example.com", name: "User 2" }
      ]
    };
    
    const result = excludePathsFromInspectionTree(obj, ["users.0.email"]);
    
    expect(result).toEqual({
      users: [
        { id: 1, name: "User 1" },
        { id: 2, email: "user2@example.com", name: "User 2" }
      ]
    });
  });

  test("excludePathsFromInspectionTree handles non-existent paths", () => {
    const obj = {
      user: { name: "John" }
    };
    
    const result = excludePathsFromInspectionTree(obj, ["user.email", "config.api_key"]);
    
    expect(result).toEqual({
      user: { name: "John" }
    });
  });
});

describe("Validation Functions", () => {
  test("validateExcludePath accepts valid paths", () => {
    const validPaths = [
      "user.email",
      "paymentApps.venmo.token",
      "config.api_key",
      "users.0.name"
    ];
    
    for (const path of validPaths) {
      const result = validateExcludePath(path);
      expect(result.valid).toBe(true);
    }
  });

  test("validateExcludePath rejects dangerous patterns", () => {
    const invalidPaths = [
      "../etc/passwd",
      "user.__proto__.polluted",
      "user.constructor.prototype",
      "user.prototype.toString"
    ];
    
    for (const path of invalidPaths) {
      const result = validateExcludePath(path);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous');
    }
  });

  test("validateExcludePath rejects invalid format", () => {
    const invalidPaths = [
      "",
      "123.invalid",
      "user..email",
      ".user.email",
      "user.email."
    ];
    
    for (const path of invalidPaths) {
      const result = validateExcludePath(path);
      expect(result.valid).toBe(false);
    }
  });

  test("validateRegexPattern accepts valid patterns", () => {
    const validPatterns = [
      "\\w+@\\w+\\.\\w+",
      "\\d{3}-\\d{3}-\\d{4}",
      "bc1[a-z0-9]{25,39}",
      "\\$[a-zA-Z0-9_]{1,20}"
    ];
    
    for (const pattern of validPatterns) {
      const result = validateRegexPattern(pattern);
      expect(result.valid).toBe(true);
    }
  });

  test("validateRegexPattern rejects dangerous patterns", () => {
    const dangerousPatterns = [
      "(?=.*a)(?=.*b)(?=.*c)(?=.*d)(?=.*e)",  // Complex lookahead
      "a{10,}",  // Excessive repetition
      "(a+)+",   // Catastrophic backtracking
      "((a+)*b)" // Nested quantifiers
    ];
    
    for (const pattern of dangerousPatterns) {
      const result = validateRegexPattern(pattern);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dangerous');
    }
  });

  test("validateRegexPattern rejects invalid regex", () => {
    const invalidPatterns = [
      "[invalid",
      "(unclosed",
      "*invalid",
      ""
    ];
    
    for (const pattern of invalidPatterns) {
      const result = validateRegexPattern(pattern);
      expect(result.valid).toBe(false);
    }
  });
});

describe("Summary and Suggestions", () => {
  test("createExcludePathsSummary generates accurate summary", () => {
    const originalObj = {
      user: { email: "test@example.com", phone: "555-1234" },
      config: { api_key: "secret" }
    };
    
    const resultObj = {
      user: { phone: "555-1234" },
      config: {}
    };
    
    const summary = createExcludePathsSummary(
      ["user.email", "config.api_key"],
      originalObj,
      resultObj
    );
    
    expect(summary).toContain("Path Exclusion Summary");
    expect(summary).toContain("user.email, config.api_key");
    expect(summary).toContain("Nodes removed: 2");
  });

  test("getRegexSuggestions provides relevant patterns", () => {
    const obj = {
      user: {
        email: "test@example.com",
        phone: "555-123-4567"
      },
      paymentApps: {
        venmo: { cashtag: "@john" },
        crypto: {
          bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        }
      }
    };
    
    const suggestions = getRegexSuggestions(obj);
    
    expect(suggestions).toContain('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b');
    expect(suggestions).toContain('\\b\\+?1?[\\s-]?\\(?[0-9]{3}\\)?[\\s-]?[0-9]{3}[\\s-]?[0-9]{4}\\b');
    expect(suggestions).toContain('\\bc1[a-z0-9]{25,39}\\b');
  });

  test("getPathSuggestions provides relevant paths", () => {
    const obj = {
      user: {
        email: "test@example.com",
        phone: "555-123-4567",
        name: "John"
      },
      paymentApps: {
        venmo: {
          token: "secret123",
          status: "connected"
        }
      }
    };
    
    const paths = getPathSuggestions(obj);
    
    expect(paths).toContain("user.email");
    expect(paths).toContain("user.phone");
    expect(paths).toContain("paymentApps.venmo.token");
    expect(paths).toContain("paymentApps.venmo.status");
  });
});

describe("CLI Integration Tests", () => {
  test("inspectScope with regex filter", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({
      filterRegex: "\\w+@\\w+\\.\\w+",
      includeUser: true,
      enableAuditLogging: false
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toBeDefined();
  });

  test("inspectScope with path exclusions", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({
      excludePaths: ["user.email", "user.phone"],
      includeUser: true,
      enableAuditLogging: false
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toBeDefined();
  });

  test("inspectScope with combined regex and path exclusion", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({
      filterRegex: "payment",
      excludePaths: ["user.email", "paymentApps.crypto"],
      includeUser: true,
      enableAuditLogging: false
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toBeDefined();
  });

  test("inspectScope handles invalid regex gracefully", async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error("process.exit called");
    });

    try {
      await inspectScope({
        filterRegex: "[invalid",
        enableAuditLogging: false
      });
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });

  test("inspectScope handles invalid path gracefully", async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error("process.exit called");
    });

    try {
      await inspectScope({
        excludePaths: ["../etc/passwd"],
        enableAuditLogging: false
      });
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });
});

describe("Security Tests", () => {
  test("regex filtering prevents ReDoS attacks", () => {
    const obj = {
      data: "a".repeat(1000) + "b"
    };
    
    // This pattern could cause catastrophic backtracking
    const dangerousRegex = /(a+)+b/;
    
    const validation = validateRegexPattern(dangerousRegex.source);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('dangerous');
  });

  test("path exclusion prevents prototype pollution", () => {
    const obj = {
      user: { name: "John" }
    };
    
    const dangerousPaths = [
      "__proto__.polluted",
      "constructor.prototype.polluted",
      "prototype.polluted"
    ];
    
    for (const path of dangerousPaths) {
      const validation = validateExcludePath(path);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('dangerous');
    }
  });

  test("path exclusion prevents directory traversal", () => {
    const dangerousPaths = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "folder/../../../etc/passwd"
    ];
    
    for (const path of dangerousPaths) {
      const validation = validateExcludePath(path);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('dangerous');
    }
  });
});

describe("Performance Tests", () => {
  test("regex filtering handles large objects efficiently", () => {
    const largeObj = {};
    for (let i = 0; i < 1000; i++) {
      largeObj[`key${i}`] = {
        email: `user${i}@example.com`,
        phone: `555-${i.toString().padStart(3, '0')}-1234`,
        data: `data${i}`
      };
    }
    
    const startTime = performance.now();
    const result = filterInspectionTreeWithRegex(largeObj, /email/i);
    const endTime = performance.now();
    
    expect(result).toBeDefined();
    expect(Object.keys(result)).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });

  test("path exclusion handles large objects efficiently", () => {
    const largeObj = {};
    for (let i = 0; i < 1000; i++) {
      largeObj[`key${i}`] = {
        email: `user${i}@example.com`,
        phone: `555-${i.toString().padStart(3, '0')}-1234`,
        data: `data${i}`
      };
    }
    
    const startTime = performance.now();
    const result = excludePathsFromInspectionTree(largeObj, Array.from({length: 100}, (_, i) => `key${i}.email`));
    const endTime = performance.now();
    
    expect(result).toBeDefined();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});

describe("Edge Cases", () => {
  test("handles null and undefined values", () => {
    const obj = {
      nullValue: null,
      undefinedValue: undefined,
      stringValue: "test@example.com"
    };
    
    const result = filterInspectionTreeWithRegex(obj, /email/i);
    expect(result).toEqual({
      stringValue: "test@example.com"
    });
  });

  test("handles empty objects and arrays", () => {
    const obj = {
      emptyObject: {},
      emptyArray: [],
      nonEmpty: { email: "test@example.com" }
    };
    
    const result = filterInspectionTreeWithRegex(obj, /email/i);
    expect(result).toEqual({
      nonEmpty: { email: "test@example.com" }
    });
  });

  test("handles circular references", () => {
    const obj: any = { name: "test" };
    obj.self = obj;
    
    // Should not crash on circular references
    expect(() => {
      filterInspectionTreeWithRegex(obj, /test/i);
    }).not.toThrow();
  });

  test("handles very deep nesting", () => {
    let obj: any = { email: "test@example.com" };
    for (let i = 0; i < 100; i++) {
      obj = { level: i, nested: obj };
    }
    
    const result = filterInspectionTreeWithRegex(obj, /email/i);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('nested');
  });
});
