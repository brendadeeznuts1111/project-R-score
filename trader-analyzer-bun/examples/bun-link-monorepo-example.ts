#!/usr/bin/env bun
/**
 * 17.18.0.0.0.0.0 — NEXUS Radiance Monorepo with `bun link`
 * Zero-Friction Development Example
 *
 * This example demonstrates Bun v1.3.4's `bun link` feature for
 * instant, symlink-based local package development in a monorepo.
 *
 * @file examples/bun-link-monorepo-example.ts
 * @see {@link https://bun.com/docs/cli/link|Bun Link Documentation}
 * @see {@link ./README-bun-link-monorepo.md|Complete Documentation}
 * @see {@link ./COMMANDS.md|Commands Reference}
 * @see {@link ../benchmarks/README.md|Benchmarks} - Performance benchmarking guide
 * @see {@link ../docs/BUN-V1.51-IMPACT-ANALYSIS.md|Bun v1.51 Impact Analysis} - Performance optimizations
 *
 * Usage:
 *   bun run examples/bun-link-monorepo-example.ts setup
 *   bun run examples/bun-link-monorepo-example.ts dev
 *   bun run examples/bun-link-monorepo-example.ts unlink
 *
 * Benchmarking:
 *   bun --cpu-prof run examples/bun-link-monorepo-example.ts setup
 *   bun run scripts/benchmarks/create-benchmark.ts \
 *     --profile=setup.cpuprofile \
 *     --name="Monorepo Setup Baseline" \
 *     --tags="monorepo,setup"
 */

import { $ } from "bun";

// ═══════════════════════════════════════════════════════════════
// Constants (UPPER_SNAKE_CASE)
// ═══════════════════════════════════════════════════════════════

/** Root directory path for monorepo */
const MONOREPO_ROOT = import.meta.dir + "/../";

/** Packages directory path */
const PACKAGES_DIR = MONOREPO_ROOT + "packages";

/** Applications directory path */
const APPS_DIR = MONOREPO_ROOT + "apps";

// Package definitions for the NEXUS Radiance monorepo
const PACKAGES = [
	{
		name: "@nexus-radiance/core",
		path: "packages/core",
		description: "Core radiance utilities and MultiLayerCorrelationGraph",
	},
	{
		name: "@nexus-radiance/graph-engine",
		path: "packages/graph-engine",
		description: "Graph correlation engine",
	},
	{
		name: "@nexus-radiance/router",
		path: "packages/radiance-router",
		description: "URLPattern-based router (Bun v1.3.4)",
	},
	{
		name: "@nexus-radiance/profiling",
		path: "packages/profiling-system",
		description: "CPU profiling and performance monitoring",
	},
	{
		name: "@nexus-radiance/mcp-tools",
		path: "packages/mcp-tools",
		description: "MCP tools registry",
	},
	{
		name: "@nexus-radiance/dashboard",
		path: "packages/dashboard",
		description: "Dashboard components",
	},
] as const;

const APPS = [
	{
		name: "nexus-cli",
		path: "apps/cli",
		description: "CLI application using all packages",
		dependencies: [
			"@nexus-radiance/core",
			"@nexus-radiance/graph-engine",
			"@nexus-radiance/router",
			"@nexus-radiance/profiling",
		],
	},
	{
		name: "radiance-api",
		path: "apps/api",
		description: "Bun.serve API server",
		dependencies: [
			"@nexus-radiance/core",
			"@nexus-radiance/router",
			"@nexus-radiance/profiling",
		],
	},
	{
		name: "telegram-miniapp",
		path: "apps/miniapp",
		description: "Telegram Mini App",
		dependencies: [
			"@nexus-radiance/core",
			"@nexus-radiance/dashboard",
		],
	},
] as const;

/**
 * 17.18.1.0.0.0.0 — One-Time Setup
 * Registers all packages with `bun link` and links them into apps
 */
async function setupMonorepo() {
	console.log("🚀 Setting up NEXUS Radiance Monorepo with bun link\n");

	// Step 1: Register all packages
	console.log("📦 Step 1: Registering packages with bun link...\n");
	for (const pkg of PACKAGES) {
		const pkgPath = MONOREPO_ROOT + pkg.path;
		console.log(`  → Registering ${pkg.name}...`);

		try {
			// Check if package.json exists
			const packageJsonPath = pkgPath + "/package.json";
			const packageJsonFile = Bun.file(packageJsonPath);

			if (!(await packageJsonFile.exists())) {
				console.log(`    ⚠️  Creating package.json for ${pkg.name}`);
				await createPackageJson(pkg.name, pkg.path);
			}

			// Register the package
			const result = await $`cd ${pkgPath} && bun link`.quiet();
			console.log(`    ✅ Registered ${pkg.name}`);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`    ❌ Failed to register ${pkg.name}: ${message}`);
		}
	}

	console.log("\n");

	// Step 2: Link packages into apps
	console.log("🔗 Step 2: Linking packages into apps...\n");
	for (const app of APPS) {
		const appPath = MONOREPO_ROOT + app.path;
		console.log(`  → Linking dependencies into ${app.name}...`);

		try {
			// Ensure app directory exists
			await $`mkdir -p ${appPath}`.quiet();

			// Check if package.json exists
			const packageJsonPath = appPath + "/package.json";
			const packageJsonFile = Bun.file(packageJsonPath);

			if (!(await packageJsonFile.exists())) {
				console.log(`    ⚠️  Creating package.json for ${app.name}`);
				await createAppPackageJson(app.name, app.dependencies);
			}

			// Link all dependencies
			for (const dep of app.dependencies) {
				try {
					const linkResult = await $`cd ${appPath} && bun link ${dep} --save`.quiet();
					console.log(`    ✅ Linked ${dep} → ${app.name}`);
				} catch (error: unknown) {
					const message = error instanceof Error ? error.message : String(error);
					console.error(`    ⚠️  ${dep} may already be linked: ${message}`);
				}
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`    ❌ Failed to link dependencies into ${app.name}: ${message}`);
		}
	}

	console.log("\n✅ Monorepo setup complete!\n");
	console.log("📝 Next steps:");
	console.log("   1. Edit packages in packages/*/src/");
	console.log("   2. Changes are instantly available in apps via symlinks");
	console.log("   3. Run 'bun run examples/bun-link-monorepo-example.ts dev' for dev mode");
}

/**
 * Create a package.json for a package
 */
async function createPackageJson(name: string, path: string) {
	const packageJson = {
		name,
		version: "17.18.0.0.0.0.0",
		description: `NEXUS Radiance package: ${name}`,
		type: "module",
		main: "src/index.ts",
		scripts: {
			dev: "bun --watch run src/index.ts",
			build: "bun build src/index.ts --outdir dist",
		},
		exports: {
			".": "./src/index.ts",
		},
	};

	const pkgPath = MONOREPO_ROOT + path;
	await $`mkdir -p ${pkgPath}/src`.quiet();
	await Bun.write(pkgPath + "/package.json", JSON.stringify(packageJson, null, 2));

	// Create a simple index.ts
	const indexContent = `/**
 * ${name}
 * NEXUS Radiance Package
 */

export function radiance() {
	return "✨ Radiance from ${name}";
}

export default {
	radiance,
	version: "17.18.0.0.0.0.0",
};
`;
	await Bun.write(pkgPath + "/src/index.ts", indexContent);
}

/**
 * Create a package.json for an app
 */
async function createAppPackageJson(name: string, dependencies: readonly string[]) {
	const packageJson = {
		name,
		version: "17.18.0.0.0.0.0",
		description: `NEXUS Radiance app: ${name}`,
		type: "module",
		main: "src/index.ts",
		scripts: {
			dev: "bun --watch run src/index.ts",
			start: "bun run src/index.ts",
		},
		dependencies: {} as Record<string, string>,
	};

	// Dependencies will be added by bun link --save
	const appPath = MONOREPO_ROOT + `apps/${name.split("-")[1]}`;
	await $`mkdir -p ${appPath}/src`.quiet();
	await Bun.write(appPath + "/package.json", JSON.stringify(packageJson, null, 2));

	// Create a simple index.ts that imports from linked packages
	const imports = dependencies.map((dep) => `import ${dep.replace("@nexus-radiance/", "").replace("-", "")} from "${dep}";`).join("\n");
	const calls = dependencies.map((dep) => {
		const varName = dep.replace("@nexus-radiance/", "").replace("-", "");
		return `  ${varName}.radiance();`;
	}).join("\n");

	const indexContent = `/**
 * ${name}
 * NEXUS Radiance App
 */

${imports}

console.log("🚀 ${name} starting...");
console.log("📦 Linked packages:");
${calls}
console.log("✅ ${name} ready!");
`;
	await Bun.write(appPath + "/src/index.ts", indexContent);
}

/**
 * 17.18.2.0.0.0.0 — Zero-Latency Development Loop
 * Demonstrates instant hot-reload with symlinks
 */
async function devMode() {
	console.log("🔥 Zero-Latency Development Mode\n");
	console.log("📝 Instructions:");
	console.log("   Terminal 1: Edit packages/*/src/index.ts");
	console.log("   Terminal 2: Run apps (changes appear instantly via symlinks)");
	console.log("   Terminal 3: Watch for changes\n");

	console.log("🔍 Checking linked packages...\n");

	for (const app of APPS) {
		const appPath = MONOREPO_ROOT + app.path;
		const packageJsonPath = appPath + "/package.json";

		try {
			const packageJsonFile = Bun.file(packageJsonPath);
			if (await packageJsonFile.exists()) {
				const packageJson = await packageJsonFile.json();
				const linkedDeps = Object.entries(packageJson.dependencies || {})
					.filter(([_, version]) => typeof version === "string" && version.startsWith("link:"))
					.map(([name]) => name);

				if (linkedDeps.length > 0) {
					console.log(`  ✅ ${app.name}:`);
					for (const dep of linkedDeps) {
						console.log(`     → ${dep} (symlinked)`);
					}
				}
			}
		} catch (error) {
			// Ignore errors
		}
	}

	console.log("\n💡 Development workflow:");
	console.log("   1. Edit package code → Changes instantly visible");
	console.log("   2. No rebuild needed → Pure symlink radiance");
	console.log("   3. Hot reload works → Bun --watch detects changes");
	console.log("   4. Zero latency → Changes propagate at symlink speed\n");
}

/**
 * 17.18.3.0.0.0.0 — Production Deployment
 * Shows how to ensure clean registry resolution
 */
async function productionMode() {
	console.log("🏭 Production Deployment Mode\n");
	console.log("📝 To deploy without link: dependencies:\n");
	console.log("   1. Use --no-link flag:");
	console.log("      bun install --no-link\n");
	console.log("   2. Or install from registry:");
	console.log("      bun install --production\n");
	console.log("   3. Or remove link: entries before install:");
	console.log("      bun run examples/bun-link-monorepo-example.ts unlink");
	console.log("      bun install\n");
	console.log("✅ All link: dependencies will resolve from npm/tarballs\n");
}

/**
 * Unlink all packages
 * 
 * ✅ Safe & Reversible: This only removes symlinks and unregisters packages.
 * Your code and package.json remain intact. You can always relink later.
 */
async function unlinkAll() {
	console.log("🔓 Unlinking all packages...\n");
	console.log("✅ Safe: This only removes symlinks, no files are deleted.\n");
	console.log("🔄 Reversible: Relink anytime with 'bun run examples/scripts/link-all.ts'\n");

	// Unlink from apps
	for (const app of APPS) {
		const appPath = MONOREPO_ROOT + app.path;
		console.log(`  → Unlinking from ${app.name}...`);

		try {
			const packageJsonPath = appPath + "/package.json";
			const packageJsonFile = Bun.file(packageJsonPath);

			if (await packageJsonFile.exists()) {
				const packageJson = await packageJsonFile.json();
				const linkedDeps = Object.entries(packageJson.dependencies || {})
					.filter(([_, version]) => typeof version === "string" && version.startsWith("link:"))
					.map(([name]) => name);

				for (const dep of linkedDeps) {
					try {
						await $`cd ${appPath} && bun unlink ${dep}`.quiet();
						console.log(`    ✅ Unlinked ${dep}`);
					} catch (error) {
						// Ignore errors
					}
				}
			}
		} catch (error) {
			// Ignore errors
		}
	}

	// Unregister packages
	console.log("\n  → Unregistering packages...\n");
	for (const pkg of PACKAGES) {
		const pkgPath = MONOREPO_ROOT + pkg.path;
		try {
			await $`cd ${pkgPath} && bun unlink`.quiet();
			console.log(`    ✅ Unregistered ${pkg.name}`);
		} catch (error) {
			// Ignore errors
		}
	}

	console.log("\n✅ All packages unlinked\n");
	console.log("💡 To relink for development:\n");
	console.log("   bun run examples/scripts/link-all.ts\n");
}

/**
 * Show status of linked packages
 */
async function status() {
	console.log("📊 Monorepo Link Status\n");

	console.log("📦 Packages:");
	for (const pkg of PACKAGES) {
		const pkgPath = MONOREPO_ROOT + pkg.path;
		const packageJsonPath = pkgPath + "/package.json";
		const packageJsonFile = Bun.file(packageJsonPath);

		if (await packageJsonFile.exists()) {
			console.log(`  ✅ ${pkg.name} (${pkg.path})`);
		} else {
			console.log(`  ⚠️  ${pkg.name} (not created)`);
		}
	}

	console.log("\n📱 Apps:");
	for (const app of APPS) {
		const appPath = MONOREPO_ROOT + app.path;
		const packageJsonPath = appPath + "/package.json";
		const packageJsonFile = Bun.file(packageJsonPath);

		if (await packageJsonFile.exists()) {
			const packageJson = await packageJsonFile.json();
			const linkedDeps = Object.entries(packageJson.dependencies || {})
				.filter(([_, version]) => typeof version === "string" && version.startsWith("link:"))
				.map(([name]) => name);

			if (linkedDeps.length > 0) {
				console.log(`  ✅ ${app.name}:`);
				for (const dep of linkedDeps) {
					console.log(`     → ${dep} (linked)`);
				}
			} else {
				console.log(`  ⚠️  ${app.name} (no linked dependencies)`);
			}
		} else {
			console.log(`  ⚠️  ${app.name} (not created)`);
		}
	}

	console.log("");
}

// CLI interface
const command = process.argv[2] || "help";
const isInteractive = process.argv.includes("--interactive");

if (isInteractive) {
	// Interactive mode - provide JSON output for web interface
	const action = process.argv[3] || "status";
	
	switch (action) {
		case "check-prereq":
			try {
				const bunVersion = Bun.version;
				console.log(JSON.stringify({
					success: true,
					bunVersion,
					ready: true,
					message: "Prerequisites check complete"
				}));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(JSON.stringify({
					success: false,
					error: message
				}));
			}
			break;
		case "setup":
			try {
				await setupMonorepo();
				console.log(JSON.stringify({ success: true, message: "Setup complete" }));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(JSON.stringify({ success: false, error: message }));
			}
			break;
		case "status":
			try {
				await status();
				console.log(JSON.stringify({ success: true, message: "Status check complete" }));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(JSON.stringify({ success: false, error: message }));
			}
			break;
		case "unlink":
			try {
				await unlinkAll();
				console.log(JSON.stringify({ success: true, message: "Unlink complete" }));
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(JSON.stringify({ success: false, error: message }));
			}
			break;
		default:
			console.log(JSON.stringify({ success: false, error: "Unknown action" }));
	}
	process.exit(0);
}

switch (command) {
	case "setup":
		await setupMonorepo();
		break;
	case "dev":
		await devMode();
		break;
	case "production":
	case "prod":
		await productionMode();
		break;
	case "unlink":
		await unlinkAll();
		break;
	case "status":
		await status();
		break;
	case "help":
	default:
		console.log("17.18.0.0.0.0.0 — NEXUS Radiance Monorepo with bun link\n");
		console.log("Usage:");
		console.log("  bun run examples/bun-link-monorepo-example.ts setup      # One-time setup");
		console.log("  bun run examples/bun-link-monorepo-example.ts dev        # Development mode info");
		console.log("  bun run examples/bun-link-monorepo-example.ts status      # Show link status");
		console.log("  bun run examples/bun-link-monorepo-example.ts unlink     # Unlink all packages (safe)");
		console.log("  bun run examples/bun-link-monorepo-example.ts production # Production deployment info");
		console.log("\nInteractive Mode:");
		console.log("  bun run examples/bun-link-monorepo-example.ts --interactive <action>");
		console.log("  Actions: check-prereq, setup, status, unlink");
		console.log("\nHelper Scripts:");
		console.log("  bun run examples/scripts/link-all.ts    # Link all packages");
		console.log("  bun run examples/scripts/unlink-all.ts # Unlink all packages");
		console.log("\nDocumentation:");
		console.log("  📚 docs/BUN-LINK.md - Complete bun link guide");
		console.log("  🌐 examples/bun-link-monorepo-interactive.html - Interactive guide");
		console.log("  📋 examples/COMMANDS.md - All commands reference");
		break;
}
