/**
 * @fileoverview Feature Flag Manager Tests
 * @description Comprehensive test suite for FeatureFlagManager edge cases
 * @module test/features/flags
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import type { FeatureFlagConfig } from "../../src/features/config";
import { FeatureFlagManager } from "../../src/features/flags";
import type { PipelineUser } from "../../src/pipeline/types";

const TEST_DB_PATH = join(process.cwd(), "test-features.db");

function createTestUser(
	id: string,
	role: string,
	featureFlags?: string[],
): PipelineUser {
	return {
		id,
		username: id,
		role,
		featureFlags,
	};
}

function createTestFlag(
	id: string,
	enabled: boolean,
	rollout: number,
	conditions: FeatureFlagConfig["conditions"] = {},
): FeatureFlagConfig {
	return {
		id,
		name: `Test Flag ${id}`,
		enabled,
		rollout,
		conditions,
	};
}

describe("FeatureFlagManager", () => {
	let manager: FeatureFlagManager;

	beforeEach(() => {
		// Clean up any existing test database
		try {
			unlinkSync(TEST_DB_PATH);
		} catch {
			// Ignore if file doesn't exist
		}
		manager = new FeatureFlagManager(TEST_DB_PATH);
	});

	afterEach(() => {
		manager.close();
		try {
			unlinkSync(TEST_DB_PATH);
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Validation Edge Cases", () => {
		test("should reject invalid rollout percentage < 0", () => {
			const flag = createTestFlag("test-1", true, -1);
			expect(() => manager.registerFlag(flag)).toThrow("Invalid rollout percentage");
		});

		test("should reject invalid rollout percentage > 100", () => {
			const flag = createTestFlag("test-2", true, 101);
			expect(() => manager.registerFlag(flag)).toThrow("Invalid rollout percentage");
		});

		test("should reject non-array roles condition", () => {
			const flag: any = createTestFlag("test-3", true, 100, {
				roles: "admin",
			});
			expect(() => manager.registerFlag(flag)).toThrow("conditions.roles must be an array");
		});

		test("should reject non-array users condition", () => {
			const flag: any = createTestFlag("test-4", true, 100, {
				users: "user1",
			});
			expect(() => manager.registerFlag(flag)).toThrow("conditions.users must be an array");
		});

		test("should reject invalid timeRange (start >= end)", () => {
			const flag = createTestFlag("test-5", true, 100, {
				timeRange: { start: 1000, end: 500 },
			});
			expect(() => manager.registerFlag(flag)).toThrow("timeRange.start must be less than timeRange.end");
		});

		test("should reject invalid timeRange (non-number start)", () => {
			const flag: any = createTestFlag("test-6", true, 100, {
				timeRange: { start: "invalid", end: 1000 },
			});
			expect(() => manager.registerFlag(flag)).toThrow("timeRange.start and timeRange.end must be numbers");
		});

		test("should reject missing id", () => {
			const flag = { ...createTestFlag("", true, 100), id: "" };
			expect(() => manager.registerFlag(flag)).toThrow("id must be a non-empty string");
		});

		test("should reject missing name", () => {
			const flag = { ...createTestFlag("test-7", true, 100), name: "" };
			expect(() => manager.registerFlag(flag)).toThrow("name must be a non-empty string");
		});

		test("should accept valid flag with all conditions", () => {
			const flag = createTestFlag("test-8", true, 50, {
				roles: ["admin", "trader"],
				users: ["user1", "user2"],
				timeRange: { start: Date.now() - 1000, end: Date.now() + 1000 },
			});
			expect(() => manager.registerFlag(flag)).not.toThrow();
		});
	});

	describe("Evaluation Edge Cases", () => {
		test("should return false for non-existent flag", () => {
			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("non-existent", user)).toBe(false);
		});

		test("should return false for globally disabled flag", () => {
			const flag = createTestFlag("disabled-flag", false, 100);
			manager.registerFlag(flag);
			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("disabled-flag", user)).toBe(false);
		});

		test("should handle flag with malformed JSON in database", () => {
			// Register a flag normally
			const flag = createTestFlag("malformed-json", true, 100);
			manager.registerFlag(flag);

			// Manually corrupt the database
			const managerAny = manager as any;
			const stmt = managerAny.db.prepare(`
				UPDATE feature_flags SET conditions_json = 'invalid json{' WHERE id = ?
			`);
			stmt.run("malformed-json");

			// Clear cache
			managerAny.flags.delete("malformed-json");

			const user = createTestUser("user1", "admin");
			// Should handle gracefully and return true (empty conditions)
			expect(manager.isEnabled("malformed-json", user)).toBe(true);
		});

		test("should respect role conditions", () => {
			const flag = createTestFlag("role-flag", true, 100, {
				roles: ["admin"],
			});
			manager.registerFlag(flag);

			const adminUser = createTestUser("admin1", "admin");
			const traderUser = createTestUser("trader1", "trader");

			expect(manager.isEnabled("role-flag", adminUser)).toBe(true);
			expect(manager.isEnabled("role-flag", traderUser)).toBe(false);
		});

		test("should respect user-specific conditions", () => {
			const flag = createTestFlag("user-flag", true, 100, {
				users: ["user1"],
			});
			manager.registerFlag(flag);

			const allowedUser = createTestUser("user1", "admin");
			const deniedUser = createTestUser("user2", "admin");

			expect(manager.isEnabled("user-flag", allowedUser)).toBe(true);
			expect(manager.isEnabled("user-flag", deniedUser)).toBe(false);
		});

		test("should respect time-based conditions (before range)", () => {
			const now = Date.now();
			const flag = createTestFlag("time-flag", true, 100, {
				timeRange: { start: now + 1000, end: now + 2000 },
			});
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("time-flag", user)).toBe(false);
		});

		test("should respect time-based conditions (during range)", () => {
			const now = Date.now();
			const flag = createTestFlag("time-flag-2", true, 100, {
				timeRange: { start: now - 1000, end: now + 1000 },
			});
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("time-flag-2", user)).toBe(true);
		});

		test("should respect time-based conditions (after range)", () => {
			const now = Date.now();
			const flag = createTestFlag("time-flag-3", true, 100, {
				timeRange: { start: now - 2000, end: now - 1000 },
			});
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("time-flag-3", user)).toBe(false);
		});

		test("should handle rollout percentage boundaries (0%)", () => {
			const flag = createTestFlag("rollout-0", true, 0);
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("rollout-0", user)).toBe(false);
		});

		test("should handle rollout percentage boundaries (100%)", () => {
			const flag = createTestFlag("rollout-100", true, 100);
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("rollout-100", user)).toBe(true);
		});

		test("should handle rollout percentage boundaries (50%)", () => {
			const flag = createTestFlag("rollout-50", true, 50);
			manager.registerFlag(flag);

			// Test multiple users to verify hash-based distribution
			const results: boolean[] = [];
			for (let i = 0; i < 100; i++) {
				const user = createTestUser(`user${i}`, "admin");
				results.push(manager.isEnabled("rollout-50", user));
			}

			// Should have roughly 50% enabled (allowing for hash distribution variance)
			const enabledCount = results.filter(Boolean).length;
			expect(enabledCount).toBeGreaterThan(30);
			expect(enabledCount).toBeLessThan(70);
		});

		test("should allow user override to bypass rollout", () => {
			const flag = createTestFlag("rollout-0-override", true, 0);
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin", ["rollout-0-override"]);
			expect(manager.isEnabled("rollout-0-override", user)).toBe(true);
		});

		test("should respect restrictive conditions even with user override", () => {
			const flag = createTestFlag("restrictive-override", true, 100, {
				roles: ["admin"],
			});
			manager.registerFlag(flag);

			const traderWithOverride = createTestUser("trader1", "trader", [
				"restrictive-override",
			]);
			expect(manager.isEnabled("restrictive-override", traderWithOverride)).toBe(
				false,
			);

			const adminWithOverride = createTestUser("admin1", "admin", [
				"restrictive-override",
			]);
			expect(manager.isEnabled("restrictive-override", adminWithOverride)).toBe(
				true,
			);
		});

		test("should handle multiple restrictive conditions (roles AND users AND time)", () => {
			const now = Date.now();
			const flag = createTestFlag("multi-restrictive", true, 100, {
				roles: ["admin"],
				users: ["user1"],
				timeRange: { start: now - 1000, end: now + 1000 },
			});
			manager.registerFlag(flag);

			// User with correct role, correct id, and within time range
			const validUser = createTestUser("user1", "admin");
			expect(manager.isEnabled("multi-restrictive", validUser)).toBe(true);

			// User with wrong role
			const wrongRole = createTestUser("user1", "trader");
			expect(manager.isEnabled("multi-restrictive", wrongRole)).toBe(false);

			// User with wrong id
			const wrongId = createTestUser("user2", "admin");
			expect(manager.isEnabled("multi-restrictive", wrongId)).toBe(false);
		});
	});

	describe("Database Edge Cases", () => {
		test("should clamp rollout values outside 0-100 range when loading", () => {
			// Register flag with valid value
			const flag = createTestFlag("clamp-test", true, 50);
			manager.registerFlag(flag);

			// Manually set invalid value in database
			const managerAny = manager as any;
			const stmt = managerAny.db.prepare(`
				UPDATE feature_flags SET rollout = 150 WHERE id = ?
			`);
			stmt.run("clamp-test");

			// Clear cache to force reload
			managerAny.flags.delete("clamp-test");

			const user = createTestUser("user1", "admin");
			// Should clamp to 100 and allow access
			expect(manager.isEnabled("clamp-test", user)).toBe(true);
		});

		test("should handle null conditions_json gracefully", () => {
			const flag = createTestFlag("null-conditions", true, 100);
			manager.registerFlag(flag);

			// Set conditions_json to NULL
			const managerAny = manager as any;
			const stmt = managerAny.db.prepare(`
				UPDATE feature_flags SET conditions_json = NULL WHERE id = ?
			`);
			stmt.run("null-conditions");

			// Clear cache
			managerAny.flags.delete("null-conditions");

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("null-conditions", user)).toBe(true);
		});

		test("should handle empty conditions_json", () => {
			const flag = createTestFlag("empty-conditions", true, 100);
			manager.registerFlag(flag);

			// Set conditions_json to empty string
			const managerAny = manager as any;
			const stmt = managerAny.db.prepare(`
				UPDATE feature_flags SET conditions_json = '' WHERE id = ?
			`);
			stmt.run("empty-conditions");

			// Clear cache
			managerAny.flags.delete("empty-conditions");

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("empty-conditions", user)).toBe(true);
		});
	});

	describe("Integration Tests", () => {
		test("should work with real database operations", () => {
			const flag1 = createTestFlag("integration-1", true, 100);
			const flag2 = createTestFlag("integration-2", true, 100, {
				roles: ["admin"],
			});

			manager.registerFlag(flag1);
			manager.registerFlag(flag2);

			const adminUser = createTestUser("admin1", "admin");
			const traderUser = createTestUser("trader1", "trader");

			expect(manager.isEnabled("integration-1", adminUser)).toBe(true);
			expect(manager.isEnabled("integration-1", traderUser)).toBe(true);
			expect(manager.isEnabled("integration-2", adminUser)).toBe(true);
			expect(manager.isEnabled("integration-2", traderUser)).toBe(false);
		});

		test("should handle concurrent flag checks", () => {
			const flag = createTestFlag("concurrent", true, 100);
			manager.registerFlag(flag);

			const users = Array.from({ length: 10 }, (_, i) =>
				createTestUser(`user${i}`, "admin"),
			);

			// Check flags concurrently
			const results = users.map((user) =>
				manager.isEnabled("concurrent", user),
			);

			// All should be enabled (100% rollout)
			expect(results.every(Boolean)).toBe(true);
		});

		test("should update flag correctly", () => {
			const flag = createTestFlag("update-test", true, 50);
			manager.registerFlag(flag);

			manager.updateFlag("update-test", { rollout: 100 });

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("update-test", user)).toBe(true);
		});

		test("should delete flag correctly", () => {
			const flag = createTestFlag("delete-test", true, 100);
			manager.registerFlag(flag);

			const user = createTestUser("user1", "admin");
			expect(manager.isEnabled("delete-test", user)).toBe(true);

			manager.deleteFlag("delete-test");
			expect(manager.isEnabled("delete-test", user)).toBe(false);
		});

		test("should get all flags", () => {
			manager.registerFlag(createTestFlag("flag1", true, 100));
			manager.registerFlag(createTestFlag("flag2", true, 50));
			manager.registerFlag(createTestFlag("flag3", false, 0));

			const allFlags = manager.getAllFlags();
			expect(allFlags.length).toBe(3);
			expect(allFlags.map((f) => f.id).sort()).toEqual([
				"flag1",
				"flag2",
				"flag3",
			]);
		});
	});

	describe("Edge Case: Invalid timeRange in database", () => {
		test("should handle invalid timeRange values when loading from database", () => {
			const flag = createTestFlag("invalid-time", true, 100, {
				timeRange: { start: Date.now() - 1000, end: Date.now() + 1000 },
			});
			manager.registerFlag(flag);

			// Corrupt timeRange in database
			const managerAny = manager as any;
			const stmt = managerAny.db.prepare(`
				UPDATE feature_flags SET conditions_json = '{"timeRange":{"start":"invalid","end":1000}}' WHERE id = ?
			`);
			stmt.run("invalid-time");

			// Clear cache
			managerAny.flags.delete("invalid-time");

			const user = createTestUser("user1", "admin");
			// Should treat as disabled due to invalid timeRange
			expect(manager.isEnabled("invalid-time", user)).toBe(false);
		});
	});
});
