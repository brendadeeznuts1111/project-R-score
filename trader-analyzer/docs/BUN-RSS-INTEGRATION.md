# Bun RSS Feed Integration

**Fetch and monitor Bun release announcements from bun.com/rss.xml**

---

## Overview

The Bun RSS integration provides utilities to fetch, parse, and display Bun release announcements and blog posts from the official Bun RSS feed.

---

## Quick Start

### Fetch Latest Bun Releases

```bash
# Display latest 10 items (default)
bun run bun:rss

# Display latest 5 items
bun run bun:rss 5

# Get latest Bun version number
bun run bun:version
```

---

## Features

### 1. RSS Parser Utility (`src/utils/rss-parser.ts`)

Universal RSS 2.0 parser supporting:
- ✅ CDATA sections
- ✅ Plain text content
- ✅ HTML entity decoding (including numeric entities)
- ✅ Multiple RSS feed formats

**API:**

```typescript
import { fetchRSSFeed, getLatestRSSItems, parseRSSXML } from "./src/utils/rss-parser.js";
import { RSS_FEED_URLS, RSS_DEFAULTS } from "./src/utils/rss-constants.js";

// Fetch and parse RSS feed
const feed = await fetchRSSFeed(RSS_FEED_URLS.BUN);

// Get latest items
const items = await getLatestRSSItems(RSS_FEED_URLS.BUN, RSS_DEFAULTS.ITEM_LIMIT);

// Parse XML directly
const feed = parseRSSXML(xmlString);
```

### 2. RSS Constants (`src/utils/rss-constants.ts`)

Standardized constants for RSS feed configuration:

```typescript
import {
	RSS_FEED_URLS,
	RSS_USER_AGENTS,
	RSS_DEFAULTS,
	RSS_REGEX_PATTERNS,
	RSS_ENV,
} from "./src/utils/rss-constants.js";

// RSS Feed URLs
RSS_FEED_URLS.BUN; // "https://bun.com/rss.xml"

// User-Agent strings
RSS_USER_AGENTS.PARSER; // "NEXUS-RSS-Parser/1.0"

// Default values
RSS_DEFAULTS.ITEM_LIMIT; // 10
RSS_DEFAULTS.VERSION_CHECK_LIMIT; // 5

// Regex patterns
RSS_REGEX_PATTERNS.BUN_VERSION; // /Bun v(\d+\.\d+\.\d+)/i

// Environment variables
RSS_ENV.API_URL; // "API_URL"
```

**Benefits:**
- Single source of truth for RSS configuration
- Consistent naming across the codebase
- Easy to discover via ripgrep patterns
- Type-safe constants with `as const`

**RSSFeed Interface:**

```typescript
interface RSSFeed {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
  pubDate?: string;
  ttl?: number;
  items: RSSItem[];
}

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
  author?: string;
  guid?: string;
}
```

### 2. Bun RSS Script (`scripts/bun-rss.ts`)

CLI tool for fetching and displaying Bun RSS feed items.

**Usage:**

```bash
# Display feed items
bun run bun:rss [limit]

# Get latest version
bun run bun:version
```

**Examples:**

```bash
# Show latest 5 releases
bun run bun:rss 5

# Show latest version
bun run bun:version
# Output: 1.3.4
```

---

## Integration Examples

### Monitor Bun Releases

```typescript
import { getLatestRSSItems } from "./src/utils/rss-parser.js";
import { RSS_FEED_URLS, RSS_DEFAULTS, RSS_REGEX_PATTERNS } from "./src/utils/rss-constants.js";

async function checkBunReleases() {
  const items = await getLatestRSSItems(
    RSS_FEED_URLS.BUN,
    RSS_DEFAULTS.VERSION_CHECK_LIMIT
  );
  
  for (const item of items) {
    // Check if it's a version release
    const versionMatch = item.title.match(RSS_REGEX_PATTERNS.BUN_VERSION);
    if (versionMatch) {
      console.log(`New Bun version: ${versionMatch[1]}`);
      // Trigger update notifications, etc.
    }
  }
}
```

### Parse Custom RSS Feed

```typescript
import { fetchRSSFeed } from "./src/utils/rss-parser.js";

const feed = await fetchRSSFeed("https://example.com/feed.xml");
console.log(`Feed: ${feed.title}`);
console.log(`Items: ${feed.items.length}`);
```

### Integrate with Telegram

```typescript
import { getLatestRSSItems } from "./src/utils/rss-parser.js";
import { TelegramBotApi } from "./src/api/telegram-ws.js";
import { RSS_FEED_URLS, RSS_DEFAULTS } from "./src/utils/rss-constants.js";

async function postBunReleasesToTelegram() {
  const items = await getLatestRSSItems(
    RSS_FEED_URLS.BUN,
    RSS_DEFAULTS.VERSION_CHECK_LIMIT
  );
  const api = new TelegramBotApi(process.env.TELEGRAM_BOT_TOKEN!);
  
  for (const item of items) {
    const message = `🚀 ${item.title}\n\n${item.description.substring(0, 200)}...\n\n🔗 ${item.link}`;
    await api.sendMessage(process.env.TELEGRAM_CHAT_ID!, message);
  }
}
```

---

## RSS Parser Features

### Supported Formats

1. **CDATA Format:**
   ```xml
   <title><![CDATA[Content]]></title>
   ```

2. **Plain Text Format:**
   ```xml
   <title>Content</title>
   ```

3. **HTML Entities:**
   - `&amp;` → `&`
   - `&lt;` → `<`
   - `&gt;` → `>`
   - `&quot;` → `"`
   - `&#39;` / `&#x27;` → `'`
   - `&#123;` → Character code 123
   - `&#x1F;` → Hex character code 1F
   - `&nbsp;` → Space

### Error Handling

The parser throws descriptive errors for:
- Invalid RSS structure (missing channel)
- Network errors (fetch failures)
- HTTP errors (non-200 status codes)

---

## Future Enhancements

Planned features:
- [ ] RSS feed monitoring service (similar to `feed-monitor.ts`)
- [ ] Automatic Telegram notifications for new Bun releases
- [ ] Version comparison and update detection
- [ ] RSS feed caching
- [ ] Multiple feed aggregation
- [ ] RSS feed validation

---

## Related Documentation

- [Telegram RSS Integration](./TELEGRAM-CHANGELOG-RSS.md) - Telegram RSS posting
- [RSS Feed API](./api/MCP-SERVER.md#rss-feed-endpoint) - Internal RSS feed endpoint
- [Feed Monitor](./TELEGRAM-CHANGELOG-RSS.md#automated-monitoring) - Automated feed monitoring

---

## Troubleshooting

### Feed Not Loading

```bash
# Check network connectivity
curl https://bun.com/rss.xml

# Test parser directly
bun run bun:rss 1
```

### HTML Entities Not Decoded

The parser handles common HTML entities. If you encounter issues:
1. Check the RSS feed format
2. Verify XML structure
3. Report parsing issues with feed URL

### Version Detection Fails

The version command looks for patterns like "Bun v1.2.3". If the format changes:
1. Check latest feed items: `bun run bun:rss 5`
2. Update regex pattern in `src/utils/rss-constants.ts` (`RSS_REGEX_PATTERNS.BUN_VERSION`)

---

## Constants Reference

All RSS-related constants are centralized in `src/utils/rss-constants.ts`:

- **RSS_FEED_URLS**: Feed URLs (e.g., `RSS_FEED_URLS.BUN`)
- **RSS_USER_AGENTS**: User-Agent strings for requests
- **RSS_DEFAULTS**: Default values (item limits, etc.)
- **RSS_REGEX_PATTERNS**: Regex patterns for parsing
- **RSS_ENV**: Environment variable names
- **RSS_INTERNAL**: Internal RSS feed configuration (platform name, generator, endpoints, etc.)
- **RSS_CATEGORIES**: Standardized RSS feed categories for organizing items
- **RSS_GITHUB_LINKS**: GitHub repository URLs for team pages and documentation
- **RSS_API_PATHS**: Common API endpoint paths used in RSS feed items

**Ripgrep Pattern:** `RSS_FEED_URLS|RSS_USER_AGENTS|RSS_DEFAULTS|RSS_REGEX_PATTERNS|RSS_ENV|RSS_INTERNAL|RSS_CATEGORIES|RSS_GITHUB_LINKS|RSS_API_PATHS|rss-constants`

### Internal RSS Feed Constants

The `RSS_INTERNAL` constants configure the NEXUS platform's own RSS feed generation (`/api/rss.xml`):

```typescript
import { RSS_INTERNAL } from "./src/utils/rss-constants.js";

RSS_INTERNAL.PLATFORM_NAME; // "NEXUS Trading Platform"
RSS_INTERNAL.PLATFORM_DESCRIPTION; // Full platform description
RSS_INTERNAL.GENERATOR_NAME; // "NEXUS RSS Generator"
RSS_INTERNAL.WEBMASTER_EMAIL; // "nexus@trading.platform"
RSS_INTERNAL.ENDPOINT_PATH; // "/api/rss.xml"
RSS_INTERNAL.CONTENT_TYPE; // "application/rss+xml; charset=utf-8"
RSS_INTERNAL.LANGUAGE; // "en-US"
RSS_INTERNAL.TTL_MINUTES; // 60
RSS_INTERNAL.IMAGE_URL; // "https://bun.com/logo.svg"
RSS_INTERNAL.GIT_LOG_LIMIT; // 15
RSS_INTERNAL.GIT_COMMITS_LIMIT; // 10
```

### RSS Feed Categories

Standardized category constants for organizing RSS feed items:

```typescript
import { RSS_CATEGORIES } from "./src/utils/rss-constants.js";

RSS_CATEGORIES.SYSTEM; // "system"
RSS_CATEGORIES.FEATURE; // "feature"
RSS_CATEGORIES.REGISTRY; // "registry"
RSS_CATEGORIES.ANALYTICS; // "analytics"
RSS_CATEGORIES.DATA; // "data"
RSS_CATEGORIES.PREDICTION_MARKETS; // "prediction-markets"
RSS_CATEGORIES.MARKET_MAKING; // "market-making"
RSS_CATEGORIES.ORCA; // "orca"
RSS_CATEGORIES.ARBITRAGE; // "arbitrage"
RSS_CATEGORIES.DERIBIT; // "deribit"
RSS_CATEGORIES.TELEGRAM; // "telegram"
RSS_CATEGORIES.MCP; // "mcp"
RSS_CATEGORIES.UI_POLICY; // "ui-policy"
RSS_CATEGORIES.AUTH; // "auth"
RSS_CATEGORIES.PIPELINE; // "pipeline"
RSS_CATEGORIES.PERFORMANCE; // "performance"
RSS_CATEGORIES.DEBUG; // "debug"
RSS_CATEGORIES.DOCUMENTATION; // "documentation"
RSS_CATEGORIES.RUNTIME; // "runtime"
RSS_CATEGORIES.UI; // "ui"
RSS_CATEGORIES.TEAM; // "team"
RSS_CATEGORIES.PROCESS; // "process"
RSS_CATEGORIES.ORGANIZATION; // "organization"
RSS_CATEGORIES.TOOLING; // "tooling"
RSS_CATEGORIES.HYPER_BUN; // "hyper-bun"
RSS_CATEGORIES.CACHE; // "cache"
RSS_CATEGORIES.OBSERVABILITY; // "observability"
RSS_CATEGORIES.COMPLIANCE; // "compliance"
RSS_CATEGORIES.DEVELOPMENT; // "development"
```

### GitHub Repository Links

Standardized GitHub repository URLs for team pages and documentation:

```typescript
import { RSS_GITHUB_LINKS } from "./src/utils/rss-constants.js";

RSS_GITHUB_LINKS.REPOSITORY; // Main repository URL
RSS_GITHUB_LINKS.TEAM_PAGE; // Team structure page
RSS_GITHUB_LINKS.TOPICS_PAGE; // Topics & categories page
RSS_GITHUB_LINKS.PR_REVIEW_PAGE; // PR review process page
RSS_GITHUB_LINKS.COMMIT_BASE; // Base URL for commit links
```

### API Endpoint Paths

Common API endpoint paths used in RSS feed items:

```typescript
import { RSS_API_PATHS } from "./src/utils/rss-constants.js";

RSS_API_PATHS.HEALTH; // "/api/health"
RSS_API_PATHS.REGISTRY; // "/api/registry"
RSS_API_PATHS.REGISTRY_PROPERTIES; // "/api/registry/properties"
RSS_API_PATHS.REGISTRY_DATA_SOURCES; // "/api/registry/data-sources"
RSS_API_PATHS.REGISTRY_SHARP_BOOKS; // "/api/registry/sharp-books"
RSS_API_PATHS.REGISTRY_TEAM_DEPARTMENTS; // "/api/registry/team-departments"
RSS_API_PATHS.REGISTRY_TOPICS; // "/api/registry/topics"
RSS_API_PATHS.REGISTRY_CSS_BUNDLER; // "/api/registry/css-bundler"
RSS_API_PATHS.REGISTRY_MCP_TOOLS; // "/api/registry/mcp-tools"
RSS_API_PATHS.REGISTRY_CLI_COMMANDS; // "/api/registry/cli-commands"
RSS_API_PATHS.V17_REGISTRY_BASE; // "/api/v17/registry"
RSS_API_PATHS.V17_REGISTRY_PROPERTIES; // "/api/v17/registry/properties"
RSS_API_PATHS.V17_REGISTRY_MCP_TOOLS; // "/api/v17/registry/mcp-tools"
RSS_API_PATHS.V17_REGISTRY_CLI_COMMANDS; // "/api/v17/registry/cli-commands"
RSS_API_PATHS.V17_HEALTH; // "/health/v17"
RSS_API_PATHS.DOCS; // "/docs"
RSS_API_PATHS.DOCS_ERRORS; // "/docs/errors"
```

**MCP Tools & CLI Commands Integration**:
- `RSS_API_PATHS.REGISTRY_MCP_TOOLS`: Endpoint for MCP (Model Context Protocol) tools registry
  - Returns 34+ tools across 6 categories (Bun Tooling, Shell, Documentation, Research, Security, Runtime Utilities)
  - Used by Dashboard & UI Department for MCP tools visualization
  - Integrated with `dashboard/17.14.0-nexus-dashboard.html` for live MCP tools display
  - Cross-referenced with `commands/mcp.md` documentation
  
- `RSS_API_PATHS.REGISTRY_CLI_COMMANDS`: Endpoint for CLI commands registry
  - Returns all command-line tools (telegram, mcp, dashboard, fetch, security, management, github, password, audit)
  - Used by Dashboard & UI Department for CLI commands visualization
  - Integrated with `dashboard/17.14.0-nexus-dashboard.html` for live CLI commands display
  - Cross-referenced with `commands/README.md` and individual command documentation files

**v17 Routing Integration**:
- `RSS_API_PATHS.V17_REGISTRY_BASE`: Base path for v17 registry endpoints (`/api/v17/registry`)
- `RSS_API_PATHS.V17_REGISTRY_MCP_TOOLS`: v17 MCP tools registry endpoint
- `RSS_API_PATHS.V17_REGISTRY_CLI_COMMANDS`: v17 CLI commands registry endpoint
- `RSS_API_PATHS.V17_HEALTH`: v17 health probe endpoint
- Integrated with `src/17.16.0.0.0.0.0-routing/` URLPattern routing system
- Used by `handleRadianceRoute17()` for type-safe registry routing
- Cross-referenced with `ROUTING_REGISTRY_NAMES` constants for registry name matching

### Routing Registry Names

Registry name constants for routing handlers:

```typescript
import { ROUTING_REGISTRY_NAMES } from "./src/utils/rss-constants.js";

ROUTING_REGISTRY_NAMES.PROPERTIES; // "properties"
ROUTING_REGISTRY_NAMES.MCP_TOOLS; // "mcp-tools"
ROUTING_REGISTRY_NAMES.CLI_COMMANDS; // "cli-commands"
ROUTING_REGISTRY_NAMES.SHARP_BOOKS; // "sharp-books"
ROUTING_REGISTRY_NAMES.DATA_SOURCES; // "data-sources"
ROUTING_REGISTRY_NAMES.TEAM_DEPARTMENTS; // "team-departments"
ROUTING_REGISTRY_NAMES.TOPICS; // "topics"
ROUTING_REGISTRY_NAMES.CSS_BUNDLER; // "css-bundler"
ROUTING_REGISTRY_NAMES.ERRORS; // "errors"
```

**Usage**:
- Used in `src/17.16.0.0.0.0.0-routing/17.16.2-routing.handler.ts` for type-safe registry name matching
- Used in `src/api/routes.ts` for registry endpoint routing
- Used in `src/17.14.0.0.0.0.0-nexus/registry-of-registries.ts` for registry metadata definitions
- Replaces hardcoded strings in switch statements and URLPattern matching
- Ensures consistency across routing handlers and registry endpoints
- Integrated with URLPattern wildcard routing (`registryItem`, `registryDeep`, `healthProbe` patterns)

### Deep-Link Paths

Deep-link path segments for RFC 001 Telegram Deep-Link Standard:

```typescript
import { DEEP_LINK_PATHS, DEEP_LINK_DEFAULTS } from "./src/utils/rss-constants.js";

DEEP_LINK_PATHS.ALERT_BASE; // "/alert/"
DEEP_LINK_PATHS.ALERT_COVERT_STEAM; // "/alert/covert-steam/"
DEEP_LINK_PATHS.ALERT_PERF_REGRESSION; // "/alert/perf-regression/"
DEEP_LINK_PATHS.ALERT_MARKET_ANOMALY; // "/alert/market-anomaly/"
DEEP_LINK_PATHS.AUDIT_URL_ANOMALY; // "/audit/url-anomaly/"
DEEP_LINK_PATHS.AUDIT_SECURITY_THREAT; // "/audit/security-threat/"
DEEP_LINK_PATHS.REGISTRY; // "/registry/"
DEEP_LINK_PATHS.DASHBOARD; // "/dashboard/"

DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV; // "http://localhost:8080"
DEEP_LINK_DEFAULTS.DASHBOARD_URL_PROD; // "https://dashboard.hyperbun.com"
DEEP_LINK_DEFAULTS.API_PORT; // "3001"
DEEP_LINK_DEFAULTS.DASHBOARD_PORT; // "8080"
```

**Usage**:
- Used in `src/utils/deeplink-generator.ts` for RFC 001 compliant deep-link generation
- All alert path segments centralized for consistency
- Default URLs and ports centralized for environment configuration
- Integrated with Telegram alert formatting (`src/telegram/covert-steam-alert.ts`)
- Cross-referenced with RFC 001 documentation (`docs/rfc/001-telegram-deeplink-standard.md`)

### Telegram Mini App & Supergroup Paths

Telegram Mini App and supergroup API endpoints:

```typescript
import { RSS_API_PATHS, TELEGRAM_MINIAPP_URLS } from "./src/utils/rss-constants.js";

// Telegram Bot endpoints
RSS_API_PATHS.TELEGRAM_BOT_STATUS; // "/api/telegram/bot/status"
RSS_API_PATHS.TELEGRAM_USERS; // "/api/telegram/users"
RSS_API_PATHS.TELEGRAM_TOPICS; // "/api/telegram/topics"
RSS_API_PATHS.TELEGRAM_BROADCAST; // "/api/telegram/broadcast"

// Mini App endpoints
RSS_API_PATHS.MINIAPP_STATUS; // "/api/miniapp/status"
RSS_API_PATHS.MINIAPP_INFO; // "/api/miniapp/info"
RSS_API_PATHS.MINIAPP_HEALTH; // "/api/miniapp/health"
RSS_API_PATHS.MINIAPP_DEPLOYMENT; // "/api/miniapp/deployment"
RSS_API_PATHS.MINIAPP_CONFIG; // "/api/miniapp/config"
RSS_API_PATHS.MINIAPP_SPORTSBOOKS; // "/api/miniapp/sportsbooks"
RSS_API_PATHS.MINIAPP_MARKETS; // "/api/miniapp/markets"
RSS_API_PATHS.MINIAPP_ARBITRAGE; // "/api/miniapp/arbitrage"
RSS_API_PATHS.MINIAPP_BETS; // "/api/miniapp/bets"
RSS_API_PATHS.MINIAPP_SUPERGROUP_SEND_ALERT; // "/api/miniapp/supergroup/send-alert"
RSS_API_PATHS.MINIAPP_ALERTS_COVERT_STEAM; // "/api/miniapp/alerts/covert-steam"

// v17 Mini App endpoints
RSS_API_PATHS.V17_MINIAPP_BASE; // "/api/v17/telegram/miniapp"
RSS_API_PATHS.V17_MINIAPP_SPORTSBOOKS; // "/api/v17/telegram/miniapp/sportsbooks"
RSS_API_PATHS.V17_MINIAPP_MARKETS; // "/api/v17/telegram/miniapp/markets"
RSS_API_PATHS.V17_MINIAPP_ARBITRAGE; // "/api/v17/telegram/miniapp/arbitrage"
RSS_API_PATHS.V17_MINIAPP_BETS; // "/api/v17/telegram/miniapp/bets"
RSS_API_PATHS.V17_MINIAPP_STATUS; // "/api/v17/telegram/miniapp/status"
RSS_API_PATHS.V17_MINIAPP_INFO; // "/api/v17/telegram/miniapp/info"

// Mini App URLs
TELEGRAM_MINIAPP_URLS.STAGING; // "https://staging.factory-wager-miniapp.pages.dev"
TELEGRAM_MINIAPP_URLS.PRODUCTION; // "https://factory-wager-miniapp.pages.dev"
TELEGRAM_MINIAPP_URLS.PRODUCTION_ALT; // "https://app.factory-wager.com"
```

**Usage**:
- Used in `src/api/routes.ts` for RSS feed generation and endpoint definitions
- Used in `src/17.14.0.0.0.0.0-nexus/registry-of-registries.ts` for mini-app registry health checks
- Used in `src/utils/miniapp-native.ts` for miniapp monitoring
- Centralizes all Telegram Mini App and supergroup endpoint paths
- Centralizes Factory Wager Mini App deployment URLs

### NPM Registry Configuration

NPM registry URLs and configuration for @graph monorepo publishing:

```typescript
import { RSS_REGISTRY_CONFIG } from "./src/utils/rss-constants.js";

RSS_REGISTRY_CONFIG.PRIVATE_REGISTRY; // "https://npm.internal.yourcompany.com"
RSS_REGISTRY_CONFIG.PUBLIC_REGISTRY; // "https://registry.npmjs.org"
RSS_REGISTRY_CONFIG.SCOPE; // "@graph"
RSS_REGISTRY_CONFIG.DEFAULT_ACCESS; // "restricted"
RSS_REGISTRY_CONFIG.DEFAULT_TAG; // "latest"
```

**Usage**:
- Used in `scripts/publish-graph-monorepo.ts` for package publishing
- Used in `.github/workflows/publish-graph-packages.yml` for CI/CD workflows
- Centralizes NPM registry configuration for monorepo packages

### Test Configuration

Test configuration constants for BUN test runner:

```typescript
import { TEST_CONFIG } from "./src/utils/rss-constants.js";

TEST_CONFIG.DEFAULT_TIMEOUT; // 30000 (30 seconds)
TEST_CONFIG.PERFORMANCE_TIMEOUT; // 60000 (60 seconds)
TEST_CONFIG.BENCHMARK_TIMEOUT; // 60000 (60 seconds)
TEST_CONFIG.DEFAULT_REPEATS; // 20
TEST_CONFIG.PERFORMANCE_REPEATS; // 50
TEST_CONFIG.CONCURRENCY; // 4
TEST_CONFIG.COVERAGE_LINES_THRESHOLD; // 80
TEST_CONFIG.COVERAGE_FUNCTIONS_THRESHOLD; // 80
TEST_CONFIG.COVERAGE_BRANCHES_THRESHOLD; // 75
TEST_CONFIG.COVERAGE_STATEMENTS_THRESHOLD; // 80
```

**Usage**:
- Used in test files for timeout and repeat configuration
- Used in test configuration files (`bunfig.toml`, `vitest.config.ts`)
- Centralizes test thresholds and performance settings
- Supports Layer4 correlation detection tests and other performance benchmarks

### Workspace & Package Paths

Workspace and package directory paths for monorepo structure:

```typescript
import { WORKSPACE_PATHS } from "./src/utils/rss-constants.js";

WORKSPACE_PATHS.PACKAGES_DIR; // "packages"
WORKSPACE_PATHS.GRAPHS_DIR; // "packages/graphs"
WORKSPACE_PATHS.MULTILAYER_PACKAGE; // "packages/graphs/multilayer"
WORKSPACE_PATHS.CORE_PACKAGE; // "packages/core"
WORKSPACE_PATHS.ALGORITHMS_PACKAGE; // "packages/algorithms"
WORKSPACE_PATHS.UTILS_PACKAGE; // "packages/utils"
WORKSPACE_PATHS.BENCH_DIR; // "bench"
WORKSPACE_PATHS.APPS_DIR; // "apps"
WORKSPACE_PATHS.TEST_DIR; // "test"
WORKSPACE_PATHS.TEST_SETUP; // "test/setup.ts"
WORKSPACE_PATHS.TEST_HARNESS; // "test/harness.ts"
```

**Usage**:
- Used in workspace configurations (`package.json` workspaces)
- Used in test files for package references
- Used in build and publish scripts
- Centralizes monorepo package structure paths

### Test File Patterns

Test file naming patterns and paths:

```typescript
import { TEST_PATTERNS } from "./src/utils/rss-constants.js";

TEST_PATTERNS.TEST_PATTERN; // "*.test.ts"
TEST_PATTERNS.SPEC_PATTERN; // "*.spec.ts"
TEST_PATTERNS.PERFORMANCE_PATTERN; // "*.performance.test.ts"
TEST_PATTERNS.BENCHMARK_PATTERN; // "*.bench.ts"
TEST_PATTERNS.TEST_DIR_PATTERN; // "test/**/*.ts"
TEST_PATTERNS.CO_LOCATED_PATTERN; // "src/**/*.test.ts"
```

**Usage**:
- Used in test discovery configuration (`bunfig.toml`, `vitest.config.ts`)
- Used in test runner scripts
- Centralizes test file naming conventions
- Supports hybrid test organization (co-located and dedicated test directory)

### Shadow Graph API Endpoints

Shadow Graph system API endpoints for dashboard, internal, and public access:

```typescript
import { RSS_API_PATHS } from "./src/utils/rss-constants.js";

// Dashboard endpoints
RSS_API_PATHS.SHADOW_GRAPH_DASHBOARD; // "/api/dashboard/shadow-graph"
RSS_API_PATHS.SHADOW_GRAPH_NODES; // "/api/dashboard/shadow-graph/nodes"
RSS_API_PATHS.SHADOW_GRAPH_EDGES; // "/api/dashboard/shadow-graph/edges"

// Internal API endpoints (real-time <50ms)
RSS_API_PATHS.SHADOW_GRAPH_INTERNAL; // "/api/internal/shadow-graph"
RSS_API_PATHS.SHADOW_GRAPH_INTERNAL_NODES; // "/api/internal/shadow-graph/nodes"
RSS_API_PATHS.SHADOW_GRAPH_INTERNAL_STREAM; // "/api/internal/shadow-graph/stream" (WebSocket)

// Public API endpoints (500ms delay)
RSS_API_PATHS.PUBLIC_MARKETS; // "/api/public/markets"
RSS_API_PATHS.PUBLIC_EVENTS; // "/api/public/events"
```

**Usage**:
- Used in `src/api/routes.ts` for shadow graph endpoint definitions
- Used in `dashboard/index.html` for shadow graph visualization
- Centralizes all shadow graph API endpoint paths
- Supports both dashboard (user-facing) and internal (real-time) APIs
- Cross-referenced with `docs/SHADOW-GRAPH-SYSTEM.md` for architecture details

### Shadow Graph File Paths

Shadow Graph system file paths and directories:

```typescript
import { SHADOW_GRAPH_PATHS } from "./src/utils/rss-constants.js";

// Configuration
SHADOW_GRAPH_PATHS.ALERT_CONFIG; // "config/shadow-graph-alerts.yaml"

// Research scripts
SHADOW_GRAPH_PATHS.SCRIPT_SCAN_COVERT_STEAM; // "scripts/research-scan-covert-steam-events.ts"
SHADOW_GRAPH_PATHS.SCRIPT_GENERATE_GRAPH; // "scripts/research-generate-shadow-market-graph.ts"
SHADOW_GRAPH_PATHS.SCRIPT_IDENTIFY_DECEPTIVE; // "scripts/research-identify-deceptive-lines.ts"
SHADOW_GRAPH_PATHS.SCRIPT_AUTO_TRADER; // "scripts/research-auto-covert-arb-trader.ts"

// Source code
SHADOW_GRAPH_PATHS.SOURCE_DIR; // "src/arbitrage/shadow-graph"

// Database & data
SHADOW_GRAPH_PATHS.DATA_DIR; // "data"
SHADOW_GRAPH_PATHS.RESEARCH_DB; // "data/research.db"
SHADOW_GRAPH_PATHS.SHADOW_GRAPHS_DB; // "data/shadow-market-graphs-weekly.db"

// Logging
SHADOW_GRAPH_PATHS.LOG_DIR; // "/var/log/hyper-bun"
SHADOW_GRAPH_PATHS.COVERT_STEAM_LOG; // "/var/log/hyper-bun/covert-steam-nightly.jsonl.zst"
```

**Usage**:
- Used in `src/arbitrage/shadow-graph/alert-system.ts` for alert configuration loading
- Used in `src/arbitrage/shadow-graph/shadow-graph-orchestrator.ts` for database path
- Used in `scripts/bun-console.ts` for database initialization
- Centralizes all shadow graph file paths and script references
- Cross-referenced with `docs/SHADOW-GRAPH-SYSTEM.md` for automation scripts

### Root Directory Paths

Common root directory paths for project structure:

```typescript
import { ROOT_DIR_PATHS } from "./src/utils/rss-constants.js";

ROOT_DIR_PATHS.DATA_DIR; // "data"
ROOT_DIR_PATHS.CONFIG_DIR; // "config"
ROOT_DIR_PATHS.SCRIPTS_DIR; // "scripts"
ROOT_DIR_PATHS.SRC_DIR; // "src"
ROOT_DIR_PATHS.DOCS_DIR; // "docs"
ROOT_DIR_PATHS.TEST_DIR; // "test"
ROOT_DIR_PATHS.EXAMPLES_DIR; // "examples"
ROOT_DIR_PATHS.DASHBOARD_DIR; // "dashboard"
ROOT_DIR_PATHS.PUBLIC_DIR; // "public"
ROOT_DIR_PATHS.DEPLOY_DIR; // "deploy"
ROOT_DIR_PATHS.BENCH_DIR; // "bench"
ROOT_DIR_PATHS.COMMANDS_DIR; // "commands"
ROOT_DIR_PATHS.ROOT_DOCS_DIR; // "docs/root-docs"
ROOT_DIR_PATHS.ROOT_SCRIPTS_DIR; // "scripts/root-scripts"
```

**Usage**:
- Used throughout codebase for file and directory references
- Centralizes root directory structure paths
- Cross-referenced with `docs/root-docs/ROOT-DIRECTORY-ORGANIZATION.md` for organization guidelines

### Database Paths (Consolidated)

Database file paths consolidated from multiple sources:

```typescript
import { DATABASE_PATHS } from "./src/utils/rss-constants.js";

// Pipeline databases
DATABASE_PATHS.PIPELINE; // "data/pipeline.sqlite"
DATABASE_PATHS.PROPERTIES; // "data/properties.sqlite"
DATABASE_PATHS.RBAC; // "data/rbac.sqlite"
DATABASE_PATHS.FEATURES; // "data/features.sqlite"
DATABASE_PATHS.SOURCES; // "data/sources.sqlite"
DATABASE_PATHS.USAGE; // "data/usage.sqlite"

// Shadow Graph & Research databases
DATABASE_PATHS.RESEARCH; // "data/research.db"
DATABASE_PATHS.SHADOW_GRAPHS; // "data/shadow-market-graphs-weekly.db"

// Security & Configuration databases
DATABASE_PATHS.SECURITY; // "data/security.db"
DATABASE_PATHS.PROXY_CONFIG; // "data/proxy-config.db"

// Market & Arbitrage databases
DATABASE_PATHS.ORCA_ARBITRAGE; // "data/orca-arbitrage.sqlite"
DATABASE_PATHS.ORCA; // "data/orca.db"
DATABASE_PATHS.ORCA_SQLITE; // "data/orca.sqlite"
DATABASE_PATHS.MARKETS; // "data/markets.db"

// Ticks & Data databases
DATABASE_PATHS.TICKS; // "data/ticks.db"
DATABASE_PATHS.TICK_DATA; // "data/tick-data.sqlite"

// Cache databases
DATABASE_PATHS.CACHE; // "data/cache.db"
DATABASE_PATHS.API_CACHE; // "data/api-cache.db"
DATABASE_PATHS.BENCH_CACHE; // "data/bench-cache.db"
DATABASE_PATHS.BOOKMAKER_CACHE; // "data/bookmaker-cache.db"

// System databases
DATABASE_PATHS.AUDIT; // "data/audit.db"
DATABASE_PATHS.DEV_STATE; // "data/dev-state.db"
DATABASE_PATHS.MANIFESTS; // "data/manifests.db"
```

**Usage**:
- Consolidates database paths from `src/pipeline/constants.ts` and shadow graph system
- Used in database initialization and connection code
- Centralizes all database file paths in one location
- Cross-referenced with `docs/STORE-CONSTANTS-REGISTRIES-DATABASES.md` for database documentation

**Note**: Original `DATABASE_PATHS` in `src/pipeline/constants.ts` is maintained for backward compatibility. New code should use `DATABASE_PATHS` from `rss-constants.ts` for consistency.

### Team Page Paths

Local file paths for team documentation:

```typescript
import { RSS_TEAM_PATHS } from "./src/utils/rss-constants.js";

RSS_TEAM_PATHS.TEAM_MD; // ".github/TEAM.md"
RSS_TEAM_PATHS.TOPICS_MD; // ".github/TOPICS.md"
RSS_TEAM_PATHS.PR_REVIEW_MD; // ".github/pull_request_review.md"
```

### Apps Directory Paths

Application directory paths for workspace apps:

```typescript
import { RSS_APPS_PATHS } from "./src/utils/rss-constants.js";

RSS_APPS_PATHS.APPS_DIR; // "apps"
RSS_APPS_PATHS.DASHBOARD; // "apps/dashboard"
RSS_APPS_PATHS.DASHBOARD_SRC; // "apps/dashboard/src"
RSS_APPS_PATHS.DASHBOARD_CLIENT; // "apps/dashboard/src/client.ts"
RSS_APPS_PATHS.DASHBOARD_CONFIG; // "apps/dashboard/rspack.config.ts"
RSS_APPS_PATHS.DIST_DASHBOARD; // "dist/dashboard"
```

### Examples Directory Paths

Example file paths for demonstrations and tutorials:

```typescript
import { RSS_EXAMPLES_PATHS } from "./src/utils/rss-constants.js";

RSS_EXAMPLES_PATHS.EXAMPLES_DIR; // "examples"
RSS_EXAMPLES_PATHS.DEVWORKSPACE_INTERACTIVE; // "examples/devworkspace-interactive.ts"
RSS_EXAMPLES_PATHS.DEVWORKSPACE_QUICKSTART; // "examples/devworkspace-quickstart.md"
```

### Commands Directory Paths

CLI commands documentation directory paths:

```typescript
import { RSS_COMMANDS_PATHS } from "./src/utils/rss-constants.js";

RSS_COMMANDS_PATHS.COMMANDS_DIR; // "commands"
RSS_COMMANDS_PATHS.README; // "commands/README.md"
RSS_COMMANDS_PATHS.QUICK_REFERENCE; // "commands/QUICK-REFERENCE.md"
RSS_COMMANDS_PATHS.COMPLETE; // "commands/COMPLETE.md"
RSS_COMMANDS_PATHS.VERSIONING; // "commands/VERSIONING.md"
RSS_COMMANDS_PATHS.VERSION_INDEX; // "commands/VERSION-INDEX.md"
RSS_COMMANDS_PATHS.TELEGRAM; // "commands/telegram.md"
RSS_COMMANDS_PATHS.MCP; // "commands/mcp.md"
RSS_COMMANDS_PATHS.DASHBOARD; // "commands/dashboard.md"
RSS_COMMANDS_PATHS.FETCH; // "commands/fetch.md"
RSS_COMMANDS_PATHS.SECURITY; // "commands/security.md"
RSS_COMMANDS_PATHS.MANAGEMENT; // "commands/management.md"
RSS_COMMANDS_PATHS.GITHUB; // "commands/github.md"
RSS_COMMANDS_PATHS.PASSWORD; // "commands/password.md"
RSS_COMMANDS_PATHS.AUDIT; // "commands/audit.md"
```

### Docs API Directory Paths

API documentation directory paths:

```typescript
import { RSS_DOCS_API_PATHS } from "./src/utils/rss-constants.js";

RSS_DOCS_API_PATHS.DOCS_API_DIR; // "docs/api"
RSS_DOCS_API_PATHS.MCP_SERVER; // "docs/api/MCP-SERVER.md"
RSS_DOCS_API_PATHS.MCP_SECRETS_INTEGRATION; // "docs/MCP-SECRETS-INTEGRATION.md"
RSS_DOCS_API_PATHS.COMPONENT_SITEMAP; // "docs/api/COMPONENT-SITEMAP.md"
RSS_DOCS_API_PATHS.NODE_SITEMAP; // "docs/api/NODE-SITEMAP.md"
RSS_DOCS_API_PATHS.METADATA_DOCUMENTATION_MAPPING; // "docs/api/METADATA-DOCUMENTATION-MAPPING.md"
RSS_DOCS_API_PATHS.ORCA_ARBITRAGE_INTEGRATION; // "docs/api/ORCA-ARBITRAGE-INTEGRATION.md"
RSS_DOCS_API_PATHS.ORCA_ARBITRAGE_REVIEW; // "docs/api/ORCA-ARBITRAGE-REVIEW.md"
RSS_DOCS_API_PATHS.PR_BINARY_DATA_DOCS; // "docs/api/PR-BINARY-DATA-DOCS.md"
```

### Bun Version File Paths

Bun version file paths and configuration:

```typescript
import { RSS_BUN_VERSION_PATHS } from "./src/utils/rss-constants.js";

RSS_BUN_VERSION_PATHS.BUN_VERSION_FILE; // ".bun-version"
RSS_BUN_VERSION_PATHS.PACKAGE_JSON; // "package.json"
RSS_BUN_VERSION_PATHS.BUNFIG_TOML; // "bunfig.toml"
RSS_BUN_VERSION_PATHS.BUNFIG_CONFIG; // "config/bunfig.toml"
```

**Usage**:
- `.bun-version` file is checked first by `getCurrentBunVersion()` for version manager compatibility (bvm/asdf)
- Falls back to `Bun.version` runtime if file doesn't exist
- Used by workspace API endpoints to report Bun version information
- `bunfig.toml` (root) and `config/bunfig.toml` are checked in priority order for workspace configuration
- Used by workspace API to read linker settings, scoped registries, and security scanner configuration

### Benchmark Directory Paths

Benchmark directory paths and test files:

```typescript
import { RSS_BENCHMARK_PATHS } from "./src/utils/rss-constants.js";

RSS_BENCHMARK_PATHS.BENCHMARKS_DIR; // "benchmarks"
RSS_BENCHMARK_PATHS.BENCHMARKS_METADATA_DIR; // "benchmarks/metadata"
RSS_BENCHMARK_PATHS.TEST_BENCHMARK_REGISTRY; // "test-benchmark-registry.ts"
RSS_BENCHMARK_PATHS.MARKET_ANALYSIS_BASELINE; // "benchmarks/market-analysis-baseline.ts"
RSS_BENCHMARK_PATHS.STRESS_TEST_1M_NODES; // "benchmarks/stress-test-large-graph.ts"
RSS_BENCHMARK_PATHS.LAYER4_CORRELATION_BASELINE; // "benchmarks/metadata/layer4-correlation-baseline.json"
```

**Usage**:
- Benchmark paths are centralized in `BENCHMARK_REGISTRY` (see `src/api/registry.ts`)
- `BENCHMARKS_METADATA_DIR` is used in `src/api/registry.ts` for counting benchmark metadata files
- `LAYER4_CORRELATION_BASELINE` is used in the Layer4 correlation detection baseline registry entry
- Test file validates registry structure and uses constants for path validation
- Used by Performance & Caching Department for benchmark management

### Dashboard Directory Paths

Dashboard HTML file paths:

```typescript
import { RSS_DASHBOARD_PATHS } from "./src/utils/rss-constants.js";

RSS_DASHBOARD_PATHS.DASHBOARD_DIR; // "dashboard"
RSS_DASHBOARD_PATHS.INDEX; // "dashboard/index.html"
RSS_DASHBOARD_PATHS.NEXUS_REGISTRY; // "dashboard/17.14.0-nexus-dashboard.html"
RSS_DASHBOARD_PATHS.REGISTRY_BROWSER; // "dashboard/registry.html"
RSS_DASHBOARD_PATHS.WORKSPACE; // "dashboard/workspace.html"
RSS_DASHBOARD_PATHS.EXAMPLES; // "dashboard/examples.html"
RSS_DASHBOARD_PATHS.CORRELATION_GRAPH; // "dashboard/correlation-graph.html"
RSS_DASHBOARD_PATHS.MULTI_LAYER_GRAPH; // "dashboard/multi-layer-graph.html"
RSS_DASHBOARD_PATHS.MLGS_DEVELOPER; // "dashboard/mlgs-developer-dashboard.html"
```

**Usage**:
- Dashboard paths are centralized for consistent references
- Used by Dashboard & UI Department for dashboard management
- Referenced in documentation and navigation guides
- `dashboard/17.14.0-nexus-dashboard.html` integrates MCP tools and CLI commands registries
  - Fetches from `RSS_API_PATHS.REGISTRY_MCP_TOOLS` and `RSS_API_PATHS.REGISTRY_CLI_COMMANDS`
  - Displays live tool/command counts, categories, descriptions, and documentation links
  - Includes navigation links to `commands/mcp.md` and `commands/README.md`

## Team & API Credentials Integration

The team-departments registry (`GET /api/registry/team-departments`) integrates:

1. **Team Structure** from `.github/TEAM.md`:
   - Department names, leads, colors
   - Responsibilities and key areas
   - Review focus areas

2. **API Credentials** from workspace system:
   - Team members with active API keys
   - Key expiration and usage stats
   - Purpose (onboarding/interview/trial)

**Example Response:**

```json
{
  "departments": [
    {
      "id": "api-routes",
      "name": "API & Routes Department",
      "lead": "API Team Lead",
      "color": "#00d4ff",
      "members": [
        {
          "email": "api.team.lead@nexus.trading",
          "role": "lead",
          "hasApiKey": true,
          "apiKeyInfo": {
            "keyId": "key_1234567890_abc123",
            "purpose": "onboarding",
            "active": true,
            "expiresAt": 1735689600000,
            "requestCount": 42
          }
        }
      ]
    }
  ],
  "total": 8,
  "withApiKeys": 5,
  "withoutApiKeys": 3
}
```
