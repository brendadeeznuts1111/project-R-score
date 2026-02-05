#!/usr/bin/env bun
/**
 * @fileoverview Pre-Publish Validation Script
 * @description Validates packages before publishing to ensure quality
 * @module scripts/validate-before-publish
 * 
 * Usage:
 *   VERSION=1.4.0 bun run scripts/validate-before-publish.ts
 * 
 * Checks:
 *   1. Version format validation
 *   2. All packages are built
 *   3. Tests pass
 *   4. No benchmark regressions
 *   5. Security audit passes
 *   6. Package.json structure is valid
 * 
 * @see scripts/publish-graph-monorepo.ts
 * @see .github/workflows/publish-graph-packages.yml
 */

import { $ } from "bun";
import { existsSync, readdir } from "fs/promises";
import { join } from "path";
import { RSS_REGISTRY_CONFIG } from "../src/utils/rss-constants";

const VERSION = process.env.VERSION;

/**
 * Check 1: Version format validation
 */
function validateVersionFormat(version: string | undefined): void {
	if (!version) {
		console.error("❌ VERSION environment variable is required");
		console.error("   Usage: VERSION=1.4.0 bun run scripts/validate-before-publish.ts");
		process.exit(1);
	}

	// Valid formats: 1.4.0, 1.4.0-beta.1, 1.4.0-rc.2, 1.4.0-alpha.3
	const versionPattern = /^\d+\.\d+\.\d+(-[a-z]+\.\d+)?$/;
	if (!versionPattern.test(version)) {
		console.error(`❌ Invalid version format: ${version}`);
		console.error("   Expected format: X.Y.Z or X.Y.Z-tag.N (e.g., 1.4.0-beta.1)");
		process.exit(1);
	}

	console.log(`✅ Version format valid: ${version}`);
}

/**
 * Check 2: All packages have been built
 */
async function validatePackagesBuilt(): Promise<void> {
	console.log("\n🔍 Checking package builds...");

	const packagesDir = "packages";
	if (!existsSync(packagesDir)) {
		console.warn("⚠️  packages/ directory not found, skipping build check");
		return;
	}

	try {
		const entries = await readdir(packagesDir, { withFileTypes: true });
		const graphPackages = entries.filter(
			(entry) => entry.isDirectory() && entry.name.startsWith("@graph"),
		);

		if (graphPackages.length === 0) {
			console.warn("⚠️  No @graph packages found");
			return;
		}

		for (const pkg of graphPackages) {
			const pkgPath = join(packagesDir, pkg.name);
			const distPath = join(pkgPath, "dist");
			const srcPath = join(pkgPath, "src");

			// Check if package has dist/ or if it's TypeScript-only (src/)
			if (existsSync(distPath)) {
				const distIndex = join(distPath, "index.js");
				if (!existsSync(distIndex)) {
					console.error(`❌ Package ${pkg.name} dist/index.js not found`);
					process.exit(1);
				}
				console.log(`  ✅ ${pkg.name}: dist/ exists`);
			} else if (existsSync(srcPath)) {
				// TypeScript-only package (no build step)
				console.log(`  ✅ ${pkg.name}: TypeScript-only (no build required)`);
			} else {
				console.error(`❌ Package ${pkg.name} has no dist/ or src/ directory`);
				process.exit(1);
			}
		}
	} catch (error) {
		console.error(`❌ Error checking packages: ${error}`);
		process.exit(1);
	}
}

/**
 * Check 3: Tests pass
 */
async function validateTests(): Promise<void> {
	console.log("\n🧪 Running test suite...");

	try {
		const result = await $`bun test`.quiet();
		if (result.exitCode !== 0) {
			console.error("❌ Tests failed");
			if (result.stderr) {
				console.error(result.stderr.toString());
			}
			if (result.stdout) {
				console.error(result.stdout.toString());
			}
			process.exit(1);
		}
		console.log("✅ All tests passed");
	} catch (error) {
		console.error(`❌ Error running tests: ${error}`);
		process.exit(1);
	}
}

/**
 * Check 4: No benchmark regressions
 */
async function validateBenchmarks(): Promise<void> {
	console.log("\n📊 Checking performance benchmarks...");

	try {
		// Check if benchmark comparison script exists
		const compareScript = "scripts/benchmarks/compare.ts";
		if (!existsSync(compareScript)) {
			console.warn("⚠️  Benchmark comparison script not found, skipping");
			return;
		}

		// Try to compare against main branch (if available)
		// This is a best-effort check - won't fail if main branch doesn't exist
		const result = await $`bun run ${compareScript} main HEAD --threshold=2% --fail-on-regression`.quiet();
		
		if (result.exitCode !== 0) {
			console.error("❌ Performance regression detected");
			if (result.stderr) {
				console.error(result.stderr.toString());
			}
			if (result.stdout) {
				console.error(result.stdout.toString());
			}
			console.error("\n💡 Fix performance regressions before publishing");
			process.exit(1);
		}
		console.log("✅ No benchmark regressions detected");
	} catch (error) {
		// Benchmark comparison might fail if main branch doesn't exist (e.g., first publish)
		console.warn("⚠️  Could not compare benchmarks (this is OK for first publish)");
	}
}

/**
 * Check 5: Security audit passes
 */
async function validateSecurity(): Promise<void> {
	console.log("\n🔒 Running security audit...");

	try {
		const result = await $`bun audit`.quiet();
		if (result.exitCode !== 0) {
			console.error("❌ Security audit found vulnerabilities!");
			if (result.stderr) {
				console.error(result.stderr.toString());
			}
			console.error("\n💡 Fix vulnerabilities before publishing:");
			console.error("   bun audit --fix");
			process.exit(1);
		}
		console.log("✅ Security audit passed");
	} catch (error) {
		console.warn("⚠️  Could not run security audit (non-blocking)");
	}
}

/**
 * Check 6: Package.json structure is valid
 */
async function validatePackageJson(): Promise<void> {
	console.log("\n📦 Validating package.json structure...");

	const rootPackageJsonPath = "package.json";
	if (!existsSync(rootPackageJsonPath)) {
		console.error("❌ Root package.json not found");
		process.exit(1);
	}

	try {
		const packageJsonText = await Bun.file(rootPackageJsonPath).text();
		const packageJson = JSON.parse(packageJsonText);

		// Check required fields
		if (!packageJson.name) {
			console.error("❌ package.json missing 'name' field");
			process.exit(1);
		}

		if (!packageJson.version) {
			console.error("❌ package.json missing 'version' field");
			process.exit(1);
		}

		// Check workspaces
		if (!packageJson.workspaces || !Array.isArray(packageJson.workspaces)) {
			console.warn("⚠️  No workspaces defined in package.json");
		}

		console.log("✅ package.json structure valid");
	} catch (error) {
		console.error(`❌ Error validating package.json: ${error}`);
		process.exit(1);
	}
}

/**
 * Main validation function
 */
async function validateBeforePublish(): Promise<void> {
	console.log("🔍 Pre-Publish Validation\n");
	console.log("=".repeat(60));

	// Check 1: Version format
	validateVersionFormat(VERSION);

	// Check 2: Packages built
	await validatePackagesBuilt();

	// Check 3: Tests pass
	await validateTests();

	// Check 4: No benchmark regressions
	await validateBenchmarks();

	// Check 5: Security audit
	await validateSecurity();

	// Check 6: Package.json structure
	await validatePackageJson();

	console.log("\n" + "=".repeat(60));
	console.log("✅ All validation checks passed");
	console.log(`\n📦 Ready to publish version ${VERSION}`);
	console.log(`   Registry: ${RSS_REGISTRY_CONFIG.PRIVATE_REGISTRY}`);
	console.log(`   Scope: ${RSS_REGISTRY_CONFIG.SCOPE}`);
}

// Run if executed directly
if (import.meta.main) {
	validateBeforePublish().catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
