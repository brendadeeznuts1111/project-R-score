#!/usr/bin/env bun
/**
 * Fix Import Paths After Reorganization
 * Updates import statements in moved files to reflect new locations
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const COLORS = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
};

interface ImportMapping {
	oldPath: string;
	newPath: string;
}

// Define path mappings for moved files
const PATH_MAPPINGS: ImportMapping[] = [
	// Tests moved to tests/ffi/
	{ oldPath: "./test-ffi", newPath: "./tests/ffi/test-ffi" },
	{ oldPath: "../test-ffi", newPath: "../tests/ffi/test-ffi" },

	// Scripts moved to tools/
	{
		oldPath: "./scripts/auto-profiler",
		newPath: "./tools/profiling/auto-profiler",
	},
	{
		oldPath: "./scripts/memory-guardian",
		newPath: "./tools/profiling/memory-guardian",
	},
	{
		oldPath: "./scripts/profiler-dashboard",
		newPath: "./tools/profiling/profiler-dashboard",
	},

	// Server files
	{ oldPath: "./server", newPath: "./server/server" },
	{ oldPath: "./server-simple", newPath: "./server/server-simple" },

	// RSS files
	{ oldPath: "./rss-fetcher", newPath: "./rss/rss-fetcher" },
	{
		oldPath: "./rss-fetcher-optimized",
		newPath: "./rss/rss-fetcher-optimized",
	},
	{ oldPath: "./batch-fetcher", newPath: "./rss/batch-fetcher" },
	{ oldPath: "./fetcher-v137", newPath: "./rss/fetcher-v137" },
	{ oldPath: "./startup", newPath: "./rss/startup" },

	// CLI consolidation
	{ oldPath: "../cli/rss-cli", newPath: "./rss-cli" },
];

// Files that were moved and need their imports fixed
const _MOVED_FILES = [
	"tests/",
	"tools/profiling/",
	"tools/demos/",
	"tools/debugging/",
	"src/server/",
	"src/rss/",
];

async function findTypeScriptFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	async function scan(currentDir: string) {
		try {
			const entries = await readdir(currentDir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = join(currentDir, entry.name);
				if (entry.isDirectory()) {
					// Skip node_modules and dist
					if (entry.name !== "node_modules" && entry.name !== "dist") {
						await scan(fullPath);
					}
				} else if (
					entry.isFile() &&
					(entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
				) {
					files.push(fullPath);
				}
			}
		} catch {
			// Directory doesn't exist or can't be read
		}
	}

	await scan(dir);
	return files;
}

async function fixImportsInFile(
	filePath: string,
	dryRun = true,
): Promise<number> {
	let content = await readFile(filePath, "utf-8");
	const originalContent = content;
	let changes = 0;

	// Find all import statements
	const importRegex = /from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;

	// Also check for dynamic imports
	const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

	// Fix regular imports
	content = content.replace(importRegex, (match, fromPath, importPath) => {
		const path = fromPath || importPath;

		// Check if this import needs updating based on moved files
		let newPath = path;

		// Update relative imports based on new file location
		for (const mapping of PATH_MAPPINGS) {
			if (path === mapping.oldPath || path.startsWith(`${mapping.oldPath}/`)) {
				newPath = path.replace(mapping.oldPath, mapping.newPath);
				changes++;
				break;
			}
		}

		if (fromPath) {
			return match.replace(fromPath, newPath);
		} else {
			return match.replace(importPath, newPath);
		}
	});

	// Fix dynamic imports
	content = content.replace(dynamicImportRegex, (match, path) => {
		let newPath = path;

		for (const mapping of PATH_MAPPINGS) {
			if (path === mapping.oldPath || path.startsWith(`${mapping.oldPath}/`)) {
				newPath = path.replace(mapping.oldPath, mapping.newPath);
				changes++;
				break;
			}
		}

		return match.replace(path, newPath);
	});

	if (content !== originalContent && !dryRun) {
		await writeFile(filePath, content, "utf-8");
	}

	return changes;
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = !args.includes("--apply");
	const targetDir = args.find((arg) => !arg.startsWith("--")) || ".";

	console.info(`\n${"=".repeat(60)}`);
	console.info(`${COLORS.bright}  IMPORT PATH FIXER${COLORS.reset}`);
	console.info(`${"=".repeat(60)}\n`);

	if (dryRun) {
		console.info(
			`${COLORS.yellow}🔍 DRY RUN MODE - No files will be modified${COLORS.reset}`,
		);
		console.info("   Run with --apply to make changes\n");
	} else {
		console.info(
			`${COLORS.green}✏️  APPLY MODE - Files will be modified${COLORS.reset}\n`,
		);
	}

	console.info(`Scanning ${targetDir} for TypeScript/JavaScript files...\n`);

	const files = await findTypeScriptFiles(targetDir);
	console.info(`Found ${files.length} files to process\n`);

	let totalChanges = 0;
	let modifiedFiles = 0;

	for (const file of files) {
		const changes = await fixImportsInFile(file, dryRun);
		if (changes > 0) {
			console.info(
				`${COLORS.cyan}${file}${COLORS.reset}: ${changes} import(s) fixed`,
			);
			totalChanges += changes;
			modifiedFiles++;
		}
	}

	console.info(`\n${"=".repeat(60)}`);
	console.info(`${COLORS.bright}  SUMMARY${COLORS.reset}`);
	console.info("=".repeat(60));
	console.info(`Files scanned: ${files.length}`);
	console.info(`Files modified: ${modifiedFiles}`);
	console.info(`Total imports fixed: ${totalChanges}`);

	if (dryRun && totalChanges > 0) {
		console.info(
			`\n${COLORS.yellow}⚠️  This was a dry run. No files were modified.${COLORS.reset}`,
		);
		console.info(
			`${COLORS.cyan}   Run with --apply to make changes:${COLORS.reset}`,
		);
		console.info(`   bun run scripts/fix-imports.ts --apply\n`);
	}
}

main().catch(console.error);
