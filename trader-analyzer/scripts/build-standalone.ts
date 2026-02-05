#!/usr/bin/env bun
/**
 * @fileoverview Standalone Executable Builder
 * @description Build standalone executables with configurable autoload options
 * @module scripts/build-standalone
 * 
 * Usage:
 *   bun run scripts/build-standalone.ts ./src/index.ts
 *   bun run scripts/build-standalone.ts ./src/index.ts --all-configs
 *   bun run scripts/build-standalone.ts ./src/index.ts --tsconfig --dotenv
 */

import { parseArgs } from "util";

interface BuildStandaloneOptions {
	entrypoint: string;
	outdir?: string;
	autoloadTsconfig?: boolean;
	autoloadPackageJson?: boolean;
	autoloadDotenv?: boolean;
	autoloadBunfig?: boolean;
	minify?: boolean;
	target?: "bun" | "node" | "browser";
}

/**
 * Build a standalone executable with configurable autoload options
 */
async function buildStandalone(options: BuildStandaloneOptions) {
	const {
		entrypoint,
		outdir,
		autoloadTsconfig = false,
		autoloadPackageJson = false,
		autoloadDotenv = false,
		autoloadBunfig = false,
		minify = true,
		target = "bun",
	} = options;

	console.log(`🔨 Building standalone executable: ${entrypoint}`);
	console.log(`📦 Output directory: ${outdir || "default"}`);
	console.log(`🎯 Target: ${target}`);
	console.log(`\n📋 Config autoload options:`);
	console.log(`   - tsconfig.json: ${autoloadTsconfig ? "✅" : "❌"}`);
	console.log(`   - package.json: ${autoloadPackageJson ? "✅" : "❌"}`);
	console.log(`   - .env files: ${autoloadDotenv ? "✅" : "❌"}`);
	console.log(`   - bunfig.toml: ${autoloadBunfig ? "✅" : "❌"}`);

	const buildOptions: Parameters<typeof Bun.build>[0] = {
		entrypoints: [entrypoint],
		...(outdir && { outdir }),
		minify,
		target,
		compile: {
			autoloadTsconfig,
			autoloadPackageJson,
			autoloadDotenv,
			autoloadBunfig,
		},
	};

	try {
		const result = await Bun.build(buildOptions);

		if (!result.success) {
			console.error("❌ Build failed:");
			for (const log of result.logs) {
				console.error(`   ${log.message}`);
			}
			process.exit(1);
		}

		console.log("\n✅ Build successful!");
		for (const output of result.outputs) {
			const sizeKB = (output.size / 1024).toFixed(2);
			console.log(`   📄 ${output.path} (${sizeKB} KB)`);
		}

		return result;
	} catch (error) {
		console.error("❌ Build error:", error);
		process.exit(1);
	}
}

/**
 * Parse command line arguments and build
 */
async function main() {
	const args = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			all: {
				type: "boolean",
				short: "a",
				default: false,
			},
			tsconfig: {
				type: "boolean",
				short: "t",
				default: false,
			},
			packageJson: {
				type: "boolean",
				short: "p",
				default: false,
			},
			dotenv: {
				type: "boolean",
				short: "e",
				default: false,
			},
			bunfig: {
				type: "boolean",
				short: "b",
				default: false,
			},
			outdir: {
				type: "string",
				short: "o",
			},
			minify: {
				type: "boolean",
				short: "m",
				default: true,
			},
			target: {
				type: "string",
				short: "T",
				default: "bun",
			},
			help: {
				type: "boolean",
				short: "h",
				default: false,
			},
		},
		allowPositionals: true,
	});

	if (args.values.help || args.positionals.length === 0) {
		console.log(`
Usage: bun run scripts/build-standalone.ts <entrypoint> [options]

Options:
  -a, --all              Enable all config autoload options
  -t, --tsconfig         Enable tsconfig.json autoload
  -p, --packageJson      Enable package.json autoload
  -e, --dotenv           Enable .env files autoload
  -b, --bunfig           Enable bunfig.toml autoload
  -o, --outdir <dir>     Output directory (default: same as entrypoint)
  -m, --minify           Minify output (default: true)
  -T, --target <target>  Target platform: bun, node, browser (default: bun)
  -h, --help             Show this help message

Examples:
  # Build with all configs enabled
  bun run scripts/build-standalone.ts ./src/index.ts --all

  # Build with specific configs
  bun run scripts/build-standalone.ts ./src/index.ts --tsconfig --dotenv

  # Build optimized executable (no config loading)
  bun run scripts/build-standalone.ts ./src/index.ts --minify

  # Build for Node.js target
  bun run scripts/build-standalone.ts ./src/index.ts --target node
`);
		process.exit(0);
	}

	const entrypoint = args.positionals[0];
	const allConfigs = args.values.all;

	await buildStandalone({
		entrypoint,
		outdir: args.values.outdir,
		autoloadTsconfig: allConfigs || args.values.tsconfig || false,
		autoloadPackageJson: allConfigs || args.values.packageJson || false,
		autoloadDotenv: allConfigs || args.values.dotenv || false,
		autoloadBunfig: allConfigs || args.values.bunfig || false,
		minify: args.values.minify ?? true,
		target: (args.values.target as "bun" | "node" | "browser") || "bun",
	});
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
