/**
 * Test Suite for Enhanced CLI with Exclude Flag
 * 
 * Comprehensive tests for the new --inspect-exclude functionality
 * including exclude logic, filter+exclude combinations, and security features.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { parseInspectArgs, inspectScope } from "../enhanced-cli.js";
import { excludeFromInspectionTree, getExcludeStatistics, createExcludeSummary } from "../utils/filter.js";
import { EnhancedDomainContext } from "../contexts/EnhancedDomainContext.js";

describe("Enhanced CLI - Exclude Flag", () => {
  test("parses inspect-exclude flag with equals", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-exclude=keychain"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.exclude).toBe("keychain");
  });

  test("parses inspect-exclude flag with space", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-exclude", "secret"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.exclude).toBe("secret");
  });

  test("parses exclude with filter and include-user", () => {
    const result = parseInspectArgs([
      "--inspect",
      "--inspect-filter=payment",
      "--inspect-exclude=crypto",
      "--inspect-include-user",
      "--format=json"
    ]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.filter).toBe("payment");
    expect(result.exclude).toBe("crypto");
    expect(result.includeUser).toBe(true);
    expect(result.format).toBe("json");
  });

  test("handles all flags together", () => {
    const result = parseInspectArgs([
      "--inspect",
      "--inspect-depth=8",
      "--inspect-filter=venmo",
      "--inspect-exclude=secret",
      "--inspect-include-user",
      "--format=shell"
    ]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.depth).toBe(8);
    expect(result.filter).toBe("venmo");
    expect(result.exclude).toBe("secret");
    expect(result.includeUser).toBe(true);
    expect(result.format).toBe("shell");
  });
});

describe("Exclude Utility Functions", () => {
  test("excludeFromInspectionTree removes matching keys", () => {
    const obj = {
      platform: "macOS",
      secrets: { backend: "Keychain", token: "secret123" },
      user: { email: "test@example.com", name: "Test User" },
      payment: { venmo: "connected" }
    };
    
    const excluded = excludeFromInspectionTree(obj, "secrets");
    
    expect(excluded).toEqual({
      platform: "macOS",
      user: { email: "test@example.com", name: "Test User" },
      payment: { venmo: "connected" }
    });
  });

  test("excludeFromInspectionTree removes matching values", () => {
    const obj = {
      platform: "macOS",
      backend: "Keychain",
      user: { email: "test@example.com", name: "Test User" },
      config: { secret: "hidden", public: "visible" }
    };
    
    const excluded = excludeFromInspectionTree(obj, "keychain");
    
    expect(excluded).toEqual({
      platform: "macOS",
      user: { email: "test@example.com", name: "Test User" },
      config: { public: "visible" }
    });
  });

  test("excludeFromInspectionTree handles case insensitive", () => {
    const obj = {
      platform: "macOS",
      SECRETS: { backend: "Keychain" },
      user: { email: "test@example.com" }
    };
    
    const excluded = excludeFromInspectionTree(obj, "secrets");
    
    expect(excluded).toEqual({
      platform: "macOS",
      user: { email: "test@example.com" }
    });
  });

  test("excludeFromInspectionTree handles arrays", () => {
    const obj = {
      apps: [
        { name: "Venmo", status: "connected", token: "secret" },
        { name: "CashApp", status: "disconnected" },
        { name: "SecretApp", status: "hidden" }
      ]
    };
    
    const excluded = excludeFromInspectionTree(obj, "secret");
    
    expect(excluded).toEqual({
      apps: [
        { name: "CashApp", status: "disconnected" }
      ]
    });
  });

  test("excludeFromInspectionTree returns undefined if all excluded", () => {
    const obj = {
      secrets: { backend: "Keychain" },
      secret: "hidden",
      userSecret: "private"
    };
    
    const excluded = excludeFromInspectionTree(obj, "secret");
    
    expect(excluded).toBeUndefined();
  });

  test("getExcludeStatistics calculates correctly", () => {
    const original = {
      platform: "macOS",
      secrets: { backend: "Keychain", token: "secret" },
      user: { email: "test@example.com" }
    };
    
    const remaining = {
      platform: "macOS",
      user: { email: "test@example.com" }
    };
    
    const stats = getExcludeStatistics(original, remaining);
    
    expect(stats.originalNodes).toBeGreaterThan(0);
    expect(stats.excludedNodes).toBeGreaterThan(0);
    expect(stats.remainingNodes).toBeGreaterThan(0);
    expect(stats.reduction).toBeGreaterThan(0);
    expect(stats.exclusionApplied).toBe(true);
  });

  test("createExcludeSummary generates correct summary", () => {
    const original = {
      platform: "macOS",
      secrets: { backend: "Keychain" },
      user: { email: "test@example.com" }
    };
    
    const remaining = {
      platform: "macOS",
      user: { email: "test@example.com" }
    };
    
    const summary = createExcludeSummary("secret", original, remaining);
    
    expect(summary).toContain("Exclude \"secret\"");
    expect(summary).toContain("nodes removed");
    expect(summary).toContain("% reduction");
  });
});

describe("Filter and Exclude Combinations", () => {
  test("exclude runs before filter", () => {
    const obj = {
      venmo: { status: "connected", token: "venmo_secret" },
      cashapp: { status: "connected", cashtag: "$test" },
      crypto: { address: "bc1q...", secret: "private_key" }
    };
    
    // First exclude secrets, then filter for connected status
    let result = excludeFromInspectionTree(obj, "secret");
    result = filterInspectionTree(result, "connected");
    
    expect(result).toEqual({
      venmo: { status: "connected" },
      cashapp: { status: "connected", cashtag: "$test" }
    });
  });

  test("exclude and filter with user context", () => {
    const obj = {
      domain: "localhost",
      user: {
        email: "test@example.com",
        phone: "+1-555-1234",
        secret: "user_secret"
      },
      config: {
        apiKey: "secret_key",
        public: "visible"
      }
    };
    
    // Exclude secrets, then filter for user-related content
    let result = excludeFromInspectionTree(obj, "secret");
    result = filterInspectionTree(result, "user");
    
    expect(result).toEqual({
      user: {
        email: "test@example.com",
        phone: "+1-555-1234"
      }
    });
  });

  test("multiple excludes work correctly", () => {
    const obj = {
      platform: "macOS",
      secrets: { backend: "Keychain" },
      user: { email: "test@example.com", secret: "private" },
      config: { secret: "config_secret", public: "visible" }
    };
    
    // Apply multiple excludes sequentially
    let result = excludeFromInspectionTree(obj, "secrets");
    result = excludeFromInspectionTree(result, "secret");
    
    expect(result).toEqual({
      platform: "macOS",
      user: { email: "test@example.com" },
      config: { public: "visible" }
    });
  });
});

describe("Enhanced CLI - Integration Tests with Exclude", () => {
  test("inspectScope with exclude only", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ exclude: "keychain" });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toContain("Exclude \"keychain\"");
    expect(output).not.toContain("keychain");
  });

  test("inspectScope with exclude and filter", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ 
      filter: "domain",
      exclude: "secret",
      format: "json"
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    
    expect(parsed).toHaveProperty("[DOMAIN]");
    expect(parsed).not.toContain("secret");
  });

  test("inspectScope with exclude and include user", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ 
      exclude: "email",
      includeUser: true
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toContain("USER_CONTEXT");
    expect(output).not.toContain("demo@duoplus.local");
  });

  test("inspectScope with all content excluded", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error("process.exit called");
    });

    try {
      await inspectScope({ exclude: "domain" }); // This should exclude everything
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });

  test("inspectScope with invalid exclude", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error("process.exit called");
    });

    try {
      await inspectScope({ exclude: "" });
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });
});

describe("Security and Privacy Features", () => {
  test("exclude removes PII effectively", () => {
    const obj = {
      user: {
        email: "user@example.com",
        phone: "+1-555-1234",
        name: "John Doe",
        userId: "user_123"
      },
      config: {
        secret: "private_key",
        token: "access_token"
      }
    };
    
    // Exclude all PII
    const excluded = excludeFromInspectionTree(obj, "email");
    const furtherExcluded = excludeFromInspectionTree(excluded, "phone");
    
    expect(furtherExcluded).toEqual({
      user: {
        name: "John Doe",
        userId: "user_123"
      },
      config: {
        secret: "private_key",
        token: "access_token"
      }
    });
  });

  test("exclude works with sensitive payment data", () => {
    const obj = {
      payment: {
        venmo: {
          cashtag: "@user",
          token: "venmo_secret_token",
          accountId: "123456789"
        },
        crypto: {
          bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          ethereum: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45",
          privateKey: "crypto_private_key"
        }
      }
    };
    
    // Exclude all sensitive payment data
    let result = excludeFromInspectionTree(obj, "token");
    result = excludeFromInspectionTree(result, "private");
    result = excludeFromInspectionTree(result, "account");
    
    expect(result).toEqual({
      payment: {
        venmo: {
          cashtag: "@user"
        },
        crypto: {
          bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          ethereum: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45"
        }
      }
    });
  });

  test("exclude preserves safe data while removing secrets", () => {
    const obj = {
      system: {
        platform: "macOS",
        version: "14.0",
        arch: "arm64"
      },
      secrets: {
        apiKey: "secret_api_key",
        databaseUrl: "postgresql://user:pass@localhost/db",
        encryptionKey: "encryption_key_123"
      }
    };
    
    const result = excludeFromInspectionTree(obj, "secret");
    
    expect(result).toEqual({
      system: {
        platform: "macOS",
        version: "14.0",
        arch: "arm64"
      }
    });
  });
});
