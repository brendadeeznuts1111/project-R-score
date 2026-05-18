#!/usr/bin/env bun
/**
 * Unlink All Packages Script
 * 
 * Unlinks all packages from apps and unregisters them.
 * Useful before production builds or when switching branches.
 * 
 * ✅ Safe & Reversible: This only removes symlinks and unregisters packages.
 * Your code and package.json remain intact. You can always relink later.
 * 
 * Usage:
 *   bun run examples/scripts/unlink-all.ts
 * 
 * Benchmarking:
 *   bun --cpu-prof run examples/scripts/unlink-all.ts
 *   bun run scripts/benchmarks/create-benchmark.ts \
 *     --profile=unlink-all.cpuprofile \
 *     --name="Unlink All Packages" \
 *     --tags="monorepo,unlink"
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

console.info("🔓 Unlinking all packages...\n");

// First, unlink from apps
console.info("📱 Step 1: Unlinking from apps...\n");
for (const app of APPS) {
	const appPath = MONOREPO_ROOT + app.path;
	console.info(`  → Unlinking from ${app.name}...`);

	for (const pkg of PACKAGES) {
		try {
			await $`cd ${appPath} && bun unlink ${pkg}`.quiet();
			console.info(`    ✅ Unlinked ${pkg}`);
		} catch (error: any) {
			// Ignore errors (package may not be linked)
		}
	}
}

console.info("\n📦 Step 2: Unregistering packages...\n");

// Then unregister packages
for (const pkg of PACKAGES) {
	const pkgName = pkg.replace("@nexus-radiance/", "");
	const pkgPath = MONOREPO_ROOT + `packages/${pkgName}`;

	try {
		await $`cd ${pkgPath} && bun unlink`.quiet();
		console.info(`  ✅ Unregistered ${pkg}`);
	} catch (error: any) {
		// Ignore errors (package may not be registered)
	}
}

console.info("\n✅ All packages unlinked!\n");
console.info("💡 To relink for development:\n");
console.info("   bun run examples/scripts/link-all.ts\n");
