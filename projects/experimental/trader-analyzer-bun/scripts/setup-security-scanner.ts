#!/usr/bin/env bun
/**
 * @fileoverview Setup script for NEXUS Security Scanner
 * @description Configure security scanner credentials using Bun.secrets (Bun 1.3+)
 * @module scripts/setup-security-scanner
 * 
 * Usage:
 *   bun run scripts/setup-security-scanner.ts
 *   bun run scripts/setup-security-scanner.ts --api-key "your-api-key"
 *   bun run scripts/setup-security-scanner.ts --api-url "https://api.example.com/threat-intel"
 */

import { secrets } from "bun";

const SERVICE_NAME = "nexus-security-scanner";

/**
 * Store threat intelligence API key using Bun.secrets
 */
async function setApiKey(apiKey: string): Promise<void> {
	try {
		await secrets.set({
			service: SERVICE_NAME,
			name: "threat-intel-api-key",
			value: apiKey,
		});
		console.info("✅ API key stored securely in OS credential storage");
		console.info(`   Service: ${SERVICE_NAME}`);
		console.info(`   Name: threat-intel-api-key`);
		console.info(`   Storage: ${getStorageLocation()}`);
	} catch (error) {
		console.error("❌ Failed to store API key:", error);
		process.exit(1);
	}
}

/**
 * Get threat intelligence API key from Bun.secrets
 */
async function getApiKey(): Promise<string | null> {
	try {
		const apiKey = await secrets.get({
			service: SERVICE_NAME,
			name: "threat-intel-api-key",
		});
		return apiKey;
	} catch (error) {
		console.error("❌ Failed to get API key:", error);
		return null;
	}
}

/**
 * Delete threat intelligence API key from Bun.secrets
 */
async function deleteApiKey(): Promise<void> {
	try {
		await secrets.delete({
			service: SERVICE_NAME,
			name: "threat-intel-api-key",
		});
		console.info("✅ API key deleted from OS credential storage");
	} catch (error) {
		console.error("❌ Failed to delete API key:", error);
		process.exit(1);
	}
}

/**
 * Store threat intelligence API URL
 */
async function setApiUrl(apiUrl: string): Promise<void> {
	try {
		await secrets.set({
			service: SERVICE_NAME,
			name: "threat-intel-api-url",
			value: apiUrl,
		});
		console.info("✅ API URL stored securely");
	} catch (error) {
		console.error("❌ Failed to store API URL:", error);
		process.exit(1);
	}
}

/**
 * Get storage location description
 */
function getStorageLocation(): string {
	if (process.platform === "darwin") {
		return "macOS Keychain";
	} else if (process.platform === "linux") {
		return "Linux libsecret";
	} else if (process.platform === "win32") {
		return "Windows Credential Manager";
	}
	return "OS credential storage";
}

/**
 * Main CLI function
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		// Interactive mode
		console.info("🔐 NEXUS Security Scanner Setup");
		console.info("");
		console.info("This script stores credentials securely using Bun.secrets (Bun 1.3+).");
		console.info(`Credentials are stored in: ${getStorageLocation()}`);
		console.info("");

		// Check if API key exists
		const existingKey = await getApiKey();
		if (existingKey) {
			console.info("✅ API key already configured");
			console.info(`   Key: ${existingKey.substring(0, 8)}...${existingKey.substring(existingKey.length - 4)}`);
			console.info("");
			const readline = await import("readline");
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const answer = await new Promise<string>((resolve) => {
				rl.question("Do you want to update it? (y/N): ", resolve);
			});
			rl.close();

			if (answer.toLowerCase() !== "y") {
				console.info("Keeping existing API key");
				return;
			}
		}

		// Prompt for API key
		const readline = await import("readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const apiKey = await new Promise<string>((resolve) => {
			rl.question("Enter threat intelligence API key: ", resolve);
		});

		const apiUrl = await new Promise<string>((resolve) => {
			rl.question("Enter threat intelligence API URL (optional): ", resolve);
		});

		rl.close();

		if (apiKey) {
			await setApiKey(apiKey);
		}

		if (apiUrl) {
			await setApiUrl(apiUrl);
		}

		console.info("");
		console.info("✅ Configuration complete!");
		console.info("   The scanner will automatically use these credentials during bun install");
		return;
	}

	// Command-line mode
	const command = args[0];

	switch (command) {
		case "--api-key":
		case "-k": {
			const apiKey = args[1];
			if (!apiKey) {
				console.error("❌ Error: API key required");
				console.error("Usage: bun run scripts/setup-security-scanner.ts --api-key <key>");
				process.exit(1);
			}
			await setApiKey(apiKey);
			break;
		}

		case "--api-url":
		case "-u": {
			const apiUrl = args[1];
			if (!apiUrl) {
				console.error("❌ Error: API URL required");
				console.error("Usage: bun run scripts/setup-security-scanner.ts --api-url <url>");
				process.exit(1);
			}
			await setApiUrl(apiUrl);
			break;
		}

		case "--get":
		case "-g": {
			const apiKey = await getApiKey();
			if (apiKey) {
				console.info(`API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
			} else {
				console.info("No API key configured");
			}
			break;
		}

		case "--delete":
		case "-d": {
			await deleteApiKey();
			break;
		}

		case "--help":
		case "-h": {
			console.info("🔐 NEXUS Security Scanner Setup");
			console.info("");
			console.info("Usage:");
			console.info("  bun run scripts/setup-security-scanner.ts              # Interactive mode");
			console.info("  bun run scripts/setup-security-scanner.ts --api-key <key>");
			console.info("  bun run scripts/setup-security-scanner.ts --api-url <url>");
			console.info("  bun run scripts/setup-security-scanner.ts --get");
			console.info("  bun run scripts/setup-security-scanner.ts --delete");
			console.info("");
			console.info("Options:");
			console.info("  --api-key, -k <key>    Store threat intelligence API key");
			console.info("  --api-url, -u <url>   Store threat intelligence API URL");
			console.info("  --get, -g              Get stored API key (masked)");
			console.info("  --delete, -d           Delete stored API key");
			console.info("  --help, -h             Show this help message");
			console.info("");
			console.info("Storage:");
			console.info(`  Credentials are stored in: ${getStorageLocation()}`);
			console.info("  They are encrypted at rest and separate from environment variables");
			break;
		}

		default: {
			console.error(`❌ Unknown command: ${command}`);
			console.error("Run with --help for usage information");
			process.exit(1);
		}
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ Error:", error);
		process.exit(1);
	});
}
