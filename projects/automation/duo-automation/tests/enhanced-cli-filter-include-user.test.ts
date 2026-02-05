/**
 * Test Suite for Enhanced CLI with Filter and Include User Flags
 * 
 * Comprehensive tests for the new --inspect-filter and --inspect-include-user
 * functionality including filter validation, tree filtering, and user context.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { parseInspectArgs, inspectScope } from "../enhanced-cli.js";
import { filterInspectionTree, formatShellFromObject, validateFilterKeyword, getFilterSuggestions } from "../utils/filter.js";
import { EnhancedDomainContext } from "../contexts/EnhancedDomainContext.js";

describe("Enhanced CLI - Filter and Include User", () => {
  test("parses inspect-filter flag with equals", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-filter=venmo"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.filter).toBe("venmo");
  });

  test("parses inspect-filter flag with space", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-filter", "email"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.filter).toBe("email");
  });

  test("parses inspect-include-user flag", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-include-user"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.includeUser).toBe(true);
  });

  test("parses both filter and include-user flags", () => {
    const result = parseInspectArgs([
      "--inspect",
      "--inspect-filter=crypto",
      "--inspect-include-user",
      "--format=json"
    ]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.filter).toBe("crypto");
    expect(result.includeUser).toBe(true);
    expect(result.format).toBe("json");
  });

  test("handles all flags together", () => {
    const result = parseInspectArgs([
      "--inspect",
      "--inspect-depth=8",
      "--inspect-filter=payment",
      "--inspect-include-user",
      "--format=shell"
    ]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.depth).toBe(8);
    expect(result.filter).toBe("payment");
    expect(result.includeUser).toBe(true);
    expect(result.format).toBe("shell");
  });
});

describe("Filter Utility Functions", () => {
  test("filterInspectionTree finds matching keys", () => {
    const obj = {
      platform: "macOS",
      secrets: { backend: "Keychain" },
      user: { email: "test@example.com" },
      payment: { venmo: "connected" }
    };
    
    const filtered = filterInspectionTree(obj, "venmo");
    
    expect(filtered).toEqual({
      payment: { venmo: "connected" }
    });
  });

  test("filterInspectionTree finds matching values", () => {
    const obj = {
      platform: "macOS",
      secrets: { backend: "Keychain" },
      user: { email: "test@example.com" },
      payment: { venmo: "connected" }
    };
    
    const filtered = filterInspectionTree(obj, "macos");
    
    expect(filtered).toEqual({
      platform: "macOS"
    });
  });

  test("filterInspectionTree handles case insensitive", () => {
    const obj = {
      platform: "macOS",
      secrets: { backend: "Keychain" },
      user: { email: "test@example.com" },
      payment: { venmo: "connected" }
    };
    
    const filtered = filterInspectionTree(obj, "KEYCHAIN");
    
    expect(filtered).toEqual({
      secrets: { backend: "Keychain" }
    });
  });

  test("filterInspectionTree returns undefined for no matches", () => {
    const obj = {
      platform: "macOS",
      secrets: { backend: "Keychain" },
      user: { email: "test@example.com" }
    };
    
    const filtered = filterInspectionTree(obj, "windows");
    
    expect(filtered).toBeUndefined();
  });

  test("filterInspectionTree handles arrays", () => {
    const obj = {
      apps: [
        { name: "Venmo", status: "connected" },
        { name: "CashApp", status: "disconnected" },
        { name: "PayPal", status: "connected" }
      ]
    };
    
    const filtered = filterInspectionTree(obj, "connected");
    
    expect(filtered).toEqual({
      apps: [
        { name: "Venmo", status: "connected" },
        { name: "PayPal", status: "connected" }
      ]
    });
  });

  test("formatShellFromObject creates environment variables", () => {
    const obj = {
      domain: "localhost",
      user: {
        email: "test@example.com",
        phone: "+1-555-1234"
      }
    };
    
    const output = formatShellFromObject(obj);
    
    expect(output).toContain('export DUOPLUS_DOMAIN="localhost"');
    expect(output).toContain('export DUOPLUS_USER_EMAIL="test@example.com"');
    expect(output).toContain('export DUOPLUS_USER_PHONE="+1-555-1234"');
  });

  test("validateFilterKeyword accepts valid keywords", () => {
    expect(validateFilterKeyword("venmo")).toEqual({ valid: true });
    expect(validateFilterKeyword("email")).toEqual({ valid: true });
    expect(validateFilterKeyword("25.50")).toEqual({ valid: true });
  });

  test("validateFilterKeyword rejects invalid keywords", () => {
    expect(validateFilterKeyword("")).toEqual({
      valid: false,
      error: "Filter keyword cannot be empty"
    });
    
    expect(validateFilterKeyword("a".repeat(101))).toEqual({
      valid: false,
      error: "Filter keyword too long (max 100 characters)"
    });
    
    expect(validateFilterKeyword("line\nbreak")).toEqual({
      valid: false,
      error: "Filter keyword cannot contain newlines"
    });
  });

  test("getFilterSuggestions extracts meaningful keywords", () => {
    const obj = {
      domain: "localhost",
      secrets_backend: "Keychain",
      user_context: {
        email: "test@example.com",
        payment_apps: {
          venmo: { status: "connected" },
          cashapp: { status: "disconnected" }
        }
      }
    };
    
    const suggestions = getFilterSuggestions(obj);
    
    expect(suggestions).toContain("domain");
    expect(suggestions).toContain("secrets");
    expect(suggestions).toContain("backend");
    expect(suggestions).toContain("user");
    expect(suggestions).toContain("context");
    expect(suggestions).toContain("email");
    expect(suggestions).toContain("payment");
    expect(suggestions).toContain("apps");
    expect(suggestions).toContain("venmo");
    expect(suggestions).toContain("cashapp");
  });
});

describe("Enhanced CLI - Integration Tests", () => {
  test("inspectScope with filter", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ filter: "domain" });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toContain("domain");
    expect(output).toContain("Filter \"domain\"");
  });

  test("inspectScope with include user", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ includeUser: true });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    expect(output).toContain("USER_CONTEXT");
    expect(output).toContain("usr_demo");
    expect(output).toContain("demo@duoplus.local");
  });

  test("inspectScope with filter and include user", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ 
      filter: "venmo", 
      includeUser: true,
      format: "json"
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    
    expect(parsed).toHaveProperty("[USER_CONTEXT]");
    expect(parsed["[USER_CONTEXT]"]).toHaveProperty("paymentApps");
    expect(parsed["[USER_CONTEXT]"].paymentApps).toHaveProperty("venmo");
  });

  test("inspectScope with no filter matches", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    // Mock process.exit to prevent actual exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error("process.exit called");
    });

    try {
      await inspectScope({ filter: "nonexistent" });
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });

  test("inspectScope with invalid filter", async () => {
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
      await inspectScope({ filter: "" });
      fail("Should have thrown process.exit error");
    } catch (error) {
      expect(error.message).toBe("process.exit called");
    }

    mockExit.mockRestore();
  });

  test("inspectScope with shell format and filter", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ 
      filter: "domain",
      format: "shell"
    });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    
    expect(output).toContain("export DUOPLUS_DOMAIN=");
    expect(output).not.toContain("export DUOPLUS_USER_");
  });
});

describe("Enhanced Domain Context - User Context", () => {
  let domainContext: EnhancedDomainContext;

  beforeEach(() => {
    domainContext = new EnhancedDomainContext("localhost");
  });

  test("sets demo user context with rich payment apps", () => {
    domainContext.setUserContext({
      userId: "usr_demo",
      email: "demo@duoplus.local",
      username: "demo_user",
      phoneNumber: "+1-555-DEMO",
      lastActive: new Date(),
      accountType: "demo",
      familyId: "FAM_DEMO",
      paymentApps: {
        venmo: {
          cashtag: "@demo",
          deepLink: "venmo://pay?recipients=@demo&amount=0",
          status: "connected"
        },
        cashapp: {
          cashtag: "$demo",
          deepLink: "cashapp://pay?cashtag=$demo&amount=0",
          status: "connected"
        },
        crypto: {
          bitcoin: "bitcoin:bc1q...?amount=0",
          ethereum: "ethereum:0x...?amount=0",
          status: "configured"
        }
      }
    });

    const userContext = domainContext.getUserContext();
    expect(userContext).not.toBeNull();
    expect(userContext?.userId).toBe("usr_demo");
    expect(userContext?.paymentApps.venmo.cashtag).toBe("@demo");
    expect(userContext?.paymentApps.cashapp.status).toBe("connected");
    expect(userContext?.paymentApps.crypto.bitcoin).toContain("bitcoin:");
  });

  test("custom inspection includes user context", () => {
    domainContext.setUserContext({
      userId: "test_user",
      email: "test@example.com",
      username: "testuser",
      phoneNumber: "+1-555-TEST",
      lastActive: new Date(),
      accountType: "developer",
      familyId: "FAM_TEST",
      paymentApps: {
        venmo: "venmo://test",
        cashapp: "cashapp://test",
        crypto: "bitcoin://test"
      }
    });

    const inspection = domainContext[Symbol.for("Bun.inspect.custom")]();
    
    expect(inspection).toHaveProperty("[USER_CONTEXT]");
    expect(inspection["[USER_CONTEXT]"]).toHaveProperty("userId", "test_user");
    expect(inspection["[USER_CONTEXT]"]).toHaveProperty("email", "test@example.com");
    expect(inspection["[USER_CONTEXT]"]).toHaveProperty("paymentApps");
  });

  test("filter works on user context", () => {
    domainContext.setUserContext({
      userId: "filter_user",
      email: "filter@example.com",
      username: "filteruser",
      phoneNumber: "+1-555-FILTER",
      lastActive: new Date(),
      accountType: "developer",
      familyId: "FAM_FILTER",
      paymentApps: {
        venmo: { cashtag: "@filter", status: "connected" },
        cashapp: { cashtag: "$filter", status: "connected" },
        crypto: { bitcoin: "bitcoin:filter", status: "configured" }
      }
    });

    const inspection = domainContext[Symbol.for("Bun.inspect.custom")]();
    const filtered = filterInspectionTree(inspection, "venmo");
    
    expect(filtered).toHaveProperty("[USER_CONTEXT]");
    expect(filtered["[USER_CONTEXT]"]).toHaveProperty("paymentApps");
    expect(filtered["[USER_CONTEXT]"].paymentApps).toHaveProperty("venmo");
    expect(filtered["[USER_CONTEXT]"].paymentApps).not.toHaveProperty("cashapp");
  });
});
