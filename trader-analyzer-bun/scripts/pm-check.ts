#!/usr/bin/env bun
/**
 * @fileoverview Package Manager Check Script
 * @description Run outdated, audit, and dependency analysis
 * @module scripts/pm-check
 * 
 * Usage:
 *   bun run scripts/pm-check.ts
 *   bun run scripts/pm-check.ts --package <name>
 *   bun run scripts/pm-check.ts --json
 *   bun run scripts/pm-check.ts --exclude '@types/*'
 *   bun run scripts/pm-check.ts --filter '@graph/*' --exclude '@graph/dev'
 */

import { $ } from "bun";

interface CheckOptions {
	package?: string;
	json?: boolean;
	skipOutdated?: boolean;
	skipAudit?: boolean;
	skipWhy?: boolean;
	filter?: string[];
	exclude?: string[];
}

/**
 * Check outdated packages
 */
async function checkOutdated(json: boolean, filters?: string[], excludes?: string[]): Promise<void> {
	console.log("\n📦 Checking for outdated packages...\n");
	
	try {
		const args: string[] = ["outdated"];
		if (json) {
			args.push("--json");
		}
		if (filters && filters.length > 0) {
			for (const filter of filters) {
				args.push("--filter", filter);
			}
		}
		if (excludes && excludes.length > 0) {
			for (const exclude of excludes) {
				// Add negation prefix if not present
				const pattern = exclude.startsWith("!") ? exclude : `!${exclude}`;
				args.push("--filter", pattern);
			}
		}
		
		const result = await $`bun ${args}`.quiet();
		if (result.stdout) {
			console.log(result.stdout.toString());
		}
		if (result.stderr && !json) {
			console.error(result.stderr.toString());
		}
	} catch (error: any) {
		if (error.stdout) {
			console.log(error.stdout.toString());
		}
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
	}
}

/**
 * Run security audit
 */
async function runAudit(json: boolean): Promise<void> {
	console.log("\n🔒 Running security audit...\n");
	
	try {
		if (json) {
			const result = await $`bun audit --json`.quiet();
			if (result.stdout) {
				console.log(result.stdout.toString());
			}
		} else {
			const result = await $`bun audit`.quiet();
			if (result.stdout) {
				console.log(result.stdout.toString());
			}
			if (result.stderr) {
				console.error(result.stderr.toString());
			}
		}
	} catch (error: any) {
		if (error.stdout) {
			console.log(error.stdout.toString());
		}
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
	}
}

/**
 * Explain why package is installed
 */
async function explainWhy(packageName: string, json: boolean): Promise<void> {
	console.log(`\n🔍 Explaining why ${packageName} is installed...\n`);
	
	try {
		const result = await $`bun why ${packageName}`.quiet();
		if (result.stdout) {
			console.log(result.stdout.toString());
		}
		if (result.stderr) {
			console.error(result.stderr.toString());
		}
	} catch (error: any) {
		if (error.stdout) {
			console.log(error.stdout.toString());
		}
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
		console.error(`❌ Package ${packageName} not found or error occurred`);
	}
}

/**
 * Get package information
 */
async function getPackageInfo(packageName: string, json: boolean): Promise<void> {
	console.log(`\n📋 Package information for ${packageName}...\n`);
	
	try {
		if (json) {
			const result = await $`bun info ${packageName} --json`.quiet();
			if (result.stdout) {
				console.log(result.stdout.toString());
			}
		} else {
			const result = await $`bun info ${packageName}`.quiet();
			if (result.stdout) {
				console.log(result.stdout.toString());
			}
		}
	} catch (error: any) {
		if (error.stdout) {
			console.log(error.stdout.toString());
		}
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
		console.error(`❌ Could not get info for ${packageName}`);
	}
}

/**
 * Main check function
 */
async function runPackageManagerCheck(options: CheckOptions = {}): Promise<void> {
	console.log("🔍 Package Manager Check\n");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	
	// Check outdated packages
	if (!options.skipOutdated) {
		await checkOutdated(options.json || false, options.filter, options.exclude);
	}
	
	// Run security audit
	if (!options.skipAudit) {
		await runAudit(options.json || false);
	}
	
	// Explain why package is installed
	if (options.package && !options.skipWhy) {
		await explainWhy(options.package, options.json || false);
		await getPackageInfo(options.package, options.json || false);
	}
	
	console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	console.log("✅ Package manager check complete!\n");
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: CheckOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--package" || arg === "-p") {
			if (i + 1 < args.length) {
				options.package = args[++i];
			}
		} else if (arg === "--json" || arg === "-j") {
			options.json = true;
		} else if (arg === "--skip-outdated") {
			options.skipOutdated = true;
		} else if (arg === "--skip-audit") {
			options.skipAudit = true;
		} else if (arg === "--skip-why") {
			options.skipWhy = true;
		} else if (arg === "--filter" || arg === "-f") {
			if (i + 1 < args.length) {
				if (!options.filter) {
					options.filter = [];
				}
				options.filter.push(args[++i]);
			}
		} else if (arg === "--exclude" || arg === "-e") {
			if (i + 1 < args.length) {
				if (!options.exclude) {
					options.exclude = [];
				}
				options.exclude.push(args[++i]);
			}
		}
	}

// Run if executed directly
if (import.meta.main) {
	runPackageManagerCheck(options).catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
