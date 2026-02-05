#!/usr/bin/env bun
/**
 * BUN-TEST-001: Validate BUN_TEST_CLI_OPTIONS matrix.
 * Exits 1 on invalid Name/Version/Type/Example.
 * @col_93 balanced_braces
 */

import { BUN_TEST_CLI_OPTIONS, renderCliMatrix } from "../lib.ts";

const REQUIRED_KEYS = [
	"Name",
	"Pattern",
	"Version",
	"Topic",
	"Type",
	"Example",
] as const;
const VALID_TYPES = ["string", "number", "boolean", "string[]"];
const SEMVER = /^\d+\.\d+\.\d+$/;

function validateOptions(): { valid: number; errors: string[] } {
	const errors: string[] = [];
	let valid = 0;

	for (let i = 0; i < BUN_TEST_CLI_OPTIONS.length; i++) {
		const row = BUN_TEST_CLI_OPTIONS[i];
		const prefix = `Row ${i} (${row.Name}):`;

		for (const key of REQUIRED_KEYS) {
			const val = (row as Record<string, unknown>)[key];
			if (val === undefined || val === null) errors.push(`${prefix} missing ${key}`);
			else if (key !== "Pattern" && String(val).trim() === "")
				errors.push(`${prefix} missing ${key}`);
		}

		if (!row.Name.startsWith("--")) errors.push(`${prefix} Name must start with --`);
		if (!SEMVER.test(row.Version))
			errors.push(`${prefix} Version must be semver (e.g. 1.3.7)`);
		if (!VALID_TYPES.includes(row.Type))
			errors.push(`${prefix} Type must be one of ${VALID_TYPES.join(", ")}`);
		if (!row.Example.includes("bun test"))
			errors.push(`${prefix} Example must contain "bun test"`);

		if (errors.filter((e) => e.startsWith(prefix)).length === 0) valid++;
	}

	return { valid, errors };
}

function main(): void {
	const { valid, errors } = validateOptions();

	for (const row of BUN_TEST_CLI_OPTIONS) {
		console.log(`🟢 ${row.Name}: ${row.Topic} [${row.Type}] | ${row.Example}`);
	}

	if (errors.length > 0) {
		console.error("\n❌ Validation errors:\n" + errors.join("\n"));
		process.exit(1);
	}

	console.log(`\n🎉 All ${valid} options valid & search-ready (BUN-TEST-001)`);

	// Render test — ensure markdown generates
	const md = renderCliMatrix();
	if (!md.includes("| Name |") || !md.includes("--test-name-pattern"))
		throw new Error("renderCliMatrix() output invalid");
	console.log("   ✓ renderCliMatrix() OK");
}

main();
