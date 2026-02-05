import { test, expect, beforeAll, afterAll, beforeEach, afterEach, describe } from "bun:test";
import { testConfig, createTestPackage } from "../setup-hooks";

describe("Package Management System", () => {
  let testPackage: any;

  // Suite-level setup
  beforeAll(() => {
    console.log("📦 Setting up package management test suite...");
    testPackage = createTestPackage("fantasy42-test", "1.0.0");
  });

  // Suite-level teardown
  afterAll(() => {
    console.log("📦 Cleaning up package management test suite...");
  });

  // Test-level setup
  beforeEach(() => {
    console.log("📦 Preparing individual package test...");
  });

  // Test-level teardown
  afterEach(() => {
    console.log("📦 Cleaning up after package test...");
  });

  test("should create package with correct structure", () => {
    expect(testPackage).toHaveProperty("name");
    expect(testPackage).toHaveProperty("version");
    expect(testPackage).toHaveProperty("description");
    expect(testPackage.name).toBe("fantasy42-test");
    expect(testPackage.version).toBe("1.0.0");
  });

  test("should validate package metadata", () => {
    expect(testPackage.author).toBe("Test Team");
    expect(testPackage.license).toBe("MIT");
    expect(testPackage.dependencies).toEqual({});
  });

  test("should handle package versioning", () => {
    const newPackage = createTestPackage("fantasy42-test", "2.0.0");
    expect(newPackage.version).toBe("2.0.0");
    expect(newPackage.version).not.toBe(testPackage.version);
  });
});

describe("Configuration Management", () => {
  test("should load test configuration", () => {
    expect(testConfig.database).toContain("memory");
    expect(testConfig.timeout).toBe(5000);
    expect(testConfig.environment).toBe("test");
  });

  test("should validate configuration values", () => {
    expect(testConfig.retries).toBeGreaterThan(0);
    expect(typeof testConfig.database).toBe("string");
  });
});
