#!/usr/bin/env bun

/**
 * Cross-platform build script
 * Usage: bun scripts/build-cross-platform.ts [platform] [arch] [edition]
 *
 * Examples:
 *   bun scripts/build-cross-platform.ts linux x64 interactive
 *   bun scripts/build-cross-platform.ts darwin arm64 premium
 *   bun scripts/build-cross-platform.ts win32 x64 community
 */

import { join } from "node:path";
import { build } from "bun";

const platform = process.argv[2] || "linux";
const arch = process.argv[3] || "x64";
const edition = process.argv[4] || "interactive";

// Map platform names to Bun target format
const platformMap: Record<string, string> = {
	linux: "bun-linux",
	darwin: "bun-darwin",
	win32: "bun-windows",
	windows: "bun-windows",
};

// Map architecture
const archMap: Record<string, string> = {
	x64: "x64",
	arm64: "arm64",
};

const bunTarget = `${platformMap[platform]}-${archMap[arch]}`;
if (!platformMap[platform] || !archMap[arch]) {
	console.error(`❌ Invalid platform or architecture`);
	console.error(`Platform: ${platform} (valid: linux, darwin, win32)`);
	console.error(`Architecture: ${arch} (valid: x64, arm64)`);
	process.exit(1);
}

// Determine features and output file
const features: string[] = [];
let outputName = `secrets-guard-${platform}-${arch}`;

if (edition === "premium") {
	features.push("PREMIUM", "INTERACTIVE");
	outputName = `secrets-guard-premium-${platform}-${arch}`;
} else if (edition === "interactive") {
	features.push("INTERACTIVE");
	outputName = `secrets-guard-${platform}-${arch}`;
} else if (edition === "community") {
	outputName = `secrets-guard-community-${platform}-${arch}`;
} else {
	console.error(
		`❌ Invalid edition: ${edition} (valid: community, interactive, premium)`,
	);
	process.exit(1);
}

// Add .exe extension for Windows
if (platform === "win32" || platform === "windows") {
	outputName += ".exe";
}

const outfile = join(process.cwd(), "dist", outputName);

console.log(`🔨 Building for ${platform}-${arch} (${edition} edition)`);
console.log(`   Target: ${bunTarget}`);
console.log(
	`   Features: ${features.length > 0 ? features.join(", ") : "none"}`,
);
console.log(`   Output: ${outfile}`);

try {
	// Build using JavaScript API for cross-compilation support
	// Note: Feature flags are handled at compile-time via bun:bundle feature() calls in code
	const buildConfig: any = {
		entrypoints: ["./src/main.ts"],
		compile: bunTarget,
		outfile,
		define: {
			"process.env.NODE_ENV": '"production"',
		},
	};

	// Note: --feature flags are CLI-only, but since the code uses bun:bundle feature()
	// compile-time checks, features will be DCE'd appropriately based on what's enabled
	// at build time. For explicit feature control, you may need to use CLI builds.

	const result = await build(buildConfig);

	if (result.success) {
		// Check actual output location
		const actualOutput = result.outputs?.[0]?.path;
		if (actualOutput && actualOutput !== outfile) {
			// Move file to desired location if it's different
			const fs = await import("node:fs/promises");
			try {
				await fs.mkdir(join(process.cwd(), "dist"), { recursive: true });
				await fs.rename(actualOutput, outfile);
				console.log(`✅ Build successful: ${outfile}`);
			} catch (_err) {
				console.log(`✅ Build successful: ${actualOutput}`);
				console.log(`   (Expected: ${outfile})`);
			}
		} else {
			console.log(`✅ Build successful: ${outfile}`);
		}
		if (features.length > 0) {
			console.log(
				`   ⚠️  Note: Feature flags (${features.join(", ")}) are handled via compile-time DCE in code`,
			);
			console.log(
				`   To explicitly control features, use CLI: bun build --compile --feature ${features.join(" --feature ")}`,
			);
		}
	} else {
		console.error(`❌ Build failed`);
		if (result.logs.length > 0) {
			console.error("Build logs:", result.logs);
		}
		process.exit(1);
	}
} catch (error) {
	console.error(`❌ Build error:`, error);
	process.exit(1);
}
