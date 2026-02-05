#!/usr/bin/env bun
/**
 * Dry Run - Codebase Reorganization Preview
 * Shows what files would be moved without actually moving them
 */

import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";

const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function _log(
	category: string,
	message: string,
	color: keyof typeof COLORS = "reset",
) {
	console.log(
		`${COLORS[color]}${category.padEnd(12)}${COLORS.reset} ${message}`,
	);
}

interface MoveOperation {
	from: string;
	to: string;
	reason: string;
}

const operations: MoveOperation[] = [];

// Define reorganization plan
const REORG_PLAN = {
	// Documentation files to move
	docs: {
		development: [
			"CONTRIBUTING_BUN_FFI.md",
			"FFI_QUICK_REFERENCE.md",
			"FFI_V1.3.7_GUIDE.md",
			"IMPLEMENTATION_BUN_FFI.md",
			"NIX_DEVELOPMENT.md",
			"STEP_BY_STEP_IMPLEMENTATION.md",
			"LINT_ERRORS_FIXED.md",
		],
		architecture: [
			"ENTERPRISE_REFACTORING_COMPLETE.md",
			"ENTERPRISE_REFACTORING_SUMMARY.md",
			"ENTERPRISE_RSS_GOVERNANCE_SYSTEM.md",
			"HEADER_CASE_PRESERVATION_CRITICAL.md",
			"RSS_V1.3.7_IMPLEMENTATION.md",
		],
	},

	// Root test files to move
	tests: [
		"test-ffi.ts",
		"test-ffi-simple.ts",
		"test-ffi-working.ts",
		"test-ffi-nix.ts",
		"test-ffi-homebrew.ts",
		"test-ffi-system.ts",
		"test-v137-features.ts",
	],

	// Scripts to categorize
	tools: {
		profiling: [
			"scripts/auto-profiler.js",
			"scripts/compare-profiles.js",
			"scripts/memory-guardian.js",
			"scripts/profiler-dashboard.js",
			"scripts/smart-profiler.js",
			"scripts/rss-performance-profiler.js",
		],
		demos: [
			"scripts/buffer-performance-demo.js",
			"scripts/header-casing-demo.js",
			"scripts/theme-demo.js",
			"scripts/terminal-interface.js",
			"scripts/enhanced-logging.js",
		],
		debugging: [
			"scripts/debug-fetch.ts",
			"scripts/debug-nix-paths.ts",
			"scripts/inspector-debugger.js",
			"scripts/validate-perf.ts",
		],
	},

	// Server files
	server: [
		"src/server.ts",
		"src/server-simple.ts",
		"src/server-v1.3.7.js",
		"src/server-governed.js",
	],

	// RSS files
	rss: [
		"src/rss-fetcher.ts",
		"src/rss-fetcher-optimized.ts",
		"src/batch-fetcher.ts",
		"src/fetcher-v137.ts",
		"src/predictive-dns.ts",
		"src/startup.ts",
		"cli/rss-cli.ts",
	],
};

async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function scanDirectory(dir: string, pattern?: RegExp): Promise<string[]> {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		const files: string[] = [];
		for (const entry of entries) {
			if (entry.isFile()) {
				if (!pattern || pattern.test(entry.name)) {
					files.push(join(dir, entry.name));
				}
			}
		}
		return files;
	} catch {
		return [];
	}
}

async function main() {
	console.log(`\n${"=".repeat(60)}`);
	console.log(
		`${COLORS.bright}  CODEBASE REORGANIZATION - DRY RUN${COLORS.reset}`,
	);
	console.log(`${"=".repeat(60)}\n`);

	// Check documentation moves
	console.log(`${COLORS.cyan}📄 Documentation Files:${COLORS.reset}`);
	for (const [category, files] of Object.entries(REORG_PLAN.docs)) {
		for (const file of files) {
			const exists = await fileExists(file);
			const status = exists ? `${COLORS.green}✓` : `${COLORS.red}✗`;
			console.log(
				`  ${status} ${file} → docs/${category}/${basename(file)}${COLORS.reset}`,
			);
			if (exists) {
				operations.push({
					from: file,
					to: `docs/${category}/${basename(file)}`,
					reason: "documentation",
				});
			}
		}
	}

	// Check CPU profiles
	console.log(`\n${COLORS.cyan}📊 CPU Profiles:${COLORS.reset}`);
	const cpuProfiles = await scanDirectory(".", /^CPU\..*\.md$/);
	for (const file of cpuProfiles) {
		console.log(
			`  ${COLORS.green}✓${COLORS.reset} ${file} → profiles/${basename(file)}`,
		);
		operations.push({
			from: file,
			to: `profiles/${basename(file)}`,
			reason: "profile",
		});
	}

	// Check test file moves
	console.log(`\n${COLORS.cyan}🧪 Test Files:${COLORS.reset}`);
	for (const file of REORG_PLAN.tests) {
		const exists = await fileExists(file);
		const status = exists ? `${COLORS.green}✓` : `${COLORS.yellow}○`;
		console.log(
			`  ${status} ${file} → tests/ffi/${basename(file)}${COLORS.reset}`,
		);
		if (exists) {
			operations.push({
				from: file,
				to: `tests/ffi/${basename(file)}`,
				reason: "test consolidation",
			});
		}
	}

	// Check test/ directory
	const testDirFiles = await scanDirectory("test", /\.ts$/);
	if (testDirFiles.length > 0) {
		console.log(
			`\n  ${COLORS.yellow}test/ directory contents (will merge into tests/):${COLORS.reset}`,
		);
		for (const file of testDirFiles) {
			console.log(
				`    ${COLORS.green}✓${COLORS.reset} ${file} → tests/${basename(file)}`,
			);
			operations.push({
				from: file,
				to: `tests/${basename(file)}`,
				reason: "test consolidation",
			});
		}
	}

	// Check script moves
	console.log(`\n${COLORS.cyan}🔧 Scripts:${COLORS.reset}`);
	for (const [category, files] of Object.entries(REORG_PLAN.tools)) {
		console.log(`\n  ${COLORS.bright}${category}:${COLORS.reset}`);
		for (const file of files) {
			const exists = await fileExists(file);
			const status = exists ? `${COLORS.green}✓` : `${COLORS.yellow}○`;
			console.log(
				`    ${status} ${file} → tools/${category}/${basename(file)}${COLORS.reset}`,
			);
			if (exists) {
				operations.push({
					from: file,
					to: `tools/${category}/${basename(file)}`,
					reason: "script organization",
				});
			}
		}
	}

	// Check server files
	console.log(`\n${COLORS.cyan}🖥️  Server Files:${COLORS.reset}`);
	for (const file of REORG_PLAN.server) {
		const exists = await fileExists(file);
		const status = exists ? `${COLORS.green}✓` : `${COLORS.yellow}○`;
		console.log(
			`  ${status} ${file} → src/server/${basename(file)}${COLORS.reset}`,
		);
		if (exists) {
			operations.push({
				from: file,
				to: `src/server/${basename(file)}`,
				reason: "server organization",
			});
		}
	}

	// Check RSS files
	console.log(`\n${COLORS.cyan}📡 RSS Files:${COLORS.reset}`);
	for (const file of REORG_PLAN.rss) {
		const exists = await fileExists(file);
		const status = exists ? `${COLORS.green}✓` : `${COLORS.yellow}○`;
		const destDir = file.startsWith("cli/") ? "src/cli/" : "src/rss/";
		console.log(
			`  ${status} ${file} → ${destDir}${basename(file)}${COLORS.reset}`,
		);
		if (exists) {
			operations.push({
				from: file,
				to: `${destDir}${basename(file)}`,
				reason: "RSS organization",
			});
		}
	}

	// Check examples
	console.log(`\n${COLORS.cyan}📚 Examples:${COLORS.reset}`);
	const _rootExamples = await scanDirectory("examples", /\.ts$/);
	const srcExamples = await scanDirectory("src/examples", /\.ts$/);

	if (srcExamples.length > 0) {
		console.log(
			`  ${COLORS.yellow}src/examples/ contents (will merge into examples/):${COLORS.reset}`,
		);
		for (const file of srcExamples) {
			console.log(
				`    ${COLORS.green}✓${COLORS.reset} ${file} → examples/${basename(file)}`,
			);
			operations.push({
				from: file,
				to: `examples/${basename(file)}`,
				reason: "example consolidation",
			});
		}
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log(`${COLORS.bright}  SUMMARY${COLORS.reset}`);
	console.log("=".repeat(60));

	const existingOps = operations.filter((op) => op.from);
	console.log(`\nTotal operations: ${existingOps.length}`);
	console.log(
		`  - Documentation: ${existingOps.filter((o) => o.reason === "documentation").length}`,
	);
	console.log(
		`  - Tests: ${existingOps.filter((o) => o.reason === "test consolidation").length}`,
	);
	console.log(
		`  - Scripts: ${existingOps.filter((o) => o.reason === "script organization").length}`,
	);
	console.log(
		`  - Server: ${existingOps.filter((o) => o.reason === "server organization").length}`,
	);
	console.log(
		`  - RSS: ${existingOps.filter((o) => o.reason === "RSS organization").length}`,
	);
	console.log(
		`  - Examples: ${existingOps.filter((o) => o.reason === "example consolidation").length}`,
	);

	console.log(
		`\n${COLORS.yellow}⚠️  This was a dry run. No files were moved.${COLORS.reset}`,
	);
	console.log(`${COLORS.cyan}   Run the following to execute:${COLORS.reset}`);
	console.log("   ./reorganize-codebase.sh\n");
}

main().catch(console.error);
