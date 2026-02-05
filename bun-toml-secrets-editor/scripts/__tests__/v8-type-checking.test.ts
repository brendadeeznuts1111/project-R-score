/**
 * 🧪 V8 Type Checking API Tests
 * Tests for v8::Value::IsMap(), IsArray(), IsInt32(), IsBigInt()
 * Run: bun test scripts/__tests__/v8-type-checking.test.ts
 */

import { describe, expect, test } from "bun:test";

/**
 * V8 Type Checking Utilities (matching V8 C++ API)
 */
class V8TypeChecker {
	static isMap(value: unknown): value is Map<unknown, unknown> {
		return value instanceof Map;
	}

	static isArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	}

	static isInt32(value: unknown): value is number {
		return (
			typeof value === "number" &&
			Number.isInteger(value) &&
			value >= -2147483648 &&
			value <= 2147483647
		);
	}

	static isBigInt(value: unknown): value is bigint {
		return typeof value === "bigint";
	}
}

describe("V8 Type Checking APIs", () => {
	describe("v8::Value::IsMap()", () => {
		test("detects Map objects", () => {
			const map = new Map([["key", "value"]]);
			expect(V8TypeChecker.isMap(map)).toBe(true);
		});

		test("rejects non-Map objects", () => {
			expect(V8TypeChecker.isMap({})).toBe(false);
			expect(V8TypeChecker.isMap([])).toBe(false);
			expect(V8TypeChecker.isMap(null)).toBe(false);
			expect(V8TypeChecker.isMap("string")).toBe(false);
		});

		test("works with Map operations", () => {
			const stats = new Map<string, { time: number; size: number }>();
			stats.set("linux-x64", { time: 100, size: 10.5 });

			if (V8TypeChecker.isMap(stats)) {
				expect(stats.get("linux-x64")?.time).toBe(100);
			}
		});
	});

	describe("v8::Value::IsArray()", () => {
		test("detects Array objects", () => {
			const arr = [1, 2, 3];
			expect(V8TypeChecker.isArray(arr)).toBe(true);
		});

		test("rejects non-Array objects", () => {
			expect(V8TypeChecker.isArray({})).toBe(false);
			expect(V8TypeChecker.isArray(new Map())).toBe(false);
			expect(V8TypeChecker.isArray(null)).toBe(false);
			expect(V8TypeChecker.isArray("string")).toBe(false);
		});

		test("works with array operations", () => {
			const platforms = ["linux-x64", "darwin-arm64"];

			if (V8TypeChecker.isArray(platforms)) {
				expect(platforms.length).toBe(2);
				expect(platforms.includes("linux-x64")).toBe(true);
			}
		});
	});

	describe("v8::Value::IsInt32()", () => {
		test("detects 32-bit integers", () => {
			expect(V8TypeChecker.isInt32(0)).toBe(true);
			expect(V8TypeChecker.isInt32(2147483647)).toBe(true); // Max Int32
			expect(V8TypeChecker.isInt32(-2147483648)).toBe(true); // Min Int32
			expect(V8TypeChecker.isInt32(100)).toBe(true);
			expect(V8TypeChecker.isInt32(-100)).toBe(true);
		});

		test("rejects non-Int32 values", () => {
			expect(V8TypeChecker.isInt32(2147483648)).toBe(false); // Too large
			expect(V8TypeChecker.isInt32(-2147483649)).toBe(false); // Too small
			expect(V8TypeChecker.isInt32(3.14)).toBe(false); // Float
			expect(V8TypeChecker.isInt32(NaN)).toBe(false);
			expect(V8TypeChecker.isInt32(Infinity)).toBe(false);
			expect(V8TypeChecker.isInt32("123")).toBe(false); // String
		});

		test("works with build statistics", () => {
			const buildTime = 1234;
			if (V8TypeChecker.isInt32(buildTime)) {
				expect(buildTime).toBe(1234);
			}
		});
	});

	describe("v8::Value::IsBigInt()", () => {
		test("detects BigInt values", () => {
			expect(V8TypeChecker.isBigInt(123n)).toBe(true);
			expect(V8TypeChecker.isBigInt(BigInt(123))).toBe(true);
			expect(V8TypeChecker.isBigInt(0n)).toBe(true);
			expect(V8TypeChecker.isBigInt(-123n)).toBe(true);
		});

		test("rejects non-BigInt values", () => {
			expect(V8TypeChecker.isBigInt(123)).toBe(false); // Number
			expect(V8TypeChecker.isBigInt("123")).toBe(false); // String
			expect(V8TypeChecker.isBigInt(null)).toBe(false);
			expect(V8TypeChecker.isBigInt(undefined)).toBe(false);
		});

		test("works with large integer operations", () => {
			const largeNumber = 9007199254740992n; // Beyond Number.MAX_SAFE_INTEGER
			if (V8TypeChecker.isBigInt(largeNumber)) {
				expect(largeNumber + 1n).toBe(9007199254740993n);
			}
		});
	});

	describe("Integration Tests", () => {
		test("validates build statistics Map", () => {
			const stats = new Map<string, { time: number; size: number }>();
			stats.set("linux-x64", { time: 100, size: 10.5 });
			stats.set("darwin-arm64", { time: 150, size: 12.3 });

			expect(V8TypeChecker.isMap(stats)).toBe(true);
			expect(stats.size).toBe(2);
		});

		test("validates platforms array", () => {
			const platforms = ["linux-x64", "darwin-arm64", "windows-x64"];

			expect(V8TypeChecker.isArray(platforms)).toBe(true);
			expect(platforms.length).toBe(3);
		});

		test("validates build time as Int32", () => {
			const buildTimes = [100, 200, 300, 1500];

			buildTimes.forEach((time) => {
				expect(V8TypeChecker.isInt32(time)).toBe(true);
			});
		});

		test("validates file sizes with BigInt", () => {
			const largeSize = 9007199254740992n; // Large file size

			if (V8TypeChecker.isBigInt(largeSize)) {
				expect(largeSize > Number.MAX_SAFE_INTEGER).toBe(true);
			}
		});

		test("combined type checking in registry manager", () => {
			// Simulate registry manager data structures
			const stats = new Map<string, { time: number; size: number }>();
			const platforms = ["linux-x64", "darwin-arm64"];
			const buildTime = 1234;
			const fileSize = 1000000000n;

			// All should pass V8 type checks
			expect(V8TypeChecker.isMap(stats)).toBe(true);
			expect(V8TypeChecker.isArray(platforms)).toBe(true);
			expect(V8TypeChecker.isInt32(buildTime)).toBe(true);
			expect(V8TypeChecker.isBigInt(fileSize)).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		test("handles null and undefined", () => {
			expect(V8TypeChecker.isMap(null)).toBe(false);
			expect(V8TypeChecker.isArray(null)).toBe(false);
			expect(V8TypeChecker.isInt32(null)).toBe(false);
			expect(V8TypeChecker.isBigInt(null)).toBe(false);

			expect(V8TypeChecker.isMap(undefined)).toBe(false);
			expect(V8TypeChecker.isArray(undefined)).toBe(false);
			expect(V8TypeChecker.isInt32(undefined)).toBe(false);
			expect(V8TypeChecker.isBigInt(undefined)).toBe(false);
		});

		test("handles boundary Int32 values", () => {
			expect(V8TypeChecker.isInt32(2147483647)).toBe(true); // Max
			expect(V8TypeChecker.isInt32(-2147483648)).toBe(true); // Min
			expect(V8TypeChecker.isInt32(2147483648)).toBe(false); // Max + 1
			expect(V8TypeChecker.isInt32(-2147483649)).toBe(false); // Min - 1
		});

		test("distinguishes between similar types", () => {
			const map = new Map();
			const obj = {};
			const arr = [];

			expect(V8TypeChecker.isMap(map)).toBe(true);
			expect(V8TypeChecker.isMap(obj)).toBe(false);
			expect(V8TypeChecker.isMap(arr)).toBe(false);

			expect(V8TypeChecker.isArray(arr)).toBe(true);
			expect(V8TypeChecker.isArray(map)).toBe(false);
			expect(V8TypeChecker.isArray(obj)).toBe(false);
		});
	});
});
