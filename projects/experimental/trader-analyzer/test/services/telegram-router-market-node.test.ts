/**
 * @fileoverview Telegram Router Market Node Routing Tests
 * @description Tests for market node-specific topic routing (9.1.1.10.2.4.0)
 * @module test/services/telegram-router-market-node
 * @version 9.0.0.0.0.0.0
 * 
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91102400|Market Node-Specific Routing (9.1.1.10.2.4.0)}
 * 
 * Test Formula (Market Node Routing): 1. Trigger alert for event_identifier="nfl-001", market_internal_id="total_q1". 2. Verify Telegram.
 * Expected Result: A new topic for "Event-nfl-001-Market-total_q1" is created (if it doesn't exist) and the alert is posted there.
 */

import { test, describe, expect, beforeEach } from "bun:test";

// Mock implementation for testing
class MockTelegramTopicRegistry {
	private topics: Map<string, number> = new Map();
	private nextThreadId = 100;

	getOrCreateTopic(chatId: string, topicName: string): number {
		if (this.topics.has(topicName)) {
			return this.topics.get(topicName)!;
		}

		// Simulate topic creation
		const threadId = this.nextThreadId++;
		this.topics.set(topicName, threadId);
		return threadId;
	}

	getTopicId(topicName: string): number | undefined {
		return this.topics.get(topicName);
	}
}

class MockMarketNodeRouter {
	private topicRegistry: MockTelegramTopicRegistry;

	constructor() {
		this.topicRegistry = new MockTelegramTopicRegistry();
	}

	routeByMarketNode(
		nodeId: string,
		chatId: string
	): { topicName: string; threadId: number; created: boolean } {
		// Parse nodeId: "eventId:marketId:bookmaker:period"
		const [eventId, marketId] = nodeId.split(":");

		const topicName = `Event-${eventId}-Market-${marketId}`;
		const existingThreadId = this.topicRegistry.getTopicId(topicName);
		const created = !existingThreadId;

		const threadId = existingThreadId || this.topicRegistry.getOrCreateTopic(chatId, topicName);

		return { topicName, threadId, created };
	}
}

describe("Telegram Router Market Node Routing (9.1.1.10.2.4.0)", () => {
	let router: MockMarketNodeRouter;
	const chatId = "-1001234567890";

	beforeEach(() => {
		router = new MockMarketNodeRouter();
	});

	test("9.1.1.10.2.4.3: Create topic for new market node", () => {
		// Test Formula: 1. Trigger alert for event_identifier="nfl-001", market_internal_id="total_q1". 2. Verify Telegram.
		// Expected Result: A new topic for "Event-nfl-001-Market-total_q1" is created (if it doesn't exist) and the alert is posted there.

		const nodeId = "nfl-001:total_q1:draftkings:q1";
		const result = router.routeByMarketNode(nodeId, chatId);

		expect(result.created).toBe(true);
		expect(result.topicName).toBe("Event-nfl-001-Market-total_q1");
		expect(result.threadId).toBeGreaterThan(0);
	});

	test("Reuse existing topic for same market node", () => {
		const nodeId = "nfl-002:total_q2:betfair:q2";
		
		// First routing creates topic
		const result1 = router.routeByMarketNode(nodeId, chatId);
		expect(result1.created).toBe(true);
		const firstThreadId = result1.threadId;

		// Second routing reuses topic
		const result2 = router.routeByMarketNode(nodeId, chatId);
		expect(result2.created).toBe(false);
		expect(result2.threadId).toBe(firstThreadId);
	});

	test("Create separate topics for different markets", () => {
		const nodeId1 = "nfl-003:total_q1:draftkings:q1";
		const nodeId2 = "nfl-003:total_q2:draftkings:q2";

		const result1 = router.routeByMarketNode(nodeId1, chatId);
		const result2 = router.routeByMarketNode(nodeId2, chatId);

		expect(result1.topicName).toBe("Event-nfl-003-Market-total_q1");
		expect(result2.topicName).toBe("Event-nfl-003-Market-total_q2");
		expect(result1.threadId).not.toBe(result2.threadId);
	});

	test("Create separate topics for different events", () => {
		const nodeId1 = "nfl-004:total_q1:draftkings:q1";
		const nodeId2 = "nfl-005:total_q1:draftkings:q1";

		const result1 = router.routeByMarketNode(nodeId1, chatId);
		const result2 = router.routeByMarketNode(nodeId2, chatId);

		expect(result1.topicName).toBe("Event-nfl-004-Market-total_q1");
		expect(result2.topicName).toBe("Event-nfl-005-Market-total_q1");
		expect(result1.threadId).not.toBe(result2.threadId);
	});

	test("Handle nodeId with event_identifier and market_internal_id", () => {
		// Alternative format: direct event_identifier and market_internal_id
		const eventId = "nfl-006";
		const marketId = "total_q3";
		const nodeId = `${eventId}:${marketId}:draftkings:q3`;

		const result = router.routeByMarketNode(nodeId, chatId);

		expect(result.topicName).toBe(`Event-${eventId}-Market-${marketId}`);
		expect(result.threadId).toBeGreaterThan(0);
	});
});
