#!/usr/bin/env bun
/**
 * @fileoverview Workspace Registry Setup Script
 * @description Interactive setup for Bun workspaces with private registry
 * @module scripts/setup-workspace-registry
 * 
 * Usage:
 *   bun run scripts/setup-workspace-registry.ts
 *   bun run scripts/setup-workspace-registry.ts --non-interactive
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";

interface SetupOptions {
	nonInteractive?: boolean;
	skipValidation?: boolean;
	skipInstall?: boolean;
}

/**
 * Check if GRAPH_NPM_TOKEN is set
 */
function checkToken(): boolean {
	const token = process.env.GRAPH_NPM_TOKEN;
	if (!token || token === "your-token-here") {
		return false;
	}
	return true;
}

/**
 * Prompt for token (non-interactive mode uses environment variable)
 */
async function getToken(nonInteractive: boolean): Promise<string | null> {
	if (nonInteractive) {
		const token = process.env.GRAPH_NPM_TOKEN;
		if (!token || token === "your-token-here") {
			console.error("❌ Error: GRAPH_NPM_TOKEN environment variable not set");
			console.error("   Set it with: export GRAPH_NPM_TOKEN='your-token'");
			return null;
		}
		return token;
	}
	
	// Interactive mode would prompt here
	// For now, check environment variable
	const token = process.env.GRAPH_NPM_TOKEN;
	if (!token || token === "your-token-here") {
		console.info("⚠️  GRAPH_NPM_TOKEN not set. Please set it:");
		console.info("   export GRAPH_NPM_TOKEN='your-token-here'");
		return null;
	}
	return token;
}

/**
 * Step 1: Set registry token
 */
async function step1SetToken(options: SetupOptions): Promise<boolean> {
	console.info("\n📝 Step 1: Setting registry token\n");
	
	const token = await getToken(options.nonInteractive || false);
	if (!token) {
		console.error("❌ Token not configured. Skipping...");
		return false;
	}
	
	console.info("✅ GRAPH_NPM_TOKEN is set");
	console.info(`   Token: ${token.substring(0, 8)}...${token.substring(token.length - 4)}`);
	return true;
}

/**
 * Step 2: Validate workspace dependencies
 */
async function step2ValidateWorkspace(options: SetupOptions): Promise<boolean> {
	if (options.skipValidation) {
		console.info("\n⏭️  Step 2: Skipping validation\n");
		return true;
	}
	
	console.info("\n🔍 Step 2: Validating workspace dependencies\n");
	
	try {
		const result = await $`bun run scripts/validate-workspace-deps.ts`.quiet();
		if (result.exitCode === 0) {
			console.info("✅ Workspace dependencies validated");
			return true;
		} else {
			// Show validation output even on failure
			if (result.stdout) {
				console.info(result.stdout.toString());
			}
			if (result.stderr) {
				console.error(result.stderr.toString());
			}
			console.error("❌ Validation failed. Fix issues and try again.");
			return false;
		}
	} catch (error: any) {
		// Show error details
		if (error.stdout) {
			console.info(error.stdout.toString());
		}
		if (error.stderr) {
			console.error(error.stderr.toString());
		}
		console.error("❌ Error running validation");
		return false;
	}
}

/**
 * Step 3: Install dependencies
 */
async function step3InstallDependencies(options: SetupOptions): Promise<boolean> {
	if (options.skipInstall) {
		console.info("\n⏭️  Step 3: Skipping install\n");
		return true;
	}
	
	console.info("\n📦 Step 3: Installing dependencies\n");
	console.info("   (workspace:* resolves automatically)\n");
	
	try {
		const result = await $`bun install`.quiet();
		if (result.exitCode === 0) {
			console.info("✅ Dependencies installed");
			return true;
		} else {
			console.error("❌ Installation failed");
			return false;
		}
	} catch (error) {
		console.error("❌ Error installing dependencies:", error);
		return false;
	}
}

/**
 * Step 4: Show publish command (don't actually publish)
 */
function step4PublishInfo(): void {
	console.info("\n📤 Step 4: Publish packages with version pinning\n");
	console.info("   To publish packages, run:");
	console.info("   VERSION=1.4.0 bun run publish:registry\n");
	console.info("   Options:");
	console.info("     --dry-run          Test without publishing");
	console.info("     --package <name>    Publish specific package");
	console.info("     --registry <url>   Custom registry URL\n");
}

/**
 * Step 5: Show CI configuration
 */
function step5CIConfig(): void {
	console.info("\n🔄 Step 5: CI Configuration\n");
	console.info("   To test with workspaces disabled in CI:");
	console.info("   BUN_WORKSPACES_DISABLED=1 bun install && bun test\n");
	console.info("   This ensures packages work outside workspace context.\n");
}

/**
 * Verify bunfig.toml exists
 */
async function verifyBunfigConfig(): Promise<boolean> {
	const bunfigPath = "bunfig.toml";
	if (!existsSync(bunfigPath)) {
		console.error(`❌ ${bunfigPath} not found`);
		return false;
	}
	
	const bunfigContent = await Bun.file(bunfigPath).text();
	if (!bunfigContent.includes("@graph")) {
		console.warn("⚠️  bunfig.toml doesn't contain @graph registry configuration");
		return false;
	}
	
	console.info("✅ bunfig.toml configured");
	return true;
}

/**
 * Main setup function
 */
async function setupWorkspaceRegistry(options: SetupOptions = {}): Promise<void> {
	console.info("🚀 Bun Workspace Registry Setup\n");
	console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	
	// Verify configuration
	console.info("📋 Verifying configuration...\n");
	if (!(await verifyBunfigConfig())) {
		console.error("\n❌ Configuration incomplete. Please check bunfig.toml");
		process.exit(1);
	}
	
	// Run steps
	const step1 = await step1SetToken(options);
	const step2 = await step2ValidateWorkspace(options);
	const step3 = await step3InstallDependencies(options);
	step4PublishInfo();
	step5CIConfig();
	
	// Summary
	console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
	console.info("📊 Setup Summary:\n");
	console.info(`   Step 1 (Token):     ${step1 ? "✅" : "⚠️  (Set GRAPH_NPM_TOKEN for publishing)"}`);
	console.info(`   Step 2 (Validate):  ${step2 ? "✅" : "❌"}`);
	console.info(`   Step 3 (Install):   ${step3 ? "✅" : "❌"}`);
	console.info(`   Step 4 (Publish):    ℹ️  Manual`);
	console.info(`   Step 5 (CI):        ℹ️  Manual\n`);
	
	// Token is optional for validation/install, required only for publishing
	if (step2 && step3) {
		if (step1) {
			console.info("✅ Setup complete! You're ready to use workspace registry.\n");
		} else {
			console.info("✅ Setup complete! (Token needed for publishing)\n");
			console.info("   To enable publishing, set:");
			console.info("   export GRAPH_NPM_TOKEN='your-token-here'\n");
		}
		process.exit(0);
	} else {
		console.info("⚠️  Setup incomplete. Please fix issues above.\n");
		process.exit(1);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SetupOptions = {};

for (const arg of args) {
	if (arg === "--non-interactive") {
		options.nonInteractive = true;
	} else if (arg === "--skip-validation") {
		options.skipValidation = true;
	} else if (arg === "--skip-install") {
		options.skipInstall = true;
	}
}

// Run if executed directly
if (import.meta.main) {
	setupWorkspaceRegistry(options).catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});
}
