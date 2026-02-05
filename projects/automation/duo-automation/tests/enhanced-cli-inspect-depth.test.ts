/**
 * Test Suite for Enhanced CLI with Inspect Depth
 * 
 * Comprehensive tests for the custom inspect depth flag functionality
 * including argument parsing, formatting, and depth validation.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { parseInspectArgs, inspectScope, formatHuman, formatJson, formatShell } from "../enhanced-cli.js";
import { validateDepth, getDepthDescription } from "../utils/formatters.js";
import { EnhancedDomainContext } from "../contexts/EnhancedDomainContext.js";

describe("Enhanced CLI - Argument Parsing", () => {
  test("parses basic inspect flag", () => {
    const result = parseInspectArgs(["--inspect"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.depth).toBe(6);
    expect(result.format).toBe("human");
    expect(result.includeUser).toBe(false);
    expect(result.filter).toBeUndefined();
  });

  test("parses inspect-depth with equals", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-depth=10"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.depth).toBe(10);
  });

  test("parses inspect-depth with space", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-depth", "15"]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.depth).toBe(15);
  });

  test("parses format flag", () => {
    const result = parseInspectArgs(["--inspect", "--format=json"]);
    
    expect(result.format).toBe("json");
  });

  test("parses format flag with space", () => {
    const result = parseInspectArgs(["--inspect", "--format", "shell"]);
    
    expect(result.format).toBe("shell");
  });

  test("parses include-user flag", () => {
    const result = parseInspectArgs(["--inspect", "--include-user"]);
    
    expect(result.includeUser).toBe(true);
  });

  test("parses filter flag", () => {
    const result = parseInspectArgs(["--inspect", "--filter=R2AppleManager"]);
    
    expect(result.filter).toBe("R2AppleManager");
  });

  test("parses filter flag with space", () => {
    const result = parseInspectArgs(["--inspect", "--filter", "STORAGE"]);
    
    expect(result.filter).toBe("STORAGE");
  });

  test("handles multiple flags", () => {
    const result = parseInspectArgs([
      "--inspect",
      "--inspect-depth=8",
      "--format=json",
      "--include-user",
      "--filter=payment"
    ]);
    
    expect(result.hasInspect).toBe(true);
    expect(result.depth).toBe(8);
    expect(result.format).toBe("json");
    expect(result.includeUser).toBe(true);
    expect(result.filter).toBe("payment");
  });

  test("handles invalid depth gracefully", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-depth=invalid"]);
    
    expect(result.depth).toBe(6); // default
  });

  test("handles out-of-range depth", () => {
    const result = parseInspectArgs(["--inspect", "--inspect-depth=25"]);
    
    expect(result.depth).toBe(6); // default
  });

  test("handles invalid format gracefully", () => {
    const result = parseInspectArgs(["--inspect", "--format=invalid"]);
    
    expect(result.format).toBe("human"); // default
  });
});

describe("Enhanced CLI - Formatters", () => {
  let domainContext: EnhancedDomainContext;

  beforeEach(() => {
    domainContext = new EnhancedDomainContext("localhost");
  });

  test("formatHuman with default depth", () => {
    const output = formatHuman(domainContext, 6);
    
    expect(output).toContain("DuoPlus Runtime Scope Inspection");
    expect(output).toContain("depth=6");
    expect(output).toContain("[DOMAIN]");
    expect(output).toContain("localhost");
  });

  test("formatHuman with custom depth", () => {
    const output = formatHuman(domainContext, 3);
    
    expect(output).toContain("depth=3");
    expect(output).toContain("[DOMAIN]");
  });

  test("formatHuman with filter", () => {
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

    const output = formatHuman(domainContext, 6, "USER");
    
    expect(output).toContain("USER");
    expect(output).toContain("test_user");
  });

  test("formatJson with depth control", () => {
    const output = formatJson(domainContext, 2);
    const parsed = JSON.parse(output);
    
    expect(parsed).toHaveProperty("[DOMAIN]");
    expect(parsed).toHaveProperty("[METADATA]");
    expect(parsed).toHaveProperty("[SCOPES]");
  });

  test("formatJson truncates at depth limit", () => {
    const output = formatJson(domainContext, 1);
    const parsed = JSON.parse(output);
    
    // Should contain top-level properties
    expect(parsed).toHaveProperty("[DOMAIN]");
    
    // Should truncate nested objects
    expect(typeof parsed["[SCOPES]"]).toBe("string");
    expect(parsed["[SCOPES]"]).toContain("truncated");
  });

  test("formatJson with filter", () => {
    const output = formatJson(domainContext, 6, "DOMAIN");
    const parsed = JSON.parse(output);
    
    expect(parsed).toHaveProperty("[DOMAIN]");
    // Should filter out non-matching properties
    expect(Object.keys(parsed)).toHaveLength(1);
  });

  test("formatShell with depth control", () => {
    const output = formatShell(domainContext, 2);
    
    expect(output).toContain("DUOPLUS_DOMAIN");
    expect(output).toContain("DUOPLUS_SCOPE");
    expect(output).toContain("DUOPLUS_PLATFORM");
    expect(output).toContain("# DuoPlus Scope Inspection");
  });

  test("formatShell with user context", () => {
    domainContext.setUserContext({
      userId: "shell_user",
      email: "shell@example.com",
      username: "shelluser",
      phoneNumber: "+1-555-SHELL",
      lastActive: new Date(),
      accountType: "developer",
      familyId: "FAM_SHELL",
      paymentApps: {
        venmo: "venmo://shell",
        cashapp: "cashapp://shell",
        crypto: "bitcoin://shell"
      }
    });

    const output = formatShell(domainContext, 3);
    
    expect(output).toContain("DUOPLUS_USER_ID=shell_user");
    expect(output).toContain("DUOPLUS_USERNAME=shelluser");
    expect(output).toContain("DUOPLUS_VENMO=venmo://shell");
  });

  test("formatShell with filter", () => {
    domainContext.setUserContext({
      userId: "filter_user",
      email: "filter@example.com",
      username: "filteruser",
      phoneNumber: "+1-555-FILTER",
      lastActive: new Date(),
      accountType: "developer",
      familyId: "FAM_FILTER",
      paymentApps: {
        venmo: "venmo://filter",
        cashapp: "cashapp://filter",
        crypto: "bitcoin://filter"
      }
    });

    const output = formatShell(domainContext, 3, "USER");
    
    expect(output).toContain("DUOPLUS_USER_ID=filter_user");
    expect(output).toContain("DUOPLUS_USERNAME=filteruser");
    // Should not include domain variables
    expect(output).not.toContain("DUOPLUS_DOMAIN");
  });
});

describe("Enhanced CLI - Depth Validation", () => {
  test("validateDepth accepts valid values", () => {
    expect(validateDepth("1")).toBe(1);
    expect(validateDepth("6")).toBe(6);
    expect(validateDepth("20")).toBe(20);
  });

  test("validateDepth rejects invalid values", () => {
    expect(validateDepth("0")).toBeNull();
    expect(validateDepth("-1")).toBeNull();
    expect(validateDepth("21")).toBeNull();
    expect(validateDepth("invalid")).toBeNull();
    expect(validateDepth("")).toBeNull();
  });

  test("getDepthDescription returns correct descriptions", () => {
    expect(getDepthDescription(1)).toBe("High-level overview");
    expect(getDepthDescription(2)).toBe("High-level overview");
    expect(getDepthDescription(3)).toBe("Standard inspection");
    expect(getDepthDescription(6)).toBe("Standard inspection");
    expect(getDepthDescription(8)).toBe("Detailed debugging");
    expect(getDepthDescription(12)).toBe("Detailed debugging");
    expect(getDepthDescription(15)).toBe("Forensic deep-dive");
    expect(getDepthDescription(20)).toBe("Forensic deep-dive");
  });
});

describe("Enhanced CLI - Integration Tests", () => {
  test("inspectScope with default options", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    // Mock Bun.stdout
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope();
    
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("DuoPlus Runtime Scope Inspection")
    );
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("depth=6")
    );
  });

  test("inspectScope with custom depth", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ depth: 10 });
    
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("depth=10")
    );
  });

  test("inspectScope with user context", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ includeUser: true });
    
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("USER_CONTEXT")
    );
  });

  test("inspectScope with JSON format", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ format: "json" });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    
    expect(parsed).toHaveProperty("[DOMAIN]");
    expect(parsed).toHaveProperty("[METADATA]");
  });

  test("inspectScope with shell format", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    await inspectScope({ format: "shell" });
    
    const output = (mockStdout.write as jest.Mock).mock.calls[0][0];
    
    expect(output).toContain("export DUOPLUS_DOMAIN=");
    expect(output).toContain("export DUOPLUS_SCOPE=");
    expect(output).toContain("# DuoPlus Scope Inspection");
  });
});

describe("Enhanced CLI - Error Handling", () => {
  test("handles missing domain gracefully", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    // Should not throw error
    await expect(inspectScope()).resolves.not.toThrow();
  });

  test("handles invalid format gracefully", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    // Should default to human format
    await inspectScope({ format: "invalid" as any });
    
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("DuoPlus Runtime Scope Inspection")
    );
  });

  test("handles extreme depth values", async () => {
    const mockStdout = {
      write: jest.fn()
    };
    
    global.Bun = {
      ...global.Bun,
      stdout: mockStdout
    } as any;

    // Should handle depth 1 (minimal)
    await inspectScope({ depth: 1 });
    
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("depth=1")
    );

    // Should handle depth 20 (maximum)
    await inspectScope({ depth: 20 });
    
    expect(mockStdout.write).toHaveBeenCalledWith(
      expect.stringContaining("depth=20")
    );
  });
});

describe("Enhanced CLI - User Context", () => {
  let domainContext: EnhancedDomainContext;

  beforeEach(() => {
    domainContext = new EnhancedDomainContext("localhost");
  });

  test("sets and gets user context", () => {
    const userContext = {
      userId: "test_user",
      email: "test@example.com",
      username: "testuser",
      phoneNumber: "+1-555-TEST",
      lastActive: new Date(),
      accountType: "developer" as const,
      familyId: "FAM_TEST",
      paymentApps: {
        venmo: "venmo://test",
        cashapp: "cashapp://test",
        crypto: "bitcoin://test"
      }
    };

    domainContext.setUserContext(userContext);
    
    const retrieved = domainContext.getUserContext();
    expect(retrieved).toEqual(userContext);
  });

  test("clears user context", () => {
    const userContext = {
      userId: "test_user",
      email: "test@example.com",
      username: "testuser",
      phoneNumber: "+1-555-TEST",
      lastActive: new Date(),
      accountType: "developer" as const,
      familyId: "FAM_TEST",
      paymentApps: {
        venmo: "venmo://test",
        cashapp: "cashapp://test",
        crypto: "bitcoin://test"
      }
    };

    domainContext.setUserContext(userContext);
    expect(domainContext.getUserContext()).not.toBeNull();
    
    domainContext.clearUserContext();
    expect(domainContext.getUserContext()).toBeNull();
  });

  test("enables debug mode", () => {
    domainContext.enableDebugMode();
    
    expect(domainContext.isDebugMode()).toBe(true);
    expect(domainContext.getUserContext()).not.toBeNull();
    expect(domainContext.getUserContext()?.userId).toBe("usr_debug");
  });

  test("disables debug mode", () => {
    domainContext.enableDebugMode();
    expect(domainContext.isDebugMode()).toBe(true);
    
    domainContext.disableDebugMode();
    expect(domainContext.isDebugMode()).toBe(false);
    expect(domainContext.getUserContext()).toBeNull();
  });

  test("validates context integrity", () => {
    // Valid context
    domainContext.setUserContext({
      userId: "valid_user",
      email: "valid@example.com",
      username: "validuser",
      phoneNumber: "+1-555-VALID",
      lastActive: new Date(),
      accountType: "developer" as const,
      familyId: "FAM_VALID",
      paymentApps: {
        venmo: "venmo://valid",
        cashapp: "cashapp://valid",
        crypto: "bitcoin://valid"
      }
    });

    const validation = domainContext.validate();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("detects invalid context", () => {
    // Invalid context (missing userId)
    domainContext.setUserContext({
      userId: "",
      email: "invalid@example.com",
      username: "invaliduser",
      phoneNumber: "+1-555-INVALID",
      lastActive: new Date(),
      accountType: "developer" as const,
      familyId: "FAM_INVALID",
      paymentApps: {
        venmo: "venmo://invalid",
        cashapp: "cashapp://invalid",
        crypto: "bitcoin://invalid"
      }
    });

    const validation = domainContext.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
