#!/usr/bin/env bun
// Build & Deployment Optimization Script
// Automated build pipeline with performance optimizations

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface BuildConfig {
	target: "bun" | "node" | "browser";
	optimization: "development" | "production" | "premium";
	platform: "darwin" | "linux" | "win32" | "all";
	arch: "x64" | "arm64" | "all";
	features: string[];
}

interface BuildMetrics {
	buildTime: number;
	bundleSize: number;
	compressionRatio: number;
	optimizationLevel: string;
	targetPlatform: string;
}

class OptimizedBuildPipeline {
	private config: BuildConfig;
	private metrics: BuildMetrics[] = [];
	private startTime: number;

	constructor(config: Partial<BuildConfig> = {}) {
		this.config = {
			target: "bun",
			optimization: "production",
			platform: "darwin",
			arch: "arm64",
			features: ["arm64-optimizations", "simd", "websockets", "telemetry"],
			...config,
		};

		this.startTime = Date.now();
		console.log("🚀 Optimized Build Pipeline");
		console.log("==========================");
		console.log(`🎯 Target: ${this.config.target}`);
		console.log(`⚡ Optimization: ${this.config.optimization}`);
		console.log(`🖥️  Platform: ${this.config.platform}`);
		console.log(`🔧 Architecture: ${this.config.arch}`);
		console.log(`🌟 Features: ${this.config.features.join(", ")}`);
		console.log("");
	}

	async build(): Promise<void> {
		try {
			console.log("🔨 Starting optimized build process...");

			// 1. Pre-build optimizations
			await this.preBuildOptimizations();

			// 2. TypeScript compilation with optimizations
			await this.compileTypeScript();

			// 3. Bundle optimization
			await this.optimizeBundles();

			// 4. Platform-specific builds
			await this.buildForPlatforms();

			// 5. Performance optimizations
			await this.applyPerformanceOptimizations();

			// 6. Generate build report
			this.generateBuildReport();

			console.log("✅ Build completed successfully!");
		} catch (error) {
			console.error(`❌ Build failed: ${error}`);
			process.exit(1);
		}
	}

	private async preBuildOptimizations(): Promise<void> {
		console.log("🔧 Running pre-build optimizations...");

		// Clean previous builds
		if (existsSync("./dist")) {
			execSync("rm -rf ./dist", { stdio: "inherit" });
		}

		// Create optimized tsconfig for production
		const tsConfig = {
			compilerOptions: {
				target: "ES2020",
				module: "ESNext",
				moduleResolution: "node",
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				declaration: true,
				declarationMap: true,
				sourceMap: this.config.optimization === "development",
				removeComments: this.config.optimization === "production",
				noEmitOnError: true,
				incremental: false,
				tsBuildInfoFile: "./.tsbuildinfo",
			},
			include: ["src/**/*", "tools/macos-widget/**/*"],
			exclude: ["node_modules", "**/*.test.ts", "**/*.spec.ts"],
		};

		writeFileSync("./tsconfig.build.json", JSON.stringify(tsConfig, null, 2));
		console.log("   ✅ TypeScript configuration optimized");

		// Run type checking
		execSync("bun run typecheck", { stdio: "inherit" });
		console.log("   ✅ Type checking completed");
	}

	private async compileTypeScript(): Promise<void> {
		console.log("📝 Compiling TypeScript with optimizations...");

		const start = performance.now();

		// Compile with optimizations based on target
		const compileCmd =
			this.config.target === "bun"
				? "bun build --target=bun --minify --sourcemap=external"
				: "bun build --target=node --minify";

		const files = [
			"tools/macos-widget/arm64-optimized-widget.ts",
			"tools/macos-widget/performance-dashboard.ts",
			"tools/macos-widget/advanced-benchmark-suite.ts",
			"tools/macos-widget/websocket-optimized-widget.ts",
			"tools/macos-widget/simd-optimized-processor.ts",
		].join(" ");

		execSync(`${compileCmd} ${files} --outdir=./dist`, { stdio: "inherit" });

		const duration = performance.now() - start;

		this.metrics.push({
			buildTime: duration,
			bundleSize: this.calculateBundleSize("./dist"),
			compressionRatio: 0,
			optimizationLevel: this.config.optimization,
			targetPlatform: `${this.config.platform}-${this.config.arch}`,
		});

		console.log(`   ✅ TypeScript compiled in ${duration.toFixed(2)}ms`);
	}

	private async optimizeBundles(): Promise<void> {
		console.log("🗜️  Optimizing bundles...");

		// Apply tree-shaking and dead code elimination
		const optimizationConfig = {
			minify: true,
			treeShaking: true,
			splitting: true,
			external: ["node:*", "worker_threads"],
			define: {
				"process.env.NODE_ENV": JSON.stringify(this.config.optimization),
				"globalThis.ARM64_OPTIMIZED": JSON.stringify(
					this.config.arch === "arm64",
				),
				"globalThis.SIMD_ENABLED": JSON.stringify(
					this.config.features.includes("simd"),
				),
			},
		};

		writeFileSync(
			"./dist/optimization.json",
			JSON.stringify(optimizationConfig, null, 2),
		);

		// Create optimized entry points
		const entryPoints = {
			widget: "./dist/arm64-optimized-widget.js",
			dashboard: "./dist/performance-dashboard.js",
			benchmark: "./dist/advanced-benchmark-suite.js",
			websocket: "./dist/websocket-optimized-widget.js",
			simd: "./dist/simd-optimized-processor.js",
		};

		for (const [name, entry] of Object.entries(entryPoints)) {
			if (existsSync(entry)) {
				const optimized = await this.optimizeFile(entry);
				writeFileSync(entry.replace(".js", ".optimized.js"), optimized);
				console.log(`   ✅ Optimized ${name}`);
			}
		}
	}

	private async optimizeFile(filePath: string): Promise<string> {
		const content = readFileSync(filePath, "utf-8");

		// Apply ARM64-specific optimizations
		let optimized = content;

		if (this.config.arch === "arm64") {
			// Replace generic operations with ARM64-optimized versions
			optimized = optimized.replace(
				/new Array\((\d+)\)/g,
				"new Float64Array($1)", // Use TypedArrays for better performance
			);

			optimized = optimized.replace(
				/for\s*\(\s*let\s+(\w+)\s*=\s*0\s*;\s*\1\s*<\s*(\w+)\.length\s*;\s*\1\+\+\s*\)/g,
				"for (let $1 = 0; $1 < $2.length; $1 += 4)", // Process in chunks of 4 for SIMD
			);
		}

		// Remove debug code in production
		if (this.config.optimization === "production") {
			optimized = optimized.replace(/console\.log\([^)]*\);?/g, "");
			optimized = optimized.replace(/console\.debug\([^)]*\);?/g, "");
			optimized = optimized.replace(/console\.info\([^)]*\);?/g, "");
		}

		return optimized;
	}

	private async buildForPlatforms(): Promise<void> {
		if (this.config.platform === "all") {
			const platforms = ["darwin", "linux", "win32"];
			const architectures = ["x64", "arm64"];

			for (const platform of platforms) {
				for (const arch of architectures) {
					console.log(`🖥️  Building for ${platform}-${arch}...`);
					await this.buildForPlatform(platform, arch);
				}
			}
		} else {
			await this.buildForPlatform(this.config.platform, this.config.arch);
		}
	}

	private async buildForPlatform(
		platform: string,
		arch: string,
	): Promise<void> {
		const start = performance.now();

		// Platform-specific build commands
		const buildCommands = {
			"darwin-arm64": "bun build --target=bun --minify",
			"darwin-x64": "bun build --target=node --minify",
			"linux-arm64": "bun build --target=node --minify",
			"linux-x64": "bun build --target=node --minify",
			"win32-x64": "bun build --target=node --minify",
		};

		const command =
			(buildCommands as any)[`${platform}-${arch}`] ||
			buildCommands["linux-x64"];
		const outputDir = `./dist/${platform}-${arch}`;

		execSync(`mkdir -p ${outputDir}`, { stdio: "inherit" });

		const files = [
			"tools/macos-widget/arm64-optimized-widget.ts",
			"tools/macos-widget/performance-dashboard.ts",
		].join(" ");

		execSync(`${command} ${files} --outdir=${outputDir}`, { stdio: "inherit" });

		const duration = performance.now() - start;
		const bundleSize = this.calculateBundleSize(outputDir);

		this.metrics.push({
			buildTime: duration,
			bundleSize,
			compressionRatio: 0,
			optimizationLevel: this.config.optimization,
			targetPlatform: `${platform}-${arch}`,
		});

		console.log(
			`   ✅ ${platform}-${arch} built in ${duration.toFixed(2)}ms (${(bundleSize / 1024 / 1024).toFixed(1)}MB)`,
		);
	}

	private async applyPerformanceOptimizations(): Promise<void> {
		console.log("⚡ Applying performance optimizations...");

		// Generate performance-optimized package.json
		const packageConfig = {
			name: "bun-toml-secrets-editor-optimized",
			version: "1.0.0",
			type: "module",
			scripts: {
				start: "bun run dist/arm64-optimized-widget.js",
				dashboard: "bun run dist/performance-dashboard.js",
				benchmark: "bun run dist/advanced-benchmark-suite.js",
				websocket: "bun run dist/websocket-optimized-widget.js",
				simd: "bun run dist/simd-optimized-processor.js",
			},
			engines: {
				bun: ">=1.3.7",
			},
			optimizations: {
				arm64: this.config.arch === "arm64",
				simd: this.config.features.includes("simd"),
				websockets: this.config.features.includes("websockets"),
				telemetry: this.config.features.includes("telemetry"),
			},
		};

		writeFileSync(
			"./dist/package.json",
			JSON.stringify(packageConfig, null, 2),
		);

		// Create performance startup script
		const startupScript = `#!/bin/bash
# Performance-optimized startup script
echo "🚀 Starting optimized widget suite..."
export NODE_ENV=production
export ARM64_OPTIMIZED=${this.config.arch === "arm64"}
export SIMD_ENABLED=${this.config.features.includes("simd")}

# Start with optimized memory settings
if command -v bun &> /dev/null; then
  exec bun --smol run dist/arm64-optimized-widget.js
else
  exec node --max-old-space-size=512 dist/arm64-optimized-widget.js
fi
`;

		writeFileSync("./dist/start.sh", startupScript);
		execSync("chmod +x ./dist/start.sh");

		console.log("   ✅ Performance optimizations applied");
	}

	private calculateBundleSize(dir: string): number {
		try {
			const result = execSync(`du -sb ${dir}`, { encoding: "utf-8" });
			return parseInt(result.split("\t")[0]);
		} catch {
			return 0;
		}
	}

	private generateBuildReport(): void {
		console.log("📊 Generating build report...");

		const totalBuildTime = Date.now() - this.startTime;
		const totalBundleSize = this.metrics.reduce(
			(sum, m) => sum + m.bundleSize,
			0,
		);
		const avgBuildTime =
			this.metrics.reduce((sum, m) => sum + m.buildTime, 0) /
			this.metrics.length;

		const report = {
			buildSummary: {
				totalBuildTime,
				totalBundleSize,
				averageBuildTime: avgBuildTime,
				optimizationLevel: this.config.optimization,
				platformsBuilt: this.metrics.length,
			},
			platformMetrics: this.metrics,
			features: {
				arm64Optimizations: this.config.arch === "arm64",
				simdSupport: this.config.features.includes("simd"),
				websocketSupport: this.config.features.includes("websockets"),
				telemetryEnabled: this.config.features.includes("telemetry"),
			},
			recommendations: this.generateRecommendations(),
		};

		writeFileSync("./dist/build-report.json", JSON.stringify(report, null, 2));

		// Display summary
		console.log("");
		console.log("📋 Build Summary");
		console.log("===============");
		console.log(`⏱️  Total build time: ${totalBuildTime}ms`);
		console.log(
			`📦 Total bundle size: ${(totalBundleSize / 1024 / 1024).toFixed(1)}MB`,
		);
		console.log(`🖥️  Platforms built: ${this.metrics.length}`);
		console.log(`🎯 Optimization level: ${this.config.optimization}`);
		console.log("");

		console.log("📈 Platform Performance:");
		this.metrics.forEach((metric) => {
			const sizeMB = (metric.bundleSize / 1024 / 1024).toFixed(1);
			console.log(
				`   ${metric.targetPlatform}: ${metric.buildTime.toFixed(0)}ms, ${sizeMB}MB`,
			);
		});

		console.log("");
		console.log("💡 Recommendations:");
		report.recommendations.forEach((rec: string) => {
			console.log(`   • ${rec}`);
		});
	}

	private generateRecommendations(): string[] {
		const recommendations: string[] = [];

		if (this.config.optimization === "development") {
			recommendations.push(
				"Consider using 'production' optimization for deployment",
			);
		}

		if (this.config.arch !== "arm64" && process.platform === "darwin") {
			recommendations.push(
				"ARM64 architecture detected - consider using 'arm64' target for better performance",
			);
		}

		const avgBuildTime =
			this.metrics.reduce((sum, m) => sum + m.buildTime, 0) /
			this.metrics.length;
		if (avgBuildTime > 5000) {
			recommendations.push(
				"Build times are slow - consider incremental builds or caching",
			);
		}

		if (!this.config.features.includes("simd")) {
			recommendations.push(
				"Consider enabling SIMD features for ARM64 platforms",
			);
		}

		return recommendations;
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const config: Partial<BuildConfig> = {};

	// Parse command line arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--target":
				config.target = args[++i] as any;
				break;
			case "--optimization":
				config.optimization = args[++i] as any;
				break;
			case "--platform":
				config.platform = args[++i] as any;
				break;
			case "--arch":
				config.arch = args[++i] as any;
				break;
			case "--features":
				config.features = args[++i].split(",");
				break;
			case "--help":
				console.log(`
Optimized Build Pipeline

Usage: bun run build-optimized.ts [options]

Options:
  --target <target>        Build target (bun|node|browser) [default: bun]
  --optimization <level>   Optimization level (development|production|premium) [default: production]
  --platform <platform>   Target platform (darwin|linux|win32|all) [default: darwin]
  --arch <architecture>    Target architecture (x64|arm64|all) [default: arm64]
  --features <features>    Comma-separated features (arm64-optimizations,simd,websockets,telemetry)
  --help                   Show this help

Examples:
  bun run build-optimized.ts --optimization premium --arch arm64
  bun run build-optimized.ts --platform all --features simd,websockets
        `);
				process.exit(0);
		}
	}

	const pipeline = new OptimizedBuildPipeline(config);
	await pipeline.build();
}

if (import.meta.main) {
	main().catch(console.error);
}

export { OptimizedBuildPipeline, type BuildConfig, type BuildMetrics };
