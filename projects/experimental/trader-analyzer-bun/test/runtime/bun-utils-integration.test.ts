/**
 * @fileoverview 7.6.1.0.0.0.0: Automated tests derived from @example formulas.
 * Each test maps directly to a documented test formula for traceability.
 * @module test/runtime/bun-utils-integration
 * 
 * @see 7.1.1.1.0 for Market Odds Table inspection formula
 * @see 7.2.1.1.0 for UUID time-ordering formula
 * @see 7.3.1.1.0 for Telegram padding formula
 */

import { describe, expect, test } from "bun:test";
import {
	inspectMarketData,
	inspectDeep,
	inspectShadowGraph,
} from "../../src/runtime/diagnostics/bun-inspect-integration";
import { generateEventId, generateEventIds, generateCorrelatedEventId } from "../../src/runtime/diagnostics/uuid-generator";
import {
	calculateTelegramPadding,
	padStrings,
	formatTelegramTable,
	formatRipgrepOutput,
} from "../../src/runtime/diagnostics/string-formatter";
import { HyperBunDiagnostics } from "../../src/runtime/diagnostics/integrated-inspector";

describe("7.1.1.1.0: inspectMarketData", () => {
	test("generates aligned table", () => {
		const odds = [
			{ bookmaker: "Bet365", odds: 1.95, timestamp: Date.now() },
			{ bookmaker: "Pinnacle", odds: 1.93, timestamp: Date.now() },
		];
		const result = inspectMarketData(odds, ["bookmaker", "odds"]);
		expect(result).toContain("Bet365");
		expect(result).toContain("Pinnacle");
		expect(result.split("\n").length).toBeGreaterThan(3); // Has header, separator, data
	});

	test("handles empty dataset", () => {
		const result = inspectMarketData([]);
		expect(result).toContain("No market data");
	});

	test("sanitizes sensitive fields", () => {
		const data = [
			{ bookmaker: "Bet365", apiKey: "secret123", token: "token456", odds: 1.95 },
		];
		const result = inspectMarketData(data);
		expect(result).not.toContain("secret123");
		expect(result).not.toContain("token456");
		expect(result).toContain("Bet365");
	});
});

describe("7.1.2.1.0: inspectDeep", () => {
	test("inspects nested objects", () => {
		const nested = {
			featureFlags: {
				shadowGraph: true,
				covertSteamAlerts: false,
			},
			userRole: "admin",
		};
		const result = inspectDeep(nested, { depth: 2 });
		expect(result).toContain("shadowGraph");
		expect(result).toContain("admin");
	});

	test("truncates large arrays", () => {
		const largeArray = Array.from({ length: 2000 }, (_, i) => ({ id: i }));
		const result = inspectDeep(largeArray);
		expect(result).toContain("Array(2000)");
		expect(result).toContain("...");
	});
});

describe("7.2.1.1.0: Bun.randomUUIDv7", () => {
	test("generates time-ordered IDs", () => {
		const id1 = generateEventId();
		const id2 = generateEventId();
		// UUIDv7 has time-ordering property in first 12 characters
		const time1 = id1.slice(0, 12);
		const time2 = id2.slice(0, 12);
		expect(time1 <= time2).toBe(true); // Time-ordering property
	});

	test("generates unique IDs", () => {
		const ids = generateEventIds(100);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(100);
	});

	test("7.2.1.3.1: generates correlated event IDs", () => {
		const id1 = generateCorrelatedEventId("bet365");
		const id2 = generateCorrelatedEventId("bet365");
		// First 8 characters should match (deterministic sharding)
		expect(id1.slice(0, 8)).toBe(id2.slice(0, 8));
	});
});

describe("7.3.1.1.0: calculateTelegramPadding", () => {
	test("handles emoji width correctly", () => {
		const padded = calculateTelegramPadding("Bet365⚡", 10);
		const width = Bun.stringWidth("Bet365⚡");
		const paddedWidth = Bun.stringWidth(padded);
		expect(width).toBeGreaterThan(0);
		expect(paddedWidth).toBe(10); // Should be exactly target width
	});

	test("pads strings to target width", () => {
		const padded = calculateTelegramPadding("test", 10);
		expect(Bun.stringWidth(padded)).toBe(10);
	});

	test("handles Unicode characters", () => {
		const padded = calculateTelegramPadding("测试", 10);
		expect(Bun.stringWidth(padded)).toBe(10);
	});

	test("7.3.1.1.0: handles emoji and CJK correctly", () => {
		const width1 = Bun.stringWidth("Bet365⚡️");
		const width2 = Bun.stringWidth("威廉希尔");
		const width3 = Bun.stringWidth("Betfair📊");
		expect(width1).toBeGreaterThan(0);
		expect(width2).toBeGreaterThan(0);
		expect(width3).toBeGreaterThan(0);
	});
});

describe("7.3.1.3.1: formatTelegramTable", () => {
	test("formats table with Unicode characters", () => {
		const rows = [
			{ bookmaker: "Bet365⚡️", odds: 1.95, steam: true },
			{ bookmaker: "Pinnacle", odds: 1.93, steam: false },
		];
		const columns = [
			{ key: "bookmaker", header: "Bookmaker" },
			{ key: "odds", header: "Odds" },
			{ key: "steam", header: "Steam" },
		];

		const table = formatTelegramTable(rows, columns);
		expect(table).toContain("Bet365⚡️");
		expect(table).toContain("Pinnacle");
		expect(table).toContain("Bookmaker");
		expect(table.split("\n").length).toBeGreaterThan(2); // Header, separator, data rows
	});
});

describe("7.3.1.4.1: formatRipgrepOutput", () => {
	test("aligns file names in ripgrep output", () => {
		const matches = [
			{ file: "src/telegram/mini-app-context.ts", line: 28, content: "6.1.1.2.2.1.2.0" },
			{ file: "src/telegram/mini-app.ts", line: 15, content: "6.1.1.2.2.2.1.0" },
		];

		const output = formatRipgrepOutput(matches);
		expect(output).toContain("mini-app-context.ts");
		expect(output).toContain("mini-app.ts");
		expect(output).toContain("28:");
		expect(output).toContain("15:");
	});
});

describe("7.4.1.2.1: HyperBunDiagnostics", () => {
	test("logs context to terminal", () => {
		const diagnostics = new HyperBunDiagnostics();
		const context = {
			apiBaseUrl: "http://localhost:3001",
			featureFlags: { shadowGraph: true },
			userRole: "admin",
			debugMode: false,
			currentTimestamp: Date.now(),
		};

		// Should not throw
		expect(() => {
			diagnostics.logContext(context, "info");
		}).not.toThrow();
	});

	test("generates session ID on construction", () => {
		const diagnostics = new HyperBunDiagnostics();
		const sessionId = diagnostics.getSessionId();
		expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	});
});
