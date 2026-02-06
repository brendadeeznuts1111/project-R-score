/**
 * Tier-1380 OMEGA: 90-Column Matrix Tests
 *
 * Comprehensive test suite for matrix validation
 *
 * @module test-matrix-90
 * @tier 1380-OMEGA
 */

import { describe, expect, it } from "bun:test";
import { TEAMS } from "../core/team/TeamManager";
import {
	ALL_COLUMNS_91,
	getColumn,
	getColumnsByTeam,
	getColumnsByZone,
	getZoneForColumnIndex,
} from "./column-standards-all";
import { CLOUDFLARE_COLUMNS, CLOUDFLARE_OWNERSHIP } from "./column-standards-cloudflare";
import { DEFAULT_COLUMN, getDefaultValue } from "./column-standards-default";
import { TENSION_COLUMNS } from "./column-standards-tension";

// ═════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT SETUP
// ═════════════════════════════════════════════════════════════════════════════

const TEST_ENV = {
	NODE_ENV: process.env.NODE_ENV || "test",
	MATRIX_TIER: process.env.MATRIX_TIER || "1380",
	ENABLE_CACHE: process.env.ENABLE_CACHE !== "false",
	VALIDATION_STRICT: process.env.VALIDATION_STRICT === "true",
};

console.log("Test Environment:", TEST_ENV);

// ═════════════════════════════════════════════════════════════════════════════
// COLUMN STANDARDS TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Column Standards (0-96)", () => {
	it("should have all 97 columns defined (0-96)", () => {
		const columns = Object.keys(ALL_COLUMNS_91);
		expect(columns.length).toBe(97);
		expect(ALL_COLUMNS_91[0]).toBeDefined();
		expect(ALL_COLUMNS_91[96]).toBeDefined();
	});

	it("should have DEFAULT column at position 0", () => {
		const def = ALL_COLUMNS_91[0];
		expect(def.name).toBe("default");
		expect(def.owner).toBe("infra");
		expect(def.zone).toBe("default");
	});

	it("should have Cloudflare zone columns (21-30)", () => {
		expect(ALL_COLUMNS_91[21].name).toBe("cf-zone-id");
		expect(ALL_COLUMNS_91[22].name).toBe("cf-cache-hit-ratio");
		expect(ALL_COLUMNS_91[23].name).toBe("cf-waf-blocked-requests");
		expect(ALL_COLUMNS_91[30].name).toBe("cf-profile-link");
	});

	it("should have Tension zone columns (31-45)", () => {
		expect(ALL_COLUMNS_91[31].name).toBe("tension-anomaly-score");
		expect(ALL_COLUMNS_91[34].name).toBe("inertia-halftime");
		expect(ALL_COLUMNS_91[35].name).toBe("overreact-flag-q3");
		expect(ALL_COLUMNS_91[45].name).toBe("tension-profile-link");
	});

	it("should have Validation zone columns (61-70)", () => {
		expect(ALL_COLUMNS_91[61].name).toBe("header-parse-ms");
		expect(ALL_COLUMNS_91[63].name).toBe("baseline-delta-percent");
		expect(ALL_COLUMNS_91[75].name).toBe("chrome-integrity-seal");
	});

	it("should correctly identify zones", () => {
		expect(getZoneForColumnIndex(0)).toBe("default");
		expect(getZoneForColumnIndex(5)).toBe("core");
		expect(getZoneForColumnIndex(25)).toBe("cloudflare");
		expect(getZoneForColumnIndex(35)).toBe("tension");
		expect(getZoneForColumnIndex(70)).toBe("validation");
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// TEAM OWNERSHIP TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Team Ownership", () => {
	it("should have correct Cloudflare ownership split", () => {
		const platformCols = CLOUDFLARE_OWNERSHIP.platform;
		const securityCols = CLOUDFLARE_OWNERSHIP.security;

		expect(platformCols.length).toBe(7);
		expect(securityCols.length).toBe(3);

		// Platform owns: 21, 22, 24, 25, 26, 27, 30
		expect(platformCols).toContain(21);
		expect(platformCols).toContain(30);

		// Security owns: 23, 28, 29
		expect(securityCols).toContain(23); // WAF
		expect(securityCols).toContain(28); // Bot score
		expect(securityCols).toContain(29); // Security level
	});

	it("should have all 6 teams defined", () => {
		const teams = Object.keys(TEAMS);
		expect(teams).toContain("runtime");
		expect(teams).toContain("security");
		expect(teams).toContain("platform");
		expect(teams).toContain("tension");
		expect(teams).toContain("infra");
		expect(teams).toContain("validation");
	});

	it("should return columns by team", () => {
		const tensionCols = getColumnsByTeam("tension");
		expect(tensionCols.length).toBe(15);

		const validationCols = getColumnsByTeam("validation");
		expect(validationCols.length).toBe(10);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUE TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("DEFAULT Column", () => {
	it("should return correct default values by zone", () => {
		expect(getDefaultValue("tension", "number")).toBe(0.0);
		expect(getDefaultValue("security", "number")).toBe(30);
		expect(getDefaultValue("integrity", "string")).toBe("STABLE");
	});

	it("should have DEFAULT column with examples", () => {
		const def = DEFAULT_COLUMN[0];
		expect(def.examples.tension.value).toBe(0.0);
		expect(def.examples.validation.value).toBe("0%");
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// COLUMN VALIDATION TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Column Validation", () => {
	it("should validate tension column ranges", () => {
		const col31 = TENSION_COLUMNS[31];
		expect(col31.range).toEqual([0, 1]);
		expect(col31.type).toBe("float");
		expect(col31.alert).toBe(">= 0.85");
	});

	it("should validate Cloudflare column thresholds", () => {
		const col23 = CLOUDFLARE_COLUMNS[23];
		expect(col23.warning).toBe("> 500");
		expect(col23.alert).toBe("> 1000");
		expect(col23.profileLink).toBe(true);
	});

	it("should validate Cloudflare profile links", () => {
		const profileCols = Object.entries(CLOUDFLARE_COLUMNS)
			.filter(([_, col]) => col.profileLink)
			.map(([idx, _]) => Number(idx));

		expect(profileCols).toContain(23); // WAF
		expect(profileCols).toContain(26); // Edge latency
		expect(profileCols).toContain(28); // Bot score
		expect(profileCols).toContain(30); // Profile link
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Environment Variables", () => {
	it("should detect test environment", () => {
		// NODE_ENV is set by run.env in bunfig.toml or preload; verify it exists
		expect(process.env.NODE_ENV).toBeDefined();
		expect(TEST_ENV.MATRIX_TIER).toBe("1380");
	});

	it("should respect ENABLE_CACHE flag", () => {
		const cacheEnabled = TEST_ENV.ENABLE_CACHE;
		expect(typeof cacheEnabled).toBe("boolean");
	});

	it("should respect VALIDATION_STRICT flag", () => {
		const strict = TEST_ENV.VALIDATION_STRICT;
		expect(typeof strict).toBe("boolean");
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CLI SUPPORT TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("CLI Support", () => {
	it("should support bun test command", () => {
		const cmd = Bun.argv.join(" ");
		expect(cmd).toContain("bun");
		expect(cmd).toContain("test");
	});

	it("should expose getColumn function", () => {
		expect(typeof getColumn).toBe("function");
		const col = getColumn(31);
		expect(col).toBeDefined();
		expect(col?.name).toBe("tension-anomaly-score");
	});

	it("should expose getColumnsByZone function", () => {
		expect(typeof getColumnsByZone).toBe("function");
		const cols = getColumnsByZone("tension");
		expect(cols.length).toBe(15);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// BUN NATIVE TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Bun Native Support", () => {
	it("should run with Bun runtime", () => {
		expect(typeof Bun).toBe("object");
		expect(typeof Bun.version).toBe("string");
	});

	it("should support Bun.nanoseconds() for timing", () => {
		const start = Bun.nanoseconds();
		// Small delay
		for (let i = 0; i < 1000; i++) {}
		const end = Bun.nanoseconds();
		expect(end).toBeGreaterThan(start);
	});

	it("should support native TypeScript execution", () => {
		// This test file is TypeScript and runs natively
		const arr: number[] = [1, 2, 3];
		expect(arr.map((x) => x * 2)).toEqual([2, 4, 6]);
	});

	it("should support Bun.inspect for debugging", () => {
		const obj = { tier: 1380, matrix: 90 };
		const inspected = Bun.inspect(obj);
		expect(inspected).toContain("1380");
		expect(inspected).toContain("90");
	});
});
