#!/usr/bin/env bun
/**
 * @fileoverview Setup Workspace Bin Directory
 * @description Creates symlinks for workspace scripts in node_modules/.bin
 * @module scripts/setup-workspace-bin
 */

import { existsSync } from "fs";
import { mkdir, symlink, unlink } from "fs/promises";
import { join } from "path";

const WORKSPACE_ROOT = process.cwd();
const BIN_DIR = join(WORKSPACE_ROOT, "node_modules", ".bin");
const SCRIPTS_DIR = join(WORKSPACE_ROOT, "scripts");

// Scripts to expose in bin directory
const BIN_SCRIPTS = [
	"verify-bun-constructor-usage.ts",
	"verify-team-organization.ts",
	"verify-sitemap.ts",
	"mcp-scaffold.ts",
	"benchmark-publisher.ts",
	"test-runner.ts",
	"monitor-error-normalization.ts",
] as const;

async function setupBinDirectory() {
	console.log("🔧 Setting up workspace bin directory...\n");

	// Create bin directory if it doesn't exist
	if (!existsSync(BIN_DIR)) {
		await mkdir(BIN_DIR, { recursive: true });
		console.log(`✅ Created ${BIN_DIR}`);
	}

	// Create symlinks for each script
	for (const script of BIN_SCRIPTS) {
		const scriptPath = join(SCRIPTS_DIR, script);
		const binPath = join(BIN_DIR, script.replace(".ts", ""));

		if (!existsSync(scriptPath)) {
			console.warn(`⚠️  Script not found: ${scriptPath}`);
			continue;
		}

		try {
			// Remove existing symlink if it exists
			if (existsSync(binPath)) {
				await unlink(binPath);
			}

			// Create relative symlink
			const relativePath = join("..", "..", "scripts", script);
			await symlink(relativePath, binPath);
			console.log(`✅ Linked ${script} → ${binPath}`);
		} catch (error: any) {
			if (error.code !== "EEXIST") {
				console.error(`❌ Failed to link ${script}: ${error.message}`);
			}
		}
	}

	console.log("\n✅ Workspace bin directory setup complete!");
	console.log(`\n📦 Bin directory: ${BIN_DIR}`);
	console.log(`💡 Run scripts with: bun run <script-name>`);
	console.log(`💡 Or directly: ${BIN_DIR}/<script-name>`);
}

// Run setup
setupBinDirectory().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});



