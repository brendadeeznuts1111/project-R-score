#!/usr/bin/env bun
/**
 * RSS Secrets CLI - Standalone Version
 *
 * Usage:
 *   bun src/cli/rss-secrets-simple-cli.ts validate [config.toml]
 *   bun src/cli/rss-secrets-simple-cli.ts feeds [config.toml]
 *   bun src/cli/rss-secrets-simple-cli.ts categories [config.toml]
 *   bun src/cli/rss-secrets-simple-cli.ts config
 */

import { parseArgs } from "node:util";
import {
	formatConfigSummary,
	resolveAllConfig,
} from "../config/secrets-config-resolver.js";
import {
	handleRSSCommand,
	RSSSecretsManager,
} from "../rss/rss-secrets-integration-simple.js";

interface CLIOptions {
	command: string;
	configPath?: string;
	secretsDir?: string;
	profile?: string;
	verbose?: boolean;
	help?: boolean;
}

function printUsage(): void {
	console.log(`
RSS Secrets CLI - Standalone Demo

Usage:
  bun rss-secrets-simple-cli.ts <command> [options]

Commands:
  validate [config.toml]     Validate TOML config and secret references
  feeds [config.toml]        List configured feeds
  categories [config.toml]   List feeds grouped by category
  config                     Show configuration context
  demo                       Run interactive demonstration

Options:
  --secrets-dir <path>       Override secrets directory
  --profile <name>           Override profile (dev/staging/production)
  --verbose, -v              Show detailed output
  --help, -h                 Show this help

Examples:
  # Validate RSS configuration
  bun rss-secrets-simple-cli.ts validate ./config/rss-example.toml

  # List feeds with production profile
  bun rss-secrets-simple-cli.ts feeds --profile production

  # Show feeds by category
  bun rss-secrets-simple-cli.ts categories

  # Show current configuration context
  bun rss-secrets-simple-cli.ts config
`);
}

function parseCLIOptions(): CLIOptions {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			"secrets-dir": { type: "string" },
			profile: { type: "string" },
			verbose: { type: "boolean", short: "v" },
			help: { type: "boolean", short: "h" },
		},
		allowPositionals: true,
	});

	const command = positionals[0];
	const configPath = positionals[1];

	return {
		command,
		configPath,
		secretsDir: values["secrets-dir"],
		profile: values.profile,
		verbose: values.verbose,
		help: values.help,
	};
}

async function runDemo(): Promise<void> {
	console.log(`
╔════════════════════════════════════════════════════════════════╗
║     RSS Secrets Integration Demo                               ║
║     (Hybrid Config + Template Engine)                          ║
╚════════════════════════════════════════════════════════════════╝
`);

	// Show current configuration
	console.log("📋 Configuration Context:");
	console.log(
		formatConfigSummary(resolveAllConfig({ args: process.argv.slice(2) })),
	);

	// Load example config
	const configPath = "./config/rss-example.toml";
	console.log(`\n📰 Loading: ${configPath}`);

	const manager = new RSSSecretsManager();

	try {
		await manager.loadConfig(configPath, { verbose: false, strict: false });

		const summary = manager.getSummary();
		console.log(`\n✅ Loaded:`);
		console.log(`   • ${summary.feeds} feeds`);
		console.log(`   • ${summary.apis} APIs`);
		console.log(`   • Profile: ${summary.profile}`);
		console.log(`   • Source: ${summary.contextSource}`);

		// List feeds
		console.log(`\n📋 Feeds:`);
		manager.getFeeds().forEach((feed, i) => {
			const auth = feed.api_key_ref ? "🔐" : "🔓";
			const cats = feed.categories?.join(", ") ?? "none";
			console.log(`   ${i + 1}. ${auth} ${feed.name} (${cats})`);
		});

		// Show APIs
		console.log(`\n🔑 APIs:`);
		const apis = ["newsapi", "feedly"];
		apis.forEach((name) => {
			const api = manager.getAPI(name);
			if (api) {
				console.log(`   • ${name}: ${api.endpoint}`);
				console.log(`     Rate limit: ${api.rate_limit ?? "unlimited"}/min`);
			}
		});

		// Show categories
		console.log(`\n🏷️  By Category:`);
		const categories = new Set(
			manager.getFeeds().flatMap((f) => f.categories ?? []),
		);
		for (const category of categories) {
			const count = manager.getFeedsByCategory(category).length;
			console.log(`   • ${category}: ${count} feed(s)`);
		}

		console.log(`\n✨ Demo complete!`);
	} catch (error: any) {
		console.error(`\n❌ Error: ${error.message}`);
		console.log("\n💡 The example config uses secret placeholders like:");
		console.log("   ${secrets:production:NEWSAPI_KEY}");
		console.log("\n   These show as '[MISSING:...]' when secrets aren't set.");
		console.log("   This is expected behavior for the demo!");
	}
}

async function main(): Promise<void> {
	const options = parseCLIOptions();

	if (options.help || !options.command) {
		printUsage();
		process.exit(options.help ? 0 : 1);
	}

	// Handle demo command
	if (options.command === "demo") {
		await runDemo();
		return;
	}

	// Build args for RSS command handler
	const args: string[] = [];
	if (options.configPath) args.push(options.configPath);

	try {
		await handleRSSCommand(options.command, args);
	} catch (error: any) {
		console.error(`❌ Error: ${error.message}`);
		if (options.verbose) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(
		"❌ Fatal error:",
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
});
