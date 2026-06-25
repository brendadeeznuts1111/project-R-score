#!/usr/bin/env bun
/**
 * @fileoverview Validate Workspace Dependencies
 * @description Ensures workspace packages use workspace:* instead of bun link
 * @module scripts/validate-workspace-deps
 * 
 * Usage:
 *   bun run scripts/validate-workspace-deps.ts
 */

import { existsSync } from "fs";
import { join } from "path";

interface PackageInfo {
	name: string;
	path: string;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

/**
 * Find all workspace packages
 */
async function findWorkspacePackages(): Promise<PackageInfo[]> {
	const packages: PackageInfo[] = [];
	
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
			packages.push({
				name: packageJson.name || workspacePath,
				path: workspacePath,
				dependencies: packageJson.dependencies || {},
				devDependencies: packageJson.devDependencies || {},
			});
		}
	}
	
	// Also check packages/ directory if it exists
	const packagesDir = "packages";
	if (existsSync(packagesDir)) {
		try {
			const entries = Array.from(Bun.file(packagesDir).readdirSync());
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const packageJsonPath = join(packagesDir, entry.name, "package.json");
					if (existsSync(packageJsonPath)) {
						const packageJsonText = await Bun.file(packageJsonPath).text();
						const packageJson = JSON.parse(packageJsonText);
						packages.push({
							name: packageJson.name || entry.name,
							path: join(packagesDir, entry.name),
							dependencies: packageJson.dependencies || {},
							devDependencies: packageJson.devDependencies || {},
						});
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
 * Check for bun link usage
 */
function checkForBunLink(packages: PackageInfo[]): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	
	for (const pkg of packages) {
		const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
		
		for (const [depName, depVersion] of Object.entries(allDeps)) {
			// Check for link: protocol (bun link)
			if (typeof depVersion === "string" && depVersion.startsWith("link:")) {
				errors.push(
					`❌ ${pkg.name} uses "link:" protocol for ${depName}. Use "workspace:*" instead.`
				);
			}
			
			// Check for @graph packages not using workspace:*
			if (depName.startsWith("@graph/") && !depVersion.startsWith("workspace:")) {
				warnings.push(
					`⚠️  ${pkg.name} depends on ${depName} without workspace: protocol. Consider using "workspace:*".`
				);
			}
		}
	}
	
	return { errors, warnings };
}

/**
 * Main validation function
 */
async function validateWorkspaceDeps(): Promise<void> {
	console.info("🔍 Validating workspace dependencies...\n");
	
	const packages = await findWorkspacePackages();
	
	if (packages.length === 0) {
		console.info("⚠️  No workspace packages found");
		return;
	}
	
	console.info(`📦 Found ${packages.length} workspace package(s):`);
	packages.forEach((pkg) => console.info(`   - ${pkg.name} (${pkg.path})`));
	console.info();
	
	const { errors, warnings } = checkForBunLink(packages);
	
	if (errors.length > 0) {
		console.info("❌ Errors found:\n");
		errors.forEach((error) => console.info(`   ${error}`));
		console.info();
	}
	
	if (warnings.length > 0) {
		console.info("⚠️  Warnings:\n");
		warnings.forEach((warning) => console.info(`   ${warning}`));
		console.info();
	}
	
	if (errors.length === 0 && warnings.length === 0) {
		console.info("✅ All workspace dependencies are correctly configured!");
		console.info("   - No 'link:' protocol usage found");
		console.info("   - @graph packages use workspace: protocol\n");
		process.exit(0);
	} else if (errors.length > 0) {
		console.info("💡 Fix: Replace 'link:' with 'workspace:*' in package.json dependencies");
		process.exit(1);
	} else {
		console.info("💡 Consider using 'workspace:*' for @graph dependencies");
		process.exit(0);
	}
}

// Run if executed directly
if (import.meta.main) {
	validateWorkspaceDeps().catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
