#!/usr/bin/env bun
/**
 * @fileoverview Demo: Using Bun.secrets.get() to retrieve Bun MCP API key
 * @description Demonstrates retrieving the Bun MCP API key using Bun.secrets.get()
 * @see {@link https://bun.com/docs/runtime/secrets#bun-secrets-get-options}
 */

import { secrets } from "bun";

const SERVICE = "nexus";
const SECRET_NAME = "mcp.bun.apiKey";

/**
 * Example: Get Bun MCP API key using Bun.secrets.get()
 * 
 * @see {@link https://bun.com/docs/runtime/secrets#bun-secrets-get-options}
 */
async function getBunApiKey() {
	try {
		// Use Bun.secrets.get() to retrieve the API key
		const apiKey = await secrets.get({
			service: SERVICE,
			name: SECRET_NAME,
		});

		if (apiKey) {
			// Mask API key for display
			const masked = apiKey.length > 8 
				? `${apiKey.slice(0, 4)}${"*".repeat(apiKey.length - 8)}${apiKey.slice(-4)}`
				: "*".repeat(apiKey.length);

			console.info("✅ Bun MCP API key retrieved successfully!");
			console.info(`   Masked: ${masked}`);
			console.info(`   Length: ${apiKey.length} characters`);
			console.info(`\n   Retrieved using:`);
			console.info(`   Bun.secrets.get({`);
			console.info(`     service: "${SERVICE}",`);
			console.info(`     name: "${SECRET_NAME}"`);
			console.info(`   })`);
			
			return apiKey;
		} else {
			console.info("ℹ️  No API key found");
			console.info(`\n   To set an API key:`);
			console.info(`   await secrets.set(`);
			console.info(`     {`);
			console.info(`       service: "${SERVICE}",`);
			console.info(`       name: "${SECRET_NAME}"`);
			console.info(`     },`);
			console.info(`     "your-api-key-here"`);
			console.info(`   );`);
			return null;
		}
	} catch (error) {
		console.error("❌ Error retrieving API key:", error);
		return null;
	}
}

// Run demo
if (import.meta.main) {
	console.info("🔐 Demo: Using Bun.secrets.get() to retrieve Bun MCP API key\n");
	getBunApiKey().catch((error) => {
		console.error("❌ Error:", error);
		process.exit(1);
	});
}