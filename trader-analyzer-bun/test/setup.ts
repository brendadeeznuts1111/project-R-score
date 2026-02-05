/**
 * @fileoverview Global Test Setup
 * @description Global test setup with mock data factories and lifecycle hooks
 * @module test/setup
 * 
 * This file is automatically loaded before all tests when using:
 *   bun test --preload ./test/setup.ts
 * 
 * Or configure in bunfig.toml:
 *   [test]
 *   preload = ["./test/setup.ts"]
 * 
 * @see config/bunfig.toml [test] section
 * @see docs/reviews/TEST_ORGANIZATION.md
 * @see test/harness.ts for additional test utilities
 */

import { afterAll, afterEach, beforeAll, beforeEach } from "bun:test";

// ═══════════════════════════════════════════════════════════════
// Mock Data Factories
// ═══════════════════════════════════════════════════════════════

/**
 * Create mock sport data for testing
 * 
 * @param sport - Sport name (e.g., "basketball", "soccer")
 * @param timestamp - Timestamp for the data point
 * @returns Mock sport data object
 */
export const createMockSportData = (
	sport: string,
	timestamp: number,
): {
	sport: string;
	timestamp: number;
	marketData: {
		totalVolume: number;
		averageOdds: number;
		volatility: number;
		eventCount: number;
	};
	anomalyFlags: string[];
} => ({
	sport: sport as any,
	timestamp,
	marketData: {
		totalVolume: 1000000 + Math.random() * 9000000,
		averageOdds: 1.5 + Math.random(),
		volatility: 0.1 + Math.random() * 0.2,
		eventCount: Math.floor(Math.random() * 30) + 1,
	},
	anomalyFlags: [],
});

/**
 * Create mock correlation data for testing
 * 
 * @param sportA - First sport name
 * @param sportB - Second sport name
 * @param strength - Correlation strength (default: 0.8)
 * @returns Mock correlation object
 */
export const createMockCorrelation = (
	sportA: string,
	sportB: string,
	strength: number = 0.8,
): {
	sportPair: { sportA: string; sportB: string };
	correlationStrength: number;
	confidenceScore: number;
	historicalMatches: number;
	correlationWindow: {
		startTime: number;
		endTime: number;
		decayRate: number;
	};
	anomalyPatterns: string[];
	validation: {
		isVerified: boolean;
		verificationSource: string;
		lastVerified: number;
		falsePositiveRate: number;
	};
} => ({
	sportPair: { sportA, sportB },
	correlationStrength: strength,
	confidenceScore: 0.8 + Math.random() * 0.2,
	historicalMatches: Math.floor(Math.random() * 100) + 10,
	correlationWindow: {
		startTime: Date.now() - 86400000,
		endTime: Date.now(),
		decayRate: 0.1 + Math.random() * 0.2,
	},
	anomalyPatterns: [],
	validation: {
		isVerified: Math.random() > 0.3,
		verificationSource: Math.random() > 0.5 ? "algorithmic" : "manual",
		lastVerified: Date.now() - Math.random() * 86400000,
		falsePositiveRate: Math.random() * 0.1,
	},
});

// ═══════════════════════════════════════════════════════════════
// Global Test Lifecycle Hooks
// ═══════════════════════════════════════════════════════════════

/**
 * Global setup before all tests
 */
beforeAll(() => {
	console.log("🏗️  Setting up Layer4 test environment...");

	// Initialize test environment variables
	process.env.TEST_ENV = "true";
	process.env.NODE_ENV = "test";

	// Mock external services
	// Note: Using globalThis instead of global for better compatibility
	(globalThis as any).mockGraphDatabase = {
		query: () => Promise.resolve([]),
		close: () => Promise.resolve(),
	};

	// Set test-specific configuration
	if (!process.env.TEST_TIMEOUT) {
		process.env.TEST_TIMEOUT = "30000"; // 30 seconds default
	}
});

/**
 * Global cleanup after all tests
 */
afterAll(() => {
	console.log("🧹 Cleaning up Layer4 test environment...");

	// Clean up resources
	if ((globalThis as any).mockGraphDatabase) {
		(globalThis as any).mockGraphDatabase.close();
		delete (globalThis as any).mockGraphDatabase;
	}

	// Clean up environment variables
	delete process.env.TEST_ENV;
});

/**
 * Setup before each test
 */
beforeEach(() => {
	// Reset random seed for reproducible tests (optional)
	// Math.random() is not seedable in JavaScript, but we can reset state

	// Clear any test-specific mocks
	// Note: Bun doesn't have jest.clearAllMocks(), so we manually reset if needed
	if ((globalThis as any).mockGraphDatabase) {
		// Reset mock database state if needed
		(globalThis as any).mockGraphDatabase.query = () => Promise.resolve([]);
	}
});

/**
 * Cleanup after each test
 */
afterEach(() => {
	// Clean up after each test
	// This is where you'd reset any test-specific state
	// For example, clearing caches, resetting counters, etc.
});

// ═══════════════════════════════════════════════════════════════
// Type Declarations
// ═══════════════════════════════════════════════════════════════

/**
 * Extend globalThis with test-specific properties
 */
declare global {
	// eslint-disable-next-line no-var
	var mockGraphDatabase: {
		query: () => Promise<unknown[]>;
		close: () => Promise<void>;
	} | undefined;
}
