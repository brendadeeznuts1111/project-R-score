#!/usr/bin/env bun
/**
 * @fileoverview Registry Secrets CLI
 * @description Manage package registry credentials using Bun.secrets
 * 
 * Usage:
 *   bun run scripts/registry-secrets.ts set @orca --token <token>
 *   bun run scripts/registry-secrets.ts get @orca
 *   bun run scripts/registry-secrets.ts delete @orca
 *   bun run scripts/registry-secrets.ts list
 */

import { registry } from "../src/secrets/index";

const commands = {
	async set(scope: string, options: { token?: string; username?: string; password?: string }) {
		if (!scope.startsWith("@")) {
			console.error("❌ Scope must start with @ (e.g., @orca)");
			process.exit(1);
		}

		const credentials: { token?: string; username?: string; password?: string } = {};
		
		if (options.token) credentials.token = options.token;
		if (options.username) credentials.username = options.username;
		if (options.password) credentials.password = options.password;

		if (Object.keys(credentials).length === 0) {
			console.error("❌ Must provide at least one credential (--token, --username, --password)");
			process.exit(1);
		}

		await registry.set(scope, credentials);
		console.log(`✅ Stored credentials for ${scope}`);
	},

	async get(scope: string) {
		if (!scope.startsWith("@")) {
			console.error("❌ Scope must start with @ (e.g., @orca)");
			process.exit(1);
		}

		const creds = await registry.get(scope);
		
		if (!creds.token && !creds.username && !creds.password) {
			console.log(`ℹ️  No credentials found for ${scope}`);
			return;
		}

		console.log(`\n📦 Credentials for ${scope}:`);
		if (creds.token) console.log(`   Token: ${creds.token.substring(0, 8)}...`);
		if (creds.username) console.log(`   Username: ${creds.username}`);
		if (creds.password) console.log(`   Password: ${"*".repeat(creds.password.length)}`);
	},

	async delete(scope: string) {
		if (!scope.startsWith("@")) {
			console.error("❌ Scope must start with @ (e.g., @orca)");
			process.exit(1);
		}

		await registry.del(scope);
		console.log(`✅ Deleted credentials for ${scope}`);
	},

	async list() {
		const scopes = ["@orca", "@nexus"];
		console.log("\n📦 Registry Credentials:\n");
		
		for (const scope of scopes) {
			const creds = await registry.get(scope);
			const hasCreds = creds.token || creds.username || creds.password;
			
			if (hasCreds) {
				console.log(`  ${scope}:`);
				if (creds.token) console.log(`    ✅ Token configured`);
				if (creds.username) console.log(`    ✅ Username configured`);
				if (creds.password) console.log(`    ✅ Password configured`);
			} else {
				console.log(`  ${scope}: ❌ No credentials`);
			}
		}
	},
};

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command || !commands[command as keyof typeof commands]) {
		console.log(`
Registry Secrets CLI - Manage package registry credentials using Bun.secrets

Usage:
  bun run scripts/registry-secrets.ts <command> [options]

Commands:
  set <scope> --token <token>              Store token for scope
  set <scope> --username <user> --password <pass>  Store username/password
  get <scope>                              Get credentials for scope
  delete <scope>                           Delete credentials for scope
  list                                     List all configured scopes

Examples:
  bun run scripts/registry-secrets.ts set @orca --token ghp_xxxxxxxxxxxx
  bun run scripts/registry-secrets.ts get @orca
  bun run scripts/registry-secrets.ts delete @orca
  bun run scripts/registry-secrets.ts list

Scopes:
  @orca   - ORCA internal packages registry
  @nexus  - NEXUS Enterprise packages registry

Note: Credentials are stored securely using Bun.secrets (OS credential manager)
`);
		process.exit(1);
	}

	try {
		if (command === "set") {
			const scope = args[1];
			if (!scope) {
				console.error("❌ Missing scope (e.g., @orca)");
				process.exit(1);
			}

			const options: { token?: string; username?: string; password?: string } = {};
			for (let i = 2; i < args.length; i++) {
				if (args[i] === "--token" && args[i + 1]) {
					options.token = args[i + 1];
					i++;
				} else if (args[i] === "--username" && args[i + 1]) {
					options.username = args[i + 1];
					i++;
				} else if (args[i] === "--password" && args[i + 1]) {
					options.password = args[i + 1];
					i++;
				}
			}

			await commands.set(scope, options);
		} else if (command === "get") {
			const scope = args[1];
			if (!scope) {
				console.error("❌ Missing scope (e.g., @orca)");
				process.exit(1);
			}
			await commands.get(scope);
		} else if (command === "delete") {
			const scope = args[1];
			if (!scope) {
				console.error("❌ Missing scope (e.g., @orca)");
				process.exit(1);
			}
			await commands.delete(scope);
		} else if (command === "list") {
			await commands.list();
		}
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		console.error("❌ Error:", errorMessage);
		process.exit(1);
	}
}

main();
