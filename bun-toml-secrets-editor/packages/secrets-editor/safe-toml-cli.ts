#!/usr/bin/env bun
// CLI tool for safe TOML parsing with stack overflow protection
// Usage: bun run src/cli/safe-toml-cli.ts <file.toml> [options]

import {
	clearTomlParseCache,
	getTomlParseCacheStats,
	safeParseTomlFile,
} from "../utils/toml-parser-safe";

interface CLIOptions {
	verbose?: boolean;
	maxDepth?: number;
	maxFileSize?: number;
	noCache?: boolean;
	stats?: boolean;
	clearCache?: boolean;
}

function parseArgs(args: string[]): { filePath?: string; options: CLIOptions } {
	const options: CLIOptions = {};
	let filePath: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "--verbose":
				options.verbose = true;
				break;
			case "--max-depth":
				options.maxDepth = parseInt(args[++i]);
				break;
			case "--max-size":
				options.maxFileSize = parseInt(args[++i]);
				break;
			case "--no-cache":
				options.noCache = true;
				break;
			case "--stats":
				options.stats = true;
				break;
			case "--clear-cache":
				options.clearCache = true;
				break;
			case "--help":
			case "-h":
				showHelp();
				process.exit(0);
			default:
				if (!arg.startsWith("-") && !filePath) {
					filePath = arg;
				}
		}
	}

	return { filePath, options };
}

function showHelp(): void {
	console.log(`
Safe TOML Parser CLI - Stack Overflow Protection

USAGE:
  bun run src/cli/safe-toml-cli.ts <file.toml> [options]

OPTIONS:
  --verbose              Show detailed error messages and parsing info
  --max-depth <number>   Maximum nesting depth (default: 1000)
  --max-size <bytes>     Maximum file size (default: 10MB)
  --no-cache             Disable caching
  --stats                Show cache statistics
  --clear-cache          Clear parse cache
  --help, -h             Show this help message

EXAMPLES:
  # Parse a TOML file with default settings
  bun run src/cli/safe-toml-cli.ts config/app.toml

  # Parse with custom depth limit
  bun run src/cli/safe-toml-cli.ts config/app.toml --max-depth 500

  # Parse with verbose output
  bun run src/cli/safe-toml-cli.ts config/app.toml --verbose

  # Show cache statistics
  bun run src/cli/safe-toml-cli.ts --stats

  # Clear cache
  bun run src/cli/safe-toml-cli.ts --clear-cache

EXIT CODES:
  0  Success
  1  Parse error or file not found
  2  Invalid arguments
`);
}

function formatBytes(bytes: number): string {
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatTime(ms: number): string {
	return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const { filePath, options } = parseArgs(args);

	// Handle cache operations
	if (options.clearCache) {
		clearTomlParseCache();
		console.log("✅ Cache cleared");
	}

	if (options.stats) {
		const stats = getTomlParseCacheStats();
		console.log(`📊 Cache Statistics:`);
		console.log(`   Size: ${stats.size}/${stats.maxSize} entries`);
		if (stats.entries.length > 0) {
			console.log(`   Entries:`);
			stats.entries.forEach((entry) => {
				const age =
					entry.age < 60000
						? `${Math.round(entry.age / 1000)}s`
						: `${Math.round(entry.age / 60000)}m`;
				console.log(
					`     - Key: ${entry.key.substring(0, 12)}... | Age: ${age} | Depth: ${entry.depth}`,
				);
			});
		}
	}

	// If no file provided, exit early (unless just showing stats/clearing cache)
	if (!filePath) {
		if (!options.stats && !options.clearCache) {
			console.error("❌ No file provided. Use --help for usage information.");
			process.exit(2);
		}
		return;
	}

	// Parse the file
	const parseOptions = {
		verboseErrors: options.verbose ?? true,
		maxDepth: options.maxDepth,
		maxFileSize: options.maxFileSize,
		enableCache: !options.noCache,
	};

	if (options.verbose) {
		console.log(`🔍 Parsing: ${filePath}`);
		console.log(`   Options:`, parseOptions);
	}

	const result = await safeParseTomlFile(filePath, parseOptions);

	if (result.success) {
		console.log("✅ TOML parsed successfully!");

		if (options.verbose && result.metadata) {
			console.log(`📈 Metadata:`);
			console.log(`   Size: ${formatBytes(result.metadata.size)}`);
			console.log(`   Parse time: ${formatTime(result.metadata.parseTime)}`);
			console.log(`   Object depth: ${result.metadata.depth}`);
			console.log(`   From cache: ${result.metadata.fromCache ? "Yes" : "No"}`);
		}

		if (options.verbose) {
			console.log(`📄 Content preview:`);
			console.log(JSON.stringify(result.data, null, 2));
		} else {
			console.log(
				`   Parsed ${Object.keys(result.data).length} top-level sections`,
			);
		}

		process.exit(0);
	} else {
		console.error("❌ TOML parse failed:");
		console.error(`   ${result.error}`);

		if (options.verbose) {
			console.error(`\n💡 Troubleshooting tips:`);
			if (result.error?.includes("syntax error")) {
				console.error(`   - Check for missing quotes around string values`);
				console.error(
					`   - Verify table brackets [section] are properly closed`,
				);
				console.error(`   - Ensure equal signs (=) have values on the right`);
			} else if (result.error?.includes("too large")) {
				console.error(`   - Consider increasing --max-size limit`);
				console.error(`   - Split large files into smaller sections`);
			} else if (result.error?.includes("depth")) {
				console.error(`   - Consider increasing --max-depth limit`);
				console.error(`   - Flatten deeply nested structures`);
			} else if (result.error?.includes("not found")) {
				console.error(`   - Verify the file path is correct`);
				console.error(`   - Check file permissions`);
			}
		}

		process.exit(1);
	}
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	console.error("💥 Unexpected error:", error.message);
	if (process.env.DEBUG) {
		console.error(error.stack);
	}
	process.exit(2);
});

process.on("unhandledRejection", (reason) => {
	console.error("💥 Unhandled promise rejection:", reason);
	process.exit(2);
});

// Run the CLI
main().catch((error) => {
	console.error("💥 CLI failed:", error.message);
	process.exit(2);
});
