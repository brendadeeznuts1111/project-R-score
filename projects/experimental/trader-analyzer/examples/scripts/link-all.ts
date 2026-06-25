#!/usr/bin/env bun
/**
 * Link All Packages Script
 * 
 * Links all NEXUS Radiance packages into all apps.
 * Run this after git checkout or when setting up a new environment.
 * 
 * Usage:
 *   bun run examples/scripts/link-all.ts
 * 
 * Benchmarking:
 *   bun --cpu-prof run examples/scripts/link-all.ts
 *   bun run scripts/benchmarks/create-benchmark.ts \
 *     --profile=link-all.cpuprofile \
 *     --name="Link All Packages" \
 *     --tags="monorepo,link"
 * 
 * @see {@link ../benchmarks/README.md|Benchmarks} - Performance benchmarking guide
 */

import { $ } from "bun";

const MONOREPO_ROOT = import.meta.dir + "/../../";

const PACKAGES = [
	"@nexus-radiance/core",
	"@nexus-radiance/graph-engine",
	"@nexus-radiance/router",
	"@nexus-radiance/profiling",
	"@nexus-radiance/mcp-tools",
	"@nexus-radiance/dashboard",
] as const;

const APPS = [
	{ name: "nexus-cli", path: "apps/cli" },
	{ name: "radiance-api", path: "apps/api" },
	{ name: "telegram-miniapp", path: "apps/miniapp" },
] as const;

console.info("🔗 Linking all packages into apps...\n");

// First, register all packages
console.info("📦 Step 1: Registering packages...\n");
for (const pkg of PACKAGES) {
	const pkgName = pkg.replace("@nexus-radiance/", "");
	const pkgPath = MONOREPO_ROOT + `packages/${pkgName}`;

	try {
		await $`cd ${pkgPath} && bun link`.quiet();
		console.info(`  ✅ Registered ${pkg}`);
	} catch (error: any) {
		console.error(`  ⚠️  ${pkg} may already be registered: ${error.message}`);
	}
}

console.info("\n🔗 Step 2: Linking packages into apps...\n");

// Then link them into apps
for (const app of APPS) {
	const appPath = MONOREPO_ROOT + app.path;
	console.info(`  → Linking into ${app.name}...`);

	for (const pkg of PACKAGES) {
		try {
			await $`cd ${appPath} && bun link ${pkg} --save`.quiet();
			console.info(`    ✅ Linked ${pkg}`);
		} catch (error: any) {
			console.error(`    ⚠️  ${pkg} may already be linked: ${error.message}`);
		}
	}
}

console.info("\n✅ All packages linked!\n");
