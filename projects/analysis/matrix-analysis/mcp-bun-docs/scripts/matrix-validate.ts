#!/usr/bin/env bun
/**
 * Tier-1380 Matrix validation CLI
 * Validates Col 93 / GB9c alignment via Bun.stringWidth
 *
 * Usage: bun run matrix:validate --region=us-east --check=gb9c --col=93
 */
import { BUN_DOC_ENTRIES, BUN_DOCS_VERSION } from "../lib.ts";

const COL_93_LIMIT = 93;
const COL_93_TERMS = [
	"Transpiler.replMode",
	"WebSocket.credentials",
	"Bun.wrapAnsi",
] as const;

function getStringWidth(s: string): number {
	if (typeof Bun !== "undefined" && "stringWidth" in Bun) {
		return (Bun as { stringWidth: (s: string) => number }).stringWidth(s);
	}
	return s.length;
}

function validateCol93(limit: number): {
	pass: boolean;
	details: { term: string; width: number; limit: number }[];
} {
	const details = COL_93_TERMS.map((term) => ({
		term,
		width: getStringWidth(term),
		limit,
	}));
	const pass = details.every((d) => d.width <= d.limit);
	return { pass, details };
}

function validateGB9c(): boolean {
	// GB9c = Grapheme cluster support (Bun.stringWidth handles Indic/CJK)
	return typeof Bun !== "undefined" && "stringWidth" in Bun;
}

function main(): void {
	const args = process.argv.slice(2);
	const region = args.find((a) => a.startsWith("--region="))?.split("=")[1] ?? "us-east";
	const check = args.find((a) => a.startsWith("--check="))?.split("=")[1] ?? "all";
	const colArg = args.find((a) => a.startsWith("--col="))?.split("=")[1];
	const colLimit = colArg ? parseInt(colArg, 10) : COL_93_LIMIT;

	console.log("\n  ╭─────────────────────────────────────────────────────────╮");
	console.log("  │  🔷 Tier-1380 Matrix Validation                          │");
	console.log("  ╰─────────────────────────────────────────────────────────╯\n");
	console.log(`  Region: ${region} | Check: ${check} | Col limit: ${colLimit}\n`);

	let failed = false;

	if (check === "gb9c" || check === "all") {
		const gb9c = validateGB9c();
		console.log(
			`  GB9c (Bun.stringWidth): ${gb9c ? "✓ pass" : "✗ fail (Bun.stringWidth not available)"}`,
		);
		if (!gb9c) failed = true;
	}

	if (check === "col" || check === "all" || check === "gb9c") {
		const { pass, details } = validateCol93(colLimit);
		console.log(`  Col ${colLimit} integrity: ${pass ? "✓ pass" : "✗ fail"}`);
		for (const d of details) {
			const ok = d.width <= colLimit;
			console.log(
				`    ${ok ? "✓" : "✗"} "${d.term}" → width ${d.width} (limit ${d.limit})`,
			);
			if (!ok) failed = true;
		}
	}

	// Security: node:inspector gated by --inspect (documentation check)
	if (check === "security" || check === "all") {
		const inspectorEntry = BUN_DOC_ENTRIES.find((e) => e.term === "node:inspector");
		const gated = inspectorEntry?.security?.notes?.includes("--inspect") ?? false;
		console.log(
			`  node:inspector --inspect gate: ${gated ? "✓ documented" : "⚠ not documented"}`,
		);
	}

	console.log(`\n  Matrix version: ${BUN_DOCS_VERSION}\n`);
	process.exit(failed ? 1 : 0);
}

main();
