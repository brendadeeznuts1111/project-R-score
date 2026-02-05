/**
 * RSS Secrets Integration
 *
 * Integrates the secrets management system with the RSS feed fetcher:
 * - API keys for authenticated feeds (NewsAPI, Feedly, etc.)
 * - TOML configuration with secret placeholders
 * - Per-environment feed configurations (dev/staging/prod)
 * - Secure credential storage
 *
 * @example
 * ```toml
 * # config/rss.toml
 * [api.newsapi]
 * key = "${secrets:production:NEWSAPI_KEY}"
 * endpoint = "https://newsapi.org/v2/top-headlines"
 *
 * [[feeds]]
 * name = "Tech News"
 * url = "${secrets:production:TECH_FEED_URL}"
 * refresh_interval = 300
 * ```
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
import { RSSFetcher } from "./rss-fetcher.js";

/** RSS Feed configuration with secret support */
export interface RSSFeedConfig {
	/** Feed name for identification */
	name: string;
	/** Feed URL (can contain ${secrets:...} placeholders) */
	url: string;
	/** Refresh interval in seconds */
	refresh_interval?: number;
	/** API key reference for authenticated feeds */
	api_key_ref?: string;
	/** Custom headers with secret support */
	headers?: Record<string, string>;
	/** Whether to enable DNS prefetching */
	prefetch_dns?: boolean;
	/** Categories/tags for organization */
	categories?: string[];
}

/** API configuration with secrets */
export interface APIConfig {
	/** API key reference (${secrets:profile:KEY_NAME}) */
	key_ref?: string;
	/** API endpoint */
	endpoint: string;
	/** Rate limit (requests per minute) */
	rate_limit?: number;
	/** Custom headers */
	headers?: Record<string, string>;
}

/** Complete RSS configuration */
export interface RSSConfig {
	/** Global settings */
	settings?: {
		default_refresh_interval?: number;
		max_concurrent_fetches?: number;
		timeout?: number;
		user_agent?: string;
	};
	/** API configurations */
	api?: Record<string, APIConfig>;
	/** Feed configurations */
	feeds?: RSSFeedConfig[];
	/** Secret validation mode */
	secret_validation?: "strict" | "lenient";
}

/** Feed fetch result with metadata */
export interface FeedResult {
	feed: RSSFeedConfig;
	data?: unknown;
	error?: string;
	fetch_time: number;
	cached: boolean;
}

/** RSS Manager with secrets integration */
export class RSSSecretsManager {
	private fetcher: RSSFetcher;
	private config?: RSSConfig;
	private context: SecretsContext;
	private resolvedSecrets: Map<string, string> = new Map();

	constructor(options?: { context?: SecretsContext; fetcher?: RSSFetcher }) {
		this.context = options?.context ?? getContext();
		this.fetcher = options?.fetcher ?? new RSSFetcher();
	}

	/**
	 * Load RSS configuration from TOML file with secret resolution.
	 *
	 * @example
	 * ```typescript
	 * const manager = new RSSSecretsManager();
	 * await manager.loadConfig("config/rss.toml", { strict: true });
	 * console.log(manager.getFeeds());
	 * ```
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

	/**
	 * Get all configured feeds.
	 */
	getFeeds(): RSSFeedConfig[] {
		return this.config?.feeds ?? [];
	}

	/**
	 * Get feeds by category.
	 */
	getFeedsByCategory(category: string): RSSFeedConfig[] {
		return this.getFeeds().filter((feed) =>
			feed.categories?.includes(category),
		);
	}

	/**
	 * Get API configuration by name.
	 */
	getAPI(name: string): APIConfig | undefined {
		return this.config?.api?.[name];
	}

	/**
	 * Fetch a single feed with secret resolution.
	 *
	 * @example
	 * ```typescript
	 * const result = await manager.fetchFeed({
	 *   name: "Tech News",
	 *   url: "${secrets:prod:FEED_URL}",
	 *   api_key_ref: "${secrets:prod:API_KEY}"
	 * });
	 * ```
	 */
	async fetchFeed(feed: RSSFeedConfig): Promise<FeedResult> {
		const startTime = performance.now();

		try {
			// Resolve feed URL (in case it has secret placeholders)
			const resolvedUrl = await this.resolveValue(feed.url);

			// Build headers with API key if specified
			const headers: Record<string, string> = { ...feed.headers };

			if (feed.api_key_ref) {
				const apiKey = await this.resolveValue(feed.api_key_ref);
				headers.Authorization = `Bearer ${apiKey}`;
				headers["X-API-Key"] = apiKey;
			}

			// Check for custom API config
			const apiConfig = this.findAPIConfigForFeed(feed);
			if (apiConfig?.headers) {
				Object.assign(headers, apiConfig.headers);
			}

			// Fetch the feed
			const fetchOptions: FetchOptions = {
				timeout: this.config?.settings?.timeout ?? 30000,
				headers,
			};

			const data = await this.fetcher.fetch(resolvedUrl, fetchOptions);

			return {
				feed,
				data,
				fetch_time: performance.now() - startTime,
				cached: false,
			};
		} catch (error: any) {
			return {
				feed,
				error: error.message,
				fetch_time: performance.now() - startTime,
				cached: false,
			};
		}
	}

	/**
	 * Fetch all configured feeds.
	 */
	async fetchAllFeeds(options?: {
		categories?: string[];
		concurrent?: number;
		onProgress?: (current: number, total: number) => void;
	}): Promise<FeedResult[]> {
		let feeds = this.getFeeds();

		// Filter by category if specified
		if (options?.categories) {
			feeds = feeds.filter((feed) =>
				feed.categories?.some((cat) => options.categories?.includes(cat)),
			);
		}

		const results: FeedResult[] = [];
		const concurrent =
			options?.concurrent ?? this.config?.settings?.max_concurrent_fetches ?? 5;

		// Process in batches
		for (let i = 0; i < feeds.length; i += concurrent) {
			const batch = feeds.slice(i, i + concurrent);
			const batchResults = await Promise.all(
				batch.map((feed) => this.fetchFeed(feed)),
			);

			results.push(...batchResults);

			if (options?.onProgress) {
				options.onProgress(
					Math.min(i + concurrent, feeds.length),
					feeds.length,
				);
			}
		}

		return results;
	}

	/**
	 * Get API config that might be associated with a feed.
	 */
	private findAPIConfigForFeed(feed: RSSFeedConfig): APIConfig | undefined {
		if (!this.config?.api) return undefined;

		// Try to match by name or category
		for (const [name, config] of Object.entries(this.config.api)) {
			if (
				feed.name.toLowerCase().includes(name.toLowerCase()) ||
				feed.categories?.some((cat) =>
					cat.toLowerCase().includes(name.toLowerCase()),
				)
			) {
				return config;
			}
		}

		return undefined;
	}

	/**
	 * Resolve a value that might contain secret placeholders.
	 */
	private async resolveValue(value: string): Promise<string> {
		// Check cache first
		if (this.resolvedSecrets.has(value)) {
			return this.resolvedSecrets.get(value)!;
		}

		// Simple secret resolution for ${secrets:profile:key}
		const secretMatch = value.match(/^\$\{secrets:([^:]+):([^}]+)\}$/);
		if (secretMatch) {
			const [, profile, key] = secretMatch;
			const { getWithFallback } = await import(
				"../secrets/context-resolver.js"
			);
			const resolved = await getWithFallback("default", key, profile);

			if (resolved) {
				this.resolvedSecrets.set(value, resolved);
				return resolved;
			}

			throw new Error(`Secret not found: ${profile}/${key}`);
		}

		// Return as-is if no secret pattern
		return value;
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
			feeds.forEach((feed) => {
				console.log(`   • ${feed.name}`);
				console.log(`     URL: ${feed.url.substring(0, 50)}...`);
				if (feed.categories) {
					console.log(`     Categories: ${feed.categories.join(", ")}`);
				}
			});
			break;
		}

		case "fetch": {
			const feedName = args[0];
			const configPath = args[1] ?? "config/rss.toml";

			await manager.loadConfig(configPath);

			const feed = manager.getFeeds().find((f) => f.name === feedName);
			if (!feed) {
				console.error(`❌ Feed not found: ${feedName}`);
				console.log("Available feeds:");
				manager.getFeeds().forEach((f) => console.log(`   - ${f.name}`));
				process.exit(1);
			}

			console.log(`🚀 Fetching "${feed.name}"...`);
			const result = await manager.fetchFeed(feed);

			if (result.error) {
				console.error(`❌ Error: ${result.error}`);
				process.exit(1);
			} else {
				console.log(`✅ Fetched in ${result.fetch_time.toFixed(2)}ms`);
				console.log(JSON.stringify(result.data, null, 2));
			}
			break;
		}

		case "fetch-all": {
			const configPath = args[0] ?? "config/rss.toml";
			await manager.loadConfig(configPath, { verbose: true });

			console.log("\n🚀 Fetching all feeds...");
			const results = await manager.fetchAllFeeds({
				onProgress: (current, total) => {
					process.stdout.write(`\r   Progress: ${current}/${total}`);
				},
			});
			console.log();

			const successful = results.filter((r) => !r.error).length;
			const failed = results.filter((r) => r.error).length;

			console.log(`\n📊 Results: ${successful} OK, ${failed} failed`);

			if (failed > 0) {
				console.log("\n❌ Failures:");
				results
					.filter((r) => r.error)
					.forEach((r) => console.log(`   • ${r.feed.name}: ${r.error}`));
			}
			break;
		}

		case "config": {
			console.log("📋 RSS Configuration Context:");
			console.log(formatConfigSummary(resolveAllConfig()));
			break;
		}

		default:
			console.log(`
RSS Secrets CLI

Usage:
  bun rss-secrets.ts <command> [options]

Commands:
  validate [config.toml]     Validate TOML config and secret refs
  feeds [config.toml]        List configured feeds
  fetch <name> [config.toml] Fetch a specific feed
  fetch-all [config.toml]    Fetch all feeds
  config                     Show configuration context

Examples:
  bun rss-secrets.ts validate
  bun rss-secrets.ts feeds
  bun rss-secrets.ts fetch "Tech News"
  bun rss-secrets.ts fetch-all --secrets-dir ./secrets --profile prod
`);
	}
}

// Export types for consumers
export type { SecretsContext, FetchOptions };
