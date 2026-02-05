#!/usr/bin/env bun
/**
 * Publish Dry Run - Test publish without actually publishing
 *
 * Usage:
 *   bun cmds/publish-dry-run.ts [options]
 */

const args = process.argv.slice(2);

console.log("🔨 Building all platform binaries...");
const buildProc = Bun.spawn(["bun", "run", "build:all"], {
	stdout: "inherit",
	stderr: "inherit",
	cwd: process.cwd(),
});

const buildExitCode = await buildProc.exited;
if (buildExitCode !== 0) {
	console.error("❌ Build failed.");
	process.exit(buildExitCode);
}

console.log("\n📦 Testing publish (dry run)...");
const publishProc = Bun.spawn(["bun", "publish", "--dry-run", ...args], {
	stdout: "inherit",
	stderr: "inherit",
	cwd: process.cwd(),
	env: process.env,
});

await publishProc.exited;
