#!/usr/bin/env bun
/**
 * Setup MCP Configuration
 * 
 * Copies the MCP configuration template to the actual config file
 * and provides instructions for API key setup.
 * 
 * Supports Bun.secrets for secure API key storage.
 */

import { existsSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { mcpApiKeys, parseApiKey, validateApiKey } from "../src/secrets/mcp";

const TEMPLATE_PATH = join(process.cwd(), ".cursor", "mcp.json.template");
const CONFIG_PATH = join(process.cwd(), ".cursor", "mcp.json");

async function main() {
	console.log("🔧 Setting up MCP configuration...\n");

	// Check if template exists
	if (!existsSync(TEMPLATE_PATH)) {
		console.error(`❌ Template not found: ${TEMPLATE_PATH}`);
		console.error("   Please ensure .cursor/mcp.json.template exists");
		process.exit(1);
	}

	// Check if config already exists
	if (existsSync(CONFIG_PATH)) {
		console.log(`⚠️  Configuration already exists: ${CONFIG_PATH}`);
		console.log("   Skipping copy. Edit the file directly if needed.\n");
		
		// Validate existing config
		try {
			const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
			const apiKey = config.mcpServers?.bun?.apiKey;
			
			// Check if API key is stored in Bun.secrets
			const storedApiKey = await mcpApiKeys.get("bun");
			
			if (storedApiKey) {
				console.log("✅ Bun API key found in Bun.secrets (secure storage)");
				console.log("   The API key is stored securely in your OS keychain\n");
			} else if (apiKey === "" || apiKey === undefined) {
				console.log("ℹ️  Bun API key is not configured (empty string)");
				console.log("   This is fine if the Bun MCP server doesn't require authentication");
				console.log("   Otherwise, add your API key using:");
				console.log("   bun run scripts/setup-mcp-config.ts --set-api-key bun <your-key>\n");
			} else {
				console.log("⚠️  Bun API key found in config file (not secure)");
				console.log("   Consider migrating to Bun.secrets for secure storage:");
				console.log("   bun run scripts/setup-mcp-config.ts --migrate-api-key bun\n");
			}
		} catch (error) {
			console.error(`❌ Invalid JSON in ${CONFIG_PATH}`);
			console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
		}
	} else {
		// Copy template to config
		try {
			copyFileSync(TEMPLATE_PATH, CONFIG_PATH);
			console.log(`✅ Created ${CONFIG_PATH} from template\n`);
			
			// Show instructions
			console.log("📝 Next steps:");
			console.log("   1. Edit .cursor/mcp.json");
			console.log("   2. Add your Bun MCP API key to the 'apiKey' field");
			console.log("      (or leave as empty string \"\" if no API key is required)");
			console.log("   3. Restart Cursor to load MCP servers\n");
		} catch (error) {
			console.error(`❌ Failed to copy template`);
			console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
			process.exit(1);
		}
	}

	// Validate configuration structure
	try {
		const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
		
		if (!config.mcpServers) {
			console.error("❌ Invalid configuration: missing 'mcpServers'");
			process.exit(1);
		}

		if (!config.mcpServers.nexus) {
			console.error("❌ Invalid configuration: missing 'nexus' server");
			process.exit(1);
		}

		if (!config.mcpServers.bun) {
			console.warn("⚠️  Warning: 'bun' server not configured");
		}

		console.log("✅ Configuration structure is valid");
		console.log("\n📚 Available servers:");
		
		if (config.mcpServers.nexus) {
			console.log("   ✓ nexus (local)");
		}
		
		if (config.mcpServers.bun) {
			const apiKey = config.mcpServers.bun.apiKey;
			const storedApiKey = await mcpApiKeys.get("bun");
			
			let status: string;
			let note: string;
			
			if (storedApiKey) {
				status = "✓";
				note = "→ API key stored in Bun.secrets (secure)";
			} else if (apiKey && apiKey !== "") {
				status = "○";
				note = "→ API key in config file (consider migrating to Bun.secrets)";
			} else {
				status = "○";
				note = "→ API key not configured (may be optional)";
			}
			
			console.log(`   ${status} bun (external)`);
			console.log(`      ${note}`);
		}

		console.log("\n📝 Usage:");
		console.log("   Set API key: bun run scripts/setup-mcp-config.ts --set-api-key <server> <key>");
		console.log("   Get API key: bun run scripts/setup-mcp-config.ts --get-api-key <server>");
		console.log("   Migrate key: bun run scripts/setup-mcp-config.ts --migrate-api-key <server>");
		console.log("\n✨ Setup complete! Restart Cursor to load MCP servers.\n");
	} catch (error) {
		console.error(`❌ Failed to validate configuration`);
		console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exit(1);
	}
}

/**
 * Handle command-line arguments
 */
async function handleArgs() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		main();
		return;
	}

	const command = args[0];

	switch (command) {
		case "--set-api-key": {
			if (args.length < 3) {
				console.error("❌ Usage: --set-api-key <server> <api-key>");
				process.exit(1);
			}
			const serverName = args[1];
			const apiKey = args[2];

			try {
				const parsed = parseApiKey(apiKey);
				if (!parsed || !validateApiKey(parsed)) {
					console.error("❌ Invalid API key format");
					process.exit(1);
				}

				await mcpApiKeys.set(serverName, parsed);
				console.log(`✅ API key stored securely for '${serverName}'`);
			} catch (error) {
				console.error(`❌ Failed to store API key: ${error instanceof Error ? error.message : String(error)}`);
				process.exit(1);
			}
			break;
		}

		case "--get-api-key": {
			if (args.length < 2) {
				console.error("❌ Usage: --get-api-key <server>");
				process.exit(1);
			}
			const serverName = args[1];
			const apiKey = await mcpApiKeys.get(serverName);

			if (apiKey) {
				console.log(`✅ API key for '${serverName}': ${apiKey}`);
			} else {
				console.log(`ℹ️  No API key found for '${serverName}'`);
			}
			break;
		}

		case "--migrate-api-key": {
			if (args.length < 2) {
				console.error("❌ Usage: --migrate-api-key <server>");
				process.exit(1);
			}
			const serverName = args[1];
			const configPath = join(process.cwd(), ".cursor", "mcp.json");

			if (!existsSync(configPath)) {
				console.error(`❌ Config file not found: ${configPath}`);
				process.exit(1);
			}

			try {
				const config = JSON.parse(readFileSync(configPath, "utf-8"));
				const apiKey = config.mcpServers?.[serverName]?.apiKey;

				if (!apiKey || apiKey === "") {
					console.log(`ℹ️  No API key found in config for '${serverName}'`);
					break;
				}

				const parsed = parseApiKey(apiKey);
				if (!parsed || !validateApiKey(parsed)) {
					console.error("❌ Invalid API key format in config");
					process.exit(1);
				}

				await mcpApiKeys.set(serverName, parsed);
				console.log(`✅ Migrated API key to Bun.secrets for '${serverName}'`);
				console.log(`   You can now remove the apiKey field from ${configPath}`);
			} catch (error) {
				console.error(`❌ Failed to migrate API key: ${error instanceof Error ? error.message : String(error)}`);
				process.exit(1);
			}
			break;
		}

		case "--list-servers": {
			const servers = await mcpApiKeys.list();
			if (servers.length > 0) {
				console.log("📋 Configured MCP servers:");
				for (const server of servers) {
					console.log(`   ✓ ${server}`);
				}
			} else {
				console.log("ℹ️  No MCP servers configured with API keys");
			}
			break;
		}

		default:
			console.error(`❌ Unknown command: ${command}`);
			console.error("Available commands:");
			console.error("  --set-api-key <server> <key>  Store API key securely");
			console.error("  --get-api-key <server>       Get stored API key");
			console.error("  --migrate-api-key <server>    Migrate from config to Bun.secrets");
			console.error("  --list-servers               List configured servers");
			process.exit(1);
	}
}

if (import.meta.main) {
	(async () => {
		try {
			const args = process.argv.slice(2);
			if (args.length === 0) {
				await main();
			} else {
				await handleArgs();
			}
		} catch (error) {
			console.error("❌ Error:", error);
			process.exit(1);
		}
	})();
}
