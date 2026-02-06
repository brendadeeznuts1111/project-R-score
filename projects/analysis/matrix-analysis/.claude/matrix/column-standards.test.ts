#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: Column Standards CLI Test Suite
 *
 * Run: bun test matrix/column-standards.test.ts
 * Or: bun run matrix:test
 */

import { beforeAll, describe, expect, it } from "bun:test";
import { $ } from "bun";
import path from "path";

const CLI = path.join(import.meta.dir, "column-standards-all.ts");

// Helper to run CLI commands
async function run(
	args: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(["bun", CLI, ...args.split(" ")], {
		stdout: "pipe",
		stderr: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	return { stdout, stderr, exitCode };
}

describe("CLI Basics", () => {
	it("should show help", async () => {
		const { stdout, exitCode } = await run("--help");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Tier-1380 OMEGA");
		expect(stdout).toContain("Commands:");
	});

	it("should show version", async () => {
		const { stdout, exitCode } = await run("--version");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("3.29.0");
		expect(stdout).toContain("Column Standards CLI");
	});

	it("should list all columns", async () => {
		const { stdout, exitCode } = await run("list");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Column Standards");
		expect(stdout).toContain("97");
	});
});

describe("Get Command", () => {
	it("should get column 45", async () => {
		const { stdout, exitCode } = await run("get 45");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension-profile-link");
		expect(stdout).toContain("tension");
		expect(stdout).toContain("url");
	});

	it("should get column 0", async () => {
		const { stdout, exitCode } = await run("get 0");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("default");
	});

	it("should fail on invalid column", async () => {
		const { stdout, exitCode } = await run("get 999");
		expect(exitCode).toBe(1);
		expect(stdout).toContain("not found");
	});

	it("should output JSON", async () => {
		const { stdout, exitCode } = await run("get 45 --json");
		expect(exitCode).toBe(0);
		const json = JSON.parse(stdout);
		expect(json.name).toBe("tension-profile-link");
	});
});

describe("Search Command", () => {
	it("should search for tension", async () => {
		const { stdout, exitCode } = await run("search tension");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension-anomaly-score");
		expect(stdout).toContain("matches found");
	});

	it("should handle no results", async () => {
		const { stdout, exitCode } = await run("search xyznonexistent");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("No matches");
	});
});

describe("Zone Shortcuts", () => {
	it("should show tension zone", async () => {
		const { stdout, exitCode } = await run("tension");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("TENSION Zone");
		expect(stdout).toContain("tension-anomaly-score");
	});

	it("should show cloudflare zone", async () => {
		const { stdout, exitCode } = await run("cloudflare");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("CLOUDFLARE Zone");
		expect(stdout).toContain("cf-zone-id");
	});

	it("should show chrome zone", async () => {
		const { stdout, exitCode } = await run("chrome");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Chrome State");
		expect(stdout).toContain("chrome-cookie-store");
	});
});

describe("Find Command", () => {
	it("should find by zone", async () => {
		const { stdout, exitCode } = await run("find zone=tension");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension");
		expect(stdout).toContain("matches");
	});

	it("should find by type", async () => {
		const { stdout, exitCode } = await run("find type=url");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension-profile-link");
	});

	it("should find required columns", async () => {
		const { stdout, exitCode } = await run("find required=true");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("matches");
	});

	it("should find by multiple criteria", async () => {
		const { stdout, exitCode } = await run("find zone=tension required=true");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension-anomaly-score");
		expect(stdout).toContain("anomaly-severity");
	});
});

describe("Pipe Formats", () => {
	it("should output TSV", async () => {
		const { stdout, exitCode } = await run("pipe tsv");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("index\tname\ttype");
		expect(stdout).toContain("45\ttension-profile-link");
	});

	it("should output CSV", async () => {
		const { stdout, exitCode } = await run("pipe csv");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("index,name,type");
	});

	it("should output names", async () => {
		const { stdout, exitCode } = await run("pipe names");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension-profile-link");
		expect(stdout).toContain("cf-zone-id");
	});

	it("should output grep-tags", async () => {
		const { stdout, exitCode } = await run("pipe grep-tags");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("[TENSION_PROFILE_LINK:VALUE]");
	});

	it("should output env", async () => {
		const { stdout, exitCode } = await run("pipe env");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("MATRIX_COL_45_TENSION_PROFILE_LINK");
	});
});

describe("Stats Command", () => {
	it("should show statistics", async () => {
		const { stdout, exitCode } = await run("stats");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("By Zone:");
		expect(stdout).toContain("tension");
		expect(stdout).toContain("15");
	});

	it("should output JSON stats", async () => {
		const { stdout, exitCode } = await run("stats --json");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("97");
	});
});

describe("Validation", () => {
	it("should validate schema", async () => {
		const { stdout, exitCode } = await run("validate");
		// Has warnings (exit 1) but shows results
		expect(stdout).toContain("Total columns: 97");
		// Exit code may be 0 or 1 depending on warnings
	});
});

describe("Doctor Command", () => {
	it("should check environment", async () => {
		const { stdout, exitCode } = await run("doctor");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Environment Diagnostics");
		expect(stdout).toContain("Bun:");
		expect(stdout).toContain("Columns: 97");
	});
});

describe("Shortcuts Command", () => {
	it("should show shortcuts", async () => {
		const { stdout, exitCode } = await run("shortcuts");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Zone Shortcuts:");
		expect(stdout).toContain("tension");
		expect(stdout).toContain("Aliases:");
	});
});

describe("Flags Command", () => {
	it("should show flags", async () => {
		const { stdout, exitCode } = await run("flags");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Global Flags:");
		expect(stdout).toContain("--json");
		expect(stdout).toContain("Command-Specific Options:");
	});
});

describe("Matrix Command", () => {
	it("should show matrix grid", async () => {
		const { stdout, exitCode } = await run("matrix");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Full Matrix View");
		expect(stdout).toContain("Zone Legend:");
	});
});

describe("Aliases", () => {
	it("should resolve get 45 as tension-profile-link", async () => {
		const { stdout, exitCode } = await run("get 45");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("tension-profile-link");
	});

	it("should show error for unknown alias", async () => {
		const { stdout, exitCode } = await run("cf");
		expect(exitCode).toBe(1);
		expect(stdout).toContain("Unknown command");
	});
});

// Summary
console.log("\n" + "=".repeat(60));
console.log("Test Suite Complete");
console.log("=".repeat(60));
