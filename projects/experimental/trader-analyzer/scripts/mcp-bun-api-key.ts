#!/usr/bin/env bun
/**
 * @fileoverview Bun MCP API Key Management
 * @description Set, get, and verify Bun MCP server API key using Bun.secrets
 * @module scripts/mcp-bun-api-key
 * 
 * Uses Bun.secrets.get() and Bun.secrets.set() for secure OS-native storage
 * @see {@link https://bun.com/docs/runtime/secrets#bun-secrets-get-options}
 */

import { secrets } from "bun";
import { mcpApiKeys, validateApiKey } from "../src/secrets/mcp";

const SERVICE = "nexus";
const SECRET_NAME = "mcp.bun.apiKey";

/**
 * Get Bun MCP API key using Bun.secrets.get()
 */
async function getBunApiKey(): Promise<string | null> {
	try {
		const apiKey = await secrets.get({
			service: SERVICE,
			name: SECRET_NAME,
		});
		return apiKey;
	} catch (error) {
		console.error("❌ Error retrieving API key:", error);
		return null;
	}
}

/**
 * Set Bun MCP API key using Bun.secrets.set()
 */
async function setBunApiKey(apiKey: string): Promise<boolean> {
	try {
		// Validate API key format
		if (!validateApiKey(apiKey)) {
			console.error("❌ Invalid API key format");
			console.error("   API key must be 8-512 characters and contain only alphanumeric, dashes, underscores, or dots");
			return false;
		}

		// Store using Bun.secrets.set()
		await secrets.set(
			{
				service: SERVICE,
				name: SECRET_NAME,
			},
			apiKey,
		);

		console.log("✅ Bun MCP API key stored securely using Bun.secrets");
		console.log(`   Service: ${SERVICE}`);
		console.log(`   Name: ${SECRET_NAME}`);
		console.log(`   Storage: OS-native credential storage (macOS Keychain, Linux libsecret, Windows Credential Manager)`);
		return true;
	} catch (error) {
		console.error("❌ Error storing API key:", error);
		return false;
	}
}

/**
 * Verify API key is accessible
 */
async function verifyApiKey(): Promise<boolean> {
	const apiKey = await getBunApiKey();
	if (!apiKey) {
		console.log("ℹ️  No API key configured");
		return false;
	}

	// Mask API key for display (show first 4 and last 4 chars)
	const masked = apiKey.length > 8 
		? `${apiKey.slice(0, 4)}${"*".repeat(apiKey.length - 8)}${apiKey.slice(-4)}`
		: "*".repeat(apiKey.length);

	console.log("✅ API key found:");
	console.log(`   Masked: ${masked}`);
	console.log(`   Length: ${apiKey.length} characters`);
	return true;
}

/**
 * Delete API key
 */
async function deleteApiKey(): Promise<boolean> {
	try {
		await secrets.delete({
			service: SERVICE,
			name: SECRET_NAME,
		});
		console.log("✅ Bun MCP API key deleted");
		return true;
	} catch (error) {
		console.error("❌ Error deleting API key:", error);
		return false;
	}
}

// ============ CLI ============
async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "get":
		case "show":
		case "status": {
			const apiKey = await getBunApiKey();
			if (apiKey) {
				const masked = apiKey.length > 8 
					? `${apiKey.slice(0, 4)}${"*".repeat(apiKey.length - 8)}${apiKey.slice(-4)}`
					: "*".repeat(apiKey.length);
				console.log(`✅ Bun MCP API key configured`);
				console.log(`   Masked: ${masked}`);
				console.log(`   Length: ${apiKey.length} characters`);
				console.log(`\n   Retrieved using: Bun.secrets.get({ service: "${SERVICE}", name: "${SECRET_NAME}" })`);
			} else {
				console.log("ℹ️  No Bun MCP API key configured");
				console.log("\n   To set an API key:");
				console.log(`   bun run scripts/mcp-bun-api-key.ts set <your-api-key>`);
			}
			break;
		}

		case "set": {
			if (args.length < 2) {
				console.error("❌ Usage: set <api-key>");
				console.error("   Example: bun run scripts/mcp-bun-api-key.ts set your-api-key-here");
				process.exit(1);
			}
			const apiKey = args[1];
			const success = await setBunApiKey(apiKey);
			if (success) {
				console.log("\n   The API key is now stored securely and will be automatically");
				console.log("   loaded by the NEXUS MCP server when it starts.");
				console.log("\n   To verify: bun run scripts/mcp-bun-api-key.ts get");
			} else {
				process.exit(1);
			}
			break;
		}

		case "verify":
		case "check": {
			const exists = await verifyApiKey();
			process.exit(exists ? 0 : 1);
			break;
		}

		case "delete":
		case "remove": {
			const success = await deleteApiKey();
			process.exit(success ? 0 : 1);
			break;
		}

		case "help":
		case "--help":
		case "-h":
		default: {
			console.log(`
🔐 Bun MCP API Key Management

Commands:
  get, show, status    Get current API key status (masked)
  set <api-key>        Store API key securely using Bun.secrets
  verify, check        Verify API key is accessible
  delete, remove       Delete stored API key

Examples:
  bun run scripts/mcp-bun-api-key.ts set your-api-key-here
  bun run scripts/mcp-bun-api-key.ts get
  bun run scripts/mcp-bun-api-key.ts verify
  bun run scripts/mcp-bun-api-key.ts delete

Storage:
  Uses Bun.secrets API for OS-native credential storage:
  - macOS: Keychain
  - Linux: libsecret
  - Windows: Credential Manager

The API key is stored at:
  Service: ${SERVICE}
  Name: ${SECRET_NAME}

Retrieved using:
  Bun.secrets.get({ service: "${SERVICE}", name: "${SECRET_NAME}" })
			`.trim());
			break;
		}
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ Error:", error);
		process.exit(1);
	});
}