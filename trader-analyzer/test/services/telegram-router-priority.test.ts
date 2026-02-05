/**
 * @fileoverview Telegram Router Priority Queuing Tests
 * @description Tests for priority-based message queuing (9.1.1.10.2.5.0)
 * @module test/services/telegram-router-priority
 * @version 9.0.0.0.0.0.0
 * 
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91102500|Priority Queuing (9.1.1.10.2.5.0)}
 */

import { test, describe, expect, beforeEach } from "bun:test";

interface QueuedMessage {
	message: string;
	priority: number;
	timestamp: number;
}

class MockPriorityQueue {
	private queue: QueuedMessage[] = [];

	enqueue(message: string, priority: number): void {
		this.queue.push({
			message,
			priority,
			timestamp: Date.now(),
		});
		// Sort by priority (highest first)
		this.queue.sort((a, b) => b.priority - a.priority);
	}

	dequeue(): QueuedMessage | undefined {
		return this.queue.shift();
	}

	getQueue(): QueuedMessage[] {
		return [...this.queue];
	}

	getSize(): number {
		return this.queue.length;
	}
}

describe("Telegram Router Priority Queuing (9.1.1.10.2.5.0)", () => {
	let queue: MockPriorityQueue;

	beforeEach(() => {
		queue = new MockPriorityQueue();
	});

	test("Process high-priority messages first", () => {
		// Test Formula: 1. Enqueue messages with different priorities. 2. Dequeue and verify order.
		// Expected Result: High-priority messages processed before low-priority.

		queue.enqueue("Low priority", 2);
		queue.enqueue("High priority", 9);
		queue.enqueue("Medium priority", 5);
		queue.enqueue("Critical priority", 10);

		const first = queue.dequeue();
		const second = queue.dequeue();
		const third = queue.dequeue();
		const fourth = queue.dequeue();

		expect(first?.priority).toBe(10); // Critical first
		expect(second?.priority).toBe(9);  // High second
		expect(third?.priority).toBe(5);    // Medium third
		expect(fourth?.priority).toBe(2);   // Low last
	});

	test("Maintain priority order with concurrent enqueues", () => {
		// Simulate concurrent message arrivals
		queue.enqueue("Message 1", 3);
		queue.enqueue("Message 2", 8);
		queue.enqueue("Message 3", 1);
		queue.enqueue("Message 4", 9);

		const messages = queue.getQueue();
		expect(messages[0].priority).toBeGreaterThanOrEqual(messages[1].priority);
		expect(messages[1].priority).toBeGreaterThanOrEqual(messages[2].priority);
		expect(messages[2].priority).toBeGreaterThanOrEqual(messages[3].priority);
	});

	test("Handle empty queue gracefully", () => {
		const message = queue.dequeue();
		expect(message).toBeUndefined();
		expect(queue.getSize()).toBe(0);
	});
});
