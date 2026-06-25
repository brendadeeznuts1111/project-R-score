#!/usr/bin/env bun
/**
 * @fileoverview Publish Workspace Packages to Private Registry
 * @description Version pinning script for publishing @graph packages
 * @module scripts/publish-to-registry
 * 
 * Usage:
 *   VERSION=1.4.0 bun run scripts/publish-to-registry.ts
 *   VERSION=1.4.0 bun run scripts/publish-to-registry.ts --package @graph/types
 *   VERSION=1.4.0 bun run scripts/publish-to-registry.ts --dry-run
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";

interface PublishOptions {
	version?: string;
	package?: string;
	dryRun?: boolean;
	registry?: string;
}

/**
 * Get version from environment or arguments
 */
function getVersion(): string {
	const envVersion = process.env.VERSION;
	if (!envVersion) {
		console.error("❌ Error: VERSION environment variable is required");
		console.error("   Usage: VERSION=1.4.0 bun run scripts/publish-to-registry.ts");
		process.exit(1);
	}
	return envVersion;
}

/**
 * Find all workspace packages
 */
function findWorkspacePackages(): Array<{ name: string; path: string; packageJson: any }> {
	const packages: Array<{ name: string; path: string; packageJson: any }> = [];
	
	// Check root package.json for workspaces
	const rootPackageJson = JSON.parse(Bun.file("package.json").text());
	const workspaces = rootPackageJson.workspaces || [];
	
	for (const workspace of workspaces) {
		const workspacePath = workspace.replace("/*", "").replace("*", "");
		const packageJsonPath = join(workspacePath, "package.json");
		
		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(Bun.file(packageJsonPath).text());
			if (packageJson.name?.startsWith("@graph/")) {
				packages.push({
					name: packageJson.name,
					path: workspacePath,
					packageJson,
				});
			}
		}
	}
	
	// Also check packages/ directory if it exists
	const packagesDir = "packages";
	if (existsSync(packagesDir)) {
		const entries = Array.from(Bun.file(packagesDir).readdirSync());
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const packageJsonPath = join(packagesDir, entry.name, "package.json");
				if (existsSync(packageJsonPath)) {
					const packageJson = JSON.parse(Bun.file(packageJsonPath).text());
					if (packageJson.name?.startsWith("@graph/")) {
						packages.push({
							name: packageJson.name,
							path: join(packagesDir, entry.name),
							packageJson,
						});
					}
				}
			}
		}
	}
	
	return packages;
}

/**
 * Update package.json version and workspace dependencies
 */
async function updatePackageVersion(
	packagePath: string,
	version: string,
	dryRun: boolean,
): Promise<void> {
	const packageJsonPath = join(packagePath, "package.json");
	const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());
	
	const oldVersion = packageJson.version;
	packageJson.version = version;
	
	// Update workspace:* dependencies to pinned versions
	if (packageJson.dependencies) {
		for (const [depName, depVersion] of Object.entries(packageJson.dependencies)) {
			if (typeof depVersion === "string" && depVersion.startsWith("workspace:")) {
				// Replace workspace:* with workspace:VERSION for publishing
				packageJson.dependencies[depName] = `workspace:${version}`;
			}
		}
	}
	
	if (dryRun) {
		console.info(`  [DRY RUN] Would update ${packageJson.name} from ${oldVersion} to ${version}`);
	} else {
		await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
		console.info(`  ✅ Updated ${packageJson.name} from ${oldVersion} to ${version}`);
	}
}

/**
 * Publish package to registry
 */
async function publishPackage(
	packagePath: string,
	packageName: string,
	version: string,
	registry: string,
	dryRun: boolean,
): Promise<void> {
	if (dryRun) {
		console.info(`  [DRY RUN] Would publish ${packageName}@${version} to ${registry}`);
		return;
	}
	
	try {
		console.info(`  📦 Publishing ${packageName}@${version}...`);
		
		// Use bun publish with registry flag
		const result = await $`cd ${packagePath} && bun publish --registry ${registry} --access public`.quiet();
		
		if (result.exitCode === 0) {
			console.info(`  ✅ Published ${packageName}@${version}`);
		} else {
			console.error(`  ❌ Failed to publish ${packageName}@${version}`);
			process.exit(1);
		}
	} catch (error) {
		console.error(`  ❌ Error publishing ${packageName}:`, error);
		process.exit(1);
	}
}

/**
 * Main publish function
 */
async function publishToRegistry(options: PublishOptions = {}): Promise<void> {
	const version = options.version || getVersion();
	const targetPackage = options.package;
	const dryRun = options.dryRun || false;
	const registry = options.registry || "https://npm.internal.yourcompany.com";
	
	console.info("🚀 Publishing workspace packages to private registry\n");
	console.info(`   Version: ${version}`);
	console.info(`   Registry: ${registry}`);
	console.info(`   Mode: ${dryRun ? "DRY RUN" : "PUBLISH"}\n`);
	
	// Find all @graph packages
	const packages = findWorkspacePackages();
	
	if (packages.length === 0) {
		console.info("⚠️  No @graph packages found in workspace");
		return;
	}
	
	console.info(`📦 Found ${packages.length} package(s):`);
	packages.forEach((pkg) => console.info(`   - ${pkg.name}`));
	console.info();
	
	// Filter by target package if specified
	const packagesToPublish = targetPackage
		? packages.filter((pkg) => pkg.name === targetPackage)
		: packages;
	
	if (packagesToPublish.length === 0) {
		console.error(`❌ Package ${targetPackage} not found`);
		process.exit(1);
	}
	
	// Update versions and publish
	for (const pkg of packagesToPublish) {
		console.info(`\n📝 Processing ${pkg.name}...`);
		
		// Update version
		await updatePackageVersion(pkg.path, version, dryRun);
		
		// Publish
		await publishPackage(pkg.path, pkg.name, version, registry, dryRun);
	}
	
	console.info("\n✅ Publishing complete!");
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: PublishOptions = {};

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "--dry-run") {
		options.dryRun = true;
	} else if (arg === "--package" && i + 1 < args.length) {
		options.package = args[++i];
	} else if (arg === "--registry" && i + 1 < args.length) {
		options.registry = args[++i];
	}
}

// Run if executed directly
if (import.meta.main) {
	publishToRegistry(options).catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
