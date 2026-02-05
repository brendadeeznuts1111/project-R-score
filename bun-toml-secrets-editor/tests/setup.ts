// Test setup file for Bun test runner
// This file is loaded before all tests via bunfig.toml preload configuration

// Set test environment
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error"; // Reduce noise during tests

// Global test utilities (if needed)
declare global {
	var testContext: {
		tempDir: string;
		mocks: Map<string, unknown>;
	};
}

// Initialize test context
global.testContext = {
	tempDir: "/tmp/bun-toml-tests",
	mocks: new Map(),
};

console.log("🧪 Test environment initialized");
