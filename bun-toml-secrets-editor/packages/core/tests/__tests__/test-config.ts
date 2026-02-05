/**
 * Test Configuration
 * Central configuration for all test suites
 */

export const TEST_CONFIG = {
	// Timeout settings
	TIMEOUT: {
		SHORT: 5000,
		MEDIUM: 10000,
		LONG: 30000,
		E2E: 60000,
	},

	// Test data paths
	PATHS: {
		FIXTURES: "./fixtures",
		MOCKS: "./mocks",
		TEMP: "./temp",
	},

	// Environment settings
	ENV: {
		TEST: "test",
		CI: process.env.CI === "true",
		DEBUG: process.env.DEBUG === "true",
	},

	// Feature flags for testing
	FEATURES: {
		SKIP_SLOW: process.env.SKIP_SLOW_TESTS === "true",
		SKIP_NETWORK: process.env.SKIP_NETWORK_TESTS === "true",
		PARALLEL: !process.env.CI, // Run in parallel unless in CI
	},
} as const;

// Test helpers
export const createTestTimeout = (ms: number) => ({
	timeout: TEST_CONFIG.TIMEOUT[ms as keyof typeof TEST_CONFIG.TIMEOUT] || ms,
});

export const skipIfCI = () => {
	if (TEST_CONFIG.ENV.CI) {
		test.skip("Skipping in CI environment");
	}
};

export const skipIfSlow = () => {
	if (TEST_CONFIG.FEATURES.SKIP_SLOW) {
		test.skip("Skipping slow tests");
	}
};
