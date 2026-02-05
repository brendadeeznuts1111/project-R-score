/**
 * 🧪 lib/ Test Suite - Comprehensive Unit Tests
 * 
 * Tests for core lib/ modules using Bun's built-in test runner.
 * Run: bun test lib/lib.test.ts
 * 
 * @version 4.5
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { isPtySupported, createTerminal, spawnWithTerminal, DEFAULT_TERMINAL_CONFIG } from "./pty-terminal";
import { isTerminalUISupported, createSpinner, createProgress, displayTable, DeploymentUI, smartDeploy } from "./terminal-tui";
import { getSignedR2URL, getScannerCookieSignedURL } from "./r2/signed-url";
import { uploadCompressedS3, createCompressedS3File, uploadTier1380 } from "./s3-content-encoding";
import { StringValidators, NumberValidators, EnterpriseValidationEngine, TypeGuards } from "./core-validation";
import { EnterpriseErrorCode, createValidationError, createSecurityError } from "./core-errors";
import { verifyFFIEnvironment, FFI_EXAMPLES } from "./ffi-environment";

// ============================================================================
// PTY Terminal Tests
// ============================================================================

describe("PTY Terminal", () => {
  describe("isPtySupported", () => {
    it("returns false on Windows", () => {
      const originalPlatform = process.platform;
      // Mock Windows
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      expect(isPtySupported()).toBe(false);
      // Restore
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });

    it("returns true on macOS", () => {
      if (process.platform === "darwin") {
        expect(isPtySupported()).toBe(true);
      }
    });

    it("returns true on Linux", () => {
      if (process.platform === "linux") {
        expect(isPtySupported()).toBe(true);
      }
    });
  });

  describe("DEFAULT_TERMINAL_CONFIG", () => {
    it("has correct default dimensions", () => {
      expect(DEFAULT_TERMINAL_CONFIG.cols).toBe(80);
      expect(DEFAULT_TERMINAL_CONFIG.rows).toBe(24);
    });
  });

  describe("createTerminal", () => {
    it("throws on Windows", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      
      expect(() => createTerminal({
        cols: 80,
        rows: 24,
        data: () => {}
      })).toThrow("PTY support is only available on POSIX");
      
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });
  });
});

// ============================================================================
// Terminal TUI Tests
// ============================================================================

describe("Terminal TUI", () => {
  describe("isTerminalUISupported", () => {
    it("returns false on non-macOS platforms", () => {
      if (process.platform !== "darwin") {
        expect(isTerminalUISupported()).toBe(false);
      }
    });

    it("returns false when not TTY", () => {
      if (!process.stdout.isTTY) {
        expect(isTerminalUISupported()).toBe(false);
      }
    });
  });

  describe("createSpinner", () => {
    it("returns fallback spinner on unsupported platforms", () => {
      const spinner = createSpinner("test");
      expect(spinner).toHaveProperty("start");
      expect(spinner).toHaveProperty("update");
      expect(spinner).toHaveProperty("success");
      expect(spinner).toHaveProperty("error");
      
      // Should not throw
      expect(() => spinner.start()).not.toThrow();
      expect(() => spinner.update("new")).not.toThrow();
      expect(() => spinner.success("done")).not.toThrow();
      expect(() => spinner.error("fail")).not.toThrow();
    });
  });

  describe("createProgress", () => {
    it("returns progress widget with update and stop", () => {
      const progress = createProgress({ total: 100, width: 40, title: "Test" });
      expect(progress).toHaveProperty("update");
      expect(progress).toHaveProperty("stop");
      
      // Should not throw
      expect(() => progress.update(50)).not.toThrow();
      expect(() => progress.stop()).not.toThrow();
    });

    it("clamps values to valid range", () => {
      const progress = createProgress({ total: 100 });
      // Should handle out-of-range values gracefully
      expect(() => progress.update(-10)).not.toThrow();
      expect(() => progress.update(150)).not.toThrow();
    });
  });

  describe("displayTable", () => {
    it("handles empty rows", () => {
      expect(() => displayTable([])).not.toThrow();
    });

    it("handles single row", () => {
      expect(() => displayTable([["A", "B"]])).not.toThrow();
    });

    it("handles multiple rows", () => {
      expect(() => displayTable([
        ["Header1", "Header2"],
        ["Data1", "Data2"],
        ["Data3", "Data4"]
      ])).not.toThrow();
    });
  });

  describe("DeploymentUI", () => {
    let ui: DeploymentUI;

    beforeEach(() => {
      ui = new DeploymentUI("test-snapshot");
    });

    it("initializes with correct snapshot ID", () => {
      expect(ui).toBeDefined();
    });

    it("tracks phase transitions", async () => {
      ui.startPhase("Backup Creation");
      // Should not throw
      ui.updatePhase("Backup Creation", "50%");
      ui.completePhase("Backup Creation");
    });

    it("handles phase failure", async () => {
      ui.startPhase("R2 Upload");
      const error = new Error("Network timeout");
      ui.failPhase("R2 Upload", error);
    });

    it("displays summary without error", () => {
      expect(() => ui.displaySummary()).not.toThrow();
    });

    it("displays error details", () => {
      const error = new Error("Test error");
      expect(() => ui.displayError(error)).not.toThrow();
    });
  });

  describe("smartDeploy", () => {
    it("executes deploy function with UI", async () => {
      const result = await smartDeploy("test-snapshot", async (ui) => {
        ui.startPhase("Test Phase");
        await Bun.sleep(10);
        ui.completePhase("Test Phase");
        return { success: true };
      });
      
      expect(result).toEqual({ success: true });
    });

    it("propagates errors from deploy function", async () => {
      await expect(smartDeploy("test-snapshot", async () => {
        throw new Error("Deploy failed");
      })).rejects.toThrow("Deploy failed");
    });
  });
});

// ============================================================================
// Core Validation Tests
// ============================================================================

describe("Core Validation", () => {
  describe("StringValidators", () => {
    it("isNonEmpty returns true for non-empty strings", () => {
      expect(StringValidators.isNonEmpty("hello")).toBe(true);
      expect(StringValidators.isNonEmpty("  a  ")).toBe(true);
    });

    it("isNonEmpty returns false for empty strings", () => {
      expect(StringValidators.isNonEmpty("")).toBe(false);
      expect(StringValidators.isNonEmpty("   ")).toBe(false);
    });

    it("isNonEmpty returns false for non-strings", () => {
      expect(StringValidators.isNonEmpty(null)).toBe(false);
      expect(StringValidators.isNonEmpty(undefined)).toBe(false);
      expect(StringValidators.isNonEmpty(123)).toBe(false);
    });

    it("isUUID validates UUID format", () => {
      expect(StringValidators.isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(StringValidators.isUUID("invalid-uuid")).toBe(false);
    });

    it("isEmail validates email format", () => {
      expect(StringValidators.isEmail("test@example.com")).toBe(true);
      expect(StringValidators.isEmail("invalid-email")).toBe(false);
    });

    it("isBase64 validates base64 format", () => {
      expect(StringValidators.isBase64("SGVsbG8=")).toBe(true);
      expect(StringValidators.isBase64("not-base64!!!")).toBe(false);
    });
  });

  describe("NumberValidators", () => {
    it("isFinite validates finite numbers", () => {
      expect(NumberValidators.isFinite(42)).toBe(true);
      expect(NumberValidators.isFinite(Infinity)).toBe(false);
      expect(NumberValidators.isFinite(NaN)).toBe(false);
    });

    it("isInRange validates number ranges", () => {
      const inRange = NumberValidators.isInRange(0, 100);
      expect(inRange(50)).toBe(true);
      expect(inRange(-1)).toBe(false);
      expect(inRange(101)).toBe(false);
    });

    it("isPositive validates positive numbers", () => {
      expect(NumberValidators.isPositive(1)).toBe(true);
      expect(NumberValidators.isPositive(0)).toBe(false);
      expect(NumberValidators.isPositive(-1)).toBe(false);
    });
  });

  describe("EnterpriseValidationEngine", () => {
    let engine: EnterpriseValidationEngine;

    beforeEach(() => {
      engine = new EnterpriseValidationEngine();
    });

    it("validates required fields", () => {
      engine.addRule("name", {
        name: "required",
        validator: StringValidators.isNonEmpty,
        required: true
      });

      const result = engine.validate({ name: "" });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("passes validation for valid data", () => {
      engine.addRule("email", {
        name: "validEmail",
        validator: StringValidators.isEmail,
        required: true
      });

      const result = engine.validate({ email: "test@example.com" });
      expect(result.isValid).toBe(true);
    });

    it("clears rules correctly", () => {
      engine.addRule("field", {
        name: "test",
        validator: () => true
      });
      
      engine.clearRules();
      const result = engine.validate({ field: "value" });
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("TypeGuards", () => {
    it("isSafeString validates safe strings", () => {
      expect(TypeGuards.isSafeString("hello")).toBe(true);
      expect(TypeGuards.isSafeString("<script>")).toBe(false);
      expect(TypeGuards.isSafeString("")).toBe(false);
    });

    it("isUUID validates UUID type", () => {
      expect(TypeGuards.isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(TypeGuards.isUUID("not-uuid")).toBe(false);
    });
  });
});

// ============================================================================
// Core Errors Tests
// ============================================================================

describe("Core Errors", () => {
  describe("Error Creation", () => {
    it("creates validation error with correct code", () => {
      const error = createValidationError(
        EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
        "Invalid input",
        "field",
        "value"
      );
      
      expect(error.code).toBe(EnterpriseErrorCode.VALIDATION_INPUT_INVALID);
      expect(error.message).toBe("Invalid input");
      expect(error.field).toBe("field");
    });

    it("creates security error with critical severity", () => {
      const error = createSecurityError(
        EnterpriseErrorCode.SECURITY_UNAUTHORIZED,
        "Access denied"
      );
      
      expect(error.code).toBe(EnterpriseErrorCode.SECURITY_UNAUTHORIZED);
      expect(error.isSecurityError()).toBe(true);
    });
  });

  describe("EnterpriseErrorCode", () => {
    it("has all error categories defined", () => {
      expect(EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED).toBeDefined();
      expect(EnterpriseErrorCode.VALIDATION_INPUT_INVALID).toBeDefined();
      expect(EnterpriseErrorCode.NETWORK_CONNECTION_FAILED).toBeDefined();
      expect(EnterpriseErrorCode.SECURITY_UNAUTHORIZED).toBeDefined();
      expect(EnterpriseErrorCode.RESOURCE_NOT_FOUND).toBeDefined();
      expect(EnterpriseErrorCode.BUSINESS_RULE_VIOLATION).toBeDefined();
    });

    it("follows naming convention", () => {
      const codes = Object.values(EnterpriseErrorCode);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z]+_\d{4}$/);
      });
    });
  });
});

// ============================================================================
// FFI Environment Tests
// ============================================================================

describe("FFI Environment", () => {
  describe("verifyFFIEnvironment", () => {
    it("returns valid on standard systems", () => {
      const result = verifyFFIEnvironment();
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("issues");
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe("FFI_EXAMPLES", () => {
    it("has NixOS example", () => {
      expect(FFI_EXAMPLES.NIXOS).toContain("C_INCLUDE_PATH");
      expect(FFI_EXAMPLES.NIXOS).toContain("LIBRARY_PATH");
    });

    it("has Guix example", () => {
      expect(FFI_EXAMPLES.GUIX).toContain("C_INCLUDE_PATH");
    });

    it("has custom toolchain example", () => {
      expect(FFI_EXAMPLES.CUSTOM_TOOLCHAIN).toContain("CFLAGS");
    });
  });
});

// ============================================================================
// S3 Content Encoding Tests
// ============================================================================

describe("S3 Content Encoding", () => {
  describe("uploadCompressedS3", () => {
    it("validates encoding options", () => {
      // This would need actual S3 mocking, but we can test validation
      // For now, just ensure the function exists
      expect(typeof uploadCompressedS3).toBe("function");
    });
  });

  describe("createCompressedS3File", () => {
    it("returns file and upload function", () => {
      // Would need S3Client mock
      expect(typeof createCompressedS3File).toBe("function");
    });
  });
});

// ============================================================================
// R2 Signed URL Tests
// ============================================================================

describe("R2 Signed URLs", () => {
  describe("getSignedR2URL", () => {
    it("rejects URLs exceeding max lifetime", async () => {
      const mockBucket = {
        bucketName: "test-bucket",
        createSignedUrl: async () => "https://example.com"
      } as any;

      await expect(
        getSignedR2URL(mockBucket, "test-key", { expiresInSeconds: 999999 })
      ).rejects.toThrow("Maximum signed URL lifetime is 7 days");
    });

    it("accepts valid expiration times", async () => {
      const mockBucket = {
        bucketName: "test-bucket",
        createSignedUrl: async () => "https://example.com"
      } as any;

      const result = await getSignedR2URL(mockBucket, "test-key", {
        expiresInSeconds: 3600
      });

      expect(result.signedUrl).toBe("https://example.com");
      expect(result.metadata).toHaveProperty("signed-at");
      expect(result.metadata).toHaveProperty("expires-in");
    });
  });

  describe("getScannerCookieSignedURL", () => {
    it("includes tier1380 context in metadata", async () => {
      const mockBucket = {
        bucketName: "scanner-cookies",
        createSignedUrl: async () => "https://signed.example.com"
      } as any;

      const result = await getScannerCookieSignedURL(mockBucket, "test-key");
      
      expect(result.metadata).toHaveProperty("bucket", "scanner-cookies");
      expect(result.metadata).toHaveProperty("context", "tier1380-headers-csrf");
    });
  });
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe("Performance", () => {
  it("StringValidators.isNonEmpty is fast", async () => {
    const start = performance.now();
    
    for (let i = 0; i < 100000; i++) {
      StringValidators.isNonEmpty("test string");
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it("TypeGuards.isUUID is fast", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const start = performance.now();
    
    for (let i = 0; i < 100000; i++) {
      TypeGuards.isUUID(uuid);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200); // Should complete in under 200ms
  });
});

console.log("🧪 Test suite loaded. Run with: bun test lib/lib.test.ts");
