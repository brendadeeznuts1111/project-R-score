/**
 * Transpilation Manager Tests
 * Comprehensive test suite for transpilation and language feature configuration
 */

import { describe, it, expect } from "bun:test";
import {
  parseTranspilationCommand,
  parseDefineFlag,
  parseLoaderFlag,
  parseDropFlag,
  validateTranspilationConfig,
  executeTranspilationCommand,
  generateTranspilationCommand,
  TranspilationConfig,
  DEFAULT_TRANSPILATION_CONFIG,
} from "../../../src/cli/transpilation-manager";

describe("Transpilation Manager", () => {
  describe("parseTranspilationCommand", () => {
    it("should parse show command", () => {
      const cmd = parseTranspilationCommand(["show"]);
      expect(cmd.action).toBe("show");
    });

    it("should parse configure command with parameters", () => {
      const cmd = parseTranspilationCommand(["configure", "value", "key"]);
      expect(cmd.action).toBe("configure");
      expect(cmd.value).toBe("value");
      expect(cmd.key).toBe("key");
    });

    it("should parse validate command", () => {
      const cmd = parseTranspilationCommand(["validate", '{"key": "value"}']);
      expect(cmd.action).toBe("validate");
      expect(cmd.value).toBe('{"key": "value"}');
    });

    it("should parse reset command", () => {
      const cmd = parseTranspilationCommand(["reset"]);
      expect(cmd.action).toBe("reset");
    });
  });

  describe("parseDefineFlag", () => {
    it("should parse simple string define", () => {
      const result = parseDefineFlag("KEY:value");
      expect(result).toEqual({ KEY: "value" });
    });

    it("should parse multiple defines", () => {
      const result = parseDefineFlag("KEY1:value1,KEY2:value2");
      expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
    });

    it("should parse JSON number define", () => {
      const result = parseDefineFlag('BUILD_NUMBER:42');
      expect(result["BUILD_NUMBER"]).toBe(42);
    });

    it("should parse JSON boolean define", () => {
      const result = parseDefineFlag('DEBUG:true');
      expect(result["DEBUG"]).toBe(true);
    });

    it("should parse JSON object define", () => {
      const result = parseDefineFlag('CONFIG:\'{"env":"dev"}\'');
      expect(result.CONFIG).toBeDefined();
    });

    it("should handle values with colons", () => {
      const result = parseDefineFlag('URL:http://localhost:3000');
      expect(result).toEqual({ URL: "http://localhost:3000" });
    });

    it("should throw on missing key", () => {
      expect(() => parseDefineFlag(":value")).toThrow();
    });

    it("should throw on missing value", () => {
      expect(() => parseDefineFlag("KEY:")).toThrow();
    });

    it("should trim whitespace", () => {
      const result = parseDefineFlag("  KEY  :  value  ");
      expect(result).toEqual({ KEY: "value" });
    });
  });

  describe("parseLoaderFlag", () => {
    it("should parse single loader", () => {
      const result = parseLoaderFlag(".ts:tsx");
      expect(result.get(".ts")).toBe("tsx");
    });

    it("should parse multiple loaders", () => {
      const result = parseLoaderFlag(".ts:tsx,.js:jsx,.json:json");
      expect(result.get(".ts")).toBe("tsx");
      expect(result.get(".js")).toBe("jsx");
      expect(result.get(".json")).toBe("json");
    });

    it("should throw on missing extension", () => {
      expect(() => parseLoaderFlag("ts:tsx")).toThrow(
        "Extensions must start with a dot"
      );
    });

    it("should throw on missing loader", () => {
      expect(() => parseLoaderFlag(".ts:")).toThrow();
    });

    it("should throw on invalid loader", () => {
      expect(() => parseLoaderFlag(".ts:invalid")).toThrow(
        "Invalid loader"
      );
    });

    it("should accept all valid loaders", () => {
      const validLoaders = [
        "js",
        "jsx",
        "ts",
        "tsx",
        "json",
        "toml",
        "text",
        "file",
        "wasm",
        "napi",
      ];
      for (const loader of validLoaders) {
        const result = parseLoaderFlag(`.test:${loader}`);
        expect(result.get(".test")).toBe(loader);
      }
    });

    it("should trim whitespace", () => {
      const result = parseLoaderFlag("  .ts  :  tsx  ");
      expect(result.get(".ts")).toBe("tsx");
    });
  });

  describe("parseDropFlag", () => {
    it("should parse single function", () => {
      const result = parseDropFlag("console");
      expect(result).toEqual(["console"]);
    });

    it("should parse multiple functions", () => {
      const result = parseDropFlag("console,debugger,trace");
      expect(result).toEqual(["console", "debugger", "trace"]);
    });

    it("should trim whitespace", () => {
      const result = parseDropFlag("  console  ,  debugger  ");
      expect(result).toEqual(["console", "debugger"]);
    });

    it("should filter empty strings", () => {
      const result = parseDropFlag("console,,debugger");
      expect(result).toEqual(["console", "debugger"]);
    });

    it("should handle namespaced functions", () => {
      const result = parseDropFlag("console.log,console.warn");
      expect(result).toEqual(["console.log", "console.warn"]);
    });
  });

  describe("validateTranspilationConfig", () => {
    it("should validate empty config", () => {
      const result = validateTranspilationConfig({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate valid config", () => {
      const config: Partial<TranspilationConfig> = {
        jsxRuntime: "automatic",
        jsxImportSource: "react",
        noMacros: false,
        drop: ["console"],
      };
      const result = validateTranspilationConfig(config);
      expect(result.valid).toBe(true);
    });

    it("should reject invalid tsconfigOverride", () => {
      const result = validateTranspilationConfig({
        tsconfigOverride: 123 as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject empty tsconfigOverride", () => {
      const result = validateTranspilationConfig({ tsconfigOverride: "" });
      expect(result.valid).toBe(false);
    });

    it("should reject non-object define", () => {
      const result = validateTranspilationConfig({ define: "not-object" as any });
      expect(result.valid).toBe(false);
    });

    it("should reject invalid define values", () => {
      const result = validateTranspilationConfig({
        define: { KEY: undefined as any },
      });
      expect(result.valid).toBe(false);
    });

    it("should reject non-array drop", () => {
      const result = validateTranspilationConfig({ drop: "console" as any });
      expect(result.valid).toBe(false);
    });

    it("should reject empty drop items", () => {
      const result = validateTranspilationConfig({ drop: [""] });
      expect(result.valid).toBe(false);
    });

    it("should reject invalid jsxRuntime", () => {
      const result = validateTranspilationConfig({
        jsxRuntime: "invalid" as any,
      });
      expect(result.valid).toBe(false);
    });

    it("should accept valid jsxRuntime values", () => {
      const automaticResult = validateTranspilationConfig({
        jsxRuntime: "automatic",
      });
      expect(automaticResult.valid).toBe(true);

      const classicResult = validateTranspilationConfig({
        jsxRuntime: "classic",
      });
      expect(classicResult.valid).toBe(true);
    });

    it("should warn on jsxFactory with automatic runtime", () => {
      const result = validateTranspilationConfig({
        jsxFactory: "h",
        jsxRuntime: "automatic",
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should validate loaders Map", () => {
      const loaders = new Map([
        [".ts", "tsx"],
        [".js", "jsx"],
      ]);
      const result = validateTranspilationConfig({ loaders });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid loaders", () => {
      const loaders = new Map([
        [".ts", "invalid" as any],
      ]);
      const result = validateTranspilationConfig({ loaders });
      expect(result.valid).toBe(false);
    });

    it("should reject loaders with invalid extensions", () => {
      const loaders = new Map([
        ["ts", "tsx"],
      ]);
      const result = validateTranspilationConfig({ loaders });
      expect(result.valid).toBe(false);
    });

    it("should reject non-boolean noMacros", () => {
      const result = validateTranspilationConfig({ noMacros: "yes" as any });
      expect(result.valid).toBe(false);
    });

    it("should reject non-string jsxFactory", () => {
      const result = validateTranspilationConfig({ jsxFactory: 42 as any });
      expect(result.valid).toBe(false);
    });
  });

  describe("executeTranspilationCommand", () => {
    it("should show default configuration", () => {
      const cmd = { action: "show" as const };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("Transpilation Configuration");
      expect(result).toContain("JSX Runtime");
    });

    it("should reset to defaults", () => {
      const cmd = { action: "reset" as const };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("✅");
      expect(result).toContain("defaults");
    });

    it("should parse and show define flags", () => {
      const cmd = {
        action: "parse-define" as const,
        value: "NODE_ENV:development",
      };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("Parsed defines");
      expect(result).toContain("NODE_ENV");
    });

    it("should parse and show loader flags", () => {
      const cmd = { action: "parse-loader" as const, value: ".ts:tsx" };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("Parsed loaders");
      expect(result).toContain(".ts");
      expect(result).toContain("tsx");
    });

    it("should parse and show drop flags", () => {
      const cmd = {
        action: "parse-drop" as const,
        value: "console,debugger",
      };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("Functions to drop");
      expect(result).toContain("console");
    });

    it("should validate and report valid config", () => {
      const cmd = {
        action: "validate" as const,
        value: '{"jsxRuntime": "automatic"}',
      };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("✅");
      expect(result).toContain("valid");
    });

    it("should validate and report invalid config", () => {
      const cmd = {
        action: "validate" as const,
        value: '{"jsxRuntime": "invalid"}',
      };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("❌");
      expect(result).toContain("failed");
    });

    it("should throw on invalid JSON", () => {
      const cmd = {
        action: "validate" as const,
        value: "{invalid json}",
      };
      expect(() => executeTranspilationCommand(cmd)).toThrow();
    });

    it("should configure with valid config", () => {
      const cmd = {
        action: "configure" as const,
        config: { jsxRuntime: "classic" },
      };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("✅");
      expect(result).toContain("Configuration updated");
    });

    it("should reject configure with invalid config", () => {
      const cmd = {
        action: "configure" as const,
        config: { jsxRuntime: "invalid" as any },
      };
      expect(() => executeTranspilationCommand(cmd)).toThrow();
    });

    it("should apply valid config", () => {
      const cmd = {
        action: "apply" as const,
        config: { noMacros: true },
      };
      const result = executeTranspilationCommand(cmd);
      expect(result).toContain("✅");
      expect(result).toContain("applied");
    });

    it("should reject apply with invalid config", () => {
      const cmd = {
        action: "apply" as const,
        config: { jsxFactory: 123 as any },
      };
      expect(() => executeTranspilationCommand(cmd)).toThrow();
    });
  });

  describe("generateTranspilationCommand", () => {
    it("should generate command with default config", () => {
      const result = generateTranspilationCommand(DEFAULT_TRANSPILATION_CONFIG);
      expect(result).toContain("bun build");
      expect(result).toContain("react");
    });

    it("should include tsconfig override", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        tsconfigOverride: "custom/tsconfig.json",
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--tsconfig-override custom/tsconfig.json");
    });

    it("should include define flags", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        define: { NODE_ENV: "production", DEBUG: "false" },
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--define");
      expect(result).toContain("NODE_ENV");
    });

    it("should include drop flags", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        drop: ["console", "debugger"],
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--drop console");
      expect(result).toContain("--drop debugger");
    });

    it("should include loader flags", () => {
      const loaders = new Map([
        [".ts", "tsx"],
        [".js", "jsx"],
      ]);
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        loaders,
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--loader");
    });

    it("should include no-macros flag", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        noMacros: true,
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--no-macros");
    });

    it("should include jsx factory", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        jsxFactory: "h",
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--jsx-factory h");
    });

    it("should include jsx fragment", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        jsxFragment: "Fragment",
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--jsx-fragment Fragment");
    });

    it("should include jsx import source when not default", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        jsxImportSource: "preact",
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--jsx-import-source preact");
    });

    it("should include jsx runtime when not default", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        jsxRuntime: "classic",
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--jsx-runtime classic");
    });

    it("should include jsx side effects", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        jsxSideEffects: true,
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--jsx-side-effects");
    });

    it("should include ignore dce annotations", () => {
      const config: TranspilationConfig = {
        ...DEFAULT_TRANSPILATION_CONFIG,
        ignoreDceAnnotations: true,
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("--ignore-dce-annotations");
    });

    it("should generate complex command with all options", () => {
      const loaders = new Map([
        [".ts", "tsx"],
        [".js", "jsx"],
      ]);
      const config: TranspilationConfig = {
        tsconfigOverride: "tsconfig.prod.json",
        define: { NODE_ENV: "production" },
        drop: ["console"],
        loaders,
        noMacros: true,
        jsxFactory: "h",
        jsxFragment: "Fragment",
        jsxImportSource: "preact",
        jsxRuntime: "classic",
        jsxSideEffects: true,
        ignoreDceAnnotations: true,
      };
      const result = generateTranspilationCommand(config);
      expect(result).toContain("bun build");
      expect(result).toContain("--tsconfig-override");
      expect(result).toContain("--define");
      expect(result).toContain("--drop");
      expect(result).toContain("--loader");
      expect(result).toContain("--no-macros");
      expect(result).toContain("--jsx-factory");
      expect(result).toContain("--jsx-fragment");
      expect(result).toContain("--jsx-import-source");
      expect(result).toContain("--jsx-runtime");
      expect(result).toContain("--jsx-side-effects");
      expect(result).toContain("--ignore-dce-annotations");
    });
  });
});
