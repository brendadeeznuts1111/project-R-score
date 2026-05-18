#!/usr/bin/env bun
/**
 * CI/CD Publish command - Optimized for automated publishing
 *
 * Usage:
 *   NPM_CONFIG_TOKEN=token bun cmds/publish-ci.ts [options]
 *
 * Features:
 *   - Automatically uses --tolerate-republish for CI/CD
 *   - Supports NPM_CONFIG_TOKEN environment variable
 *   - Builds all platforms before publishing
 *   - Exits gracefully on republish
 */

const args = process.argv.slice(2);

// Check for NPM_CONFIG_TOKEN
if (!process.env.NPM_CONFIG_TOKEN && !process.env.NPM_TOKEN) {
	console.warn(
		"⚠️  Warning: NPM_CONFIG_TOKEN not set. Publishing may require authentication.",
	);
}

// Build all platforms
console.info("🔨 Building all platform binaries...");
const buildProc = Bun.spawn(["bun", "run", "build:all"], {
	stdout: "inherit",
	stderr: "inherit",
});

await buildProc.exited;

if (buildProc.exitCode !== 0) {
	console.error("❌ Build failed. Aborting publish.");
	process.exit(1);
}

console.info("✅ All binaries built successfully\n");

// Prepare publish command with CI/CD optimizations
const publishArgs = [
	"--tolerate-republish", // Don't fail if version exists
	...args.filter((arg) => arg !== "--tolerate-republish"), // Allow override
];

// Add tag if specified, otherwise use latest
if (!args.includes("--tag")) {
	// Could add logic to determine tag from branch/version
}

const publishCmd = ["bun", "publish", ...publishArgs];

console.info(`📦 Publishing package (CI/CD mode)...`);
console.info(`   Command: ${publishCmd.join(" ")}`);
if (process.env.NPM_CONFIG_TOKEN || process.env.NPM_TOKEN) {
	console.info(`   ✅ Using NPM_CONFIG_TOKEN for authentication`);
}
console.info();

// Execute bun publish
const publishProc = Bun.spawn(publishCmd, {
	stdout: "inherit",
	stderr: "inherit",
	env: {
		...process.env,
		// Support both NPM_CONFIG_TOKEN and NPM_TOKEN
		NPM_CONFIG_TOKEN: process.env.NPM_CONFIG_TOKEN || process.env.NPM_TOKEN,
	},
});

await publishProc.exited;

if (publishProc.exitCode === 0) {
	console.info("\n✅ Package published successfully!");
} else {
	// Even on error, check if it was just a republish
	console.error("\n❌ Publish failed");
	process.exit(publishProc.exitCode || 1);
}
