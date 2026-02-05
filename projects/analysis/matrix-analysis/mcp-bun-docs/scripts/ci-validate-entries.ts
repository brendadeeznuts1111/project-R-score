#!/usr/bin/env bun
/**
 * CI validation for Tier-1380 Bun doc entries.
 * Flags deprecated APIs, experimental in prod context, version gates.
 *
 * @col_93 balanced_braces (skills)
 *
 * Run: bun mcp-bun-docs/scripts/ci-validate-entries.ts
 * Exit 1 if deprecated entries exist (CI gate).
 */

import {
	BUN_DOC_ENTRIES,
	BUN_DOCS_MIN_VERSION,
	BUN_DOCS_VERSION,
	filterEntriesByStability,
	filterEntriesByVersion,
} from "../lib.ts";

const RUNTIME = process.env.BUN_VERSION ?? BUN_DOCS_VERSION;
const DEPRECATED = BUN_DOC_ENTRIES.filter((e) => e.stability === "deprecated");
const EXPERIMENTAL = BUN_DOC_ENTRIES.filter((e) => e.stability === "experimental");
const STABLE = filterEntriesByStability(BUN_DOC_ENTRIES, ["stable"]);
const VERSION_SAFE = filterEntriesByVersion(BUN_DOC_ENTRIES, RUNTIME);
const PROD_SAFE = filterEntriesByStability(VERSION_SAFE, ["stable"]);

const statusSymbol = (s: string) =>
	s === "pass" ? "✓ pass" : s === "fail" ? "✗ fail" : s === "warn" ? "⚠ warn" : "ℹ info";

const rows = [
	{
		Check: "Total entries",
		Value: String(BUN_DOC_ENTRIES.length),
		Status: statusSymbol("info"),
	},
	{
		Check: "Min version (gate)",
		Value: BUN_DOCS_MIN_VERSION,
		Status: statusSymbol("info"),
	},
	{ Check: "Runtime version", Value: RUNTIME, Status: statusSymbol("info") },
	{
		Check: "Deprecated",
		Value: String(DEPRECATED.length),
		Status: statusSymbol(DEPRECATED.length > 0 ? "fail" : "pass"),
	},
	{
		Check: "Experimental",
		Value: String(EXPERIMENTAL.length),
		Status: statusSymbol("warn"),
	},
	{
		Check: "Prod-safe (stable + version)",
		Value: String(PROD_SAFE.length),
		Status: statusSymbol("pass"),
	},
];

console.log("\n  ╭─────────────────────────────────────────────────────────╮");
console.log("  │  🔷 Tier-1380 CI Validation                              │");
console.log("  ╰─────────────────────────────────────────────────────────╯\n");

if (typeof Bun !== "undefined" && Bun.inspect?.table) {
	console.log(Bun.inspect.table(rows, ["Check", "Value", "Status"], { colors: true }));
} else {
	rows.forEach((r) => console.log(`  ${r.Check}: ${r.Value}  ${r.Status}`));
}

if (DEPRECATED.length > 0) {
	console.log("\n  ❌ Deprecated entries (CI fail):\n");
	const depRows = DEPRECATED.map((e) => ({
		Term: e.term,
		Path: e.path,
		"Min ver": e.bunMinVersion,
	}));
	if (typeof Bun !== "undefined" && Bun.inspect?.table) {
		console.log(
			Bun.inspect.table(depRows, ["Term", "Path", "Min ver"], { colors: true }),
		);
	} else {
		DEPRECATED.forEach((e) => console.log(`     - ${e.term} (${e.path})`));
	}
	process.exit(1);
}

if (EXPERIMENTAL.length > 0) {
	console.log("\n  ⚠  Experimental (excluded from prod-safe):\n");
	const expRows = EXPERIMENTAL.map((e) => ({
		Term: e.term,
		Path: e.path,
		Platforms: e.platforms.join(", "),
	}));
	if (typeof Bun !== "undefined" && Bun.inspect?.table) {
		console.log(
			Bun.inspect.table(expRows, ["Term", "Path", "Platforms"], { colors: true }),
		);
	} else {
		EXPERIMENTAL.forEach((e) => console.log(`     - ${e.term} (${e.path})`));
	}
}

console.log("\n  ✅ CI validation passed (no deprecated)\n");
