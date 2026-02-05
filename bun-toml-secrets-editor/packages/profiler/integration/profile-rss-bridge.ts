#!/usr/bin/env bun

/**
 * Profile-RSS Bridge Integration
 * Bridges performance profiling with RSS infrastructure using unified configuration
 */

import {
	createLogger,
	type EnhancedLogger,
	LogLevel,
} from "../../../core/logging/enhanced-logger";
import type {
	ProfileRssTriggerEntry,
	RssFeedEntry,
} from "../../../core/types/integrated-profile";
import {
	type IntegratedProfileConfig,
	IntegratedProfileLoader,
	type ProfileRssState,
} from "../../../core/types/integrated-profile";

interface BridgeOptions {
	configPath?: string;
	config?: IntegratedProfileConfig; // Allow direct config injection for testing
	enableHotReload?: boolean;
	logLevel?: LogLevel;
	profileMode?: "adaptive" | "manual" | "performance";
}

interface RssFetchMetrics {
	feedName: string;
	latencyMs: number;
	success: boolean;
	errorCount: number;
	fetchSize: number;
	timestamp: Date;
}

interface ProfilePerformanceMetrics {
	cpu_usage_percent: number;
	memory_usage_mb: number;
	heap_usage_mb: number;
	fetch_latency_avg_ms: number;
	cache_hit_ratio: number;
	error_rate: number;
	timestamp: Date;
}

export class ProfileRssBridge {
	private config!: IntegratedProfileConfig;
	private logger: EnhancedLogger;
	private currentState!: ProfileRssState;
	private metricsHistory: ProfilePerformanceMetrics[] = [];
	private fetchMetrics: RssFetchMetrics[] = [];
	private hotReloadWatcher: any = null;

	constructor(options: BridgeOptions = {}) {
		this.logger = createLogger({
			service: "profile-rss-bridge",
			level: (options.logLevel || LogLevel.INFO) as any,
			logFile: "./logs/profile-rss-bridge.jsonl",
			enableMetrics: true,
			enableColors: true,
		});

		this.initializeState();

		// Use direct config if provided, otherwise load from file
		if (options.config) {
			this.config = options.config;
			this.logger.info("🔗 Profile-RSS Bridge initialized with direct config", {
				profile: this.config.profile.name,
				feeds: this.config.rss.feeds.entry.length,
				triggers: this.config.integration.profile_rss.triggers.entry.length,
			});
		} else {
			this.setupConfig(options.configPath);
		}

		if (options.enableHotReload) {
			this.setupHotReload();
		}
	}

	private initializeState(): void {
		this.currentState = {
			current_profile: "default",
			active_feeds: new Map(),
			performance_metrics: {
				cpu_usage_percent: 0,
				memory_usage_mb: 0,
				heap_usage_mb: 0,
				fetch_latency_avg_ms: 0,
				cache_hit_ratio: 0,
				error_rate: 0,
			},
			security_status: {
				url_scan_passed: true,
				certificate_valid: true,
				auth_status: new Map(),
				blocked_requests: 0,
				violations: [],
			},
		};
	}

	private async setupConfig(configPath?: string): Promise<void> {
		const loader = IntegratedProfileLoader.getInstance(configPath);
		this.config = await loader.loadConfig();

		this.logger.info("🔗 Profile-RSS Bridge initialized", {
			profile: this.config.profile.name,
			feeds: this.config.rss.feeds.entry.length,
			triggers: this.config.integration.profile_rss.triggers.entry.length,
		});

		// Initialize RSS feeds
		await this.initializeRssFeeds();
	}

	private async initializeRssFeeds(): Promise<void> {
		for (const feed of this.config.rss.feeds.entry) {
			this.currentState.active_feeds.set(feed.name, {
				name: feed.name,
				url: feed.url,
				status: "active",
				last_fetch: new Date(),
				next_fetch: new Date(Date.now() + feed.update_interval_seconds * 1000),
				error_count: 0,
				latency_ms: 0,
				auth_status: feed.auth_required ? "unauthenticated" : "authenticated",
			});
		}

		this.logger.info("📡 RSS feeds initialized", {
			active_feeds: this.currentState.active_feeds.size,
		});
	}

	private setupHotReload(): void {
		if (!this.config.development.hot_reload) {
			return;
		}

		const watchFiles = this.config.development.watch_files;

		// Simple file watcher implementation
		const checkFiles = async () => {
			try {
				const loader = IntegratedProfileLoader.getInstance();
				await loader.reloadConfig();
				this.config = await loader.loadConfig();

				this.logger.info("🔄 Configuration hot-reloaded", {
					timestamp: new Date().toISOString(),
				});

				// Reinitialize feeds if configuration changed
				await this.initializeRssFeeds();
			} catch (error) {
				this.logger.error("Hot reload failed", { error });
			}
		};

		// Check every 5 seconds for file changes
		this.hotReloadWatcher = setInterval(checkFiles, 5000);

		this.logger.info("🔥 Hot reload enabled", {
			watching: watchFiles,
		});
	}

	// =============================================================================
	// ADAPTIVE RSS FETCHING
	// =============================================================================

	async fetchRssFeed(feedName: string): Promise<any> {
		const feed = this.config.rss.feeds.entry.find((f) => f.name === feedName);
		if (!feed) {
			throw new Error(`Feed not found: ${feedName}`);
		}

		const startTime = Date.now();
		const feedState = this.currentState.active_feeds.get(feedName)!;

		try {
			// Apply profile-specific configuration
			const timeout = this.getProfileSpecificTimeout(feed);
			const userAgent = this.config.rss.user_agent.replace(
				"${profile.name}",
				this.config.profile.name,
			);

			// Perform fetch with profile-aware settings
			const response = await this.fetchWithProfileSettings(feed.url, {
				timeout,
				userAgent,
				authRequired: feed.auth_required,
			});

			const latency = Date.now() - startTime;
			const content = await response.text();

			// Update metrics
			this.updateFetchMetrics(feedName, {
				feedName,
				latencyMs: latency,
				success: true,
				errorCount: 0,
				fetchSize: content.length,
				timestamp: new Date(),
			});

			// Update feed state
			feedState.last_fetch = new Date();
			feedState.latency_ms = latency;
			feedState.next_fetch = new Date(
				Date.now() + feed.update_interval_seconds * 1000,
			);
			feedState.error_count = 0;

			this.logger.debug("📡 RSS fetch successful", {
				feed: feedName,
				latency: `${latency}ms`,
				size: `${content.length} bytes`,
			});

			// Check for profile triggers
			await this.checkProfileTriggers(feedName, content);

			return content;
		} catch (error) {
			const latency = Date.now() - startTime;

			feedState.error_count++;
			feedState.status = "error";

			this.updateFetchMetrics(feedName, {
				feedName,
				latencyMs: latency,
				success: false,
				errorCount: 1,
				fetchSize: 0,
				timestamp: new Date(),
			});

			this.logger.error("RSS fetch failed", {
				feed: feedName,
				error: error instanceof Error ? error.message : "Unknown error",
				attempts: feedState.error_count,
			});

			throw error;
		}
	}

	private getProfileSpecificTimeout(feed: RssFeedEntry): number {
		const securityProfile =
			this.config.security.profiles[
				this.config.profile
					.environment as keyof typeof this.config.security.profiles
			];
		return securityProfile?.rss_timeout_ms || this.config.rss.timeout_ms;
	}

	private async fetchWithProfileSettings(
		url: string,
		options: {
			timeout: number;
			userAgent: string;
			authRequired: boolean;
		},
	): Promise<Response> {
		const headers: Record<string, string> = {
			"User-Agent": options.userAgent,
		};

		// Add authentication if required
		if (options.authRequired) {
			// This would integrate with your secrets management
			const authToken = await this.getAuthToken(url);
			if (authToken) {
				headers["Authorization"] = `Bearer ${authToken}`;
			}
		}

		// Apply security scanning
		if (this.config.security.url_pattern_scan) {
			this.validateUrlSecurity(url);
		}

		// Perform fetch with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), options.timeout);

		try {
			const response = await fetch(url, {
				headers,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	private async getAuthToken(url: string): Promise<string | null> {
		// This would integrate with Bun.secrets or your secrets management
		// For now, return null (no auth)
		return null;
	}

	private validateUrlSecurity(url: string): void {
		const urlObj = new URL(url);

		// Check against blocked patterns
		for (const pattern of this.config.security.blocked_patterns) {
			if (new RegExp(pattern.replace("*", ".*")).test(url)) {
				this.currentState.security_status.blocked_requests++;
				throw new Error(`URL blocked by security pattern: ${pattern}`);
			}
		}

		// Check allowed domains
		const allowedDomains = this.config.security.allowed_rss_domains;
		if (allowedDomains.length > 0) {
			const domain = urlObj.hostname;
			const isAllowed = allowedDomains.some((allowed) => {
				if (allowed.startsWith("*.")) {
					return domain.endsWith(allowed.slice(2));
				}
				return domain === allowed;
			});

			if (!isAllowed) {
				this.currentState.security_status.blocked_requests++;
				throw new Error(`Domain not allowed: ${domain}`);
			}
		}
	}

	// =============================================================================
	// PROFILE TRIGGERING
	// =============================================================================

	private async checkProfileTriggers(
		feedName: string,
		content: string,
	): Promise<void> {
		if (!this.config.integration.profile_rss.enabled) {
			return;
		}

		for (const trigger of this.config.integration.profile_rss.triggers.entry) {
			if (trigger.feed_url !== this.getFeedUrl(feedName)) {
				continue;
			}

			try {
				const pattern = new RegExp(trigger.trigger_pattern, "i");
				if (pattern.test(content)) {
					await this.activateProfileTrigger(trigger, feedName, content);
				}
			} catch (error) {
				this.logger.error("Trigger pattern error", {
					trigger: trigger.activate_profile,
					pattern: trigger.trigger_pattern,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}
	}

	private getFeedUrl(feedName: string): string {
		const feed = this.config.rss.feeds.entry.find((f) => f.name === feedName);
		return feed?.url || "";
	}

	private async activateProfileTrigger(
		trigger: ProfileRssTriggerEntry,
		feedName: string,
		content: string,
	): Promise<void> {
		this.logger.info("🎯 Profile trigger activated", {
			feed: feedName,
			trigger: trigger.activate_profile,
			pattern: trigger.trigger_pattern,
		});

		// Check cooldown
		if (
			this.isProfileInCooldown(
				trigger.activate_profile,
				trigger.cooldown_minutes,
			)
		) {
			this.logger.debug("Profile in cooldown, skipping", {
				profile: trigger.activate_profile,
			});
			return;
		}

		// Check required secrets
		const missingSecrets = await this.checkRequiredSecrets(
			trigger.secrets_required,
		);
		if (missingSecrets.length > 0) {
			this.logger.warn("Missing required secrets for profile switch", {
				profile: trigger.activate_profile,
				missing: missingSecrets,
			});
			return;
		}

		// Switch profile
		await this.switchProfile(trigger.activate_profile, "rss_trigger", feedName);
	}

	private isProfileInCooldown(
		profileName: string,
		cooldownMinutes: number,
	): boolean {
		// This would track last profile switch times
		// For now, return false (no cooldown)
		return false;
	}

	private async checkRequiredSecrets(secrets: string[]): Promise<string[]> {
		const missing: string[] = [];

		for (const secret of secrets) {
			// This would check against Bun.secrets or your secrets management
			const value = process.env[secret];
			if (!value) {
				missing.push(secret);
			}
		}

		return missing;
	}

	// =============================================================================
	// PROFILE MANAGEMENT
	// =============================================================================

	async switchProfile(
		newProfile: string,
		trigger: "manual" | "automatic" | "rss_trigger" | "performance" = "manual",
		source?: string,
	): Promise<void> {
		const oldProfile = this.currentState.current_profile;

		if (oldProfile === newProfile) {
			this.logger.debug("Profile already active", { profile: newProfile });
			return;
		}

		this.logger.info("🔄 Switching profile", {
			from: oldProfile,
			to: newProfile,
			trigger,
			source,
		});

		try {
			// This would load and apply the new profile configuration
			// For now, just update the state
			this.currentState.current_profile = newProfile;
			this.currentState.last_profile_switch = {
				from_profile: oldProfile,
				to_profile: newProfile,
				trigger,
				trigger_source: source,
				timestamp: new Date(),
				migration_successful: true,
			};

			// Reinitialize RSS feeds with new profile settings
			await this.initializeRssFeeds();

			this.logger.success("✅ Profile switch completed", {
				profile: newProfile,
				feeds_migrated: this.currentState.active_feeds.size,
			});
		} catch (error) {
			this.logger.error("Profile switch failed", {
				from: oldProfile,
				to: newProfile,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			// Record failed switch
			this.currentState.last_profile_switch = {
				from_profile: oldProfile,
				to_profile: newProfile,
				trigger,
				trigger_source: source,
				timestamp: new Date(),
				migration_successful: false,
			};

			throw error;
		}
	}

	// =============================================================================
	// METRICS COLLECTION
	// =============================================================================

	private updateFetchMetrics(feedName: string, metrics: RssFetchMetrics): void {
		this.fetchMetrics.push(metrics);

		// Keep only last 1000 metrics
		if (this.fetchMetrics.length > 1000) {
			this.fetchMetrics = this.fetchMetrics.slice(-1000);
		}

		// Update performance metrics
		this.updatePerformanceMetrics();
	}

	private updatePerformanceMetrics(): void {
		const recentMetrics = this.fetchMetrics.slice(-100); // Last 100 fetches

		if (recentMetrics.length === 0) {
			return;
		}

		const successfulFetches = recentMetrics.filter((m) => m.success);
		const avgLatency =
			successfulFetches.reduce((sum, m) => sum + m.latencyMs, 0) /
			successfulFetches.length;
		const errorRate =
			(recentMetrics.length - successfulFetches.length) / recentMetrics.length;

		// Get memory usage
		const memUsage = process.memoryUsage();

		this.currentState.performance_metrics = {
			cpu_usage_percent: 0, // Would need CPU monitoring
			memory_usage_mb: memUsage.rss / 1024 / 1024,
			heap_usage_mb: memUsage.heapUsed / 1024 / 1024,
			fetch_latency_avg_ms: avgLatency,
			cache_hit_ratio: 0, // Would need cache metrics
			error_rate: errorRate * 100,
		};

		// Store in history
		this.metricsHistory.push({
			cpu_usage_percent:
				this.currentState.performance_metrics.cpu_usage_percent,
			memory_usage_mb: this.currentState.performance_metrics.memory_usage_mb,
			heap_usage_mb: this.currentState.performance_metrics.heap_usage_mb,
			fetch_latency_avg_ms:
				this.currentState.performance_metrics.fetch_latency_avg_ms,
			cache_hit_ratio: this.currentState.performance_metrics.cache_hit_ratio,
			error_rate: this.currentState.performance_metrics.error_rate,
			timestamp: new Date(),
		});

		// Keep only last 1000 metrics
		if (this.metricsHistory.length > 1000) {
			this.metricsHistory = this.metricsHistory.slice(-1000);
		}
	}

	// =============================================================================
	// SECURITY VALIDATION METHODS
	// =============================================================================

	async getValidEndpoints(profile: IntegratedProfileConfig): Promise<string[]> {
		const endpoints: string[] = [];

		if (profile.rss?.endpoints?.primary) {
			if (
				!this.isInternalURL(profile.rss.endpoints.primary) &&
				this.isDomainAllowed(profile.rss.endpoints.primary)
			) {
				endpoints.push(profile.rss.endpoints.primary);
			}
		}

		if (profile.rss?.endpoints?.fallback) {
			if (
				!this.isInternalURL(profile.rss.endpoints.fallback) &&
				this.isDomainAllowed(profile.rss.endpoints.fallback)
			) {
				endpoints.push(profile.rss.endpoints.fallback);
			}
		}

		return endpoints;
	}

	private isDomainAllowed(url: string): boolean {
		try {
			const urlObj = new URL(url);
			const allowedDomains = this.config.security.allowed_rss_domains;

			if (allowedDomains.length === 0) {
				return true; // No whitelist configured
			}

			const domain = urlObj.hostname;
			const isAllowed = allowedDomains.some((allowed) => {
				if (allowed.startsWith("*.")) {
					return domain.endsWith(allowed.slice(2));
				}
				return domain === allowed;
			});

			return isAllowed;
		} catch {
			return false; // Invalid URLs are not allowed
		}
	}

	validateProfileSecurity(profile: any): void {
		if (!profile.rss?.endpoints) {
			throw new Error("Profile missing RSS endpoints configuration");
		}

		const endpoints = profile.rss.endpoints;

		if (endpoints.primary && this.isInternalURL(endpoints.primary)) {
			throw new Error(
				`Primary endpoint cannot use internal IP: ${endpoints.primary}`,
			);
		}

		if (endpoints.fallback && this.isInternalURL(endpoints.fallback)) {
			throw new Error(
				`Fallback endpoint cannot use internal IP: ${endpoints.fallback}`,
			);
		}
	}

	private isInternalURL(url: string): boolean {
		try {
			const parsedUrl = new URL(url);
			let hostname = parsedUrl.hostname.toLowerCase();

			// Only allow http and https protocols
			if (!["http:", "https:"].includes(parsedUrl.protocol)) {
				return true; // Block non-HTTP protocols
			}

			// Remove trailing dot
			if (hostname.endsWith(".")) {
				hostname = hostname.slice(0, -1);
			}

			// IPv6-mapped IPv4 detection (::ffff:127.0.0.1)
			if (hostname.startsWith("[::ffff:")) {
				const ipv4 = hostname.replace("[::ffff:", "").replace("]", "");
				if (this.isIPv4Internal(ipv4)) {
					return true;
				}
			}

			// Standard IPv6 loopback and internal IPv6
			if (hostname.startsWith("[") && hostname.endsWith("]")) {
				const ipv6 = hostname.slice(1, -1).toLowerCase();
				if (
					ipv6 === "::1" || // IPv6 loopback
					ipv6.startsWith("fe80::") || // Link-local IPv6
					ipv6.startsWith("fc00::") || // Private IPv6
					ipv6 === "::" || // Unspecified
					ipv6.startsWith("2001:db8::") || // Documentation
					ipv6.includes("127.0.0.1") // IPv4 embedded in IPv6
				) {
					return true;
				}
			}

			// Check for localhost variations and suspicious domains
			if (
				hostname === "localhost" ||
				hostname === "localdomain" ||
				hostname.endsWith(".localhost") ||
				hostname.endsWith(".localdomain") ||
				hostname.endsWith(".localhost.com") ||
				hostname.endsWith(".localdomain.com")
			) {
				return true;
			}

			// Check for IP addresses in domain names (evasion technique)
			if (/\d+\.\d+\.\d+\.\d+/.test(hostname)) {
				// Extract IP pattern from domain
				const ipMatch = hostname.match(/(\d+\.\d+\.\d+\.\d+)/);
				if (ipMatch) {
					const ip = ipMatch[1];
					if (this.isIPv4Internal(ip)) {
						return true;
					}
				}
			}

			// Check for IPv4 addresses
			if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
				return this.isIPv4Internal(hostname);
			}

			// Check for DNS rebinding patterns
			if (hostname.match(/\d+\.\d+\.\d+\.\d+\.(nip|xip)\.io$/)) {
				return true;
			}

			// Check for Unicode digits that might represent IPs
			if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(hostname)) {
				// Convert Unicode digits to regular digits
				const converted = hostname
					.replace(/①/g, "1")
					.replace(/②/g, "2")
					.replace(/③/g, "3")
					.replace(/④/g, "4")
					.replace(/⑤/g, "5")
					.replace(/⑥/g, "6")
					.replace(/⑦/g, "7")
					.replace(/⑧/g, "8")
					.replace(/⑨/g, "9")
					.replace(/⑩/g, "0");

				if (/^\d+\.\d+\.\d+\.\d+$/.test(converted)) {
					return this.isIPv4Internal(converted);
				}
			}

			return false;
		} catch {
			return true; // Invalid URLs are considered unsafe
		}
	}

	private isIPv4Internal(ip: string): boolean {
		const parts = ip.split(".").map(Number);
		return (
			parts[0] === 127 || // Loopback
			parts[0] === 10 || // Private Class A
			(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // Private Class B
			(parts[0] === 192 && parts[1] === 168) || // Private Class C
			(parts[0] === 169 && parts[1] === 254) || // Link-local
			parts.every((p) => p === 0) || // 0.0.0.0
			parts[0] === 224 || // Multicast
			parts[0] >= 240 // Reserved
		);
	}

	// =============================================================================
	// PUBLIC API
	// =============================================================================

	getCurrentState(): ProfileRssState {
		return { ...this.currentState };
	}

	getConfig(): IntegratedProfileConfig {
		return { ...this.config };
	}

	getMetrics(): {
		performance: ProfilePerformanceMetrics[];
		fetches: RssFetchMetrics[];
		current: ProfilePerformanceMetrics;
	} {
		return {
			performance: [...this.metricsHistory],
			fetches: [...this.fetchMetrics],
			current: {
				...this.currentState.performance_metrics,
				timestamp: new Date(),
			},
		};
	}

	async shutdown(): Promise<void> {
		this.logger.info("🛑 Shutting down Profile-RSS Bridge");

		// Clear hot reload watcher
		if (this.hotReloadWatcher) {
			clearInterval(this.hotReloadWatcher);
		}

		// Shutdown logger
		await this.logger.shutdown();
	}
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

interface CliOptions {
	config?: string;
	mode?: "adaptive" | "manual" | "performance";
	hotReload?: boolean;
	logLevel?: string;
	help?: boolean;
}

function parseCliArgs(): CliOptions {
	const args = process.argv.slice(2);
	const options: CliOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "--config":
			case "-c":
				options.config = args[++i];
				break;

			case "--mode":
			case "-m":
				options.mode = args[++i] as any;
				break;

			case "--hot-reload":
				options.hotReload = true;
				break;

			case "--log-level":
				options.logLevel = args[++i];
				break;

			case "--help":
			case "-h":
				options.help = true;
				break;

			default:
				if (arg.startsWith("--")) {
					console.error(`Unknown option: ${arg}`);
					process.exit(1);
				}
		}
	}

	return options;
}

function showHelp(): void {
	console.log(`
🔗 Profile-RSS Bridge CLI

USAGE:
  bun run src/integration/profile-rss-bridge.ts [OPTIONS]

OPTIONS:
  -c, --config <path>        Configuration file path (default: ./config/integrated-profile.toml)
  -m, --mode <mode>          Operation mode: adaptive, manual, performance
      --hot-reload           Enable configuration hot reload
      --log-level <level>    Log level: debug, info, warn, error
  -h, --help                 Show this help message

EXAMPLES:
  # Start with adaptive mode
  bun run src/integration/profile-rss-bridge.ts --mode adaptive

  # Start with hot reload
  bun run src/integration/profile-rss-bridge.ts --hot-reload

  # Use custom configuration
  bun run src/integration/profile-rss-bridge.ts --config ./config/custom-profile.toml

  # Performance mode with debug logging
  bun run src/integration/profile-rss-bridge.ts --mode performance --log-level debug
`);
}

async function main(): Promise<void> {
	const options = parseCliArgs();

	if (options.help) {
		showHelp();
		return;
	}

	const bridge = new ProfileRssBridge({
		configPath: options.config,
		enableHotReload: options.hotReload,
		logLevel: options.logLevel as LogLevel,
		profileMode: options.mode,
	});

	// Setup graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n🛑 Shutting down gracefully...");
		await bridge.shutdown();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("\n🛑 Shutting down gracefully...");
		await bridge.shutdown();
		process.exit(0);
	});

	// Keep the process running
	console.log("🔗 Profile-RSS Bridge is running. Press Ctrl+C to stop.");

	// Demo: fetch a feed
	try {
		const feeds = bridge.getConfig().rss.feeds.entry;
		if (feeds.length > 0) {
			console.log(`📡 Fetching demo feed: ${feeds[0].name}`);
			await bridge.fetchRssFeed(feeds[0].name);
			console.log("✅ Demo fetch completed");
		}
	} catch (error) {
		console.error("❌ Demo fetch failed:", error);
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ Profile-RSS Bridge failed:", error);
		process.exit(1);
	});
}
