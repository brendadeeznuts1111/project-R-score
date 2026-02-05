#!/usr/bin/env bun
/**
 * Publish command - Wrapper for bun publish with cross-platform build support
 *
 * Usage:
 *   bun cmds/publish.ts [options]
 *
 * Examples:
 *   bun cmds/publish.ts                    # Standard publish
 *   bun cmds/publish.ts --dry-run          # Test without publishing
 *   bun cmds/publish.ts --tag beta         # Publish with tag
 *   bun cmds/publish.ts --tolerate-republish  # CI/CD friendly
 */

const args = process.argv.slice(2);

// Check if we should build first (unless --no-build is specified)
const shouldBuild =
	!args.includes("--no-build") && !args.includes("--skip-build");

if (shouldBuild) {
	console.log("🔨 Building all platform binaries...");
	const buildProc = Bun.spawn(["bun", "run", "build:all"], {
		stdout: "inherit",
		stderr: "inherit",
	});

	await buildProc.exited;

	if (buildProc.exitCode !== 0) {
		console.error("❌ Build failed. Aborting publish.");
		process.exit(1);
	}

	console.log("✅ All binaries built successfully\n");
}

// Prepare bun publish command
const publishArgs = args.filter(
	(arg) => arg !== "--no-build" && arg !== "--skip-build",
);
const publishCmd = ["bun", "publish", ...publishArgs];

console.log(`📦 Publishing package...`);
console.log(`   Command: ${publishCmd.join(" ")}\n`);

// Execute bun publish
const publishProc = Bun.spawn(publishCmd, {
	stdout: "inherit",
	stderr: "inherit",
	env: process.env,
});

await publishProc.exited;

if (publishProc.exitCode === 0) {
	console.log("\n✅ Package published successfully!");
} else {
	console.error("\n❌ Publish failed");
	process.exit(publishProc.exitCode || 1);
}
