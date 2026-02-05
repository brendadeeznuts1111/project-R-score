import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

console.log("🔧 Setting up test environment...");

// Global setup - runs once before all tests
beforeAll(() => {
  console.log("🚀 Initializing test database connection...");
  console.log("📊 Setting up test fixtures...");
  console.log("⚙️ Configuring test environment variables...");
});

// Global teardown - runs once after all tests
afterAll(() => {
  console.log("🧹 Cleaning up test database...");
  console.log("📁 Removing temporary test files...");
  console.log("🔒 Closing test connections...");
});

// Setup before each test
beforeEach(() => {
  console.log("📋 Preparing test context...");
});

// Cleanup after each test
afterEach(() => {
  console.log("🧽 Resetting test state...");
});

export const testConfig = {
  database: "file::memory:",
  timeout: 5000,
  retries: 3,
  environment: "test"
};

export function createTestPackage(name: string, version: string) {
  return {
    name,
    version,
    description: `Test package ${name}`,
    author: "Test Team",
    license: "MIT",
    dependencies: {},
    devDependencies: {}
  };
}
