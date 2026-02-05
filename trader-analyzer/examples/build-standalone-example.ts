#!/usr/bin/env bun
/**
 * @fileoverview Standalone Executable Build Example
 * @description Demonstrates building standalone executables with autoload options for runtime config loading
 * @module examples/build-standalone-example
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@1.3.4.2.0.0.0;instance-id=EXAMPLE-STANDALONE-BUILD-001;version=1.3.4.2.0.0.0}]
 * [PROPERTIES:{example={value:"Standalone Executable Build";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-BUILD"];@version:"1.3.4.2.0.0.0"}}]
 * [CLASS:StandaloneBuildExamples][#REF:v-1.3.4.2.0.0.0.BP.EXAMPLES.BUILD.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 1.3.4.2.0.0.0
 * Ripgrep Pattern: 1\.3\.4\.2\.0\.0\.0|EXAMPLE-STANDALONE-BUILD-001|BP-EXAMPLE@1\.3\.4\.2\.0\.0\.0|build-standalone-example
 * 
 * Demonstrates:
 * - Building with all config autoload options enabled
 * - Building optimized executables (no config loading)
 * - Selective config loading (only needed configs)
 * - Building for different targets (bun, node, browser)
 * - Conditional config loading based on environment
 * 
 * Config Autoload Options:
 * - autoloadTsconfig: Load tsconfig.json at runtime
 * - autoloadPackageJson: Load package.json at runtime
 * - autoloadDotenv: Load .env files at runtime
 * - autoloadBunfig: Load bunfig.toml at runtime
 * 
 * @example 1.3.4.2.0.0.0.1: Build with All Configs
 * // Test Formula:
 * // 1. Call buildWithAllConfigs()
 * // 2. Verify build succeeds
 * // 3. Check executable loads configs at runtime
 * // Expected Result: Executable built with all config loading enabled
 * //
 * // Snippet:
 * ```typescript
 * await Bun.build({
 *   entrypoints: ["./app.ts"],
 *   compile: {
 *     autoloadTsconfig: true,
 *     autoloadPackageJson: true,
 *     autoloadDotenv: true,
 *     autoloadBunfig: true,
 *   },
 * });
 * ```
 * 
 * @example 1.3.4.2.0.0.0.2: Build Optimized Executable
 * // Test Formula:
 * // 1. Call buildOptimized()
 * // 2. Verify build succeeds
 * // 3. Check executable has faster startup (no config loading)
 * // Expected Result: Optimized executable built without config loading
 * //
 * // Snippet:
 * ```typescript
 * await Bun.build({
 *   entrypoints: ["./app.ts"],
 *   minify: true,
 *   compile: true, // No autoload options = fastest startup
 * });
 * ```
 * 
 * @see {@link ../docs/BUN-STANDALONE-EXECUTABLES.md Bun Standalone Executables Documentation}
 * @see {@link ../scripts/build-standalone.ts Build Standalone CLI Utility}
 * @see {@link ../test/standalone-executable-compile.test.ts Standalone Executable Tests}
 * @see {@link https://bun.sh/docs/cli/bun#build Bun Build Documentation}
 * 
 * // Ripgrep: 1.3.4.2.0.0.0
 * // Ripgrep: EXAMPLE-STANDALONE-BUILD-001
 * // Ripgrep: BP-EXAMPLE@1.3.4.2.0.0.0
 * 
 * Run: bun run examples/build-standalone-example.ts
 * 
 * @author NEXUS Team
 * @since Bun 1.3.4+
 */

/**
 * Example 1: Build with all config autoload options enabled
 * 
 * This creates an executable that loads all config files at runtime:
 * - tsconfig.json
 * - package.json
 * - .env files
 * - bunfig.toml
 */
async function buildWithAllConfigs() {
	console.log("📦 Example 1: Building with all config autoload options...\n");

	const result = await Bun.build({
		entrypoints: ["./app.ts"],
		compile: {
			autoloadTsconfig: true,
			autoloadPackageJson: true,
			autoloadDotenv: true,
			autoloadBunfig: true,
		},
	});

	if (result.success) {
		console.log("✅ Build successful!");
		console.log(`   Output: ${result.outputs[0]?.path}`);
		console.log(`   Size: ${(result.outputs[0]?.size / 1024).toFixed(2)} KB`);
	} else {
		console.error("❌ Build failed:", result.logs);
	}

	return result;
}

/**
 * Example 2: Build optimized executable (no config loading)
 * 
 * This creates a faster executable that doesn't load config files at runtime.
 * Use this for production deployments where config values are embedded at build time.
 */
async function buildOptimized() {
	console.log("\n📦 Example 2: Building optimized executable (no config loading)...\n");

	const result = await Bun.build({
		entrypoints: ["./app.ts"],
		minify: true,
		compile: true, // No autoload options = fastest startup
	});

	if (result.success) {
		console.log("✅ Build successful!");
		console.log(`   Output: ${result.outputs[0]?.path}`);
		console.log(`   Size: ${(result.outputs[0]?.size / 1024).toFixed(2)} KB`);
	} else {
		console.error("❌ Build failed:", result.logs);
	}

	return result;
}

/**
 * Example 3: Build with selective config loading
 * 
 * Only load the configs you actually need at runtime.
 */
async function buildSelective() {
	console.log("\n📦 Example 3: Building with selective config loading...\n");

	const result = await Bun.build({
		entrypoints: ["./app.ts"],
		compile: {
			autoloadPackageJson: true, // Need package.json for version info
			autoloadDotenv: true,      // Need .env for environment variables
			// Skip tsconfig.json and bunfig.toml
		},
	});

	if (result.success) {
		console.log("✅ Build successful!");
		console.log(`   Output: ${result.outputs[0]?.path}`);
		console.log(`   Size: ${(result.outputs[0]?.size / 1024).toFixed(2)} KB`);
	} else {
		console.error("❌ Build failed:", result.logs);
	}

	return result;
}

/**
 * Example 4: Build for different targets
 * 
 * Build executables for different platforms.
 */
async function buildForTargets() {
	console.log("\n📦 Example 4: Building for different targets...\n");

	const targets: Array<"bun" | "node" | "browser"> = ["bun", "node"];

	for (const target of targets) {
		console.log(`\n   Building for ${target}...`);

		const result = await Bun.build({
			entrypoints: ["./app.ts"],
			target,
			compile: {
				autoloadPackageJson: true,
			},
		});

		if (result.success) {
			console.log(`   ✅ ${target} build successful`);
			console.log(`      Output: ${result.outputs[0]?.path}`);
		} else {
			console.error(`   ❌ ${target} build failed:`, result.logs);
		}
	}
}

/**
 * Example 5: Conditional config loading based on environment
 * 
 * Enable config loading only in development, optimize for production.
 */
async function buildConditional() {
	console.log("\n📦 Example 5: Conditional config loading...\n");

	const isDevelopment = process.env.NODE_ENV !== "production";

	const result = await Bun.build({
		entrypoints: ["./app.ts"],
		minify: !isDevelopment,
		compile: {
			// Only load configs in development
			autoloadTsconfig: isDevelopment,
			autoloadPackageJson: isDevelopment,
			autoloadDotenv: isDevelopment,
			autoloadBunfig: isDevelopment,
		},
	});

	if (result.success) {
		console.log(`✅ Build successful (${isDevelopment ? "development" : "production"} mode)`);
		console.log(`   Output: ${result.outputs[0]?.path}`);
		console.log(`   Config loading: ${isDevelopment ? "enabled" : "disabled"}`);
	} else {
		console.error("❌ Build failed:", result.logs);
	}

	return result;
}

/**
 * Main function - run examples
 */
async function main() {
	console.log("🚀 Standalone Executable Build Examples\n");
	console.log("=" .repeat(60));

	// Note: These examples assume ./app.ts exists
	// In a real scenario, replace with your actual entry point

	try {
		// Uncomment the examples you want to run:
		// await buildWithAllConfigs();
		// await buildOptimized();
		// await buildSelective();
		// await buildForTargets();
		// await buildConditional();

		console.log("\n" + "=".repeat(60));
		console.log("💡 Tip: Uncomment the example functions above to run them");
		console.log("💡 Or use the build script: bun run scripts/build-standalone.ts");
	} catch (error) {
		console.error("❌ Error running examples:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
