#!/usr/bin/env bun
/**
 * @fileoverview Publish Graph Monorepo Packages to Private Registry
 * @description Enhanced publish script with OTP (2FA), tags, and dry-run support
 * @module scripts/publish-graph-monorepo
 * 
 * Usage:
 *   # Dry run
 *   bun run scripts/publish-graph-monorepo.ts --dry-run
 * 
 *   # Publish with 2FA
 *   VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --otp=123456
 * 
 *   # Publish beta
 *   VERSION=1.5.0-beta.1 bun run scripts/publish-graph-monorepo.ts --tag=beta
 * 
 *   # Publish with custom registry
 *   VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --registry=https://custom-registry.com
 * 
 *   # Publish with custom CA certificate
 *   VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --cafile=./config/ca-bundle.crt
 * 
 *   # Publish with reduced network concurrency
 *   VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --network-concurrency=16
 * 
 *   # Publish with custom config file
 *   VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --config=./config/prod-bunfig.toml
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import { RSS_REGISTRY_CONFIG } from "../src/utils/rss-constants";

interface PublishOptions {
	version?: string;
	package?: string;
	dryRun?: boolean;
	registry?: string;
	otp?: string;
	tag?: string;
	access?: "public" | "restricted";
	skipValidation?: boolean;
	skipTests?: boolean;
	skipBench?: boolean;
	useChangeset?: boolean;
	ca?: string;
	cafile?: string;
	networkConcurrency?: number;
	config?: string;
}

/**
 * Get version from environment or arguments
 */
function getVersion(dryRun: boolean = false): string {
	const envVersion = process.env.VERSION;
	if (!envVersion) {
		if (dryRun) {
			// Use a placeholder version for dry-run
			return "1.0.0-dry-run";
		}
		console.error("❌ Error: VERSION environment variable is required");
		console.error("   Usage: VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts");
		console.error("   Or use --dry-run to test without a version");
		process.exit(1);
	}
	return envVersion;
}

/**
 * Dependency graph for @graph packages (publish order)
 * Packages are published in dependency order to ensure dependencies are available
 */
const PUBLISH_ORDER = [
	"@graph/types",        // No deps
	"@graph/algorithms",   // depends on types
	"@graph/storage",      // depends on types, algorithms
	"@graph/layer1",       // depends on types, algorithms
	"@graph/layer2",       // depends on types, algorithms, layer1
	"@graph/layer3",       // depends on types, algorithms, layer1, layer2
	"@graph/layer4",       // depends on all above
	"@graph/api",          // depends on all packages
	"@graph/dashboard",    // depends on all packages
] as const;

/**
 * Find all @graph workspace packages
 */
async function findGraphPackages(): Promise<Array<{ name: string; path: string; packageJson: any }>> {
	const packages: Array<{ name: string; path: string; packageJson: any }> = [];
	
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
		try {
			const entries = Array.from(Bun.file(packagesDir).readdirSync());
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const packageJsonPath = join(packagesDir, entry.name, "package.json");
					if (existsSync(packageJsonPath)) {
						const packageJsonText = await Bun.file(packageJsonPath).text();
						const packageJson = JSON.parse(packageJsonText);
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
		} catch {
			// packages/ might not exist or be readable
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
	const packageJsonText = await Bun.file(packageJsonPath).text();
	const packageJson = JSON.parse(packageJsonText);
	
	const oldVersion = packageJson.version;
	packageJson.version = version;
	
	// Update workspace:* dependencies to pinned versions
	if (packageJson.dependencies) {
		for (const [depName, depVersion] of Object.entries(packageJson.dependencies)) {
			if (typeof depVersion === "string" && depVersion.startsWith("workspace:")) {
				// Extract base version (remove -beta.1, etc.)
				const baseVersion = version.split("-")[0];
				packageJson.dependencies[depName] = `workspace:${baseVersion}`;
			}
		}
	}
	
	if (dryRun) {
		console.log(`  [DRY RUN] Would update ${packageJson.name} from ${oldVersion} to ${version}`);
	} else {
		await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
		console.log(`  ✅ Updated ${packageJson.name} from ${oldVersion} to ${version}`);
	}
}

/**
 * Build publish command arguments
 */
function buildPublishArgs(
	registry: string,
	otp?: string,
	tag?: string,
	access: "public" | "restricted" = "restricted",
	ca?: string,
	cafile?: string,
	networkConcurrency?: number,
	config?: string,
): string[] {
	const args: string[] = ["publish"];
	
	// Config file (must come first to override other settings)
	if (config) {
		args.push("--config", config);
	}
	
	// Registry
	if (registry) {
		args.push("--registry", registry);
	}
	
	// OTP (2FA)
	if (otp) {
		args.push("--otp", otp);
	}
	
	// Tag (default: latest, or beta, rc, etc.)
	if (tag) {
		args.push("--tag", tag);
	} else if (process.env.VERSION?.includes("beta")) {
		args.push("--tag", "beta");
	} else if (process.env.VERSION?.includes("rc")) {
		args.push("--tag", "rc");
	} else {
		args.push("--tag", "latest");
	}
	
	// Access (restricted for private packages - best practice)
	args.push("--access", access);
	
	// CA Certificate
	if (ca) {
		args.push("--ca", ca);
	} else if (cafile) {
		args.push("--cafile", cafile);
	}
	
	// Network concurrency
	if (networkConcurrency) {
		args.push("--network-concurrency", networkConcurrency.toString());
	}
	
	return args;
}

/**
 * Validate package before publishing
 */
async function validatePackage(
	packagePath: string,
	packageName: string,
	skipTests: boolean,
	skipBench: boolean,
	dryRun: boolean,
): Promise<boolean> {
	if (dryRun) {
		console.log(`  [DRY RUN] Would validate ${packageName}`);
		return true;
	}
	
	console.log(`  🔍 Validating ${packageName}...`);
	
	// Run tests
	if (!skipTests) {
		try {
			const testResult = await $`cd ${packagePath} && bun test`.quiet();
			if (testResult.exitCode !== 0) {
				console.error(`  ❌ Tests failed for ${packageName}`);
				if (testResult.stderr) {
					console.error(testResult.stderr.toString());
				}
				return false;
			}
			console.log(`  ✅ Tests passed`);
		} catch (error) {
			console.error(`  ❌ Error running tests: ${error}`);
			return false;
		}
	}
	
	// Run benchmarks
	if (!skipBench) {
		try {
			const benchResult = await $`cd ${packagePath} && bun bench`.quiet();
			if (benchResult.exitCode !== 0) {
				console.warn(`  ⚠️  Benchmarks failed (non-blocking)`);
			} else {
				console.log(`  ✅ Benchmarks passed`);
			}
		} catch (error) {
			console.warn(`  ⚠️  Benchmarks skipped (non-blocking)`);
		}
	}
	
	return true;
}

/**
 * Publish package to registry
 */
async function publishPackage(
	packagePath: string,
	packageName: string,
	version: string,
	registry: string,
	otp?: string,
	tag?: string,
	access: "public" | "restricted" = "restricted",
	ca?: string,
	cafile?: string,
	networkConcurrency?: number,
	config?: string,
	dryRun: boolean = false,
): Promise<void> {
	if (dryRun) {
		const publishTag = tag || (version.includes("beta") ? "beta" : version.includes("rc") ? "rc" : "latest");
		console.log(`  [DRY RUN] Would publish ${packageName}@${version} to ${registry}`);
		console.log(`           Tag: ${publishTag}, Access: ${access}${otp ? `, OTP: ${otp}` : ""}`);
		if (cafile) {
			console.log(`           CA File: ${cafile}`);
		}
		if (networkConcurrency) {
			console.log(`           Network Concurrency: ${networkConcurrency}`);
		}
		if (config) {
			console.log(`           Config: ${config}`);
		}
		return;
	}
	
	try {
		console.log(`  📦 Publishing ${packageName}@${version}...`);
		
		const publishArgs = buildPublishArgs(registry, otp, tag, access, ca, cafile, networkConcurrency, config);
		
		// Use bun publish with all arguments
		const result = await $`cd ${packagePath} && bun ${publishArgs}`.quiet();
		
		if (result.exitCode === 0) {
			const publishTag = tag || (version.includes("beta") ? "beta" : version.includes("rc") ? "rc" : "latest");
			console.log(`  ✅ Published ${packageName}@${version} (tag: ${publishTag}, access: ${access})`);
		} else {
			// Show error output
			if (result.stderr) {
				console.error(result.stderr.toString());
			}
			console.error(`  ❌ Failed to publish ${packageName}@${version}`);
			process.exit(1);
		}
	} catch (error: any) {
		// Show error details
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
		console.error(`  ❌ Error publishing ${packageName}:`, error.message || error);
		process.exit(1);
	}
}

/**
 * Determine publish tag from version
 */
function determineTag(version: string, explicitTag?: string): string {
	if (explicitTag) {
		return explicitTag;
	}
	if (version.includes("beta")) {
		return "beta";
	}
	if (version.includes("rc")) {
		return "rc";
	}
	if (version.includes("alpha")) {
		return "alpha";
	}
	return "latest";
}


/**
 * Main publish function
 */
async function publishGraphMonorepo(options: PublishOptions = {}): Promise<void> {
	const dryRun = options.dryRun || false;
	const version = options.version || getVersion(dryRun);
	const targetPackage = options.package;
	const registry = options.registry || RSS_REGISTRY_CONFIG.PRIVATE_REGISTRY;
	const otp = options.otp;
	const tag = options.tag || determineTag(version);
	const access = options.access || "restricted"; // Best practice: restricted for private packages
	const skipValidation = options.skipValidation || false;
	const skipTests = options.skipTests || false;
	const skipBench = options.skipBench || false;
	const useChangeset = options.useChangeset !== false; // Default: true if available
	const ca = options.ca;
	const cafile = options.cafile;
	const networkConcurrency = options.networkConcurrency;
	const config = options.config;
	
	console.log("🚀 Publishing @graph monorepo packages\n");
	console.log(`   Version: ${version}`);
	console.log(`   Registry: ${registry}`);
	console.log(`   Tag: ${tag}`);
	console.log(`   Access: ${access} (${access === "restricted" ? "private packages" : "public packages"})`);
	if (otp) {
		console.log(`   OTP: ${otp.substring(0, 2)}****`);
	}
	if (cafile) {
		console.log(`   CA File: ${cafile}`);
	}
	if (networkConcurrency) {
		console.log(`   Network Concurrency: ${networkConcurrency}`);
	}
	if (config) {
		console.log(`   Config: ${config}`);
	}
	console.log(`   Mode: ${dryRun ? "DRY RUN" : "PUBLISH"}\n`);
	
	// Best Practice: Pre-publish checks (outdated, audit)
	if (!dryRun && !skipValidation) {
		console.log("🔍 Running pre-publish checks...\n");
		
		// Check for outdated packages
		try {
			console.log("📦 Checking for outdated packages...");
			const outdatedResult = await $`bun outdated`.quiet();
			if (outdatedResult.stdout) {
				const output = outdatedResult.stdout.toString();
				if (output.trim()) {
					console.warn("⚠️  Some packages are outdated:");
					console.log(output);
				} else {
					console.log("✅ All packages are up to date");
				}
			}
		} catch (error) {
			console.warn("⚠️  Could not check outdated packages");
		}
		
		// Run security audit
		try {
			console.log("\n🔒 Running security audit...");
			const auditResult = await $`bun audit`.quiet();
			if (auditResult.exitCode !== 0) {
				console.error("❌ Security audit found vulnerabilities!");
				if (auditResult.stderr) {
					console.error(auditResult.stderr.toString());
				}
				console.error("\n💡 Fix vulnerabilities before publishing:");
				console.error("   bun audit --fix");
				if (!options.skipValidation) {
					process.exit(1);
				}
			} else {
				console.log("✅ Security audit passed");
			}
		} catch (error) {
			console.warn("⚠️  Could not run security audit");
		}
		
		console.log();
	}
	
	// Best Practice: Use changeset for versioning (if available)
	if (useChangeset && !dryRun) {
		const changesetConfigExists = existsSync(".changeset") || existsSync("changeset.json");
		if (changesetConfigExists) {
			console.log("📝 Using changeset for versioning...\n");
			try {
				const changesetResult = await $`bun changeset version`.quiet();
				if (changesetResult.exitCode === 0) {
					console.log("✅ Changeset version updated\n");
				}
			} catch (error) {
				console.warn("⚠️  Changeset version failed, using manual version\n");
			}
		}
	}
	
	// Find all @graph packages
	const packages = await findGraphPackages();
	
	if (packages.length === 0) {
		console.log("⚠️  No @graph packages found in workspace");
		console.log("   Make sure packages are in workspaces array in package.json");
		return;
	}
	
	console.log(`📦 Found ${packages.length} package(s):`);
	packages.forEach((pkg) => console.log(`   - ${pkg.name}`));
	console.log();
	
	// Filter by target package if specified
	let packagesToPublish = targetPackage
		? packages.filter((pkg) => pkg.name === targetPackage)
		: packages;
	
	// Sort packages by dependency order (if not targeting a specific package)
	if (!targetPackage && packagesToPublish.length > 1) {
		const packageMap = new Map(packagesToPublish.map((pkg) => [pkg.name, pkg]));
		const orderedPackages: Array<{ name: string; path: string; packageJson: any }> = [];
		
		// Add packages in dependency order
		for (const packageName of PUBLISH_ORDER) {
			const pkg = packageMap.get(packageName);
			if (pkg) {
				orderedPackages.push(pkg);
				packageMap.delete(packageName);
			}
		}
		
		// Add any remaining packages (not in PUBLISH_ORDER)
		for (const pkg of packageMap.values()) {
			orderedPackages.push(pkg);
		}
		
		packagesToPublish = orderedPackages;
		console.log("📋 Publishing in dependency order:");
		packagesToPublish.forEach((pkg, idx) => console.log(`   ${idx + 1}. ${pkg.name}`));
		console.log();
	}
	
	if (packagesToPublish.length === 0) {
		console.error(`❌ Package ${targetPackage} not found`);
		process.exit(1);
	}
	
	// Update versions and publish
	for (const pkg of packagesToPublish) {
		console.log(`\n📝 Processing ${pkg.name}...`);
		
		// Best Practice: Validate before publish
		if (!skipValidation && !dryRun) {
			const isValid = await validatePackage(pkg.path, pkg.name, skipTests, skipBench, dryRun);
			if (!isValid) {
				console.error(`\n❌ Validation failed for ${pkg.name}. Skipping publish.`);
				process.exit(1);
			}
		}
		
		// Update version
		await updatePackageVersion(pkg.path, version, dryRun);
		
		// Publish
		await publishPackage(
			pkg.path,
			pkg.name,
			version,
			registry,
			otp,
			tag,
			access,
			ca,
			cafile,
			networkConcurrency,
			config,
			dryRun,
		);
	}
	
	console.log("\n✅ Publishing complete!");
	
	if (dryRun) {
		console.log("\n💡 This was a dry run. To actually publish, remove --dry-run flag.");
	} else {
		console.log(`\n📦 Published packages are available at:`);
		console.log(`   ${registry}/-/web/detail/@graph`);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: PublishOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--dry-run" || arg === "-d") {
			options.dryRun = true;
		} else if (arg === "--package" || arg === "-p") {
			if (i + 1 < args.length) {
				options.package = args[++i];
			}
		} else if (arg === "--registry" || arg === "-r") {
			if (i + 1 < args.length) {
				options.registry = args[++i];
			}
		} else if (arg.startsWith("--otp=")) {
			options.otp = arg.split("=")[1];
		} else if (arg === "--otp" || arg === "-o") {
			if (i + 1 < args.length) {
				options.otp = args[++i];
			}
		} else if (arg.startsWith("--tag=")) {
			options.tag = arg.split("=")[1];
		} else if (arg === "--tag" || arg === "-t") {
			if (i + 1 < args.length) {
				options.tag = args[++i];
			}
		} else if (arg.startsWith("--access=")) {
			const accessValue = arg.split("=")[1];
			if (accessValue === "public" || accessValue === "restricted") {
				options.access = accessValue as "public" | "restricted";
			}
		} else if (arg === "--access" || arg === "-a") {
			if (i + 1 < args.length) {
				const accessValue = args[++i];
				if (accessValue === "public" || accessValue === "restricted") {
					options.access = accessValue as "public" | "restricted";
				}
			}
		} else if (arg === "--skip-validation") {
			options.skipValidation = true;
		} else if (arg === "--skip-tests") {
			options.skipTests = true;
		} else if (arg === "--skip-bench") {
			options.skipBench = true;
		} else if (arg === "--no-changeset") {
			options.useChangeset = false;
		} else if (arg.startsWith("--ca=")) {
			options.ca = arg.split("=")[1];
		} else if (arg === "--ca") {
			if (i + 1 < args.length) {
				options.ca = args[++i];
			}
		} else if (arg.startsWith("--cafile=")) {
			options.cafile = arg.split("=")[1];
		} else if (arg === "--cafile") {
			if (i + 1 < args.length) {
				options.cafile = args[++i];
			}
		} else if (arg.startsWith("--network-concurrency=")) {
			options.networkConcurrency = parseInt(arg.split("=")[1], 10);
		} else if (arg === "--network-concurrency" || arg === "-n") {
			if (i + 1 < args.length) {
				options.networkConcurrency = parseInt(args[++i], 10);
			}
		} else if (arg.startsWith("--config=")) {
			options.config = arg.split("=")[1];
		} else if (arg === "--config" || arg === "-c") {
			if (i + 1 < args.length) {
				options.config = args[++i];
			}
		}
	}

// Run if executed directly
if (import.meta.main) {
	publishGraphMonorepo(options).catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
