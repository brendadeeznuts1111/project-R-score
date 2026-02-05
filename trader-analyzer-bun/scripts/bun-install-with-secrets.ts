#!/usr/bin/env bun
/**
 * @fileoverview Bun Install Wrapper with Bun.secrets Integration
 * @description Loads registry credentials from Bun.secrets before running bun install
 * 
 * Usage:
 *   bun run scripts/bun-install-with-secrets.ts [bun install args...]
 * 
 * This script:
 * 1. Loads registry credentials from Bun.secrets
 * 2. Sets them as environment variables
 * 3. Runs bun install with the provided arguments
 * 
 * Benefits:
 * - No need to store tokens in .env.local files
 * - Credentials encrypted at rest by OS credential manager
 * - Works seamlessly with bunfig.toml scoped registry configuration
 */

import { registry } from "../src/secrets/index";

async function main() {
	// Load registry credentials from Bun.secrets
	const envVars = await registry.loadEnvVars();
	
	// Set environment variables for current process
	for (const [key, value] of Object.entries(envVars)) {
		process.env[key] = value;
	}
	
	// Get remaining arguments (everything after script name)
	const args = process.argv.slice(2);
	
	// Run bun install with provided arguments
	const installArgs = args.length > 0 ? args : [];
	
	console.log("🔐 Loaded registry credentials from Bun.secrets");
	console.log(`📦 Running: bun install ${installArgs.join(" ")}`);
	
	// Spawn bun install process with environment variables
	const proc = Bun.spawn(["bun", "install", ...installArgs], {
		env: { ...process.env, ...envVars },
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});
	
	// Wait for process to complete
	const exitCode = await proc.exited;
	process.exit(exitCode);
}

main().catch((error: unknown) => {
	const errorMessage =
		error instanceof Error ? error.message : String(error);
	console.error("❌ Error loading registry credentials:", errorMessage);
	process.exit(1);
});
