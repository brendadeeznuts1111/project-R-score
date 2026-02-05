/**
 * RSS Feed Constants
 * Standardized configuration for RSS feed parsing and Bun RSS integration
 *
 * Ripgrep Pattern: RSS_FEED_URLS|RSS_USER_AGENTS|RSS_DEFAULTS|RSS_REGEX_PATTERNS|RSS_ENV|RSS_INTERNAL|RSS_CATEGORIES|RSS_GITHUB_LINKS|RSS_API_PATHS|RSS_TEAM_PATHS|RSS_APPS_PATHS|RSS_EXAMPLES_PATHS|RSS_COMMANDS_PATHS|RSS_DOCS_API_PATHS|RSS_BUN_VERSION_PATHS|RSS_BENCHMARK_PATHS|RSS_DASHBOARD_PATHS|ROUTING_REGISTRY_NAMES|TELEGRAM_MINIAPP_URLS|DEEP_LINK_DEFAULTS|RSS_REGISTRY_CONFIG|TEST_CONFIG|WORKSPACE_PATHS|TEST_PATTERNS|SHADOW_GRAPH_PATHS|ROOT_DIR_PATHS|DATABASE_PATHS|rss-constants
 */

// ═══════════════════════════════════════════════════════════════
// RSS FEED URLS
// ═══════════════════════════════════════════════════════════════

/**
 * Standard RSS feed URLs for various sources
 */
export const RSS_FEED_URLS = {
	BUN: "https://bun.com/rss.xml",
} as const;

// ═══════════════════════════════════════════════════════════════
// USER AGENTS
// ═══════════════════════════════════════════════════════════════

/**
 * User-Agent strings for RSS feed requests
 */
export const RSS_USER_AGENTS = {
	PARSER: "NEXUS-RSS-Parser/1.0",
} as const;

// ═══════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

/**
 * Default configuration values for RSS feed operations
 */
export const RSS_DEFAULTS = {
	ITEM_LIMIT: 10,
	VERSION_CHECK_LIMIT: 5,
} as const;

// ═══════════════════════════════════════════════════════════════
// REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Regular expression patterns for parsing RSS feed content
 */
export const RSS_REGEX_PATTERNS = {
	BUN_VERSION: /Bun v(\d+\.\d+\.\d+)/i,
} as const;

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════

/**
 * Environment variable names for RSS feed configuration
 */
export const RSS_ENV = {
	API_URL: "API_URL", // For local RSS feed endpoint
} as const;

// ═══════════════════════════════════════════════════════════════
// INTERNAL RSS FEED CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Internal RSS feed configuration for NEXUS platform RSS generation
 */
export const RSS_INTERNAL = {
	PLATFORM_NAME: "NEXUS Trading Platform",
	PLATFORM_DESCRIPTION: "NEXUS Trading Intelligence Platform - Cross-market arbitrage detection and trading analytics",
	GENERATOR_NAME: "NEXUS RSS Generator",
	WEBMASTER_EMAIL: "nexus@trading.platform",
	MANAGING_EDITOR_EMAIL: "nexus@trading.platform",
	AUTHOR_EMAIL_DOMAIN: "@nexus.trading",
	LANGUAGE: "en-US",
	CONTENT_TYPE: "application/rss+xml; charset=utf-8",
	ENDPOINT_PATH: "/api/rss.xml",
	DEFAULT_BASE_URL: "http://localhost:3001",
	TTL_MINUTES: 60,
	IMAGE_URL: "https://bun.com/logo.svg",
	IMAGE_TITLE: "NEXUS Trading Platform",
	IMAGE_WIDTH: 144,
	IMAGE_HEIGHT: 144,
	GIT_LOG_LIMIT: 15,
	GIT_COMMITS_LIMIT: 10,
} as const;

// ═══════════════════════════════════════════════════════════════
// RSS FEED CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Standard RSS feed categories for organizing feed items
 */
export const RSS_CATEGORIES = {
	SYSTEM: "system",
	FEATURE: "feature",
	REGISTRY: "registry",
	ANALYTICS: "analytics",
	DATA: "data",
	PREDICTION_MARKETS: "prediction-markets",
	MARKET_MAKING: "market-making",
	ORCA: "orca",
	ARBITRAGE: "arbitrage",
	DERIBIT: "deribit",
	TELEGRAM: "telegram",
	MCP: "mcp",
	UI_POLICY: "ui-policy",
	AUTH: "auth",
	PIPELINE: "pipeline",
	PERFORMANCE: "performance",
	DEBUG: "debug",
	DOCUMENTATION: "documentation",
	RUNTIME: "runtime",
	UI: "ui",
	TEAM: "team",
	PROCESS: "process",
	ORGANIZATION: "organization",
	TOOLING: "tooling",
	HYPER_BUN: "hyper-bun",
	CACHE: "cache",
	OBSERVABILITY: "observability",
	COMPLIANCE: "compliance",
	DEVELOPMENT: "development",
} as const;

// ═══════════════════════════════════════════════════════════════
// GITHUB REPOSITORY LINKS
// ═══════════════════════════════════════════════════════════════

/**
 * GitHub repository URLs for documentation and team resources
 */
export const RSS_GITHUB_LINKS = {
	REPOSITORY: "https://github.com/brendadeeznuts1111/trader-analyzer-bun",
	TEAM_PAGE: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TEAM.md",
	TOPICS_PAGE: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TOPICS.md",
	PR_REVIEW_PAGE: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/pull_request_review.md",
	COMMIT_BASE: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/commit",
} as const;

// ═══════════════════════════════════════════════════════════════
// TEAM PAGE PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Local file paths for team documentation
 */
export const RSS_TEAM_PATHS = {
	TEAM_MD: ".github/TEAM.md",
	TOPICS_MD: ".github/TOPICS.md",
	PR_REVIEW_MD: ".github/pull_request_review.md",
} as const;

// ═══════════════════════════════════════════════════════════════
// APPS DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Application directory paths for workspace apps
 */
export const RSS_APPS_PATHS = {
	APPS_DIR: "apps",
	DASHBOARD: "apps/dashboard",
	DASHBOARD_SRC: "apps/dashboard/src",
	DASHBOARD_CLIENT: "apps/dashboard/src/client.ts",
	DASHBOARD_CONFIG: "apps/dashboard/rspack.config.ts",
	DIST_DASHBOARD: "dist/dashboard",
} as const;

// ═══════════════════════════════════════════════════════════════
// EXAMPLES DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Example file paths for demonstrations and tutorials
 */
export const RSS_EXAMPLES_PATHS = {
	EXAMPLES_DIR: "examples",
	DEVWORKSPACE_INTERACTIVE: "examples/devworkspace-interactive.ts",
	DEVWORKSPACE_QUICKSTART: "examples/devworkspace-quickstart.md",
} as const;

// ═══════════════════════════════════════════════════════════════
// COMMANDS DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * CLI commands documentation directory paths
 */
export const RSS_COMMANDS_PATHS = {
	COMMANDS_DIR: "commands",
	README: "commands/README.md",
	QUICK_REFERENCE: "commands/QUICK-REFERENCE.md",
	COMPLETE: "commands/COMPLETE.md",
	VERSIONING: "commands/VERSIONING.md",
	VERSION_INDEX: "commands/VERSION-INDEX.md",
	TELEGRAM: "commands/telegram.md",
	MCP: "commands/mcp.md",
	DASHBOARD: "commands/dashboard.md",
	FETCH: "commands/fetch.md",
	SECURITY: "commands/security.md",
	MANAGEMENT: "commands/management.md",
	GITHUB: "commands/github.md",
	PASSWORD: "commands/password.md",
	AUDIT: "commands/audit.md",
} as const;

// ═══════════════════════════════════════════════════════════════
// DOCS API DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * API documentation directory paths
 */
export const RSS_DOCS_API_PATHS = {
	DOCS_API_DIR: "docs/api",
	MCP_SERVER: "docs/api/MCP-SERVER.md",
	MCP_SECRETS_INTEGRATION: "docs/MCP-SECRETS-INTEGRATION.md",
	COMPONENT_SITEMAP: "docs/api/COMPONENT-SITEMAP.md",
	NODE_SITEMAP: "docs/api/NODE-SITEMAP.md",
	METADATA_DOCUMENTATION_MAPPING: "docs/api/METADATA-DOCUMENTATION-MAPPING.md",
	ORCA_ARBITRAGE_INTEGRATION: "docs/api/ORCA-ARBITRAGE-INTEGRATION.md",
	ORCA_ARBITRAGE_REVIEW: "docs/api/ORCA-ARBITRAGE-REVIEW.md",
	PR_BINARY_DATA_DOCS: "docs/api/PR-BINARY-DATA-DOCS.md",
} as const;

// ═══════════════════════════════════════════════════════════════
// BUN VERSION FILE PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Bun version file paths and configuration
 */
export const RSS_BUN_VERSION_PATHS = {
	BUN_VERSION_FILE: ".bun-version",
	PACKAGE_JSON: "package.json",
	BUNFIG_TOML: "bunfig.toml",
	BUNFIG_CONFIG: "config/bunfig.toml",
} as const;

// ═══════════════════════════════════════════════════════════════
// BENCHMARK DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Benchmark directory paths and test files
 */
export const RSS_BENCHMARK_PATHS = {
	BENCHMARKS_DIR: "benchmarks",
	BENCHMARKS_METADATA_DIR: "benchmarks/metadata",
	TEST_BENCHMARK_REGISTRY: "test-benchmark-registry.ts",
	MARKET_ANALYSIS_BASELINE: "benchmarks/market-analysis-baseline.ts",
	STRESS_TEST_1M_NODES: "benchmarks/stress-test-large-graph.ts",
	LAYER4_CORRELATION_BASELINE: "benchmarks/metadata/layer4-correlation-baseline.json",
} as const;

// ═══════════════════════════════════════════════════════════════
// DASHBOARD DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Dashboard HTML file paths
 */
export const RSS_DASHBOARD_PATHS = {
	DASHBOARD_DIR: "dashboard",
	INDEX: "dashboard/index.html",
	NEXUS_REGISTRY: "dashboard/17.14.0-nexus-dashboard.html",
	REGISTRY_BROWSER: "dashboard/registry.html",
	WORKSPACE: "dashboard/workspace.html",
	EXAMPLES: "dashboard/examples.html",
	CORRELATION_GRAPH: "dashboard/correlation-graph.html",
	MULTI_LAYER_GRAPH: "dashboard/multi-layer-graph.html",
	MLGS_DEVELOPER: "dashboard/mlgs-developer-dashboard.html",
} as const;

// ═══════════════════════════════════════════════════════════════
// API ENDPOINT PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Common API endpoint paths used in RSS feed items
 */
export const RSS_API_PATHS = {
	HEALTH: "/api/health",
	REGISTRY: "/api/registry",
	REGISTRY_PROPERTIES: "/api/registry/properties",
	REGISTRY_DATA_SOURCES: "/api/registry/data-sources",
	REGISTRY_SHARP_BOOKS: "/api/registry/sharp-books",
	REGISTRY_TEAM_DEPARTMENTS: "/api/registry/team-departments",
	REGISTRY_TOPICS: "/api/registry/topics",
	REGISTRY_CSS_BUNDLER: "/api/registry/css-bundler",
	REGISTRY_MCP_TOOLS: "/api/registry/mcp-tools",
	REGISTRY_CLI_COMMANDS: "/api/registry/cli-commands",
	REGISTRY_ERRORS: "/api/registry/errors",
	DOCS: "/docs",
	DOCS_ERRORS: "/docs/errors",
	// v17 Routing paths
	V17_REGISTRY_BASE: "/api/v17/registry",
	V17_REGISTRY_PROPERTIES: "/api/v17/registry/properties",
	V17_REGISTRY_DATA_SOURCES: "/api/v17/registry/data-sources",
	V17_REGISTRY_MCP_TOOLS: "/api/v17/registry/mcp-tools",
	V17_REGISTRY_CLI_COMMANDS: "/api/v17/registry/cli-commands",
	V17_REGISTRY_SHARP_BOOKS: "/api/v17/registry/sharp-books",
	V17_HEALTH: "/health/v17",
	// Telegram & Mini App endpoints
	TELEGRAM_BOT_STATUS: "/api/telegram/bot/status",
	TELEGRAM_USERS: "/api/telegram/users",
	TELEGRAM_TOPICS: "/api/telegram/topics",
	TELEGRAM_BROADCAST: "/api/telegram/broadcast",
	MINIAPP_STATUS: "/api/miniapp/status",
	MINIAPP_INFO: "/api/miniapp/info",
	MINIAPP_HEALTH: "/api/miniapp/health",
	MINIAPP_DEPLOYMENT: "/api/miniapp/deployment",
	MINIAPP_CONFIG: "/api/miniapp/config",
	MINIAPP_SPORTSBOOKS: "/api/miniapp/sportsbooks",
	MINIAPP_MARKETS: "/api/miniapp/markets",
	MINIAPP_ARBITRAGE: "/api/miniapp/arbitrage",
	MINIAPP_BETS: "/api/miniapp/bets",
	MINIAPP_SUPERGROUP_SEND_ALERT: "/api/miniapp/supergroup/send-alert",
	MINIAPP_ALERTS_COVERT_STEAM: "/api/miniapp/alerts/covert-steam",
	// v17 Telegram Mini App endpoints
	V17_MINIAPP_BASE: "/api/v17/telegram/miniapp",
	V17_MINIAPP_SPORTSBOOKS: "/api/v17/telegram/miniapp/sportsbooks",
	V17_MINIAPP_MARKETS: "/api/v17/telegram/miniapp/markets",
	V17_MINIAPP_ARBITRAGE: "/api/v17/telegram/miniapp/arbitrage",
	V17_MINIAPP_BETS: "/api/v17/telegram/miniapp/bets",
	V17_MINIAPP_STATUS: "/api/v17/telegram/miniapp/status",
	V17_MINIAPP_INFO: "/api/v17/telegram/miniapp/info",
	// Shadow Graph endpoints
	SHADOW_GRAPH_DASHBOARD: "/api/dashboard/shadow-graph",
	SHADOW_GRAPH_NODES: "/api/dashboard/shadow-graph/nodes",
	SHADOW_GRAPH_EDGES: "/api/dashboard/shadow-graph/edges",
	SHADOW_GRAPH_INTERNAL: "/api/internal/shadow-graph",
	SHADOW_GRAPH_INTERNAL_NODES: "/api/internal/shadow-graph/nodes",
	SHADOW_GRAPH_INTERNAL_STREAM: "/api/internal/shadow-graph/stream",
	PUBLIC_MARKETS: "/api/public/markets",
	PUBLIC_EVENTS: "/api/public/events",
} as const;

// ═══════════════════════════════════════════════════════════════
// DEEP-LINK PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Deep-link path segments for RFC 001 Telegram Deep-Link Standard
 * Used in DeepLinkGenerator for generating standardized alert deep-links
 * 
 * @see docs/rfc/001-telegram-deeplink-standard.md
 * @see src/utils/deeplink-generator.ts
 */
export const DEEP_LINK_PATHS = {
	ALERT_BASE: "/alert/",
	ALERT_COVERT_STEAM: "/alert/covert-steam/",
	ALERT_PERF_REGRESSION: "/alert/perf-regression/",
	ALERT_MARKET_ANOMALY: "/alert/market-anomaly/",
	AUDIT_URL_ANOMALY: "/audit/url-anomaly/",
	AUDIT_SECURITY_THREAT: "/audit/security-threat/",
	REGISTRY: "/registry/",
	DASHBOARD: "/dashboard/",
} as const;

// ═══════════════════════════════════════════════════════════════
// TELEGRAM MINI APP URLS
// ═══════════════════════════════════════════════════════════════

/**
 * Telegram Mini App deployment URLs
 * Used for Factory Wager Mini App staging and production environments
 * 
 * @see src/utils/miniapp-native.ts
 * @see docs/FACTORY-WAGER-MINIAPP-INTEGRATION.md
 */
export const TELEGRAM_MINIAPP_URLS = {
	STAGING: "https://staging.factory-wager-miniapp.pages.dev",
	PRODUCTION: "https://factory-wager-miniapp.pages.dev",
	// Alternative production domain
	PRODUCTION_ALT: "https://app.factory-wager.com",
} as const;

// ═══════════════════════════════════════════════════════════════
// DEEP-LINK DEFAULT URLS
// ═══════════════════════════════════════════════════════════════

/**
 * Default URLs for deep-link generation
 * Used in DeepLinkGenerator for base URL resolution
 * 
 * @see src/utils/deeplink-generator.ts
 */
export const DEEP_LINK_DEFAULTS = {
	DASHBOARD_URL_DEV: "http://localhost:8080",
	DASHBOARD_URL_PROD: "https://dashboard.hyperbun.com",
	API_PORT: "3001",
	DASHBOARD_PORT: "8080",
} as const;

// ═══════════════════════════════════════════════════════════════
// ROUTING REGISTRY NAMES
// ═══════════════════════════════════════════════════════════════

/**
 * Registry name constants for routing handlers
 * Used in URLPattern matching and switch statements
 */
export const ROUTING_REGISTRY_NAMES = {
	PROPERTIES: "properties",
	DATA_SOURCES: "data-sources",
	MCP_TOOLS: "mcp-tools",
	CLI_COMMANDS: "cli-commands",
	SHARP_BOOKS: "sharp-books",
	TEAM_DEPARTMENTS: "team-departments",
	TOPICS: "topics",
	CSS_BUNDLER: "css-bundler",
	ERRORS: "errors",
} as const;

// ═══════════════════════════════════════════════════════════════
// NPM REGISTRY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * NPM registry URLs and configuration for @graph monorepo publishing
 * Used in publish scripts and CI/CD workflows
 * 
 * @see scripts/publish-graph-monorepo.ts
 * @see .github/workflows/publish-graph-packages.yml
 */
export const RSS_REGISTRY_CONFIG = {
	/** Default private registry URL for @graph packages */
	PRIVATE_REGISTRY: "https://npm.internal.yourcompany.com",
	/** Public npm registry (fallback) */
	PUBLIC_REGISTRY: "https://registry.npmjs.org",
	/** Scoped package prefix */
	SCOPE: "@graph",
	/** Default access level for scoped packages */
	DEFAULT_ACCESS: "restricted",
	/** Default publish tag */
	DEFAULT_TAG: "latest",
} as const;

// ═══════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Test configuration constants for BUN test runner
 * Used in test files and test configuration
 * 
 * @see config/bunfig.toml [test] section
 * @see docs/reviews/TEST_ORGANIZATION.md
 */
export const TEST_CONFIG = {
	/** Default test timeout in milliseconds */
	DEFAULT_TIMEOUT: 30000,
	/** Performance test timeout in milliseconds */
	PERFORMANCE_TIMEOUT: 60000,
	/** Benchmark timeout in milliseconds */
	BENCHMARK_TIMEOUT: 60000,
	/** Default number of test repeats for benchmarking */
	DEFAULT_REPEATS: 20,
	/** Performance test repeats */
	PERFORMANCE_REPEATS: 50,
	/** Test concurrency level */
	CONCURRENCY: 4,
	/** Coverage threshold for lines */
	COVERAGE_LINES_THRESHOLD: 80,
	/** Coverage threshold for functions */
	COVERAGE_FUNCTIONS_THRESHOLD: 80,
	/** Coverage threshold for branches */
	COVERAGE_BRANCHES_THRESHOLD: 75,
	/** Coverage threshold for statements */
	COVERAGE_STATEMENTS_THRESHOLD: 80,
} as const;

// ═══════════════════════════════════════════════════════════════
// WORKSPACE & PACKAGE PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Workspace and package directory paths for monorepo structure
 * Used in workspace configurations and package references
 * 
 * @see package.json workspaces configuration
 * @see scripts/publish-graph-monorepo.ts
 */
export const WORKSPACE_PATHS = {
	/** Root packages directory */
	PACKAGES_DIR: "packages",
	/** Graphs packages directory */
	GRAPHS_DIR: "packages/graphs",
	/** Multilayer graph package */
	MULTILAYER_PACKAGE: "packages/graphs/multilayer",
	/** Core package */
	CORE_PACKAGE: "packages/core",
	/** Algorithms package */
	ALGORITHMS_PACKAGE: "packages/algorithms",
	/** Utils package */
	UTILS_PACKAGE: "packages/utils",
	/** Bench directory */
	BENCH_DIR: "bench",
	/** Apps directory */
	APPS_DIR: "apps",
	/** Test directory */
	TEST_DIR: "test",
	/** Test setup file */
	TEST_SETUP: "test/setup.ts",
	/** Test harness utilities */
	TEST_HARNESS: "test/harness.ts",
} as const;

// ═══════════════════════════════════════════════════════════════
// TEST FILE PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Test file naming patterns and paths
 * Used for test discovery and organization
 * 
 * @see config/bunfig.toml [test] section
 * @see docs/reviews/TEST_ORGANIZATION.md
 */
export const TEST_PATTERNS = {
	/** Standard test file pattern */
	TEST_PATTERN: "*.test.ts",
	/** Spec test file pattern */
	SPEC_PATTERN: "*.spec.ts",
	/** Performance test file pattern */
	PERFORMANCE_PATTERN: "*.performance.test.ts",
	/** Benchmark test file pattern */
	BENCHMARK_PATTERN: "*.bench.ts",
	/** Test directory pattern */
	TEST_DIR_PATTERN: "test/**/*.ts",
	/** Co-located test pattern */
	CO_LOCATED_PATTERN: "src/**/*.test.ts",
} as const;

// ═══════════════════════════════════════════════════════════════
// SHADOW GRAPH PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Shadow Graph system file paths and directories
 * Used in shadow graph scripts, configuration, and database files
 * 
 * @see docs/SHADOW-GRAPH-SYSTEM.md
 * @see src/arbitrage/shadow-graph/
 * @see scripts/research-*.ts
 */
export const SHADOW_GRAPH_PATHS = {
	/** Alert configuration file */
	ALERT_CONFIG: "config/shadow-graph-alerts.yaml",
	/** Research scripts directory */
	SCRIPTS_DIR: "scripts",
	/** Research scan script */
	SCRIPT_SCAN_COVERT_STEAM: "scripts/research-scan-covert-steam-events.ts",
	/** Research generate graph script */
	SCRIPT_GENERATE_GRAPH: "scripts/research-generate-shadow-market-graph.ts",
	/** Research identify deceptive lines script */
	SCRIPT_IDENTIFY_DECEPTIVE: "scripts/research-identify-deceptive-lines.ts",
	/** Research auto trader script */
	SCRIPT_AUTO_TRADER: "scripts/research-auto-covert-arb-trader.ts",
	/** Source code directory */
	SOURCE_DIR: "src/arbitrage/shadow-graph",
	/** Database directory */
	DATA_DIR: "data",
	/** Research database file */
	RESEARCH_DB: "data/research.db",
	/** Shadow market graphs database */
	SHADOW_GRAPHS_DB: "data/shadow-market-graphs-weekly.db",
	/** Log directory (production) */
	LOG_DIR: "/var/log/hyper-bun",
	/** Covert steam nightly log file */
	COVERT_STEAM_LOG: "/var/log/hyper-bun/covert-steam-nightly.jsonl.zst",
} as const;

// ═══════════════════════════════════════════════════════════════
// ROOT DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Root directory paths for common project directories
 * Used throughout the codebase for file and directory references
 * 
 * @see docs/root-docs/ROOT-DIRECTORY-ORGANIZATION.md
 * @see README.md for directory structure
 */
export const ROOT_DIR_PATHS = {
	/** Data directory for databases and imports */
	DATA_DIR: "data",
	/** Configuration directory */
	CONFIG_DIR: "config",
	/** Scripts directory */
	SCRIPTS_DIR: "scripts",
	/** Source code directory */
	SRC_DIR: "src",
	/** Documentation directory */
	DOCS_DIR: "docs",
	/** Test directory */
	TEST_DIR: "test",
	/** Examples directory */
	EXAMPLES_DIR: "examples",
	/** Dashboard directory */
	DASHBOARD_DIR: "dashboard",
	/** Public assets directory */
	PUBLIC_DIR: "public",
	/** Deploy directory */
	DEPLOY_DIR: "deploy",
	/** Bench directory */
	BENCH_DIR: "bench",
	/** Commands directory */
	COMMANDS_DIR: "commands",
	/** Root docs subdirectory */
	ROOT_DOCS_DIR: "docs/root-docs",
	/** Root scripts subdirectory */
	ROOT_SCRIPTS_DIR: "scripts/root-scripts",
} as const;

// ═══════════════════════════════════════════════════════════════
// DATABASE PATHS (CONSOLIDATED)
// ═══════════════════════════════════════════════════════════════

/**
 * Database file paths (consolidated from pipeline/constants.ts and shadow-graph)
 * All databases are stored in the data/ directory
 * 
 * @see src/pipeline/constants.ts for original DATABASE_PATHS
 * @see SHADOW_GRAPH_PATHS for shadow graph specific databases
 */
export const DATABASE_PATHS = {
	/** Pipeline database */
	PIPELINE: "data/pipeline.sqlite",
	/** Properties database */
	PROPERTIES: "data/properties.sqlite",
	/** RBAC database */
	RBAC: "data/rbac.sqlite",
	/** Features database */
	FEATURES: "data/features.sqlite",
	/** Sources database */
	SOURCES: "data/sources.sqlite",
	/** Usage database */
	USAGE: "data/usage.sqlite",
	/** Research database (shadow graph) */
	RESEARCH: "data/research.db",
	/** Security database */
	SECURITY: "data/security.db",
	/** Proxy config database */
	PROXY_CONFIG: "data/proxy-config.db",
	/** Shadow market graphs database */
	SHADOW_GRAPHS: "data/shadow-market-graphs-weekly.db",
	/** ORCA arbitrage database */
	ORCA_ARBITRAGE: "data/orca-arbitrage.sqlite",
	/** ORCA database (legacy) */
	ORCA: "data/orca.db",
	/** ORCA SQLite database */
	ORCA_SQLITE: "data/orca.sqlite",
	/** Markets database */
	MARKETS: "data/markets.db",
	/** Ticks database */
	TICKS: "data/ticks.db",
	/** Tick data SQLite */
	TICK_DATA: "data/tick-data.sqlite",
	/** Cache database */
	CACHE: "data/cache.db",
	/** API cache database */
	API_CACHE: "data/api-cache.db",
	/** Bench cache database */
	BENCH_CACHE: "data/bench-cache.db",
	/** Bookmaker cache database */
	BOOKMAKER_CACHE: "data/bookmaker-cache.db",
	/** Audit database */
	AUDIT: "data/audit.db",
	/** Dev state database */
	DEV_STATE: "data/dev-state.db",
	/** Manifests database */
	MANIFESTS: "data/manifests.db",
} as const;

