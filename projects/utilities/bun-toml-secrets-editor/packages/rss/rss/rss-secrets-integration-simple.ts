/**
 * RSS Secrets Integration - Standalone Version
 *
 * Simplified version for demonstration without full RSS dependencies.
 */

import {
	formatConfigSummary,
	resolveAllConfig,
} from "../config/secrets-config-resolver.js";
import {
	generateSecretReport,
	resolveTomlFile,
	validateTemplate,
} from "../config/template-engine.js";
import {
	getContext,
	type SecretsContext,
} from "../secrets/context-resolver.js";

/** RSS Feed configuration with secret support */
export interface RSSFeedConfig {
	name: string;
	url: string;
	refresh_interval?: number;
	api_key_ref?: string;
	headers?: Record<string, string>;
	prefetch_dns?: boolean;
	categories?: string[];
}

/** API configuration with secrets */
export interface APIConfig {
	key_ref?: string;
	endpoint: string;
	rate_limit?: number;
	headers?: Record<string, string>;
}

/** Complete RSS configuration */
export interface RSSConfig {
	settings?: {
		default_refresh_interval?: number;
		max_concurrent_fetches?: number;
		timeout?: number;
		user_agent?: string;
	};
	api?: Record<string, APIConfig>;
	feeds?: RSSFeedConfig[];
	secret_validation?: "strict" | "lenient";
}

/** RSS Manager with secrets integration */
export class RSSSecretsManager {
	private config?: RSSConfig;
	private context: SecretsContext;

	constructor(options?: { context?: SecretsContext }) {
		this.context = options?.context ?? getContext();
	}

	/**
	 * Load RSS configuration from TOML file with secret resolution.
	 */
	async loadConfig(
		filePath: string,
		options: { strict?: boolean; verbose?: boolean } = {},
	): Promise<RSSConfig> {
		if (options.verbose) {
			console.log(`🔧 Loading RSS config from ${filePath}...`);
			console.log(formatConfigSummary(resolveAllConfig()));
		}

		// Resolve TOML with secret placeholders
		const resolved = await resolveTomlFile(filePath, {
			strict: options.strict,
			profile: this.context.profile,
		});

		this.config = resolved as RSSConfig;

		// Validate secret references
		const content = await Bun.file(filePath).text();
		const validation = validateTemplate(content);

		if (options.verbose) {
			console.log(`\n📋 Secret references: ${validation.references.length}`);
			if (validation.references.length > 0) {
				console.log(generateSecretReport(content));
			}
		}

		if (!validation.valid && options.strict) {
			throw new Error(
				`Invalid secret references: ${validation.errors.join(", ")}`,
			);
		}

		return this.config;
	}

	/**
	 * Load configuration from string (useful for testing).
	 */
	async loadConfigString(
		tomlContent: string,
		options: { strict?: boolean } = {},
	): Promise<RSSConfig> {
		const { resolveTemplate } = await import("../config/template-engine.js");

		const result = await resolveTemplate(tomlContent, {
			context: this.context,
			strict: options.strict,
		});

		this.config = Bun.TOML.parse(result.content) as RSSConfig;
		return this.config;
	}

	getFeeds(): RSSFeedConfig[] {
		return this.config?.feeds ?? [];
	}

	getFeedsByCategory(category: string): RSSFeedConfig[] {
		return this.getFeeds().filter((feed) =>
			feed.categories?.includes(category),
		);
	}

	getAPI(name: string): APIConfig | undefined {
		return this.config?.api?.[name];
	}

	/**
	 * Get current configuration summary.
	 */
	getSummary(): {
		feeds: number;
		apis: number;
		profile: string;
		contextSource: string;
	} {
		return {
			feeds: this.config?.feeds?.length ?? 0,
			apis: Object.keys(this.config?.api ?? {}).length,
			profile: this.context.profile,
			contextSource: this.context.configSource ?? "default",
		};
	}
}

/**
 * CLI command handler for RSS operations.
 */
export async function handleRSSCommand(
	command: string,
	args: string[],
): Promise<void> {
	const manager = new RSSSecretsManager();

	switch (command) {
		case "validate": {
			const configPath = args[0] ?? "config/rss.toml";
			console.log(`🔍 Validating ${configPath}...`);

			const content = await Bun.file(configPath).text();
			const validation = validateTemplate(content);

			if (validation.valid) {
				console.log(
					`✅ Config is valid (${validation.references.length} secret refs)`,
				);
				if (validation.references.length > 0) {
					console.log("\n📋 Secret References:");
					validation.references.forEach((ref) => {
						console.log(`   • ${ref.profile}/${ref.key}`);
					});
				}
			} else {
				console.error("❌ Validation errors:");
				validation.errors.forEach((e) => console.error(`   ${e}`));
				process.exit(1);
			}
			break;
		}

		case "feeds": {
			const configPath = args[0] ?? "config/rss.toml";
			await manager.loadConfig(configPath, { verbose: true });

			const feeds = manager.getFeeds();
			console.log(`\n📰 Configured Feeds (${feeds.length}):`);
			feeds.forEach((feed, i) => {
				console.log(`   ${i + 1}. ${feed.name}`);
				console.log(
					`      URL: ${feed.url.substring(0, 60)}${feed.url.length > 60 ? "..." : ""}`,
				);
				if (feed.categories?.length) {
					console.log(`      Categories: ${feed.categories.join(", ")}`);
				}
				if (feed.api_key_ref) {
					console.log(`      Auth: ✅ ${feed.api_key_ref}`);
				}
				if (feed.refresh_interval) {
					console.log(`      Refresh: ${feed.refresh_interval}s`);
				}
			});

			// Show categories summary
			const categories = new Set(feeds.flatMap((f) => f.categories ?? []));
			if (categories.size > 0) {
				console.log(`\n🏷️  Categories: ${Array.from(categories).join(", ")}`);
			}
			break;
		}

		case "categories": {
			const configPath = args[0] ?? "config/rss.toml";
			await manager.loadConfig(configPath);

			const feeds = manager.getFeeds();
			const categories = new Set(feeds.flatMap((f) => f.categories ?? []));

			console.log("📁 Feeds by Category:\n");
			for (const category of categories) {
				const catFeeds = manager.getFeedsByCategory(category);
				console.log(`   ${category} (${catFeeds.length}):`);
				catFeeds.forEach((f) => console.log(`      • ${f.name}`));
			}
			break;
		}

		case "config": {
			console.log("📋 RSS Configuration Context:\n");
			console.log(formatConfigSummary(resolveAllConfig()));
			break;
		}

		default:
			console.log(`
RSS Secrets CLI (Standalone)

Usage:
  bun rss-secrets-simple.ts <command> [options]

Commands:
  validate [config.toml]     Validate TOML config and secret refs
  feeds [config.toml]        List configured feeds
  categories [config.toml]   List feeds grouped by category
  config                     Show configuration context

Options:
  --secrets-dir <path>       Override secrets directory
  --profile <name>           Override profile
  --verbose                  Show detailed output
`);
	}
}
