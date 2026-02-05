/**
 * Bookmaker Router Integration Tests
 * 
 * Tests for Telegram Mini App bookmaker routing functionality
 * 
 * @module test/telegram/bookmaker-router
 * @see 9.1.1.6.1.1 for test matrix entry
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { BookmakerRouter } from "../../src/telegram/bookmaker-router";

// Mock window object for testing
declare global {
	var window: {
		HYPERBUN_UI_CONTEXT?: {
			apiBaseUrl: string;
			startParam?: string;
			telegramUserId?: number;
			telegramAuthHash?: string;
		};
	};
}

describe("BookmakerRouter Integration (9.1.1.6.1.1)", () => {
	beforeEach(() => {
		// Setup mock UIContext
		global.window = {
			HYPERBUN_UI_CONTEXT: {
				apiBaseUrl: "https://api.hyperbun.com",
				startParam: "bookmaker:bet365",
				telegramUserId: 123456789,
				telegramAuthHash: "test-hash",
			},
		};
	});

	test("9.1.1.3.1.2: Constructs bookmaker-specific API endpoint", () => {
		const router = new BookmakerRouter();
		const endpoint = router.getOddsEndpoint();

		expect(endpoint).toBe("https://api.hyperbun.com/v1/bookmakers/bet365/odds");
	});

	test("9.1.1.3.1.4: Constructs balance endpoint", () => {
		const router = new BookmakerRouter();
		const endpoint = router.getBalanceEndpoint();

		expect(endpoint).toBe("https://api.hyperbun.com/v1/bookmakers/bet365/balance");
	});

	test("9.1.1.3.1.5: Extracts bookmaker name from startParam", () => {
		const router = new BookmakerRouter();
		const bookmaker = router.getBookmakerName();

		expect(bookmaker).toBe("bet365");
	});

	test("9.1.1.3.1.1: Throws error if UIContext not injected", () => {
		// Remove UIContext
		global.window = {} as any;

		expect(() => {
			new BookmakerRouter();
		}).toThrow("9.1.1.3.1.1: UIContext not injected");
	});

	test("9.1.1.3.1.3: Throws error if no bookmaker in startParam", () => {
		global.window.HYPERBUN_UI_CONTEXT = {
			apiBaseUrl: "https://api.hyperbun.com",
			// No startParam
		};

		const router = new BookmakerRouter();

		expect(() => {
			router.getOddsEndpoint();
		}).toThrow("9.1.1.3.1.3: No bookmaker in start_param");
	});

	test("Integration with HTMLRewriter apiBaseUrl (6.1.1.2.2.1.2.1)", () => {
		// Test that router uses apiBaseUrl from UIContext (injected by HTMLRewriter)
		global.window.HYPERBUN_UI_CONTEXT = {
			apiBaseUrl: "http://localhost:3001", // Different base URL
			startParam: "bookmaker:draftkings",
		};

		const router = new BookmakerRouter();
		const endpoint = router.getOddsEndpoint();

		expect(endpoint).toContain("http://localhost:3001");
		expect(endpoint).toContain("draftkings");
	});
});
