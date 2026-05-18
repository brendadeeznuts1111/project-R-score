import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

console.info("🔧 Setting up test environment...");

// Global setup - runs once before all tests
beforeAll(() => {
  console.info("🚀 Initializing test database connection...");
  console.info("📊 Setting up test fixtures...");
  console.info("⚙️ Configuring test environment variables...");
});

// Global teardown - runs once after all tests
afterAll(() => {
  console.info("🧹 Cleaning up test database...");
  console.info("📁 Removing temporary test files...");
  console.info("🔒 Closing test connections...");
});

// Setup before each test
beforeEach(() => {
  console.info("📋 Preparing test context...");
});

// Cleanup after each test
afterEach(() => {
  console.info("🧽 Resetting test state...");
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
