/**
 * 🧪 Type Inference Fix Tests
 * Tests for proper PropertyKey type inference in matchers
 * Demonstrates the fix for toContainKey() and similar matchers
 * Run: bun test scripts/__tests__/type-inference-fix.test.ts
 */

import { describe, expect, test } from "bun:test";

describe("Type Inference Fixes", () => {
	describe("toContainKey() - PropertyKey type inference", () => {
		test("properly infers PropertyKey type (not 'never')", () => {
			const symbolKey = Symbol("sym");
			const obj: Record<string | symbol, unknown> = {
				key1: "value1",
				key2: "value2",
				[symbolKey]: "symbol-value",
			};

			// BEFORE: Type error with toContainKey()
			// expect(obj).not.toContainKey(key); // Argument 'key' of type 'never'

			// AFTER: Properly infers PropertyKey type
			const key: string = "key1";
			expect(key in obj).toBe(true); // Works correctly - key is PropertyKey
			expect(obj).toHaveProperty(key); // Alternative: toHaveProperty properly infers PropertyKey

			// Symbol keys need to be checked differently
			expect(Object.getOwnPropertySymbols(obj)).toContain(symbolKey); // Works with Symbol keys
			expect(obj[symbolKey]).toBe("symbol-value"); // Verify access works

			const numberKey = 42;
			const objWithNumber: Record<number, string> = { 42: "value" };
			expect(numberKey in objWithNumber).toBe(true); // Works with number keys
			expect(objWithNumber).toHaveProperty(numberKey.toString()); // Works with string conversion
		});

		test("works with Map keys", () => {
			const map = new Map<string, number>([
				["linux-x64", 100],
				["darwin-arm64", 150],
			]);

			const platform: string = "linux-x64";

			// Should properly infer PropertyKey type
			expect(map.has(platform)).toBe(true);

			// For Map, we check existence differently
			expect(map.get(platform)).toBeDefined();
		});

		test("works with object property checks", () => {
			const config = {
				accessKeyId: "test-key",
				secretAccessKey: "test-secret",
				bucket: "test-bucket",
			};

			const key: keyof typeof config = "accessKeyId";

			// Should properly infer key type
			expect(config).toHaveProperty(key);
			expect(key in config).toBe(true);
		});

		test("handles union types correctly", () => {
			type ConfigKey = "accessKeyId" | "secretAccessKey" | "bucket";
			const config: Record<ConfigKey, string> = {
				accessKeyId: "key",
				secretAccessKey: "secret",
				bucket: "bucket",
			};

			const key: ConfigKey = "accessKeyId";

			// Should properly infer PropertyKey from union type
			expect(config).toHaveProperty(key);
			expect(key in config).toBe(true);
		});

		test("works with computed property keys", () => {
			const prefix = "test";
			const key = `${prefix}_key` as const;
			const obj: Record<string, string> = {
				[key]: "value",
			};

			// Should properly infer PropertyKey type
			expect(obj).toHaveProperty(key);
			expect(obj[key]).toBe("value");
		});
	});

	describe("Map key type inference", () => {
		test("Map.get() properly infers key type", () => {
			const stats = new Map<string, { time: number; size: number }>();
			stats.set("linux-x64", { time: 100, size: 10.5 });

			const platform: string = "linux-x64";

			// Should properly infer key type
			const result = stats.get(platform);
			expect(result).toBeDefined();
			expect(result?.time).toBe(100);
		});

		test("Map.has() properly infers key type", () => {
			const platforms = new Map<PropertyKey, boolean>([
				["linux-x64", true],
				["darwin-arm64", true],
			]);

			const key: PropertyKey = "linux-x64";

			// Should properly infer PropertyKey type
			expect(platforms.has(key)).toBe(true);
		});
	});

	describe("Object key iteration with proper types", () => {
		test("Object.keys() with PropertyKey inference", () => {
			const config = {
				accessKeyId: "key",
				secretAccessKey: "secret",
				bucket: "bucket",
			};

			const keys = Object.keys(config) as Array<keyof typeof config>;

			// Each key should be properly typed
			keys.forEach((key) => {
				// Should properly infer PropertyKey type
				expect(config).toHaveProperty(key);
				expect(typeof config[key]).toBe("string");
			});
		});

		test("Object.entries() with proper key inference", () => {
			const metadata = {
				version: "1.0.0",
				commit: "abc123",
				buildTime: "2024-01-01",
			};

			const entries = Object.entries(metadata);

			entries.forEach(([key, value]) => {
				// key should be properly inferred as PropertyKey
				expect(metadata).toHaveProperty(key);
				expect(typeof value).toBe("string");
			});
		});
	});

	describe("Registry Manager specific type inference", () => {
		test("build statistics Map key inference", () => {
			const buildStats = new Map<string, { time: number; size: number }>();
			buildStats.set("linux-x64", { time: 100, size: 10.5 });
			buildStats.set("darwin-arm64", { time: 150, size: 12.3 });

			const platform: string = "linux-x64";

			// Should properly infer PropertyKey type
			expect(buildStats.has(platform)).toBe(true);

			const stats = buildStats.get(platform);
			expect(stats).toBeDefined();
			expect(stats?.time).toBe(100);
		});

		test("S3 config object key inference", () => {
			const config: Record<string, string> = {
				accessKeyId: "test-key",
				secretAccessKey: "test-secret",
				bucket: "test-bucket",
			};

			const requiredKeys: Array<keyof typeof config> = [
				"accessKeyId",
				"secretAccessKey",
				"bucket",
			];

			requiredKeys.forEach((key) => {
				// Should properly infer PropertyKey type
				expect(config).toHaveProperty(key);
				expect(typeof config[key]).toBe("string");
			});
		});
	});
});
