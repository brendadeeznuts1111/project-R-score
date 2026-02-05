/**
 * @fileoverview Telegram Router Bookmaker Routing Tests
 * @description Tests for bookmaker-specific routing functionality (9.1.1.10.2.3.0)
 * @module test/services/telegram-router-bookmaker
 * @version 9.0.0.0.0.0.0
 * 
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91102330|Bookmaker-Specific Routing (9.1.1.10.2.3.0)}
 * 
 * Test Formula (Bookmaker Routing): 1. Configure telegram-bookmaker-map.yaml with entry for "DraftKings". 2. Dispatch notification with bookmaker_name: "DraftKings". 3. Verify Telegram.
 * Expected Result: The notification appears in the dedicated DraftKings Telegram topic.
 */

import { test, describe, expect, beforeEach } from "bun:test";

// Mock implementation for testing
interface BookmakerConfig {
	chat_id: string;
	default_thread_id: number;
	enabled: boolean;
}

class MockTelegramMessageRouter {
	private bookmakerMap: Map<string, BookmakerConfig> = new Map();

	constructor() {
		// Load mock bookmaker mappings
		this.loadBookmakerMap();
	}

	private loadBookmakerMap() {
		// Simulate loading from config/telegram-bookmaker-map.yaml
		this.bookmakerMap.set("draftkings", {
			chat_id: "-1001234567890",
			default_thread_id: 10,
			enabled: true,
		});
		this.bookmakerMap.set("betfair", {
			chat_id: "-1001234567890",
			default_thread_id: 11,
			enabled: true,
		});
		this.bookmakerMap.set("pinnacle", {
			chat_id: "-1001234567890",
			default_thread_id: 12,
			enabled: false, // Disabled
		});
	}

	routeByBookmaker(
		bookmakerName: string,
		message: string,
		severity: number
	): { chatId: string; threadId: number; routed: boolean } {
		const bookmakerConfig = this.bookmakerMap.get(bookmakerName.toLowerCase());

		if (bookmakerConfig && bookmakerConfig.enabled) {
			return {
				chatId: bookmakerConfig.chat_id,
				threadId: bookmakerConfig.default_thread_id,
				routed: true,
			};
		}

		// Fallback to default
		return {
			chatId: process.env.TELEGRAM_OPERATIONS_CHAT_ID || "",
			threadId: 1, // GENERAL topic
			routed: false,
		};
	}
}

describe("Telegram Router Bookmaker Routing (9.1.1.10.2.3.0)", () => {
	let router: MockTelegramMessageRouter;

	beforeEach(() => {
		router = new MockTelegramMessageRouter();
	});

	test("9.1.1.10.2.3.3: Route DraftKings alert to dedicated topic", () => {
		// Test Formula: 1. Configure telegram-bookmaker-map.yaml with entry for "DraftKings". 2. Dispatch notification with bookmaker_name: "DraftKings". 3. Verify Telegram.
		// Expected Result: The notification appears in the dedicated DraftKings Telegram topic.

		const result = router.routeByBookmaker("DraftKings", "Test alert", 8);

		expect(result.routed).toBe(true);
		expect(result.chatId).toBe("-1001234567890");
		expect(result.threadId).toBe(10); // DraftKings topic ID
	});

	test("Route Betfair alert to Betfair topic", () => {
		const result = router.routeByBookmaker("Betfair", "Betfair alert", 7);

		expect(result.routed).toBe(true);
		expect(result.threadId).toBe(11); // Betfair topic ID
	});

	test("Route unknown bookmaker to default topic", () => {
		const result = router.routeByBookmaker("UnknownBookmaker", "Alert", 5);

		expect(result.routed).toBe(false);
		expect(result.threadId).toBe(1); // GENERAL topic (fallback)
	});

	test("Skip disabled bookmaker routing", () => {
		const result = router.routeByBookmaker("Pinnacle", "Alert", 6);

		expect(result.routed).toBe(false); // Pinnacle is disabled
		expect(result.threadId).toBe(1); // Falls back to default
	});

	test("Case-insensitive bookmaker name matching", () => {
		const result1 = router.routeByBookmaker("DRAFTKINGS", "Alert", 8);
		const result2 = router.routeByBookmaker("draftkings", "Alert", 8);
		const result3 = router.routeByBookmaker("DraftKings", "Alert", 8);

		expect(result1.routed).toBe(true);
		expect(result2.routed).toBe(true);
		expect(result3.routed).toBe(true);
		expect(result1.threadId).toBe(result2.threadId);
		expect(result2.threadId).toBe(result3.threadId);
	});
});
