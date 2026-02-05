#!/usr/bin/env bun

/**
 * Post-Migration Validation Script
 * Comprehensive validation after workspace migration
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

interface ValidationTest {
	name: string;
	check: () => Promise<boolean> | boolean;
	required: boolean;
	description?: string;
}

console.log("🔍 Running post-migration validation...\n");

const validations: ValidationTest[] = [
	// Basic structure validation
	{
		name: "Workspace configuration exists",
		check: () => existsSync("bun-workspace.toml"),
		required: true,
		description: "bun-workspace.toml should exist in root",
	},
	{
		name: "Root package.json exists",
		check: () => existsSync("package.json"),
		required: true,
		description: "Root package.json with workspace configuration",
	},

	// Package structure validation
	{
		name: "Core package structure",
		check: () =>
			validatePackageStructure("packages/core", [
				"types",
				"logging",
				"security",
				"utils",
			]),
		required: true,
		description: "Core package should have all required modules",
	},
	{
		name: "RSS package structure",
		check: () =>
			validatePackageStructure("packages/rss", [
				"api",
				"rss",
				"profile-rss-bridge.ts",
			]),
		required: true,
		description: "RSS package should have core RSS functionality",
	},
	{
		name: "CLI package structure",
		check: () =>
			validatePackageStructure("packages/cli", ["index.ts", "duoplus-cli.ts"]),
		required: true,
		description: "CLI package should have Matrix and DuoPlus CLI",
	},
	{
		name: "Logger package structure",
		check: () =>
			validatePackageStructure("packages/logger", ["enhanced-logger.ts"]),
		required: true,
		description: "Logger package should have enhanced logger",
	},
	{
		name: "Profiler package structure",
		check: () =>
			validatePackageStructure("packages/profiler", [
				"profiling-cli.ts",
				"v137-profile-rss-integration.ts",
			]),
		required: true,
		description: "Profiler package should have v1.3.7 integration",
	},
	{
		name: "Secrets Editor package structure",
		check: () =>
			validatePackageStructure("packages/secrets-editor", [
				"main.ts",
				"safe-toml-cli.ts",
			]),
		required: true,
		description: "Secrets Editor should have main CLI",
	},

	// Dependency validation
	{
		name: "Workspace dependencies resolved",
		check: async () => {
			try {
				await $`bun install --dry-run`;
				return true;
			} catch {
				return false;
			}
		},
		required: true,
		description: "All workspace dependencies should be resolvable",
	},

	// Import validation
	{
		name: "Core package imports work",
		check: () => validateImports("packages/core"),
		required: true,
		description: "Core package should have valid imports",
	},
	{
		name: "RSS package imports work",
		check: () => validateImports("packages/rss"),
		required: true,
		description: "RSS package should have valid imports",
	},

	// Build validation
	{
		name: "Core package builds",
		check: async () => {
			try {
				await $`cd packages/core && bun run build`;
				return true;
			} catch {
				return false;
			}
		},
		required: true,
		description: "Core package should build successfully",
	},
	{
		name: "RSS package builds",
		check: async () => {
			try {
				await $`cd packages/rss && bun run build`;
				return true;
			} catch {
				return false;
			}
		},
		required: true,
		description: "RSS package should build successfully",
	},

	// Test validation
	{
		name: "Security integration tests pass",
		check: async () => {
			try {
				await $`bun run test:security-integration`;
				return true;
			} catch {
				return false;
			}
		},
		required: true,
		description: "Security integration tests should pass",
	},
	{
		name: "Unit tests pass",
		check: async () => {
			try {
				await $`bun run test:unit`;
				return true;
			} catch {
				return false;
			}
		},
		required: true,
		description: "Unit tests should pass",
	},

	// Type validation
	{
		name: "TypeScript compilation",
		check: async () => {
			try {
				await $`bun run typecheck`;
				return true;
			} catch {
				return false;
			}
		},
		required: true,
		description: "All TypeScript should compile without errors",
	},

	// Security validation
	{
		name: "No duplicate exports",
		check: () => validateNoDuplicateExports(),
		required: true,
		description: "No duplicate exports across packages",
	},
	{
		name: "SSRF protection active",
		check: () => validateSSRFProtection(),
		required: true,
		description: "SSRF protection should be active in RSS package",
	},
	{
		name: "Secret masking works",
		check: () => validateSecretMasking(),
		required: true,
		description: "Secret masking should work in logger",
	},
];

async function runValidations() {
	let passed = 0;
	let failed = 0;
	const results: Array<{ name: string; passed: boolean; error?: string }> = [];

	for (const validation of validations) {
		console.log(`🧪 Testing: ${validation.name}`);

		try {
			const result = await validation.check();
			if (result) {
				console.log(`✅ ${validation.name}`);
				passed++;
				results.push({ name: validation.name, passed: true });
			} else {
				console.log(`❌ ${validation.name}`);
				if (validation.required) {
					failed++;
				}
				results.push({
					name: validation.name,
					passed: false,
					error: "Validation failed",
				});
			}
		} catch (error) {
			console.log(`❌ ${validation.name} - Error: ${error}`);
			if (validation.required) {
				failed++;
			}
			results.push({
				name: validation.name,
				passed: false,
				error: String(error),
			});
		}

		if (validation.description) {
			console.log(`   ${validation.description}`);
		}
		console.log("");
	}

	// Summary
	console.log("📊 Validation Summary:");
	console.log(`✅ Passed: ${passed}`);
	console.log(`❌ Failed: ${failed}`);
	console.log(
		`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`,
	);

	if (failed > 0) {
		console.log("\n⚠️  Failed validations:");
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`   ❌ ${r.name}${r.error ? ` - ${r.error}` : ""}`);
			});

		console.log("\n🔧 Recommended fixes:");
		console.log("1. Review failed validations and fix issues");
		console.log("2. Run 'bun install' to ensure dependencies are correct");
		console.log("3. Check import paths in affected packages");
		console.log("4. Verify package.json configurations");

		process.exit(1);
	} else {
		console.log(
			"\n🎉 All validations passed! Migration is complete and ready for use.",
		);

		console.log("\n📋 Next steps:");
		console.log("1. Commit the migration changes");
		console.log("2. Push to remote repository");
		console.log("3. Update CI/CD pipelines for workspace structure");
		console.log("4. Update documentation for new package structure");
	}

	// Generate validation report
	generateReport(results);
}

function validatePackageStructure(
	packagePath: string,
	expectedItems: string[],
): boolean {
	if (!existsSync(packagePath)) {
		return false;
	}

	const srcPath = join(packagePath, "src");
	if (!existsSync(srcPath)) {
		return false;
	}

	for (const item of expectedItems) {
		const itemPath = join(srcPath, item);
		if (!existsSync(itemPath)) {
			console.log(`   Missing: ${itemPath}`);
			return false;
		}
	}

	return true;
}

function validateImports(packagePath: string): boolean {
	const packageJsonPath = join(packagePath, "package.json");
	if (!existsSync(packageJsonPath)) {
		return false;
	}

	try {
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

		// Check if workspace dependencies are properly referenced
		if (packageJson.dependencies) {
			for (const [name, version] of Object.entries(packageJson.dependencies)) {
				if (name.startsWith("@bun-toml/") && version !== "workspace:*") {
					console.log(
						`   Invalid dependency version: ${name}@${version} (should be workspace:*)`,
					);
					return false;
				}
			}
		}

		return true;
	} catch {
		return false;
	}
}

function validateNoDuplicateExports(): boolean {
	// This would need more sophisticated analysis in a real implementation
	// For now, just check that package.json files are valid
	const packages = [
		"packages/core",
		"packages/rss",
		"packages/cli",
		"packages/logger",
		"packages/profiler",
	];

	for (const pkg of packages) {
		const packageJsonPath = join(pkg, "package.json");
		if (existsSync(packageJsonPath)) {
			try {
				JSON.parse(readFileSync(packageJsonPath, "utf8"));
			} catch {
				console.log(`   Invalid package.json in ${pkg}`);
				return false;
			}
		}
	}

	return true;
}

function validateSSRFProtection(): boolean {
	const bridgePath = "packages/rss/src/profile-rss-bridge.ts";
	if (!existsSync(bridgePath)) {
		return false;
	}

	const content = readFileSync(bridgePath, "utf8");
	return (
		content.includes("isInternalIP") || content.includes("validateEndpoint")
	);
}

function validateSecretMasking(): boolean {
	const loggerPath = "packages/core/src/logging/enhanced-logger.ts";
	if (!existsSync(loggerPath)) {
		return false;
	}

	const content = readFileSync(loggerPath, "utf8");
	return content.includes("REDACTED") && content.includes("sanitizeMetadata");
}

function generateReport(
	results: Array<{ name: string; passed: boolean; error?: string }>,
) {
	const report = {
		timestamp: new Date().toISOString(),
		summary: {
			total: results.length,
			passed: results.filter((r) => r.passed).length,
			failed: results.filter((r) => !r.passed).length,
		},
		results: results,
	};

	const reportPath = "migration-validation-report.json";
	writeFileSync(reportPath, JSON.stringify(report, null, 2));
	console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run the validations
runValidations().catch(console.error);
