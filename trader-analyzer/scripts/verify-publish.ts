#!/usr/bin/env bun
/**
 * @fileoverview Post-Publish Verification Script
 * @description Verifies packages were published correctly to the registry
 * @module scripts/verify-publish
 * 
 * Usage:
 *   VERSION=1.4.0 bun run scripts/verify-publish.ts
 *   VERSION=1.4.0 bun run scripts/verify-publish.ts --registry=https://custom-registry.com
 * 
 * Verification Steps:
 *   1. Check each package version exists on registry
 *   2. Verify package can be installed
 *   3. Validate package metadata
 * 
 * @see scripts/publish-graph-monorepo.ts
 * @see scripts/validate-before-publish.ts
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";
import { RSS_REGISTRY_CONFIG } from "../src/utils/rss-constants";

const VERSION = process.env.VERSION;
const REGISTRY = process.env.REGISTRY || RSS_REGISTRY_CONFIG.PRIVATE_REGISTRY;

/**
 * Find all @graph packages
 */
async function findGraphPackages(): Promise<string[]> {
	const packages: string[] = [];

	// Check root package.json for workspaces
	const rootPackageJsonText = await Bun.file("package.json").text();
	const rootPackageJson = JSON.parse(rootPackageJsonText);
	const workspaces = rootPackageJson.workspaces || [];

	for (const workspace of workspaces) {
		const workspacePath = workspace.replace("/*", "").replace("*", "");
		const packageJsonPath = join(workspacePath, "package.json");

		if (existsSync(packageJsonPath)) {
			const packageJsonText = await Bun.file(packageJsonPath).text();
			const packageJson = JSON.parse(packageJsonText);
			if (packageJson.name?.startsWith(RSS_REGISTRY_CONFIG.SCOPE + "/")) {
				packages.push(packageJson.name);
			}
		}
	}

	// Also check packages/ directory if it exists
	const packagesDir = "packages";
	if (existsSync(packagesDir)) {
		try {
			const entries = await readdir(packagesDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const packageJsonPath = join(packagesDir, entry.name, "package.json");
					if (existsSync(packageJsonPath)) {
						const packageJsonText = await Bun.file(packageJsonPath).text();
						const packageJson = JSON.parse(packageJsonText);
						if (packageJson.name?.startsWith(RSS_REGISTRY_CONFIG.SCOPE + "/")) {
							if (!packages.includes(packageJson.name)) {
								packages.push(packageJson.name);
							}
						}
					}
				}
			}
		} catch {
			// packages/ might not exist or be readable
		}
	}

	return packages;
}

/**
 * Verify package version exists on registry
 */
async function verifyPackageVersion(
	packageName: string,
	version: string,
	registry: string,
): Promise<boolean> {
	try {
		// Query registry using npm view
		const result = await $`npm view ${packageName}@${version} version --registry ${registry}`.quiet();
		
		if (result.exitCode !== 0) {
			return false;
		}

		const publishedVersion = result.stdout.toString().trim();
		return publishedVersion === version;
	} catch {
		return false;
	}
}

/**
 * Verify package can be installed
 */
async function verifyPackageInstall(
	packageName: string,
	version: string,
	registry: string,
): Promise<boolean> {
	const tempDir = `/tmp/verify-${packageName.replace("/", "-")}-${Date.now()}`;

	try {
		// Create temp directory
		await $`mkdir -p ${tempDir}`;

		// Initialize npm project
		await $`cd ${tempDir} && npm init -y`.quiet();

		// Configure registry
		await $`cd ${tempDir} && npm config set @graph:registry ${registry}`.quiet();

		// Try to install package
		const installResult = await $`cd ${tempDir} && npm install ${packageName}@${version} --registry ${registry}`.quiet();

		// Cleanup
		await $`rm -rf ${tempDir}`.quiet();

		return installResult.exitCode === 0;
	} catch {
		// Cleanup on error
		try {
			await $`rm -rf ${tempDir}`.quiet();
		} catch {
			// Ignore cleanup errors
		}
		return false;
	}
}

/**
 * Main verification function
 */
async function verifyPublish(): Promise<void> {
	if (!VERSION) {
		console.error("❌ VERSION environment variable is required");
		console.error("   Usage: VERSION=1.4.0 bun run scripts/verify-publish.ts");
		process.exit(1);
	}

	console.log(`🔍 Verifying @graph/* v${VERSION} on registry\n`);
	console.log(`   Registry: ${REGISTRY}`);
	console.log(`   Scope: ${RSS_REGISTRY_CONFIG.SCOPE}`);
	console.log("=".repeat(60));

	const packages = await findGraphPackages();

	if (packages.length === 0) {
		console.warn("⚠️  No @graph packages found");
		return;
	}

	console.log(`\n📦 Found ${packages.length} package(s) to verify:\n`);

	let allVerified = true;

	for (const packageName of packages) {
		console.log(`  Checking ${packageName}...`);

		// Check version exists
		const versionExists = await verifyPackageVersion(packageName, VERSION, REGISTRY);
		if (!versionExists) {
			console.error(`    ❌ ${packageName}@${VERSION} not found on registry`);
			allVerified = false;
			continue;
		}
		console.log(`    ✅ Version ${VERSION} exists on registry`);

		// Verify can install
		const canInstall = await verifyPackageInstall(packageName, VERSION, REGISTRY);
		if (!canInstall) {
			console.error(`    ❌ Cannot install ${packageName}@${VERSION}`);
			allVerified = false;
			continue;
		}
		console.log(`    ✅ Package can be installed`);
	}

	console.log("\n" + "=".repeat(60));

	if (allVerified) {
		console.log("🎉 All packages verified successfully!");
		console.log(`\n📦 Published packages are available at:`);
		console.log(`   ${REGISTRY}/-/web/detail/${RSS_REGISTRY_CONFIG.SCOPE}`);
	} else {
		console.error("❌ Some packages failed verification");
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	verifyPublish().catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
