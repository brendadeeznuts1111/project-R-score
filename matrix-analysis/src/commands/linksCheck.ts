#!/usr/bin/env bun
/**
 * Link Checker Command
 *
 * CLI command for checking links in documentation
 */

import { join, resolve } from "path";
import { fmt } from "../../.claude/lib/cli.ts";
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import { LinkChecker } from "../../benchmarks-combined/scripts/check-links.ts";

interface LinkCheckOptions {
	verbose?: boolean;
	external?: boolean;
	export?: "json" | "csv";
	directory?: string;
}

export async function linksCheck(options: LinkCheckOptions = {}): Promise<void> {
	const {
		verbose = false,
		external = false,
		export: exportFormat,
		directory = ".",
	} = options;

	console.log(fmt.bold("🔗 Checking documentation links..."));

	if (external) {
		console.log(fmt.warn("Note: External link checking is enabled (slower)"));
	}

	const checker = new LinkChecker(directory, verbose, external);

	try {
		await checker.checkDirectory();
		checker.printResults();

		if (exportFormat) {
			await checker.exportResults(exportFormat);
		}
	} catch (error) {
		throw new Error(
			`Link check failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Quick link check for internal links only
export async function linksQuick(directory: string = "."): Promise<void> {
	console.log(fmt.bold("🔍 Quick link check (internal only)..."));

	const scriptPath = join(
		import.meta.dir,
		"../../benchmarks-combined/scripts/quick-link-check.ts",
	);
	const absDirectory = resolve(directory);

	const proc = Bun.spawn(["bun", scriptPath, absDirectory], {
		cwd: import.meta.dir,
		stdout: "inherit",
		stderr: "inherit",
		env: {
			...Bun.env,
			FORCE_COLOR: process.env.NO_COLOR ? "0" : "1",
		},
	});

	const result = await proc.exited;

	if (result !== 0) {
		throw new Error("Quick link check failed");
	}
}
