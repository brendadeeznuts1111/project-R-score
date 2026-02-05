/**
 * RSS Feed Constants
 * Standardized configuration for RSS feed parsing and Bun RSS integration
 *
 * Ripgrep Pattern: RSS_FEED_URLS|RSS_USER_AGENTS|RSS_DEFAULTS|RSS_REGEX_PATTERNS|RSS_ENV|RSS_INTERNAL|RSS_CATEGORIES|RSS_GITHUB_LINKS|RSS_API_PATHS|RSS_TEAM_PATHS|RSS_APPS_PATHS|RSS_EXAMPLES_PATHS|RSS_COMMANDS_PATHS|RSS_DOCS_API_PATHS|RSS_BUN_VERSION_PATHS|RSS_BENCHMARK_PATHS|RSS_DASHBOARD_PATHS|ROUTING_REGISTRY_NAMES|TELEGRAM_MINIAPP_URLS|DEEP_LINK_DEFAULTS|RSS_REGISTRY_CONFIG|TEST_CONFIG|WORKSPACE_PATHS|TEST_PATTERNS|SHADOW_GRAPH_PATHS|ROOT_DIR_PATHS|DATABASE_PATHS|BUN_DOCS_URLS|rss-constants
 *
 * Examples Integration: All example paths are available in RSS_EXAMPLES_PATHS for programmatic access
 * @see examples/README.md - Complete examples directory documentation
 */

// ═══════════════════════════════════════════════════════════════
// RSS FEED URLS
// ═══════════════════════════════════════════════════════════════

/**
 * Standard RSS feed URLs for various sources
 */
export const RSS_FEED_URLS = {
  BUN: "https://bun.com/rss.xml",

  // Team feeds
  sports_correlation: {
    main: "https://t.me/s/GraphEngineSports",
    announcements: "https://t.me/s/GraphEngineSportsAnnounce",
    benchmarks: "https://t.me/s/GraphEngineSportsBenchmarks",
  },
  market_analytics: {
    main: "https://t.me/s/GraphEngineMarkets",
    announcements: "https://t.me/s/GraphEngineMarketsAnnounce",
    benchmarks: "https://t.me/s/GraphEngineMarketsBenchmarks",
  },
  platform_tools: {
    main: "https://t.me/s/GraphEnginePlatform",
    announcements: "https://t.me/s/GraphEnginePlatformAnnounce",
    benchmarks: "https://t.me/s/GraphEnginePlatformBenchmarks",
  },

  // Package-specific feeds
  packages: {
    "@graph/layer4": "https://t.me/s/GraphEngineLayer4",
    "@graph/layer3": "https://t.me/s/GraphEngineLayer3",
    "@graph/layer2": "https://t.me/s/GraphEngineLayer2",
    "@graph/layer1": "https://t.me/s/GraphEngineLayer1",
    "@bench/layer4": "https://t.me/s/GraphEngineBenchLayer4",
  },

  // Geographic/market feeds
  geographic: {
    uk_bookmakers: "https://t.me/s/GraphEngineUK",
    us_east_bookmakers: "https://t.me/s/GraphEngineUSEast",
    curacao_bookmakers: "https://t.me/s/GraphEngineCuracao",
  },

  // Event feeds
  events: {
    releases: "https://t.me/s/GraphEngineReleases",
    incidents: "https://t.me/s/GraphEngineIncidents",
    rfc_updates: "https://t.me/s/GraphEngineRFC",
  },
} as const

// ═══════════════════════════════════════════════════════════════
// BUN DOCUMENTATION URLS
// ═══════════════════════════════════════════════════════════════

/**
 * Bun documentation URLs
 * Centralized constants for Bun documentation links
 *
 * @see https://bun.com/docs - Main Bun documentation
 * @see https://bun.com/reference - API reference
 */
export const BUN_DOCS_URLS = {
  /** Bun Package Manager CLI install configuration */
  PM_CLI_INSTALL_CONFIG: "https://bun.com/docs/pm/cli/install#configuration",
  /** Bun API Reference */
  API_REFERENCE: "https://bun.com/reference",
  /** Bun Globals Reference */
  GLOBALS_REFERENCE: "https://bun.com/reference/globals",
  /** Bun Runtime APIs */
  RUNTIME_APIS: "https://bun.com/docs/runtime/bun-apis",
  /** Bun Documentation */
  DOCS: "https://bun.com/docs",
  /** Bun Blog */
  BLOG: "https://bun.com/blog",
  /** Bun GitHub Repository */
  GITHUB: "https://github.com/oven-sh/bun",
  /** Bun Test Runner */
  TEST_RUNNER: "https://bun.com/docs/test/runner",
  /** Bun Workspace Configuration */
  WORKSPACE_CONFIG: "https://bun.com/docs/install/workspaces",
  /** Bun Performance Benchmarking */
  BENCHMARKING: "https://bun.com/docs/benchmarks",
  /** Bun Build & Compile */
  BUILD_COMPILE: "https://bun.com/docs/bundler",
  /** Bun Fetch API Documentation */
  FETCH_API: "https://bun.com/docs/runtime/networking/fetch",
  /** Bun Fetch Timeouts */
  FETCH_TIMEOUTS: "https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout",
  /** Bun Debugger Documentation */
  DEBUGGER: "https://bun.com/docs/runtime/debugger",
  /** Bun Security Scanner */
  SECURITY_SCANNER: "https://bun.com/docs/runtime/security-scanner",
  /** Bun Secrets Management */
  SECRETS: "https://bun.com/docs/runtime/secrets",
  /** Bun CSRF Protection */
  CSRF: "https://bun.com/docs/runtime/csrf",
  /** Bun WebSocket Contextual Data */
  WEBSOCKET_CONTEXTUAL_DATA: "https://bun.com/docs/runtime/http/websockets#contextual-data",
  /** Bun Shell Builtin Commands */
  SHELL_BUILTIN_COMMANDS: "https://bun.com/docs/runtime/shell#builtin-commands",
  /** Bun Shell File Loader */
  SHELL_FILE_LOADER: "https://bun.com/docs/runtime/shell#sh-file-loader",
  /** Bun Shell Environment Variables */
  SHELL_ENV_VARS: "https://bun.com/docs/runtime/shell#environment-variables",
  /** Bun Shell Utilities */
  SHELL_UTILITIES: "https://bun.com/docs/runtime/shell#utilities",
  /** Bun YAML API */
  YAML_API: "https://bun.com/docs/runtime/yaml",
} as const

// ═══════════════════════════════════════════════════════════════
// USER AGENTS
// ═══════════════════════════════════════════════════════════════

/**
 * User-Agent strings for RSS feed requests
 */
export const RSS_USER_AGENTS = {
  PARSER: "NEXUS-RSS-Parser/1.0",
  team_bot: "GraphEngine-Team-Bot/1.0 Bun/1.3.4",
  benchmark_bot: "GraphEngine-Benchmark-Bot/1.0 Bun/1.3.4",
  monitoring_bot: "GraphEngine-Monitor-Bot/1.0 Bun/1.3.4",
  ci_cd: "GraphEngine-CI-CD/1.0 Bun/1.3.4",
} as const

// ═══════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

/**
 * Default configuration values for RSS feed operations
 */
export const RSS_DEFAULTS = {
  ITEM_LIMIT: 10,
  VERSION_CHECK_LIMIT: 5,
  refresh_interval: 300, // 5 minutes
  max_age: 86400, // 24 hours
  batch_size: 100,
  timeout: 30000, // 30 seconds
  retry_attempts: 3,
} as const

// ═══════════════════════════════════════════════════════════════
// REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Regular expression patterns for parsing RSS feed content
 */
export const RSS_REGEX_PATTERNS = {
  BUN_VERSION: /Bun v(\d+\.\d+\.\d+)/i,
} as const

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════

/**
 * Environment variable names for RSS feed configuration
 */
export const RSS_ENV = {
  API_URL: "API_URL", // For local RSS feed endpoint
} as const

// ═══════════════════════════════════════════════════════════════
// INTERNAL RSS FEED CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Internal RSS feed configuration for NEXUS platform RSS generation
 */
export const RSS_INTERNAL = {
  PLATFORM_NAME: "NEXUS Trading Platform",
  PLATFORM_DESCRIPTION:
    "NEXUS Trading Intelligence Platform - Cross-market arbitrage detection and trading analytics",
  GENERATOR_NAME: "NEXUS RSS Generator",
  WEBMASTER_EMAIL: "nexus@trading.platform",
  MANAGING_EDITOR_EMAIL: "nexus@trading.platform",
  AUTHOR_EMAIL_DOMAIN: "@nexus.trading",
  LANGUAGE: "en-US",
  CONTENT_TYPE: "application/rss+xml; charset=utf-8",
  ENDPOINT_PATH: "/api/rss.xml",
  DEFAULT_BASE_URL: "http://localhost:3001",
  TTL_MINUTES: 60,
  // Internal feed endpoints (private registry)
  /**
   * Registry API endpoint for RSS feed cache refresh
   * Primary endpoint for cache refresh operations
   * @see {@link ../utils/rss-cache-refresh.ts refreshRSSCache} - Centralized cache refresh utility
   */
  registry_api: "https://npm.internal.yourcompany.com/api/rss",
  /**
   * Benchmark API endpoint for RSS feed cache refresh
   * Fallback endpoint when registry_api is unavailable
   * Used for benchmark-specific RSS feed cache refresh operations
   *
   * Endpoint selection priority:
   * 1. `RSS_INTERNAL.registry_api` (primary)
   * 2. `RSS_INTERNAL.benchmark_api` (fallback)
   *
   * @see {@link ../utils/rss-cache-refresh.ts refreshRSSCache} - Centralized cache refresh utility
   * @see {@link ../scripts/publish-audit-to-rss.ts publish-audit-to-rss.ts} - Audit RSS publisher
   * @see {@link ../scripts/benchmark-publisher.ts benchmark-publisher.ts} - Benchmark RSS publisher
   */
  benchmark_api: "https://npm.internal.yourcompany.com/api/rss/benchmarks",
  /**
   * Team metrics API endpoint for RSS feed cache refresh
   * Used for team-specific metrics RSS feed cache refresh
   */
  team_metrics: "https://npm.internal.yourcompany.com/api/rss/team-metrics",
  IMAGE_URL: "https://bun.com/logo.svg",
  IMAGE_TITLE: "NEXUS Trading Platform",
  IMAGE_WIDTH: 144,
  IMAGE_HEIGHT: 144,
  GIT_LOG_LIMIT: 15,
  GIT_COMMITS_LIMIT: 10,
} as const

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
} as const

// ═══════════════════════════════════════════════════════════════
// RSS TEAM CATEGORIES (Extended Team Architecture)
// ═══════════════════════════════════════════════════════════════

/**
 * RSS feed categories with team architecture integration
 * Maps teams to their RSS feeds, packages, and Telegram topics
 */
export const RSS_TEAM_CATEGORIES = {
  sports_correlation: {
    id: "sports",
    name: "Sports Correlation Team",
    packages: ["@graph/layer4", "@graph/layer3"],
    team_lead: "alex.chen@yourcompany.com",
    telegram_topic: 1,
    feed_url: RSS_FEED_URLS.sports_correlation.main,
  },
  market_analytics: {
    id: "markets",
    name: "Market Analytics Team",
    packages: ["@graph/layer2", "@graph/layer1"],
    team_lead: "sarah.kumar@yourcompany.com",
    telegram_topic: 3,
    feed_url: RSS_FEED_URLS.market_analytics.main,
  },
  platform_tools: {
    id: "platform",
    name: "Platform & Tools",
    packages: [
      "@graph/algorithms",
      "@graph/storage",
      "@graph/streaming",
      "@graph/utils",
      "@bench/*",
    ],
    team_lead: "mike.rodriguez@yourcompany.com",
    telegram_topic: 5,
    feed_url: RSS_FEED_URLS.platform_tools.main,
  },
} as const

// ═══════════════════════════════════════════════════════════════
// GITHUB REPOSITORY LINKS
// ═══════════════════════════════════════════════════════════════

/**
 * GitHub repository URLs for documentation and team resources
 */
export const RSS_GITHUB_LINKS = {
  REPOSITORY: "https://github.com/brendadeeznuts1111/trader-analyzer-bun",
  TEAM_PAGE: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TEAM.md",
  TOPICS_PAGE:
    "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/TOPICS.md",
  PR_REVIEW_PAGE:
    "https://github.com/brendadeeznuts1111/trader-analyzer-bun/blob/main/.github/pull_request_review.md",
  COMMIT_BASE: "https://github.com/brendadeeznuts1111/trader-analyzer-bun/commit",
} as const

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
} as const

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
} as const

// ═══════════════════════════════════════════════════════════════
// EXAMPLES DIRECTORY PATHS
// ═══════════════════════════════════════════════════════════════

/**
 * Example file paths for demonstrations and tutorials
 * Comprehensive index of all example files for RSS feed integration and documentation
 *
 * @see examples/README.md - Complete examples directory documentation
 * @see examples/COMMANDS.md - Command reference for all examples
 */
export const RSS_EXAMPLES_PATHS = {
  EXAMPLES_DIR: "examples",
  README: "examples/README.md",
  COMMANDS: "examples/COMMANDS.md",

  // Core Bun API Examples
  BUN_UTILITIES_DEMO: "examples/bun-utilities-demo.ts",
  BUN_HASH_EXAMPLES: "examples/bun-hash-examples.ts",
  BUN_HTML_TAG_EXAMPLE: "examples/bun-html-tag-example.ts",
  BUN_STRIP_ANSI_EXAMPLES: "examples/bun-strip-ansi-examples.ts",
  BUN_SHELL_EXAMPLE: "examples/bun-shell-example.sh",

  // Bun v1.2.11+ Examples
  BUN_1_2_11_API_INTEGRATION: "examples/bun-1.2.11-api-integration.ts",
  BUN_1_2_11_REAL_WORLD: "examples/bun-1.2.11-real-world-examples.ts",

  // Bun v1.3+ Examples
  BUN_1_3_PERFORMANCE_FEATURES: "examples/bun-1.3-performance-features.ts",
  BUN_1_3_4_URLPATTERN: "examples/bun-1.3.4-urlpattern.ts",
  BUN_FAKE_TIMERS_EXAMPLE: "examples/bun-fake-timers-example.test.ts",
  /** Complete URLPattern + Fake Timers guide with Router, MockAPI, RateLimiter */
  BUN_1_3_4_URLPATTERN_FAKETIMERS_COMPLETE: "examples/bun-1.3.4-urlpattern-faketimers-complete.ts",
  /** Test suite for URLPattern + Fake Timers integration */
  BUN_1_3_4_URLPATTERN_FAKETIMERS_COMPLETE_TEST:
    "examples/bun-1.3.4-urlpattern-faketimers-complete.test.ts",

  // Fetch API Examples
  BUN_FETCH_API_EXAMPLES: "examples/bun-fetch-api-examples.ts",
  BUN_FETCH_STREAMING_EXAMPLES: "examples/bun-fetch-streaming-examples.ts",
  BUN_FETCH_TESTING_UTILITIES: "examples/bun-fetch-testing-utilities.ts",

  // Server & Networking Examples
  BUN_SERVE_EXAMPLES: "examples/bun-serve-examples.ts",
  AUDIT_WEBSOCKET_CLIENT: "examples/audit-websocket-client.ts",
  HTTP_408_REQUEST_TIMEOUT: "examples/http-408-request-timeout-example.ts",

  // Routing Examples
  URLPATTERN_BASIC_EXAMPLES: "examples/urlpattern-basic-examples.ts",
  URLPATTERN_ROUTER_DEMO: "examples/urlpattern-router-demo.ts",
  URLPATTERN_ROUTER_INTEGRATION: "examples/urlpattern-router-integration.ts",

  // Package Management Examples
  BUN_LINK_MONOREPO_EXAMPLE: "examples/bun-link-monorepo-example.ts",
  BUN_LINK_MONOREPO_INTERACTIVE: "examples/bun-link-monorepo-interactive.html",
  BUN_ISOLATED_INSTALLS_VISUALIZER: "examples/bun-isolated-installs-visualizer.ts",
  BUN_ISOLATED_INSTALLS_INTERACTIVE: "examples/bun-isolated-installs-interactive.html",
  BUILD_STANDALONE_EXAMPLE: "examples/build-standalone-example.ts",

  // Security Examples
  BUN_SECURITY_EXAMPLES: "examples/bun-security-examples.ts",
  TELEGRAM_GOLDEN_SETUP: "examples/telegram-golden-setup.ts",
  TELEGRAM_GOLDEN_SETUP_MD: "examples/README-telegram-golden-setup.md",

  // Performance Examples
  BUN_PERFORMANCE_OPTIMIZATIONS: "examples/bun-performance-optimizations.ts",
  PERFORMANCE_MONITOR_DEMO: "examples/performance-monitor-demo.ts",

  // Development Tools
  DEVWORKSPACE_INTERACTIVE: "examples/devworkspace-interactive.ts",
  DEVWORKSPACE_QUICKSTART: "examples/devworkspace-quickstart.md",
  UTILS_DEMO: "examples/utils-demo.ts",

  // Specialized Examples
  DISTRIBUTED_ID_DEMO: "examples/distributed-id-demo.ts",
  HYPERTICK_DEMO: "examples/hypertick-demo.ts",
  CREATE_NBA_DEMO_TS: "examples/create-nba-demo.ts",
  CREATE_NBA_DEMO_JS: "examples/create-nba-demo.js",

  // Documentation
  README_BUN_1_3_EXAMPLES: "examples/README-Bun-1.3-Examples.md",
  README_BUN_LINK_MONOREPO: "examples/README-bun-link-monorepo.md",
  METADATA_ENHANCEMENT_GUIDE: "examples/METADATA-ENHANCEMENT-GUIDE.md",
  METADATA_ENHANCEMENT_SUMMARY: "examples/METADATA-ENHANCEMENT-SUMMARY.md",

  // Demos Subdirectory
  DEMOS_DIR: "examples/demos",
  DEMOS_README: "examples/demos/README.md",
  DEMO_BUN_UTILS: "examples/demos/demo-bun-utils.ts",
  DEMO_BUN_INSPECT_CUSTOM: "examples/demos/demo-bun-inspect-custom.ts",
  DEMO_BUN_INSPECT_EXAMPLES: "examples/demos/demo-bun-inspect-examples.ts",
  DEMO_BUN_SPAWN_COMPLETE: "examples/demos/demo-bun-spawn-complete.ts",
  DEMO_BUN_SPAWN_HTTP_PIPE: "examples/demos/demo-bun-spawn-http-pipe.ts",
  DEMO_BUN_SHELL_ENV_REDIRECT_PIPE: "examples/demos/demo-bun-shell-env-redirect-pipe.ts",
  DEMO_CIRCULAR_BUFFER: "examples/demos/demo-circular-buffer.ts",
  DEMO_ADVANCED_CIRCULAR_BUFFER: "examples/demos/demo-advanced-circular-buffer.ts",
  DEMO_CONSOLE_DEPTH: "examples/demos/demo-console-depth.ts",
  DEMO_CONSOLE_FEATURES: "examples/demos/demo-console-features.ts",
  DEMO_FETCH_DEBUG: "examples/demos/demo-fetch-debug.ts",
  DEMO_HTML_REWRITER: "examples/demos/demo-html-rewriter.ts",
  DEMO_HTML_REWRITER_SIMPLE: "examples/demos/demo-html-rewriter-simple.ts",
  DEMO_HTML_REWRITER_COMPARISON: "examples/demos/demo-html-rewriter-comparison.ts",
  DEMO_HTML_REWRITER_LIVE_EDITOR: "examples/demos/demo-html-rewriter-live-editor.ts",
  DEMO_HTML_REWRITER_SERVER: "examples/demos/demo-html-rewriter-server.ts",
  DEMO_LINK_EXTRACTOR: "examples/demos/demo-link-extractor.ts",
  DEMO_TAG_MANAGER_PRO: "examples/demos/demo-tag-manager-pro.ts",
  DEMO_WORKER_THREADS: "examples/demos/demo-worker-threads.ts",
  DEMO_REWRITER_OUTPUT_HTML: "examples/demos/demo-rewriter-output.html",
  HTML_REWRITER_DEMOS_MD: "examples/demos/HTML-REWRITER-DEMOS.md",
  README_HTML_REWRITER_DEMO: "examples/demos/README-HTML-REWRITER-DEMO.md",
  TAG_MANAGER: "examples/demos/tag-manager.ts",
  TAG_MANAGER_PRO: "examples/demos/tag-manager-pro.ts",
  FIX_TYPE_ERRORS: "examples/demos/fix-type-errors.ts",

  // Workers Subdirectory
  WORKERS_DIR: "examples/workers",
  WORKERS_COMPLETE_SYSTEM_DEMO: "examples/workers/complete-system-demo.ts",
  WORKERS_EVENT_BUS_DEMO: "examples/workers/event-bus-demo.ts",
  WORKERS_MESSAGE_BROKER_DEMO: "examples/workers/message-broker-demo.ts",
  WORKERS_WORKER_POOL_DEMO: "examples/workers/worker-pool-demo.ts",

  // Scripts Subdirectory
  SCRIPTS_DIR: "examples/scripts",
  SCRIPTS_LINK_ALL: "examples/scripts/link-all.ts",
  SCRIPTS_UNLINK_ALL: "examples/scripts/unlink-all.ts",
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
  // MLGS MultiLayerGraph endpoints
  MLGS_SHADOW_SCAN: "/api/mlgs/shadow-scan",
  PUBLIC_MARKETS: "/api/public/markets",
  PUBLIC_EVENTS: "/api/public/events",
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

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
} as const

// ═══════════════════════════════════════════════════════════════
// PATCHED DEPENDENCIES TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Patched dependencies tracking for team-aware patch management
 * Tracks all patches applied to dependencies with team impact, severity, and metadata
 *
 * @see docs/BUN-PATCH.md - Bun patch documentation
 * @see package.json patchedDependencies - Actual patch file references
 */
export const PATCHED_DEPENDENCIES = {
  global: {
    "@hyper-bun/cli": {
      version: "1.3.4",
      patches: [
        {
          id: "HYPERBUN-001",
          description: "Add team-aware RSS feed routing",
          category: "routing",
          severity: "medium",
          applied_by: "mike.rodriguez@yourcompany.com",
          applied_date: "2025-01-10",
          team_impact: ["sports_correlation", "market_analytics"],
        },
        {
          id: "HYPERBUN-002",
          description: "Enable MCP tool auto-discovery",
          category: "ai-integration",
          severity: "high",
          applied_by: "mike.rodriguez@yourcompany.com",
          applied_date: "2025-01-10",
          team_impact: ["platform_tools"],
        },
      ],
      patch_dir: "patches/@hyper-bun/cli",
      checksum: "sha256:a7f8c9...",
    },
    "bun:test": {
      version: "1.3.4",
      patches: [
        {
          id: "BUN-TEST-001",
          description: "Add Hyper-Bun-specific matchers for CMMS assertions",
          category: "testing",
          severity: "medium",
          applied_by: "sarah.kumar@yourcompany.com",
          applied_date: "2025-01-09",
          team_impact: ["market_analytics"],
        },
      ],
    },
  },
  team_specific: {
    sports_correlation: {
      "@mlg/rss-integrator": {
        version: "1.3.4",
        patches: [
          {
            id: "RSS-SPORTS-001",
            description: "Cache sports feeds for 30s vs default 5min",
            category: "performance",
            severity: "critical",
            applied_by: "alex.chen@yourcompany.com",
            applied_date: "2025-01-08",
            team_impact: ["sports_correlation"],
          },
        ],
      },
    },
    market_analytics: {
      "@mlg/rss-integrator": {
        version: "1.3.4",
        patches: [
          {
            id: "RSS-MARKETS-001",
            description: "Enable market data deduplication",
            category: "data-quality",
            severity: "high",
            applied_by: "sarah.kumar@yourcompany.com",
            applied_date: "2025-01-08",
            team_impact: ["market_analytics"],
          },
        ],
      },
    },
  },
} as const

/**
 * Package.json patched dependencies structure
 * Maps to actual package.json patchedDependencies field
 *
 * @see docs/BUN-PATCH.md - Patch workflow documentation
 */
export const PACKAGE_JSON_PATCHED = {
  patchedDependencies: {
    "@hyper-bun/cli@1.3.4": "patches/@hyper-bun/cli@1.3.4.patch",
    "bun:test@1.3.4": "patches/bun:test@1.3.4.patch",
    "@mlg/rss-integrator@1.3.4": "patches/@mlg/rss-integrator@1.3.4.patch",
  },
  patchManager: {
    autoApply: true,
    validation: "strict",
    notification: {
      onPatchApply: true,
      onPatchConflict: "error",
    },
  },
} as const

// ═══════════════════════════════════════════════════════════════
// HTTP AGENT & PROXY CONFIGURATION (Bun v1.3.4+)
// ═══════════════════════════════════════════════════════════════

import * as http from "node:http"
import * as https from "node:https"

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extended fetch options type with Node.js-compatible agent and Bun proxy support
 * Combines standard RequestInit with Node.js http.Agent and Bun v1.3.4 proxy format
 */
export interface RSSFetchOptions extends RequestInit {
  /** HTTP/HTTPS agent instance for connection pooling */
  agent?: http.Agent | https.Agent
  /** Bun v1.3.4 proxy configuration with custom headers */
  proxy?: {
    url: string | undefined
    headers: Record<string, string>
  }
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Proxy configuration type for Bun v1.3.4 fetch
 */
export interface ProxyConfig {
  url: string | undefined
  headers: Record<string, string>
}

/**
 * HTTP/HTTPS Agent configuration parameters for connection pooling
 * Uses Bun v1.3.4 fixed keepAlive connection reuse
 *
 * @see https://bun.sh/blog/bun-v1.3.4#http-agent-connection-pool
 * @see test/bun-1.3.4-features.test.ts - Integration tests
 * @see docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md - Documentation
 */
export const RSS_HTTP_AGENT_CONFIG_PARAMS = {
  /** HTTP Agent configuration */
  http: {
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000,
    keepAliveMsecs: 1000,
  },
  /** HTTPS Agent configuration */
  https: {
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 30000,
    keepAliveMsecs: 1000,
    rejectUnauthorized: true,
  },
  /** High-throughput configuration for benchmarks/bulk operations */
  highThroughput: {
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 25,
    timeout: 60000,
    keepAliveMsecs: 500,
  },
  /** Low-latency configuration for real-time feeds */
  lowLatency: {
    keepAlive: true,
    maxSockets: 25,
    maxFreeSockets: 5,
    timeout: 10000,
    keepAliveMsecs: 500,
  },
} as const

/**
 * Pre-created HTTP/HTTPS Agent instances for connection pooling
 * Singleton pattern to ensure proper connection reuse across requests
 *
 * @see https://bun.sh/blog/bun-v1.3.4#http-agent-connection-pool
 */
export const RSS_AGENTS = {
  http: new http.Agent(RSS_HTTP_AGENT_CONFIG_PARAMS.http),
  https: new https.Agent(RSS_HTTP_AGENT_CONFIG_PARAMS.https),
  highThroughput: new https.Agent(RSS_HTTP_AGENT_CONFIG_PARAMS.highThroughput),
  lowLatency: new https.Agent(RSS_HTTP_AGENT_CONFIG_PARAMS.lowLatency),
} as const

/**
 * Enterprise proxy configuration with custom headers
 * Uses Bun v1.3.4 fetch() proxy object format with headers
 *
 * @see https://bun.sh/blog/bun-v1.3.4#custom-proxy-headers-in-fetch
 * @see test/bun-1.3.4-features.test.ts - Integration tests
 *
 * @example
 * ```typescript
 * const response = await fetch(url, {
 *   proxy: {
 *     url: RSS_PROXY_CONFIG.corporate.url,
 *     headers: RSS_PROXY_CONFIG.corporate.headers,
 *   }
 * });
 * ```
 */
export const RSS_PROXY_CONFIG = {
  /** Corporate proxy configuration */
  corporate: {
    url: process.env.CORPORATE_PROXY_URL,
    headers: {
      "Proxy-Authorization": `Bearer ${process.env.CORPORATE_PROXY_TOKEN || ""}`,
      "X-Client-ID": "nexus-rss-v1.0",
      "X-Request-Source": "rss-feed-parser",
    },
  },
  /** Telegram API proxy (for restricted regions) */
  telegram: {
    url: process.env.TELEGRAM_PROXY_URL,
    headers: {
      "Proxy-Authorization": `Bearer ${process.env.TELEGRAM_PROXY_TOKEN || ""}`,
      "X-Proxy-Region": "us-east",
    },
  },
  /** External feed proxy (for third-party RSS feeds) */
  external_feeds: {
    url: process.env.EXTERNAL_PROXY_URL,
    headers: {
      "X-Client-ID": "nexus-external-feeds",
      "X-Request-Timeout": "30000",
    },
  },
  /** No proxy configuration (direct connection) */
  none: undefined,
} as const

/**
 * Fetch configuration templates for enterprise RSS operations
 * Defines parameters that can be resolved into complete fetch options
 *
 * @see https://bun.sh/blog/bun-v1.3.4 - Bun v1.3.4 fetch enhancements
 *
 * @example
 * ```typescript
 * import { getFetchOptions } from './utils/rss-constants';
 *
 * const fetchOptions = getFetchOptions('default');
 * const response = await fetch('https://secure-api.example.com/data', fetchOptions);
 *
 * if (!response.ok) {
 *   const errorText = await response.text();
 *   console.error(`HTTP Error! Status: ${response.status}, Details: ${errorText}`);
 *   throw new Error(`Failed to fetch data: ${response.status}`);
 * }
 *
 * const data = await response.json();
 * Bun.inspect.table(data.slice(0, 5), ['id', 'name', 'value']);
 * ```
 */
export const RSS_FETCH_TEMPLATES = {
  /** Default fetch configuration for RSS feeds */
  default: {
    agentKey: "https" as keyof typeof RSS_AGENTS,
    proxyKey: "corporate" as keyof typeof RSS_PROXY_CONFIG,
    headers: {
      "User-Agent": RSS_USER_AGENTS.PARSER,
      Accept: "application/rss+xml, application/xml, text/xml",
      "Accept-Encoding": "gzip, deflate, br",
    },
    timeout: RSS_DEFAULTS.timeout,
  },
  /** High-throughput fetch for bulk RSS operations */
  bulk: {
    agentKey: "highThroughput" as keyof typeof RSS_AGENTS,
    proxyKey: "corporate" as keyof typeof RSS_PROXY_CONFIG,
    headers: {
      "User-Agent": RSS_USER_AGENTS.benchmark_bot,
      Accept: "application/rss+xml, application/xml",
      "X-Bulk-Request": "true",
    },
    timeout: 60000,
  },
  /** Low-latency fetch for real-time RSS feeds */
  realtime: {
    agentKey: "lowLatency" as keyof typeof RSS_AGENTS,
    proxyKey: "none" as keyof typeof RSS_PROXY_CONFIG,
    headers: {
      "User-Agent": RSS_USER_AGENTS.monitoring_bot,
      Accept: "application/rss+xml",
      "Cache-Control": "no-cache",
    },
    timeout: 10000,
  },
  /** Telegram feed fetch configuration */
  telegram: {
    agentKey: "https" as keyof typeof RSS_AGENTS,
    proxyKey: "telegram" as keyof typeof RSS_PROXY_CONFIG,
    headers: {
      "User-Agent": RSS_USER_AGENTS.team_bot,
      Accept: "text/html",
    },
    timeout: 15000,
  },
} as const

/**
 * Helper function to resolve fetch configuration templates into complete RequestInit options
 * Handles proxy token validation and agent instance resolution
 *
 * @param templateName - The name of the fetch template to use
 * @returns Complete RSSFetchOptions object for fetch calls
 * @throws Error if template is unknown or required proxy tokens are missing
 *
 * @example Basic Usage
 * ```typescript
 * import { getFetchOptions } from './utils/rss-constants';
 *
 * const fetchOptions = getFetchOptions('default');
 * const response = await fetch('https://secure-api.example.com/data', fetchOptions);
 *
 * if (!response.ok) {
 *   const errorText = await response.text();
 *   console.error(`HTTP Error! Status: ${response.status}, Details: ${errorText}`);
 *   throw new Error(`Failed to fetch data: ${response.status}`);
 * }
 *
 * const data = await response.json();
 * Bun.inspect.table(data.slice(0, 5), ['id', 'name', 'value']);
 * ```
 *
 * @example Bulk Operations
 * ```typescript
 * const bulkOptions = getFetchOptions('bulk');
 * const feeds = await Promise.all(urls.map(url => fetch(url, bulkOptions)));
 * ```
 *
 * @example Real-time Feeds (No Proxy)
 * ```typescript
 * const realtimeOptions = getFetchOptions('realtime');
 * const response = await fetch('https://stream.example.com/feed', realtimeOptions);
 * ```
 *
 * @example Telegram API
 * ```typescript
 * const telegramOptions = getFetchOptions('telegram');
 * const response = await fetch('https://t.me/s/channel', telegramOptions);
 * ```
 */
export function getFetchOptions(templateName: keyof typeof RSS_FETCH_TEMPLATES): RSSFetchOptions {
  const template = RSS_FETCH_TEMPLATES[templateName]
  if (!template) {
    throw new Error(`Unknown fetch template: ${templateName}`)
  }

  const agentInstance = RSS_AGENTS[template.agentKey]
  const proxyConfig = RSS_PROXY_CONFIG[template.proxyKey]

  // Validate proxy configuration if proxy is required
  if (proxyConfig && proxyConfig !== RSS_PROXY_CONFIG.none) {
    if (!proxyConfig.url) {
      throw new Error(
        `Proxy configuration for '${template.proxyKey}' is missing required URL environment variable`
      )
    }

    // Check for required proxy tokens
    if (template.proxyKey === "corporate" && !process.env.CORPORATE_PROXY_TOKEN) {
      throw new Error("CORPORATE_PROXY_TOKEN environment variable is required for corporate proxy")
    }
    if (template.proxyKey === "telegram" && !process.env.TELEGRAM_PROXY_TOKEN) {
      throw new Error("TELEGRAM_PROXY_TOKEN environment variable is required for telegram proxy")
    }
  }

  return {
    agent: agentInstance,
    proxy: proxyConfig && proxyConfig !== RSS_PROXY_CONFIG.none ? proxyConfig : undefined,
    headers: template.headers,
    timeout: template.timeout,
  }
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Enhanced Telegram configuration for channels, supergroups, and bot settings
 * Supports one-way broadcast channels and multi-way discussion supergroups with topic threads
 *
 * @see src/telegram/client.ts - EnhancedTelegramClient implementation
 * @see src/telegram/tension-alerts.ts - Tension alert routing
 * @see src/telegram/proxy-pinning.ts - Proxy URL pattern pinning
 * @see docs/20.0.0.0.0.0.0-TELEGRAM-ENHANCED-INTEGRATION.md - Complete documentation
 */
export const TELEGRAM_CONFIG = {
  channels: {
    // One-way broadcast channels (no replies)
    announcements: {
      id: "@GraphEngineAnnouncements", // Public channel
      type: "channel" as const,
      purpose: "Release notes, system updates",
      rss_feed: RSS_FEED_URLS.events.releases,
      ai_summary: true,
    },
    security_alerts: {
      id: "@GraphEngineSecurity",
      type: "channel" as const,
      purpose: "Security advisories",
      severity_threshold: "high" as const,
      auto_forward_from: "incidents",
    },
    benchmark_results: {
      id: "@GraphEngineBenchmarks",
      type: "channel" as const,
      purpose: "Benchmark results broadcast",
      mute_notifications: false,
    },
  },
  supergroups: {
    // Multi-way discussion groups
    sports_correlation: {
      id: -100140123456789, // Supergroup ID (negative for supergroups)
      type: "supergroup" as const,
      topic_threads: true, // Forum topics enabled
      topics: {
        general: 1,
        benchmarks: 2,
        incidents: 3,
        rfc: 4,
      },
      rss_feeds: {
        main: RSS_FEED_URLS.sports_correlation.main,
        announcements: RSS_FEED_URLS.sports_correlation.announcements,
        benchmarks: RSS_FEED_URLS.sports_correlation.benchmarks,
      },
    },
    market_analytics: {
      id: -100150234567890,
      type: "supergroup" as const,
      topics: {
        general: 5,
        benchmarks: 6,
        incidents: 7,
      },
    },
    platform_tools: {
      id: -100160345678901,
      type: "supergroup" as const,
      topics: {
        general: 9,
        benchmarks: 10,
        incidents: 11,
        audits: 12,
      },
    },
  },
  bot_config: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    api_base: "https://api.telegram.org",
    // Proxy configuration for enterprise environments
    proxy: {
      url: process.env.TELEGRAM_PROXY_URL || "",
      headers: {
        "Proxy-Authorization": `Bearer ${process.env.TELEGRAM_PROXY_TOKEN || ""}`,
        "X-Proxy-Region": "us-east",
      },
    },
    // HTTP keep-alive for connection reuse
    http_agent: {
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000,
      keepAliveMsecs: 1000,
    },
  },
} as const
