#!/usr/bin/env bun
/**
 * NEXUS Setup Script
 * Ensures all prerequisites are met and initializes required databases/configurations
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";

const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
	console.info(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
	log(`\n${"=".repeat(60)}`, "cyan");
	log(`  ${title}`, "bright");
	log("=".repeat(60), "cyan");
}

async function checkBunVersion(): Promise<boolean> {
	try {
		const version = await $`bun --version`.text();
		const major = parseInt(version.trim().split(".")[0]);
		const minor = parseInt(version.trim().split(".")[1]);
		
		if (major > 1 || (major === 1 && minor >= 1)) {
			log(`✅ Bun version: ${version.trim()}`, "green");
			return true;
		} else {
			log(`❌ Bun version ${version.trim()} is too old. Required: >=1.1.0`, "red");
			return false;
		}
	} catch {
		log("❌ Bun is not installed or not in PATH", "red");
		return false;
	}
}

async function checkDependencies(): Promise<boolean> {
	log("\n📦 Checking dependencies...", "blue");
	
	try {
		if (!existsSync("node_modules")) {
			log("⚠️  node_modules not found. Installing dependencies...", "yellow");
			await $`bun install`.quiet();
			log("✅ Dependencies installed", "green");
		} else {
			log("✅ Dependencies found", "green");
		}
		return true;
	} catch (error) {
		log(`❌ Failed to install dependencies: ${error}`, "red");
		return false;
	}
}

async function createDataDirectories(): Promise<boolean> {
	log("\n📁 Creating data directories...", "blue");
	
	const directories = [
		"data",
		"data/streams",
		"data/telegram-logs",
		"data/security",
		"data/research",
		"data/forensic",
		"data/compliance",
	];
	
	try {
		for (const dir of directories) {
			if (!existsSync(dir)) {
				await mkdir(dir, { recursive: true });
				log(`✅ Created: ${dir}`, "green");
			} else {
				log(`✓ Exists: ${dir}`, "cyan");
			}
		}
		return true;
	} catch (error) {
		log(`❌ Failed to create directories: ${error}`, "red");
		return false;
	}
}

async function checkEnvironmentVariables(): Promise<boolean> {
	log("\n🔐 Checking environment variables...", "blue");
	
	const required = [
		{
			name: "TELEGRAM_BOT_TOKEN",
			description: "Telegram Bot API token",
			optional: true,
			secret: true,
		},
		{
			name: "TELEGRAM_CHAT_ID",
			description: "Telegram chat/supergroup ID",
			optional: true,
			secret: false,
		},
		{
			name: "PORT",
			description: "API server port (default: 3000)",
			optional: true,
			secret: false,
		},
	];
	
	let allGood = true;
	
	for (const env of required) {
		const value = process.env[env.name];
		if (value) {
			const display = env.secret ? "***" : value;
			log(`✅ ${env.name}: ${display}`, "green");
		} else if (env.optional) {
			log(`⚠️  ${env.name}: Not set (optional)`, "yellow");
		} else {
			log(`❌ ${env.name}: Required but not set`, "red");
			allGood = false;
		}
	}
	
	// Check Bun.secrets
	log("\n🔑 Checking Bun.secrets...", "blue");
	try {
		const secrets = Bun.secrets;
		const secretKeys = Object.keys(secrets);
		
		if (secretKeys.length > 0) {
			log(`✅ Found ${secretKeys.length} secret(s) in Bun.secrets`, "green");
			log(`   Keys: ${secretKeys.join(", ")}`, "cyan");
		} else {
			log("⚠️  No secrets found in Bun.secrets", "yellow");
			log("   Tip: Use 'bun secret set TELEGRAM_BOT_TOKEN=your_token'", "cyan");
		}
	} catch (error) {
		log(`⚠️  Could not access Bun.secrets: ${error}`, "yellow");
	}
	
	return allGood;
}

async function checkDatabases(): Promise<boolean> {
	log("\n💾 Checking databases...", "blue");
	
	const databases = [
		"data/pipeline.sqlite",
		"data/rbac.sqlite",
		"data/properties.sqlite",
		"data/sources.sqlite",
		"data/features.sqlite",
		"data/security.db",
		"data/compliance-audit.db",
		"data/research.db",
	];
	
	let allGood = true;
	
	for (const db of databases) {
		if (existsSync(db)) {
			log(`✅ ${db}`, "green");
		} else {
			log(`⚠️  ${db} will be created on first use`, "yellow");
		}
	}
	
	return allGood;
}

async function checkGitInfo(): Promise<boolean> {
	log("\n🔍 Checking Git repository...", "blue");
	
	try {
		const [branch, commit] = await Promise.all([
			$`git rev-parse --abbrev-ref HEAD`.text().catch(() => null),
			$`git rev-parse --short HEAD`.text().catch(() => null),
		]);
		
		if (branch && commit) {
			log(`✅ Branch: ${branch.trim()}`, "green");
			log(`✅ Commit: ${commit.trim()}`, "green");
			return true;
		} else {
			log("⚠️  Not a git repository or git not available", "yellow");
			return false;
		}
	} catch {
		log("⚠️  Git not available", "yellow");
		return false;
	}
}

async function verifyAPIServer(): Promise<boolean> {
	log("\n🌐 Verifying API server configuration...", "blue");
	
	const port = process.env.PORT || "3000";
	log(`✅ Default port: ${port}`, "green");
	log(`   API will be available at: http://localhost:${port}`, "cyan");
	log(`   Dashboard: http://localhost:${port}/dashboard/index.html`, "cyan");
	log(`   Health: http://localhost:${port}/health`, "cyan");
	log(`   Git Info: http://localhost:${port}/api/git-info`, "cyan");
	
	return true;
}

async function runTypeCheck(): Promise<boolean> {
	log("\n🔍 Running TypeScript type check...", "blue");
	
	try {
		await $`bun run typecheck`.quiet();
		log("✅ Type check passed", "green");
		return true;
	} catch (error) {
		log("⚠️  Type check found issues (non-blocking)", "yellow");
		return false;
	}
}

async function main() {
	log("\n" + "=".repeat(60), "bright");
	log("  NEXUS Trading Platform - Setup & Verification", "bright");
	log("=".repeat(60), "bright");
	
	const checks = [
		{ name: "Bun Version", fn: checkBunVersion },
		{ name: "Dependencies", fn: checkDependencies },
		{ name: "Data Directories", fn: createDataDirectories },
		{ name: "Environment Variables", fn: checkEnvironmentVariables },
		{ name: "Databases", fn: checkDatabases },
		{ name: "Git Info", fn: checkGitInfo },
		{ name: "API Server Config", fn: verifyAPIServer },
		{ name: "Type Check", fn: runTypeCheck },
	];
	
	const results: Array<{ name: string; passed: boolean }> = [];
	
	for (const check of checks) {
		logSection(check.name);
		const passed = await check.fn();
		results.push({ name: check.name, passed });
	}
	
	// Summary
	logSection("Setup Summary");
	
	let allPassed = true;
	for (const result of results) {
		const icon = result.passed ? "✅" : "⚠️ ";
		const color = result.passed ? "green" : "yellow";
		log(`${icon} ${result.name}`, color);
		if (!result.passed) allPassed = false;
	}
	
	log("\n" + "=".repeat(60), "cyan");
	if (allPassed) {
		log("  ✅ Setup complete! You're ready to go.", "green");
		log("\n  Quick Start:", "bright");
		log("    bun run dev          # Start development server", "cyan");
		log("    bun run dashboard    # Open CLI dashboard", "cyan");
		log("    bun run test         # Run tests", "cyan");
	} else {
		log("  ⚠️  Setup complete with warnings", "yellow");
		log("  Review the output above and address any issues", "yellow");
	}
	log("=".repeat(60) + "\n", "cyan");
	
	process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
	log(`\n❌ Setup failed: ${error}`, "red");
	process.exit(1);
});
