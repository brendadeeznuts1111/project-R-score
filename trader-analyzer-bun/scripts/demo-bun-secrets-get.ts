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

			console.log("✅ Bun MCP API key retrieved successfully!");
			console.log(`   Masked: ${masked}`);
			console.log(`   Length: ${apiKey.length} characters`);
			console.log(`\n   Retrieved using:`);
			console.log(`   Bun.secrets.get({`);
			console.log(`     service: "${SERVICE}",`);
			console.log(`     name: "${SECRET_NAME}"`);
			console.log(`   })`);
			
			return apiKey;
		} else {
			console.log("ℹ️  No API key found");
			console.log(`\n   To set an API key:`);
			console.log(`   await secrets.set(`);
			console.log(`     {`);
			console.log(`       service: "${SERVICE}",`);
			console.log(`       name: "${SECRET_NAME}"`);
			console.log(`     },`);
			console.log(`     "your-api-key-here"`);
			console.log(`   );`);
			return null;
		}
	} catch (error) {
		console.error("❌ Error retrieving API key:", error);
		return null;
	}
}

// Run demo
if (import.meta.main) {
	console.log("🔐 Demo: Using Bun.secrets.get() to retrieve Bun MCP API key\n");
	getBunApiKey().catch((error) => {
		console.error("❌ Error:", error);
		process.exit(1);
	});
}