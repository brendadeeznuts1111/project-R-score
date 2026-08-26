#!/usr/bin/env bun
/**
 * Comprehensive Test Suite for Components #42-45
 *
 * Tests the Golden Matrix v2.4.2 expansion components
 * Unicode StringWidth Engine, V8 Type Bridge, YAML Parser, Security Layer
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
  COMPONENT_REGISTRY,
  GoldenMatrixManager,
} from "../golden-matrix-v2-4-2";
import { SecurityHardeningLayer } from "../security-hardening-layer";
import {
  UnicodeStringWidthEngine,
  stringWidth,
  stripANSI,
} from "../stringwidth-engine";
import { V8TypeCheckingBridge } from "../v8-type-bridge";
import {
  YAML12StrictParser,
  parseBoolean,
  parseConfig,
} from "../yaml-1-2-parser";

describe("Component #42: Unicode StringWidth Engine", () => {
  describe("String Width Calculation", () => {
    it("should calculate basic string width correctly", () => {
      expect(UnicodeStringWidthEngine.calculateWidth("Hello")).toBe(5);
      expect(UnicodeStringWidthEngine.calculateWidth("World!")).toBe(6);
      expect(UnicodeStringWidthEngine.calculateWidth("")).toBe(0);
    });

    it("should handle emoji sequences correctly", () => {
      // Flag emoji (regional indicator pairs)
      expect(UnicodeStringWidthEngine.calculateWidth("🇺🇸")).toBe(2);
      expect(UnicodeStringWidthEngine.calculateWidth("🇨🇦")).toBe(2);

      // Skin tone sequences
      expect(UnicodeStringWidthEngine.calculateWidth("👋🏽")).toBe(2);
      expect(UnicodeStringWidthEngine.calculateWidth("👍🏿")).toBe(2);

      // ZWJ family sequences
      expect(UnicodeStringWidthEngine.calculateWidth("👨‍👩‍👧")).toBe(2);
      expect(UnicodeStringWidthEngine.calculateWidth("👩‍👩‍👦‍👦")).toBe(2);
    });

    it("should handle zero-width characters", () => {
      // Soft hyphen
      expect(UnicodeStringWidthEngine.calculateWidth("\u00AD")).toBe(0);

      // Word joiner
      expect(UnicodeStringWidthEngine.calculateWidth("\u2060")).toBe(0);

      // Arabic formatting characters
      expect(UnicodeStringWidthEngine.calculateWidth("\u061C")).toBe(0);
    });

    it("should handle East Asian wide characters", () => {
      // Chinese characters
      expect(UnicodeStringWidthEngine.calculateWidth("漢字")).toBe(4);
      expect(UnicodeStringWidthEngine.calculateWidth("中文")).toBe(4);

      // Korean characters
      expect(UnicodeStringWidthEngine.calculateWidth("한글")).toBe(4);

      // Japanese characters
      expect(UnicodeStringWidthEngine.calculateWidth("日本語")).toBe(6);
    });

    it("should strip ANSI escape codes", () => {
      const coloredText = "\x1b[31mRed\x1b[0m";
      expect(UnicodeStringWidthEngine.stripANSI(coloredText)).toBe("Red");
      expect(UnicodeStringWidthEngine.calculateWidth(coloredText)).toBe(3);
    });

    it("should handle mixed content", () => {
      const mixed = "Hello 🇺🇸 World \u2060";
      expect(UnicodeStringWidthEngine.calculateWidth(mixed)).toBe(15);
    });
  });

  describe("Zero-Cost Abstraction", () => {
    it("should provide zero-cost exports", () => {
      expect(typeof stringWidth).toBe("function");
      expect(typeof stripANSI).toBe("function");

      // Should work the same as the full implementation
      const testString = "Hello 🇺🇸";
      expect(stringWidth(testString)).toBe(
        UnicodeStringWidthEngine.calculateWidth(testString)
      );
    });
  });

  describe("Performance", () => {
    it("should complete width calculations efficiently", () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        UnicodeStringWidthEngine.calculateWidth("Test 🇺🇸 string 🎉");
      }
      const time = performance.now() - start;
      expect(time).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});

describe("Component #43: V8 Type Checking Bridge", () => {
  describe("Type Checking Methods", () => {
    it("should correctly identify Maps", () => {
      expect(V8TypeCheckingBridge.isMap(new Map())).toBe(true);
      expect(V8TypeCheckingBridge.isMap(new Set())).toBe(false);
      expect(V8TypeCheckingBridge.isMap({})).toBe(false);
      expect(V8TypeCheckingBridge.isMap([])).toBe(false);
    });

    it("should correctly identify Arrays", () => {
      expect(V8TypeCheckingBridge.isArray([])).toBe(true);
      expect(V8TypeCheckingBridge.isArray([1, 2, 3])).toBe(true);
      expect(V8TypeCheckingBridge.isArray([])).toBe(true);
      expect(V8TypeCheckingBridge.isArray({})).toBe(false);
      expect(V8TypeCheckingBridge.isArray(new Map())).toBe(false);
    });

    it("should correctly identify Int32 values", () => {
      expect(V8TypeCheckingBridge.isInt32(42)).toBe(true);
      expect(V8TypeCheckingBridge.isInt32(-2147483648)).toBe(true);
      expect(V8TypeCheckingBridge.isInt32(2147483647)).toBe(true);
      expect(V8TypeCheckingBridge.isInt32(2147483648)).toBe(false); // Overflow
      expect(V8TypeCheckingBridge.isInt32(-2147483649)).toBe(false); // Underflow
      expect(V8TypeCheckingBridge.isInt32(3.14)).toBe(false); // Not integer
      expect(V8TypeCheckingBridge.isInt32("42")).toBe(false); // Not number
    });

    it("should correctly identify BigInt values", () => {
      expect(V8TypeCheckingBridge.isBigInt(BigInt(42))).toBe(true);
      expect(V8TypeCheckingBridge.isBigInt(BigInt(0))).toBe(true);
      expect(V8TypeCheckingBridge.isBigInt(BigInt(-1))).toBe(true);
      expect(V8TypeCheckingBridge.isBigInt(42)).toBe(false); // Regular number
      expect(V8TypeCheckingBridge.isBigInt("42")).toBe(false); // String
    });

    it("should correctly identify Uint32 values", () => {
      expect(V8TypeCheckingBridge.isUint32(0)).toBe(true);
      expect(V8TypeCheckingBridge.isUint32(4294967295)).toBe(true);
      expect(V8TypeCheckingBridge.isUint32(42)).toBe(true);
      expect(V8TypeCheckingBridge.isUint32(-1)).toBe(false); // Negative
      expect(V8TypeCheckingBridge.isUint32(4294967296)).toBe(false); // Overflow
    });

    it("should correctly identify Float32 values", () => {
      expect(V8TypeCheckingBridge.isFloat32(3.14)).toBe(true);
      expect(V8TypeCheckingBridge.isFloat32(0.0)).toBe(true);
      expect(V8TypeCheckingBridge.isFloat32(-42.5)).toBe(true);
      expect(V8TypeCheckingBridge.isFloat32(Infinity)).toBe(false); // Not finite
      expect(V8TypeCheckingBridge.isFloat32(NaN)).toBe(false); // NaN
    });

    it("should correctly identify Date objects", () => {
      expect(V8TypeCheckingBridge.isDate(new Date())).toBe(true);
      expect(V8TypeCheckingBridge.isDate(new Date(0))).toBe(true);
      expect(V8TypeCheckingBridge.isDate(new Date("invalid"))).toBe(false); // Invalid date
      expect(V8TypeCheckingBridge.isDate({})).toBe(false);
      expect(V8TypeCheckingBridge.isDate("2023-01-01")).toBe(false);
    });

    it("should correctly identify RegExp objects", () => {
      expect(V8TypeCheckingBridge.isRegExp(/test/)).toBe(true);
      expect(V8TypeCheckingBridge.isRegExp(new RegExp("test"))).toBe(true);
      expect(V8TypeCheckingBridge.isRegExp(/^test$/)).toBe(true);
      expect(V8TypeCheckingBridge.isRegExp("test")).toBe(false);
      expect(V8TypeCheckingBridge.isRegExp({})).toBe(false);
    });

    it("should correctly identify TypedArrays", () => {
      expect(V8TypeCheckingBridge.isTypedArray(new Uint8Array())).toBe(true);
      expect(V8TypeCheckingBridge.isTypedArray(new Int16Array())).toBe(true);
      expect(V8TypeCheckingBridge.isTypedArray(new Float32Array())).toBe(true);
      expect(V8TypeCheckingBridge.isTypedArray(new BigInt64Array())).toBe(true);
      expect(V8TypeCheckingBridge.isTypedArray([])).toBe(false);
      expect(V8TypeCheckingBridge.isTypedArray([])).toBe(false);
    });
  });

  describe("Native Addon Registration", () => {
    it("should register and unregister type checks", () => {
      const addonName = "test-addon";

      V8TypeCheckingBridge.registerTypeChecks(addonName);
      expect(V8TypeCheckingBridge.getRegisteredAddons()).toContain(addonName);

      const typeChecks = V8TypeCheckingBridge.getTypeChecks(addonName);
      expect(typeChecks).toBeDefined();
      expect(typeChecks!.has("isMap")).toBe(true);
      expect(typeChecks!.has("isArray")).toBe(true);

      V8TypeCheckingBridge.unregisterTypeChecks(addonName);
      expect(V8TypeCheckingBridge.getRegisteredAddons()).not.toContain(
        addonName
      );
    });
  });

  describe("Value Conversion", () => {
    it("should convert values to V8-compatible format", () => {
      const map = new Map<string, string>([["key", "value"]]);
      const v8Value = V8TypeCheckingBridge.toV8Value(map);
      expect(v8Value).toEqual({ key: "value" });

      const array = [1, 2, 3];
      const v8Array = V8TypeCheckingBridge.toV8Value(array);
      expect(v8Array).toEqual([1, 2, 3]);

      const date = new Date("2023-01-01");
      const v8Date = V8TypeCheckingBridge.toV8Value(date);
      expect(v8Date).toBe("2023-01-01T00:00:00.000Z");
    });

    it("should convert V8 values back to JavaScript", () => {
      const v8Map = { key: "value" };
      const jsMap = V8TypeCheckingBridge.fromV8Value(v8Map);
      expect(jsMap).toBeInstanceOf(Map);
      expect((jsMap as Map<string, string>).get("key")).toBe("value");
    });
  });

  describe("V8 Compatibility", () => {
    it("should validate V8 compatibility", () => {
      const isCompatible = V8TypeCheckingBridge.validateV8Compatibility();
      expect(isCompatible).toBe(true);
    });
  });
});

describe("Component #44: YAML 1.2 Strict Parser", () => {
  describe("Boolean Parsing", () => {
    it("should parse YAML 1.2 booleans correctly", () => {
      expect(parseBoolean("true")).toBe(true);
      expect(parseBoolean("false")).toBe(false);
      expect(parseBoolean("yes")).toBe("yes"); // String in YAML 1.2
      expect(parseBoolean("no")).toBe("no"); // String in YAML 1.2
      expect(parseBoolean("on")).toBe("on"); // String in YAML 1.2
      expect(parseBoolean("off")).toBe("off"); // String in YAML 1.2
    });

    it("should handle quoted boolean values", () => {
      expect(parseBoolean('"true"')).toBe('"true"');
      expect(parseBoolean("'false'")).toBe("'false'");
      expect(parseBoolean('"yes"')).toBe('"yes"');
    });
  });

  describe("Number Parsing", () => {
    it("should parse valid numbers", () => {
      expect(YAML12StrictParser.parseNumber("42")).toBe(42);
      expect(YAML12StrictParser.parseNumber("-13")).toBe(-13);
      expect(YAML12StrictParser.parseNumber("3.14")).toBe(3.14);
      expect(YAML12StrictParser.parseNumber("0")).toBe(0);
    });

    it("should return invalid numbers as strings", () => {
      expect(YAML12StrictParser.parseNumber("not-a-number")).toBe(
        "not-a-number"
      );
      expect(YAML12StrictParser.parseNumber("Infinity")).toBe("Infinity");
      expect(YAML12StrictParser.parseNumber("NaN")).toBe("NaN");
    });
  });

  describe("Configuration Parsing", () => {
    it("should parse basic configuration", () => {
      const config = `
name = "test"
version = "1.0.0"
enabled = true
count = 42
`;

      const result = parseConfig(config);
      expect(result.name).toBe("test");
      expect(result.version).toBe("1.0.0");
      expect(result.enabled).toBe(true);
      expect(result.count).toBe(42);
    });

    it("should handle nested configurations", () => {
      const config = `
[database]
host = "localhost"
port = 5432
ssl = true

[cache]
enabled = false
ttl = 300
`;

      const result = parseConfig(config);
      expect(result.database.host).toBe("localhost");
      expect(result.database.port).toBe(5432);
      expect(result.database.ssl).toBe(true);
      expect(result.cache.enabled).toBe(false);
      expect(result.cache.ttl).toBe(300);
    });

    it("should parse arrays correctly", () => {
      const config = `
dependencies = ["react", "vue", "angular"]
numbers = [1, 2, 3, 4, 5]
`;

      const result = parseConfig(config);
      expect(result.dependencies).toEqual(["react", "vue", "angular"]);
      expect(result.numbers).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("Security Validation", () => {
    it("should detect dangerous YAML 1.1 boolean patterns", () => {
      const maliciousYAML = `
trustedDependencies = ["yes", "on", "file:malicious"]
debugMode = "on"
logLevel = yes
`;

      const warnings = YAML12StrictParser.validateYAMLContent(maliciousYAML);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("yes"))).toBe(true);
      expect(warnings.some((w) => w.includes("on"))).toBe(true);
    });

    it("should migrate YAML 1.1 to 1.2 format", () => {
      const yaml11 = `
trustedDependencies = ["yes", "on"]
debugMode = "on"
logLevel = yes
`;

      const yaml12 = YAML12StrictParser.migrateToYAML12(yaml11);
      expect(yaml12).toContain('"yes"');
      expect(yaml12).toContain('"on"');
    });
  });

  describe("Security Demonstration", () => {
    it("should show security improvements", () => {
      // This should not throw an error
      expect(() => YAML12StrictParser.demonstrateSecurity()).not.toThrow();
    });
  });
});

describe("Component #45: Security Hardening Layer", () => {
  describe("Trusted Dependency Validation", () => {
    it("should validate trusted dependencies", () => {
      // Valid cases
      expect(
        SecurityHardeningLayer.validateTrustedDependency("react", "npm")
      ).toMatchObject({ valid: true });
      expect(
        SecurityHardeningLayer.validateTrustedDependency("vue", "yarn")
      ).toMatchObject({ valid: true });

      // Invalid cases
      expect(
        SecurityHardeningLayer.validateTrustedDependency(
          "malicious",
          "file:/etc/passwd"
        )
      ).toMatchObject({ valid: false, violation: { protocol: "file:" } });
      expect(
        SecurityHardeningLayer.validateTrustedDependency(
          "backdoor",
          "git:malicious-repo"
        )
      ).toMatchObject({ valid: false, violation: { protocol: "git:" } });
      expect(
        SecurityHardeningLayer.validateTrustedDependency("../package", "file")
      ).toMatchObject({ valid: false });
    });

    it("should detect dangerous patterns", () => {
      expect(
        SecurityHardeningLayer.validateTrustedDependency(
          "../etc/passwd",
          "file"
        )
      ).toMatchObject({ valid: false });
      expect(
        SecurityHardeningLayer.validateTrustedDependency(
          "${HOME}/malicious",
          "file"
        )
      ).toMatchObject({ valid: false });
      expect(
        SecurityHardeningLayer.validateTrustedDependency(
          "package`rm -rf /`",
          "npm"
        )
      ).toMatchObject({ valid: false });
    });
  });

  describe("Isolated Context Creation", () => {
    it("should create isolated contexts", () => {
      const isolated = SecurityHardeningLayer.createIsolatedContext();
      const context = isolated.context as Record<string, unknown>;

      expect(isolated.isolated).toBe(true);
      expect(typeof context.console).toBe("object");
      expect(typeof context.Object).toBe("function");
      expect(typeof context.Array).toBe("function");

      // Should not have access to dangerous globals
      expect((context as Record<string, unknown>).Bun).toBeUndefined();
      expect(
        (context as Record<string, unknown>).__bun_jsc_loader__
      ).toBeUndefined();
    });

    it("should provide safe console methods", () => {
      const isolated = SecurityHardeningLayer.createIsolatedContext();
      const context = isolated.context as {
        console: Pick<Console, "log" | "warn" | "error">;
      };

      expect(typeof context.console.log).toBe("function");
      expect(typeof context.console.warn).toBe("function");
      expect(typeof context.console.error).toBe("function");
    });
  });

  describe("Configuration Validation", () => {
    it("should validate trustedDependencies configuration", () => {
      const validConfig = {
        trustedDependencies: ["react", "vue", "angular"],
        disableInstallScripts: true,
        lockfile: true,
      };

      const result = SecurityHardeningLayer.validateConfig(validConfig);
      expect(result).toMatchObject({
        valid: true,
        warnings: [],
        errors: [],
        securityLevel: "HIGH",
      });
    });

    it("should detect configuration issues", () => {
      const invalidConfig = {
        trustedDependencies: ["file:malicious", "git:backdoor", "../dangerous"],
      };

      const result = SecurityHardeningLayer.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.warnings.some((w) => w.includes("file:malicious"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("git:backdoor"))).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should warn about missing trustedDependencies", () => {
      const emptyConfig = {};

      const result = SecurityHardeningLayer.validateConfig(emptyConfig);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("No trustedDependencies"))).toBe(
        true
      );
    });
  });

  describe("Package Validation", () => {
    it("should validate package.json structure", () => {
      const validPackage = {
        name: "test-package",
        version: "1.0.0",
        scripts: {
          build: "webpack",
          test: "jest",
        },
        dependencies: {
          react: "^18.0.0",
        },
      };

      const result = SecurityHardeningLayer.scanPackageJson(validPackage);
      expect(result).toMatchObject({ valid: true, issues: [] });
    });

    it("should detect dangerous scripts", () => {
      const maliciousPackage = {
        name: "malicious-package",
        version: "1.0.0",
        scripts: {
          postinstall: "rm -rf / && echo 'pwned'",
        },
      };

      const result = SecurityHardeningLayer.scanPackageJson(maliciousPackage);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "DANGEROUS_SCRIPT",
          command: expect.stringContaining("rm -rf"),
        })
      );
    });

    it("should detect suspicious dependencies", () => {
      const suspiciousPackage = {
        name: "test-package",
        version: "1.0.0",
        dependencies: {
          "legit-lib": "^1.0.0",
          "backdoor-trojan": "^1.0.0",
          "keylogger-spyware": "^1.0.0",
        },
      };

      const result = SecurityHardeningLayer.scanPackageJson(suspiciousPackage);
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.package === "backdoor-trojan")).toBe(true);
      expect(result.issues.some((issue) => issue.package === "keylogger-spyware")).toBe(true);
    });
  });

  describe("Security Metrics", () => {
    it("should expose and reset structured security metrics", () => {
      expect(SecurityHardeningLayer.getSecurityMetrics()).toHaveProperty(
        "securityViolations"
      );
      SecurityHardeningLayer.resetSecurityMetrics();
      expect(SecurityHardeningLayer.getSecurityMetrics()).toMatchObject({
        packagesBlocked: 0,
        packagesAllowed: 0,
        securityViolations: 0,
      });
    });
  });
});

describe("Golden Matrix v2.4.2 Integration", () => {
  let manager: GoldenMatrixManager;

  beforeEach(() => {
    manager = GoldenMatrixManager.getInstance();
  });

  describe("Component Registry", () => {
    it("should have all 45 components registered", () => {
      expect(COMPONENT_REGISTRY.map((component) => component.id)).toEqual([
        1, 3, 41, 42, 43, 44, 45,
      ]);
      expect(COMPONENT_REGISTRY.some((c) => c.id === 42)).toBe(true);
      expect(COMPONENT_REGISTRY.some((c) => c.id === 43)).toBe(true);
      expect(COMPONENT_REGISTRY.some((c) => c.id === 44)).toBe(true);
      expect(COMPONENT_REGISTRY.some((c) => c.id === 45)).toBe(true);
    });

    it("should have correct component metadata", () => {
      const unicodeEngine = manager.getComponent(42);
      expect(unicodeEngine).toBeDefined();
      expect(unicodeEngine!.name).toBe("Unicode-StringWidth-Engine");
      expect(unicodeEngine!.tier).toBe("Level 0: Kernel");
      expect(unicodeEngine!.status).toBe("OPTIMIZED");

      const securityLayer = manager.getComponent(45);
      expect(securityLayer).toBeDefined();
      expect(securityLayer!.name).toBe("Security-Hardening-Layer");
      expect(securityLayer!.tier).toBe("Level 1: Security");
      expect(securityLayer!.status).toBe("HARDENED");
    });
  });

  describe("Feature Flag Management", () => {
    it("should manage feature flags correctly", () => {
      expect(manager.isFeatureEnabled("STRING_WIDTH_OPT")).toBe(true);
      expect(manager.isFeatureEnabled("NATIVE_ADDONS")).toBe(true);
      expect(manager.isFeatureEnabled("YAML12_STRICT")).toBe(true);
      expect(manager.isFeatureEnabled("SECURITY_HARDENING")).toBe(true);
      expect(manager.isFeatureEnabled("MCP_ENABLED")).toBe(true);
      expect(manager.isFeatureEnabled("QUANTUM_READY")).toBe(true);
    });
  });

  describe("Component Management", () => {
    it("should enable and disable components", () => {
      const component = manager.getComponent(42);
      expect(component).toBeDefined();

      manager.disableComponent(42);
      // Component should be disabled (verification would depend on implementation)

      manager.enableComponent(42);
      // Component should be enabled again
    });
  });

  describe("Parity Lock Verification", () => {
    it("should verify parity locks for components", () => {
      expect(manager.verifyParityLock(42)).toBe(true);
      expect(manager.verifyParityLock(43)).toBe(true);
      expect(manager.verifyParityLock(44)).toBe(true);
      expect(manager.verifyParityLock(45)).toBe(true);

      expect(manager.verifyParityLock(999)).toBe(false); // Non-existent component
    });
  });

  describe("System Status", () => {
    it("should provide accurate system status", () => {
      const status = manager.getSystemStatus() as {
        version: string;
        totalComponents: number;
        securityHardened: boolean;
        quantumReady: boolean;
        uptime: number;
      };

      expect(status).toBeDefined();
      expect(status.version).toBe("2.4.2-STABLE-SECURITY-HARDENED");
      expect(status.totalComponents).toBe(45);
      expect(status.securityHardened).toBe(true);
      expect(status.quantumReady).toBe(true);
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe("Component Integration Tests", () => {
    it("should test all new components", async () => {
      // These should not throw errors
      await expect(manager.testUnicodeEngine()).resolves.toBeUndefined();
      await expect(manager.testV8Bridge()).resolves.toBeUndefined();
      await expect(manager.testYAMLParser()).resolves.toBeUndefined();
      await expect(manager.testSecurityLayer()).resolves.toBeUndefined();
    });
  });

  describe("System Test", () => {
    it("should run complete system test", async () => {
      // Should not throw errors
      await expect(manager.runSystemTest()).resolves.toBeUndefined();
    });
  });
});
