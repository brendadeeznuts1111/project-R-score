/**
 * TypeScript definitions for Unified Profile-RSS-Secrets Integration
 * Generated from integrated-profile.toml schema v1.0.0
 */

// =============================================================================
// BASE TYPES
// =============================================================================

export interface IntegratedProfileConfig {
	meta: MetaConfig;
	profile: ProfileConfig;
	secrets: SecretsConfig;
	rss: RssConfig;
	integration: IntegrationConfig;
	security: SecurityConfig;
	observability: ObservabilityConfig;
	development: DevelopmentConfig;
	deployment: DeploymentConfig;
	features: FeaturesConfig;
}

export interface MetaConfig {
	version: string;
	schema: string;
	description: string;
	created_at: string;
}

// =============================================================================
// PROFILE CONFIGURATION
// =============================================================================

export interface ProfileConfig {
	name: string;
	base: string;
	tier: "community" | "premium";
	environment: "development" | "staging" | "production";
	performance: PerformanceConfig;
	monitoring: MonitoringConfig;
}

export interface PerformanceConfig {
	cpu_profiling: "auto" | "manual" | "disabled";
	heap_threshold: number;
	memory_limit_mb: number;
	worker_threads: number;
	cache_strategy: "adaptive" | "lru" | "fifo";
}

export interface MonitoringConfig {
	metrics_interval_ms: number;
	profiling_sample_rate: number;
	alert_webhook?: string;
	health_check_interval: number;
}

// =============================================================================
// SECRETS CONFIGURATION
// =============================================================================

export interface SecretsConfig {
	sources: string[];
	required: string[];
	optional: string[];
	bun_integration: BunSecretsConfig;
	encryption: EncryptionConfig;
}

export interface BunSecretsConfig {
	use_bun_secrets: boolean;
	auto_refresh: boolean;
	cache_ttl_seconds: number;
}

export interface EncryptionConfig {
	algorithm: string;
	key_derivation: string;
	rotation_days: number;
}

// =============================================================================
// RSS CONFIGURATION
// =============================================================================

export interface RssConfig {
	fetch_concurrency: number;
	respect_robots: boolean;
	user_agent: string;
	timeout_ms: number;
	retry_attempts: number;
	backoff_strategy: "exponential" | "linear" | "fixed";
	cache: RssCacheConfig;
	endpoints: RssEndpointsConfig;
	feeds: RssFeedsConfig;
}

export interface RssCacheConfig {
	enabled: boolean;
	type: "redis" | "memory" | "disk";
	ttl_seconds: number;
	max_entries: number;
	compression: boolean;
}

export interface RssEndpointsConfig {
	primary: string;
	fallback?: string;
	health_check: string;
}

export interface RssFeedsConfig {
	entry: RssFeedEntry[];
}

export interface RssFeedEntry {
	name: string;
	url: string;
	category: string;
	priority: "high" | "medium" | "low";
	auth_required: boolean;
	update_interval_seconds: number;
}

// =============================================================================
// INTEGRATION CONFIGURATION
// =============================================================================

export interface IntegrationConfig {
	profile_rss: ProfileRssIntegrationConfig;
}

export interface ProfileRssIntegrationConfig {
	enabled: boolean;
	auto_profile_switching: boolean;
	performance_threshold_ms: number;
	memory_pressure_threshold: number;
	triggers: ProfileRssTriggersConfig;
}

export interface ProfileRssTriggersConfig {
	entry: ProfileRssTriggerEntry[];
}

export interface ProfileRssTriggerEntry {
	feed_url: string;
	trigger_pattern: string;
	activate_profile: string;
	secrets_required: string[];
	cooldown_minutes: number;
}

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export interface SecurityConfig {
	url_pattern_scan: boolean;
	allowed_rss_domains: string[];
	blocked_patterns: string[];
	max_response_size_mb: number;
	certificate_validation: boolean;
	profiles: SecurityProfilesConfig;
}

export interface SecurityProfilesConfig {
	high_security: SecurityProfileConfig;
	development: SecurityProfileConfig;
	testing: SecurityProfileConfig;
}

export interface SecurityProfileConfig {
	rss_timeout_ms: number;
	validate_certs: boolean;
	allowed_domains?: string[];
	strict_content_filtering?: boolean;
	mock_feeds?: boolean;
}

// =============================================================================
// OBSERVABILITY CONFIGURATION
// =============================================================================

export interface ObservabilityConfig {
	log_level: "debug" | "info" | "warn" | "error";
	structured_logging: boolean;
	correlation_ids: boolean;
	export_metrics: boolean;
	endpoints: ObservabilityEndpointsConfig;
	rss_metrics: RssMetricsConfig;
}

export interface ObservabilityEndpointsConfig {
	logs: string;
	metrics: string;
	traces: string;
}

export interface RssMetricsConfig {
	fetch_latency: boolean;
	parse_errors: boolean;
	cache_hit_ratio: boolean;
	feed_size_distribution: boolean;
	auth_failures: boolean;
}

// =============================================================================
// DEVELOPMENT CONFIGURATION
// =============================================================================

export interface DevelopmentConfig {
	hot_reload: boolean;
	watch_files: string[];
	auto_validate: boolean;
	error_recovery: "graceful" | "strict" | "disabled";
	debug: DevelopmentDebugConfig;
}

export interface DevelopmentDebugConfig {
	profile_switching: boolean;
	rss_fetch_debug: boolean;
	secrets_debug: boolean;
	integration_debug: boolean;
}

// =============================================================================
// DEPLOYMENT CONFIGURATION
// =============================================================================

export interface DeploymentConfig {
	target: "r2" | "s3" | "local";
	region: "auto" | string;
	compression: boolean;
	encryption_at_rest: boolean;
	bundles: DeploymentBundlesConfig;
}

export interface DeploymentBundlesConfig {
	entry: DeploymentBundleEntry[];
}

export interface DeploymentBundleEntry {
	name: string;
	includes: string[];
	encrypt: boolean;
	sign: boolean;
}

// =============================================================================
// FEATURES CONFIGURATION
// =============================================================================

export interface FeaturesConfig {
	adaptive_fetching: boolean;
	intelligent_caching: boolean;
	auto_profile_optimization: boolean;
	security_scanning: boolean;
	real_time_dashboard: boolean;
	cross_profile_migration: boolean;
	experimental: ExperimentalFeaturesConfig;
}

export interface ExperimentalFeaturesConfig {
	ml_based_optimization: boolean;
	predictive_caching: boolean;
	anomaly_detection: boolean;
}

// =============================================================================
// RUNTIME TYPES
// =============================================================================

export interface ProfileRssState {
	current_profile: string;
	active_feeds: Map<string, RssFeedState>;
	performance_metrics: PerformanceMetrics;
	security_status: SecurityStatus;
	last_profile_switch?: ProfileSwitchEvent;
}

export interface RssFeedState {
	name: string;
	url: string;
	status: "active" | "paused" | "error";
	last_fetch: Date;
	next_fetch: Date;
	error_count: number;
	latency_ms: number;
	auth_status: "authenticated" | "unauthenticated" | "expired";
}

export interface PerformanceMetrics {
	cpu_usage_percent: number;
	memory_usage_mb: number;
	heap_usage_mb: number;
	fetch_latency_avg_ms: number;
	cache_hit_ratio: number;
	error_rate: number;
}

export interface SecurityStatus {
	url_scan_passed: boolean;
	certificate_valid: boolean;
	auth_status: Map<string, boolean>;
	blocked_requests: number;
	violations: SecurityViolation[];
}

export interface SecurityViolation {
	type: "domain" | "pattern" | "size" | "certificate";
	description: string;
	timestamp: Date;
	feed_url?: string;
}

export interface ProfileSwitchEvent {
	from_profile: string;
	to_profile: string;
	trigger: "manual" | "automatic" | "rss_trigger" | "performance";
	trigger_source?: string;
	timestamp: Date;
	migration_successful: boolean;
}

// =============================================================================
// CONFIGURATION LOADER
// =============================================================================

export class IntegratedProfileLoader {
	private static instance: IntegratedProfileLoader;
	private config: IntegratedProfileConfig | null = null;
	private configPath: string;

	private constructor(configPath: string = "./config/integrated-profile.toml") {
		this.configPath = configPath;
	}

	static getInstance(configPath?: string): IntegratedProfileLoader {
		if (!IntegratedProfileLoader.instance) {
			IntegratedProfileLoader.instance = new IntegratedProfileLoader(
				configPath,
			);
		}
		return IntegratedProfileLoader.instance;
	}

	async loadConfig(): Promise<IntegratedProfileConfig> {
		if (this.config) {
			return this.config;
		}

		try {
			if (typeof Bun === "undefined") {
				throw new Error("Bun runtime is required");
			}

			const content = await (Bun as any).file(this.configPath).text();
			const parsed = (Bun as any).TOML.parse(
				content,
			) as IntegratedProfileConfig;

			// Validate required fields
			this.validateConfig(parsed);

			// Expand environment variables
			this.config = this.expandEnvironmentVariables(parsed);

			return this.config;
		} catch (error) {
			throw new Error(
				`Failed to load integrated profile config: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async reloadConfig(): Promise<IntegratedProfileConfig> {
		this.config = null;
		return this.loadConfig();
	}

	getConfig(): IntegratedProfileConfig | null {
		return this.config;
	}

	private validateConfig(config: any): void {
		const required = [
			"meta",
			"profile",
			"secrets",
			"rss",
			"integration",
			"security",
		];

		for (const field of required) {
			if (!config[field]) {
				throw new Error(`Missing required configuration section: ${field}`);
			}
		}

		// Validate profile name
		if (!config.profile.name) {
			throw new Error("Profile name is required");
		}

		// Validate RSS feeds
		if (config.rss.feeds && config.rss.feeds.entry) {
			for (const feed of config.rss.feeds.entry) {
				if (!feed.name || !feed.url) {
					throw new Error("RSS feed entries must have name and url");
				}
			}
		}
	}

	private expandEnvironmentVariables(config: any): any {
		const jsonStr = JSON.stringify(config);
		const expanded = jsonStr.replace(/\$\{([^}]+)\}/g, (match, path) => {
			const parts = path.split(".");
			let value: any = process.env;

			for (const part of parts) {
				value = value?.[part];
			}

			return value !== undefined ? String(value) : match;
		});

		return JSON.parse(expanded);
	}
}

// =============================================================================
// EXPORTS
// =============================================================================

export default IntegratedProfileLoader;
export type {
	IntegratedProfileConfig,
	ProfileRssState,
	RssFeedState,
	PerformanceMetrics,
	SecurityStatus,
	ProfileSwitchEvent,
	SecurityViolation,
};
