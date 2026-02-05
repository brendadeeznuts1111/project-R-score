import { afterEach, describe, expect, test } from "bun:test";
import { BunContext, ctx } from "../../src/context/BunContext";

describe("BunContext", () => {
  afterEach(() => {
    // Reset any environment variables we might have modified
    delete process.env.TEST_KEY;
    delete process.env.TEST_NUM;
    delete process.env.TEST_BOOL;
    delete process.env.DEV_HQ_DEBUG;
    delete process.env.DEVELOPMENT;
    delete process.env.PRODUCTION;
    delete process.env.TEST;
    delete process.env.NODE_ENV;
    delete process.env.BUN_MEMORY_LIMIT;
  });

  test("version returns Bun.version", () => {
    expect(BunContext.version).toBe(Bun.version);
  });

  test("versionNumber parses version correctly", () => {
    const originalVersion = Bun.version;
    // Mocking Bun.version is hard, but we can test the logic if we could.
    // Since we can't easily mock Bun.version globally, we check if it's a number
    expect(typeof BunContext.versionNumber).toBe("number");
    expect(BunContext.versionNumber).toBeGreaterThan(0);
  });

  test("satisfiesVersion correctly compares versions", () => {
    // Current version should satisfy itself
    expect(BunContext.satisfiesVersion(Bun.version)).toBe(true);
    // Should satisfy a much older version
    expect(BunContext.satisfiesVersion("0.0.1")).toBe(true);
    // Should not satisfy a future version
    expect(BunContext.satisfiesVersion("99.99.99")).toBe(false);
  });

  test("env returns Bun.env", () => {
    expect(BunContext.env).toBe(Bun.env);
  });

  test("getEnv returns value or default", () => {
    process.env.TEST_KEY = "test-value";
    expect(BunContext.getEnv("TEST_KEY")).toBe("test-value");
    expect(BunContext.getEnv("NON_EXISTENT")).toBeUndefined();
    expect(BunContext.getEnv("NON_EXISTENT", "default")).toBe("default");
  });

  test("getEnvNumber returns number or default", () => {
    process.env.TEST_NUM = "42";
    expect(BunContext.getEnvNumber("TEST_NUM")).toBe(42);
    expect(BunContext.getEnvNumber("NON_EXISTENT")).toBeUndefined();
    expect(BunContext.getEnvNumber("NON_EXISTENT", 10)).toBe(10);

    process.env.TEST_NUM = "not-a-number";
    expect(BunContext.getEnvNumber("TEST_NUM", 5)).toBe(5);
  });

  test("getEnvBool returns boolean correctly", () => {
    process.env.TEST_BOOL = "true";
    expect(BunContext.getEnvBool("TEST_BOOL")).toBe(true);
    process.env.TEST_BOOL = "1";
    expect(BunContext.getEnvBool("TEST_BOOL")).toBe(true);
    process.env.TEST_BOOL = "yes";
    expect(BunContext.getEnvBool("TEST_BOOL")).toBe(true);

    process.env.TEST_BOOL = "false";
    expect(BunContext.getEnvBool("TEST_BOOL")).toBe(false);
    expect(BunContext.getEnvBool("NON_EXISTENT")).toBe(false);
    expect(BunContext.getEnvBool("NON_EXISTENT", true)).toBe(true);
  });

  test("platform and arch return process values", () => {
    expect(BunContext.platform).toBe(process.platform);
    expect(BunContext.arch).toBe(process.arch);
  });

  test("isCI detects CI environment", () => {
    const originalCI = process.env.CI;
    process.env.CI = "true";
    expect(BunContext.isCI).toBe(true);
    delete process.env.CI;
    // Note: Other CI env vars might be set in the real environment
  });

  test("isDevelopment detects development mode", () => {
    process.env.DEV_HQ_DEBUG = "true";
    expect(BunContext.isDevelopment).toBe(true);
    delete process.env.DEV_HQ_DEBUG;

    process.env.DEVELOPMENT = "1";
    expect(BunContext.isDevelopment).toBe(true);
  });

  test("isProduction detects production mode", () => {
    process.env.PRODUCTION = "true";
    expect(BunContext.isProduction).toBe(true);
    delete process.env.PRODUCTION;

    process.env.NODE_ENV = "production";
    expect(BunContext.isProduction).toBe(true);
  });

  test("isTest detects test mode", () => {
    process.env.TEST = "true";
    expect(BunContext.isTest).toBe(true);
    delete process.env.TEST;

    process.env.NODE_ENV = "test";
    expect(BunContext.isTest).toBe(true);
  });

  test("cpuCount returns a number", () => {
    expect(typeof BunContext.cpuCount).toBe("number");
    expect(BunContext.cpuCount).toBeGreaterThan(0);
  });

  test("memoryLimit returns number or undefined", () => {
    expect(BunContext.memoryLimit).toBeUndefined();
    process.env.BUN_MEMORY_LIMIT = "1024";
    expect(BunContext.memoryLimit).toBe(1024);
  });

  test("shorthand exports work", () => {
    expect(ctx).toBe(BunContext);
    process.env.TEST_KEY = "shorthand";
    expect(ctx.getEnv("TEST_KEY")).toBe("shorthand");
  });
});
