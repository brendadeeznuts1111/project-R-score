#!/usr/bin/env bun
/**
 * Consolidated Cross-Platform Build Script
 * Replaces the 18+ individual build scripts with a single configurable builder
 */

interface BuildConfig {
	platforms: string[];
	archs: string[];
	tiers: string[];
	outputDir: string;
	features: string[];
}

interface BuildOptions {
	platform?: string;
	arch?: string;
	tier?: string;
	features?: string[];
	output?: string;
	verbose?: boolean;
	dryRun?: boolean;
}

const DEFAULT_CONFIG: BuildConfig = {
	platforms: ["linux", "darwin", "win32"],
	archs: ["x64", "arm64"],
	tiers: ["community", "premium"],
	outputDir: "./dist",
	features: ["INTERACTIVE"],
};

function parseArgs(): BuildOptions {
	const args = process.argv.slice(2);
	const options: BuildOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "--platform":
			case "-p":
				options.platform = args[++i];
				break;

			case "--arch":
			case "-a":
				options.arch = args[++i];
				break;

			case "--tier":
			case "-t":
				options.tier = args[++i];
				break;

			case "--features":
			case "-f":
				options.features = args[++i].split(",");
				break;

			case "--output":
			case "-o":
				options.output = args[++i];
				break;

			case "--verbose":
			case "-v":
				options.verbose = true;
				break;

			case "--dry-run":
			case "-n":
				options.dryRun = true;
				break;

			case "--help":
			case "-h":
				showHelp();
				process.exit(0);
				break;

			default:
				if (arg.startsWith("--")) {
					console.error(`Unknown option: ${arg}`);
					process.exit(1);
				}
		}
	}

	return options;
}

function showHelp(): void {
	console.log(`
🔨 Consolidated Cross-Platform Build Script

USAGE:
  bun scripts/build-cross-platform.ts [OPTIONS]

OPTIONS:
  -p, --platform <platform>    Build specific platform (linux, darwin, win32)
  -a, --arch <arch>           Build specific architecture (x64, arm64)
  -t, --tier <tier>           Build specific tier (community, premium)
  -f, --features <features>   Comma-separated features (INTERACTIVE,PREMIUM)
  -o, --output <dir>          Output directory (default: ./dist)
  -v, --verbose               Enable verbose output
  -n, --dry-run               Show commands without executing
  -h, --help                  Show this help message

EXAMPLES:
  # Build all platforms/archs/tiers
  bun scripts/build-cross-platform.ts

  # Build only for macOS ARM64 premium
  bun scripts/build-cross-platform.ts --platform darwin --arch arm64 --tier premium

  # Build with custom features
  bun scripts/build-cross-platform.ts --features INTERACTIVE,PREMIUM --tier premium

  # Dry run to see what would be built
  bun scripts/build-cross-platform.ts --dry-run --verbose

LEGACY EQUIVALENTS:
  bun run build:community:linux:x64    → bun scripts/build-cross-platform.ts -p linux -a x64 -t community
  bun run build:premium:darwin:arm64   → bun scripts/build-cross-platform.ts -p darwin -a arm64 -t premium
  bun run build:all                    → bun scripts/build-cross-platform.ts
`);
}

class CrossPlatformBuilder {
	private config: BuildConfig;
	private options: BuildOptions;

	constructor(
		config: BuildConfig = DEFAULT_CONFIG,
		options: BuildOptions = {},
	) {
		this.config = config;
		this.options = options;
	}

	async build(): Promise<void> {
		const buildMatrix = this.generateBuildMatrix();

		console.log(`🏗️  Building ${buildMatrix.length} target(s)...`);

		if (this.options.verbose) {
			console.log("\n📋 Build Matrix:");
			buildMatrix.forEach((target, index) => {
				console.log(
					`  ${index + 1}. ${target.platform}-${target.arch}-${target.tier}`,
				);
			});
			console.log("");
		}

		for (const target of buildMatrix) {
			await this.buildTarget(target);
		}

		console.log("✅ Build completed successfully!");
	}

	private generateBuildMatrix(): Array<{
		platform: string;
		arch: string;
		tier: string;
	}> {
		const platforms = this.options.platform
			? [this.options.platform]
			: this.config.platforms;
		const archs = this.options.arch ? [this.options.arch] : this.config.archs;
		const tiers = this.options.tier ? [this.options.tier] : this.config.tiers;

		const matrix: Array<{ platform: string; arch: string; tier: string }> = [];

		for (const platform of platforms) {
			for (const arch of archs) {
				for (const tier of tiers) {
					// Skip invalid combinations
					if (platform === "win32" && arch === "arm64") {
						if (this.options.verbose) {
							console.log(`⚠️  Skipping win32-arm64 (not supported)`);
						}
						continue;
					}
					matrix.push({ platform, arch, tier });
				}
			}
		}

		return matrix;
	}

	private async buildTarget(target: {
		platform: string;
		arch: string;
		tier: string;
	}): Promise<void> {
		const features = this.getFeaturesForTier(target.tier);
		const outputFile = this.getOutputFileName(target);
		const outputDir = this.options.output || this.config.outputDir;

		const command = [
			"bun",
			"build",
			"./src/main.ts",
			"--compile",
			`--outfile=${outputDir}/${outputFile}`,
			"--define",
			`process.env.NODE_ENV="'production'"`,
			...features.map((f) => `--feature=${f}`),
		];

		if (this.options.verbose) {
			console.log(
				`🔨 Building ${target.platform}-${target.arch}-${target.tier}...`,
			);
			console.log(`   Command: ${command.join(" ")}`);
		}

		if (this.options.dryRun) {
			console.log(`[DRY-RUN] Would execute: ${command.join(" ")}`);
			return;
		}

		try {
			const startTime = Date.now();
			const subprocess = Bun.spawn(command, {
				stdout: "inherit",
				stderr: "inherit",
			});

			const exitCode = await subprocess.exited;
			const duration = Date.now() - startTime;

			if (exitCode === 0) {
				console.log(
					`✅ ${target.platform}-${target.arch}-${target.tier} (${duration}ms)`,
				);
			} else {
				console.error(
					`❌ ${target.platform}-${target.arch}-${target.tier} failed (exit code: ${exitCode})`,
				);
				process.exit(exitCode);
			}
		} catch (error) {
			console.error(
				`❌ Failed to build ${target.platform}-${target.arch}-${target.tier}:`,
				error,
			);
			process.exit(1);
		}
	}

	private getFeaturesForTier(tier: string): string[] {
		switch (tier) {
			case "premium":
				return [...this.config.features, "PREMIUM"];
			case "community":
				return this.config.features;
			default:
				return [];
		}
	}

	private getOutputFileName(target: {
		platform: string;
		arch: string;
		tier: string;
	}): string {
		const platformName =
			target.platform === "win32" ? "windows" : target.platform;
		const archName = target.arch === "x64" ? "x64" : "arm64";
		const tierName = target.tier === "premium" ? "premium" : "community";

		return `secrets-guard-${platformName}-${archName}-${tierName}`;
	}
}

// Main execution
async function main(): Promise<void> {
	const options = parseArgs();
	const builder = new CrossPlatformBuilder(DEFAULT_CONFIG, options);

	await builder.build();
}

// Run if this file is executed directly
if (typeof require !== "undefined" && require.main === module) {
	main().catch((error) => {
		console.error("❌ Build failed:", error);
		process.exit(1);
	});
}

export { CrossPlatformBuilder, DEFAULT_CONFIG };
