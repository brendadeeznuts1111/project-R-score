/**
 * @fileoverview API Documentation for Trader Analyzer
 * @module [API][DOCS][OpenAPI]{version:3.0.3}
 * @description OpenAPI 3.0 specification with comprehensive endpoint documentation
 * @version 2.0.0
 * @author Trader Analyzer Team
 * @license MIT
 *
 * @example
 * // Access documentation (port from $PORT env var)
 * open http://localhost:$PORT/docs
 *
 * @example
 * // Get OpenAPI JSON spec
 * curl http://localhost:$PORT/docs/openapi.json
 *
 * @see {@link https://swagger.io/specification/|OpenAPI 3.0 Spec}
 * @see {@link https://bun.com/reference|Bun Reference}
 */

import { Hono } from "hono"
import { html } from "../utils/html-tag-polyfill"
import { ERROR_REGISTRY, type ErrorCategory } from "../errors"
import { getTimezoneConfigForHeaders, getTimezoneInfo } from "../utils/time-format"

// Port configuration from environment
const API_PORT = process.env.PORT || "3001"
const WS_PORT = process.env.WS_PORT || "3002"

const docs = new Hono()

/**
 * Tag metadata with structured identifiers
 * Format: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]
 *
 * @typedef {Object} TagDefinition
 * @property {string} name - Tag identifier
 * @property {string} description - Human-readable description
 * @property {Object} externalDocs - External documentation reference
 */
const tagDefinitions = [
  {
    name: "Health",
    description: "[CORE][SYSTEM][STATUS]{uptime,version}[HealthController][#REF:routes.ts:15]",
    externalDocs: {
      description: "Health check patterns",
      url: "https://microservices.io/patterns/observability/health-check-api.html",
    },
    "x-tag-metadata": {
      domain: "CORE",
      scope: "SYSTEM",
      type: "STATUS",
      category: "observability",
      priority: "high",
      version: "1.0.0",
    },
  },
  {
    name: "Streams",
    description: "[CORE][DATA][IMPORT]{file,api,sync}[StreamController][#REF:routes.ts:30-120]",
    externalDocs: {
      description: "Data stream management",
      url: "https://bun.com/reference",
    },
  },
  {
    name: "Trades",
    description: "[CORE][DATA][QUERY]{pagination,filter}[TradeController][#REF:routes.ts:150]",
  },
  {
    name: "Analytics",
    description:
      "[CORE][COMPUTE][STATS]{metrics,profile,sessions}[AnalyticsController][#REF:analytics/]",
  },
  {
    name: "Polymarket",
    description:
      "[PREDICTION][EXTERNAL][POLYGON]{markets,trades}[PolymarketController][#REF:polymarket/]",
    externalDocs: {
      description: "Polymarket API",
      url: "https://docs.polymarket.com/",
    },
  },
  {
    name: "Kalshi",
    description: "[PREDICTION][EXTERNAL][REGULATED]{markets,auth}[KalshiController][#REF:kalshi/]",
    externalDocs: {
      description: "Kalshi API",
      url: "https://trading-api.readme.io/",
    },
  },
  {
    name: "Market Making",
    description:
      "[TRADING][COMPUTE][MM]{maker,taker,inventory}[MMController][#REF:analytics/mm.ts]",
  },
  {
    name: "ORCA",
    description:
      "[SPORTS][NORMALIZE][UUIDv5]{teams,leagues,markets}[OrcaNormalizer][#REF:orca/normalizer.ts]",
    externalDocs: {
      description: "ORCA Architecture",
      url: "https://github.com/anthropics/orca-sports",
    },
  },
  {
    name: "MCP",
    description: "[MCP][SERVER][TOOLS]{model-context-protocol}[MCPServer][#REF:mcp/server.ts]",
    externalDocs: {
      description: "Model Context Protocol",
      url: "https://modelcontextprotocol.io/",
    },
  },
  {
    name: "Secrets",
    description: "[SECURITY][SECRETS][BUN]{api-keys,cookies}[BunSecrets][#REF:secrets/mcp.ts]",
    externalDocs: {
      description: "Bun.secrets API",
      url: "https://bun.sh/docs/runtime/bun-apis",
    },
  },
  {
    name: "Mini App",
    description:
      "[INTEGRATION][MINIAPP][FACTORY-WAGER]{status,health,deployment}[NativeMiniappMonitor][#REF:utils/miniapp-native.ts]",
    externalDocs: {
      description: "Factory Wager Mini App",
      url: "https://staging.factory-wager-miniapp.pages.dev",
    },
  },
  {
    name: "ORCA Streaming",
    description:
      "[SPORTS][REALTIME][WEBSOCKET]{odds,events}[OrcaStreamServer][#REF:orca/streaming.ts]",
    externalDocs: {
      description: "Bun WebSocket",
      url: "https://bun.com/reference",
    },
  },
  {
    name: "ORCA Storage",
    description:
      "[SPORTS][PERSIST][SQLITE]{aliases,odds,history}[OrcaStorage][#REF:orca/storage.ts]",
    externalDocs: {
      description: "bun:sqlite",
      url: "https://bun.com/reference",
    },
  },
  {
    name: "Debug",
    description: "[DEV][RUNTIME][BUN:1.3]{memory,cpu,heap}[DebugController][#REF:routes.ts:850]",
    externalDocs: {
      description: "Bun 1.3.2 Features",
      url: "https://bun.com/blog/bun-v1.3.2",
    },
  },
  {
    name: "Registry",
    description:
      "[REGISTRY][SYSTEM][UNIFIED]{properties,sources,tools,errors}[RegistryController][#REF:api/registry.ts]",
    externalDocs: {
      description: "Registry System Documentation",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/REGISTRY-SYSTEM.md",
    },
  },
  {
    name: "Market Graph",
    description:
      "[MARKET][GRAPH][SHADOW]{nodes,links,propagation,dark-pool}[ShadowGraphBuilder][#REF:arbitrage/shadow-graph/]",
    externalDocs: {
      description: "Shadow Graph System",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/SHADOW-GRAPH-SYSTEM.md",
    },
  },
  {
    name: "Covert Steam",
    description:
      "[COVERT-STEAM][DETECTION][EVENTS]{severity,propagation}[CovertSteamEventDetector][#REF:arbitrage/shadow-graph/covert-steam-detector.ts]",
    externalDocs: {
      description: "Covert Steam Detection",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/SHADOW-GRAPH-SYSTEM.md",
    },
  },
  {
    name: "Circuit Breaker",
    description:
      "[CIRCUIT-BREAKER][PRODUCTION][RESILIENCE]{tripped,reset,monitoring}[ProductionCircuitBreaker][#REF:utils/production-circuit-breaker.ts]",
    externalDocs: {
      description: "Production Circuit Breaker",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/12.0.0.0.0.0.0-PRODUCTION-CIRCUIT-BREAKER-SUBSYSTEM.md",
    },
  },
  {
    name: "Logging",
    description:
      "[LOGGING][CONTROL][OPERATIONAL]{log-codes,levels,dynamic}[LoggingSystem][#REF:logging/index.ts]",
    externalDocs: {
      description: "Centralized Logging",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/16.0.0.0.0.0.0-CENTRALIZED-LOGGING.md",
    },
  },
  {
    name: "Radiance WebSocket",
    description:
      "[RADIANCE][REALTIME][WEBSOCKET]{pub-sub,compression,identity}[RadiancePubSubServer][#REF:17.13.0.0.0.0.0-compression/]",
    externalDocs: {
      description: "Hyper-Bun Radiance Pub-Sub",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/src/17.0.0.0.0.0.0-dashboard/17.5.0.0.0.0.0-README.md",
    },
    "x-tag-metadata": {
      domain: "RADIANCE",
      scope: "REALTIME",
      type: "WEBSOCKET",
      category: "realtime",
      priority: "high",
      version: "17.13.0.0.0.0.0",
      features: ["pub-sub", "compression", "per-socket-identity", "multi-channel"],
      compression: "perMessageDeflate (RFC 7692)",
      bandwidthReduction: "68-74%",
    },
  },
  {
    name: "Terminal Environment",
    description:
      "[DEV][TERMINAL][MLGS]{tmux,bun-console,ripgrep-discovery}[TerminalEnvironment][#REF:docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md]",
    externalDocs: {
      description: "Terminal Environment Configuration",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md",
    },
    "x-tag-metadata": {
      domain: "DEV",
      scope: "TERMINAL",
      type: "MLGS",
      category: "development",
      priority: "medium",
      version: "11.0.0.0.0.0.0",
      features: [
        "tmux-sessions",
        "bun-console",
        "ripgrep-discovery",
        "module-specific-sessions",
        "color-integration",
      ],
      tools: ["tmux", "bun", "ripgrep"],
    },
  },
  {
    name: "Discovery",
    description:
      "[CORE][DISCOVERY][FEEDS]{rss,sitemap,api-discovery}[DiscoveryController][#REF:routes.ts:654-1689]",
    externalDocs: {
      description: "RSS 2.0 Specification",
      url: "https://www.rssboard.org/rss-specification",
    },
    "x-tag-metadata": {
      domain: "CORE",
      scope: "DISCOVERY",
      type: "FEEDS",
      category: "discovery",
      priority: "medium",
      version: "1.0.0",
    },
  },
  {
    name: "Changelog",
    description:
      "[CORE][VERSIONING][CHANGELOG]{git-commits,structured-data}[ChangelogController][#REF:routes.ts:1303-1683]",
    "x-tag-metadata": {
      domain: "CORE",
      scope: "VERSIONING",
      type: "CHANGELOG",
      category: "versioning",
      priority: "low",
      version: "1.0.0",
    },
  },
  {
    name: "Examples",
    description:
      "[DEV][DOCUMENTATION][EXAMPLES]{code-samples,bun-apis}[ExamplesController][#REF:routes.ts:1690-1785]",
    "x-tag-metadata": {
      domain: "DEV",
      scope: "DOCUMENTATION",
      type: "EXAMPLES",
      category: "documentation",
      priority: "low",
      version: "1.0.0",
    },
  },
  {
    name: "Security",
    description:
      "[SECURITY][MONITORING][THREATS]{threats,incidents,compliance}[SecurityController][#REF:routes.ts:1786-1936]",
    externalDocs: {
      description: "Security Monitoring",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/16.0.0.0.0.0.0-CENTRALIZED-LOGGING.md",
    },
    "x-tag-metadata": {
      domain: "SECURITY",
      scope: "MONITORING",
      type: "THREATS",
      category: "security",
      priority: "high",
      version: "1.0.0",
    },
  },
  {
    name: "Shadow Graph",
    description:
      "[ANALYTICS][SHADOW-GRAPH][MARKET-ANALYSIS]{dark-pool,liquidity,deceptive-lines}[ShadowGraphController][#REF:routes.ts:2287-2593]",
    externalDocs: {
      description: "Shadow Graph System",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/SHADOW-GRAPH-SYSTEM.md",
    },
    "x-tag-metadata": {
      domain: "ANALYTICS",
      scope: "SHADOW-GRAPH",
      type: "MARKET-ANALYSIS",
      category: "analytics",
      priority: "high",
      version: "1.0.0",
    },
  },
]

/**
 * OpenAPI 3.0 Specification
 * @type {Object}
 *
 * @description
 * Complete API documentation with:
 * - Structured tag system: [DOMAIN][SCOPE][TYPE][META][CLASS][#REF]
 * - JSDoc-style descriptions
 * - Bun native API references
 * - Code file references
 * - Request/response examples
 *
 * @example
 * // Tag format explained:
 * // [DOMAIN] - Functional area (CORE, SPORTS, PREDICTION, DEV)
 * // [SCOPE]  - Operation scope (DATA, COMPUTE, EXTERNAL, REALTIME)
 * // [TYPE]   - Action type (QUERY, IMPORT, NORMALIZE, PERSIST)
 * // {META}   - Properties/features
 * // [CLASS]  - Controller/Service class
 * // [#REF]   - Source code reference
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Trader Analyzer API",
    description: `
# Multi-Source Trading Analytics Platform

**Runtime**: Bun ${typeof Bun !== "undefined" ? Bun.version : "1.3.x"} | **Framework**: Hono | **Database**: bun:sqlite

## Timezone Configuration

**Status**: 🟡 **REQUIRED FOR PRODUCTION** | DoD Compliance Implementation

**Constants**: [\`$TZ\`][\`Etc/UTC\`][\`setSystemTime\`]

### System Configuration
- **System Timezone**: \`PST\` (Las Vegas data center - primary)
- **Storage Format**: UTC Unix milliseconds (immutable - regulatory requirement)
- **Default Timezone**: \`Etc/UTC\` (used by \`bun test\`)
- **Environment Variable**: \`TZ\` (override with \`TZ=America/Los_Angeles bun test\`)
- **setSystemTime**: Available in test context (\`bun:test\`)
- **Current Timezone**: ${(() => {
      try {
        const tz = getTimezoneInfo()
        return `${tz.name} (${tz.offsetString})`
      } catch {
        return "System default"
      }
    })()}

### Supported Timezones
The system supports the following timezones for sports betting jurisdictions:
- **UTC** (0): Universal Coordinated Time
- **EST/EDT** (-5/-4): Eastern Time (NYC)
- **PST/PDT** (-8/-7): Pacific Time (Vegas) - Default
- **GMT/BST** (0/+1): Greenwich Mean Time / British Summer Time (London)
- **CET/CEST** (+1/+2): Central European Time
- **AEST** (+10): Australian Eastern Standard Time

### API Response Headers
All API responses include timezone headers:
- \`X-Timezone\`: Current timezone name
- \`X-Timezone-Offset\`: UTC offset (e.g., "UTC-08:00")
- \`X-Timezone-Env-Var\`: Environment variable name ("TZ")
- \`X-Timezone-Default\`: Default timezone ("Etc/UTC")

### Regulatory Compliance
All timestamps must be timezone-aware for regulatory compliance:
- **Nevada Gaming Commission Regulation 5.225**: All gaming transactions timestamped with UTC offset
- **UK Gambling Commission RTS 7**: Timestamps traceable to UTC
- **MGA Technical Requirement 3.2**: Audit logs include timezone information

### Event ID Format
Events should follow format: \`SPORT-YYYYMMDD-HHMM-TZ\`
- Example: \`NFL-20241207-1345-PST\` (NFL game Dec 7, 2024 at 1:45 PM PST)

### DST Handling
- **Auto-adjusting**: System automatically handles Daylight Saving Time transitions
- **Transition Table**: Pre-populated DST transitions for 2024-2026
- **Detection**: Timezone transitions logged with code \`HBTS-001\`

See: 
- [Bun Test Time Documentation](https://bun.com/docs/test/time)
- [Timezone Configuration Guide](./docs/operators/timezone-guide.md)
- [Core Timezone Service](./src/core/timezone.ts)

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     Trader Analyzer API                      │
├─────────────────────────────────────────────────────────────┤
│  [CORE]           │  [SPORTS/ORCA]    │  [PREDICTION]        │
│  ├─ Streams       │  ├─ Normalizer    │  ├─ Polymarket       │
│  ├─ Trades        │  ├─ Streaming     │  ├─ Kalshi           │
│  ├─ Analytics     │  └─ Storage       │  └─ Stats            │
│  └─ Sessions      │                   │                      │
├─────────────────────────────────────────────────────────────┤
│  [REGISTRY]       │  [SECURITY]       │  [INTEGRATION]       │
│  ├─ 16 Registries │  ├─ Threats       │  ├─ Errors           │
│  ├─ Properties    │  ├─ Profiles      │  ├─ Teams            │
│  ├─ Tools         │  └─ Monitoring    │  ├─ Topics            │
│  └─ Patterns      │                   │  └─ Mini App          │
├─────────────────────────────────────────────────────────────┤
│  [TERMINAL]       │  [RADIANCE]      │  [COMPRESSION]      │
│  ├─ Tmux Sessions │  ├─ Pub-Sub      │  ├─ perMessageDeflate│
│  ├─ Bun Console   │  ├─ Identity     │  └─ RFC 7692        │
│  └─ Ripgrep       │  └─ Channels     │                      │
├─────────────────────────────────────────────────────────────┤
│  Bun Native APIs: bun:sqlite, Bun.serve, ServerWebSocket    │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Registry System

**16 Unified Registries** organized by category:
- **Data** (3): properties, data-sources, sharp-books
- **Tooling** (3): mcp-tools, css-bundler, bun-apis
- **Security** (2): bookmaker-profiles, security-threats
- **Research** (2): url-anomaly-patterns, tension-patterns
- **Integration** (5): errors, team-departments, topics, api-examples, mini-app
- **CLI** (1): cli-commands

**Endpoints**: \`GET /api/registry\`, \`GET /api/registry/{registryId}\`, \`GET /api/registry/category/{category}\`

See: [Registry System Documentation](./docs/REGISTRY-SYSTEM.md)

## Data Sources

| Domain | Sources | Status |
|--------|---------|--------|
| **Crypto** | BitMEX, Binance, Bybit, OKX | via CCXT |
| **Prediction** | Polymarket, Kalshi | REST API |
| **Sports** | DraftKings, FanDuel, Pinnacle, Betfair | ORCA Normalized |
| **Files** | CSV, JSON | Local Import |

## ORCA Module

Sports betting market normalization using **UUIDv5-based deterministic IDs**:

\`\`\`typescript
// Same game from different books → same UUID
const dk = normalize({ bookmaker: 'draftkings', homeTeam: 'LA Lakers', ... });
const pin = normalize({ bookmaker: 'pinnacle', homeTeam: 'Los Angeles Lakers', ... });
dk.event.id === pin.event.id  // true ✓
\`\`\`

**Supported Books**: US (DraftKings, FanDuel, BetMGM), Sharp (Pinnacle, Circa), Exchanges (Betfair, Smarkets)

## Bun Native Features

| Feature | API | Usage |
|---------|-----|-------|
| SQLite | \`bun:sqlite\` | Alias registry, odds history |
| WebSocket | \`Bun.serve\` | Real-time odds streaming |
| File I/O | \`Bun.file\` | CSV/JSON import |
| Memory | \`process.memoryUsage()\` | Debug endpoint |
| CPU Profile | \`bun --cpu-prof\` | Performance analysis |

## Terminal Environment (11.0.0.0.0.0.0)

**MLGS Terminal Environment** - Optimized development workflow with tmux and Bun console:

- **Tmux Sessions**: Pre-configured sessions for Core, Analytics, Research, Monitoring
- **Bun Console**: Interactive console with preloaded MLGS context (shadow graph, steam detector, arbitrage)
- **Ripgrep Discovery**: Version numbers (\`11.x.x.x.x.x.x\`) enable instant cross-file discovery
- **Color Integration**: Unified tmux ↔ dashboard color schemes

**Quick Start:**
\`\`\`bash
bun run tmux:setup    # One-time setup
bun run tmux:start    # Start development environment
bun run console       # Start Bun console with MLGS context
\`\`\`

**Module Sessions:**
- \`mlgs-core\`: Main development (dev server, tests, type checking)
- \`mlgs-analytics\`: Dashboard, correlation engine, performance monitoring
- \`mlgs-research\`: Research console, scripts, data analysis
- \`mlgs-monitoring\`: Logs, chaos tests, health checks

**Ripgrep Discovery:**
Version numbers (\`11.x.x.x.x.x.x\`) enable instant discovery across TypeScript, Shell, Markdown, Config, and Tests.

See: [Terminal Environment Documentation](./docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md)

## Development Tools

**CLI Commands** (via \`bun run\`):
- \`tmux:setup\` - Setup terminal environment (one-time)
- \`tmux:start\` - Start tmux development session
- \`console\` - Start Bun console with MLGS context
- \`dev\` - Start API server with hot-reload
- \`dashboard\` - Start live trading dashboard
- \`fetch\` - Trading data import CLI
- \`security\` - Security testing CLI

**Package Scripts**: See \`package.json\` for complete list of available commands.
    `.trim(),
    version: "2.0.0",
    contact: {
      name: "Trader Analyzer Team",
      url: "https://github.com/trader-analyzer",
      email: "support@trader-analyzer.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    "x-logo": {
      url: "https://bun.com/logo.svg",
      altText: "Bun Runtime",
    },
    "x-api-version": "2.0.0",
    "x-runtime": `Bun ${typeof Bun !== "undefined" ? Bun.version : "1.3.x"}`,
    "x-framework": "Hono",
    "x-database": "bun:sqlite",
    "x-timezone": (() => {
      try {
        const tz = getTimezoneInfo()
        return `${tz.name} (${tz.offsetString})`
      } catch {
        return "Etc/UTC"
      }
    })(),
  },
  externalDocs: [
    {
      description: "Bun Reference",
      url: "https://bun.com/reference",
    },
    {
      description: "Hyper-Bun Radiance Dashboard",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/src/17.0.0.0.0.0.0-dashboard/17.5.0.0.0.0.0-README.md",
    },
    {
      description: "Registry System Documentation",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/REGISTRY-SYSTEM.md",
    },
    {
      description: "Model Context Protocol",
      url: "https://modelcontextprotocol.io/",
    },
    {
      description: "Terminal Environment Configuration",
      url: "https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md",
    },
  ],
  servers: [
    {
      url: `http://localhost:${API_PORT}/api`,
      description: "Local development server",
      variables: {
        port: {
          default: API_PORT,
          description: "API server port (from $PORT env)",
        },
      },
    },
    {
      url: `http://localhost:${WS_PORT}`,
      description: "ORCA WebSocket streaming server",
    },
    {
      url: `ws://localhost:8080`,
      description: "Radiance WebSocket Pub-Sub Server (17.13.0.0.0.0.0)",
    },
  ],
  tags: tagDefinitions,
  paths: {
    // ============ Health ============
    "/health": {
      get: {
        operationId: "getHealth",
        tags: ["Health"],
        summary: "Service health check with Bun server metrics",
        description: `
**[CORE][SYSTEM][STATUS]{uptime,version,metrics}[#REF:routes.ts:101]**

Returns service health status, runtime information, and Bun server metrics.

**Bun Server Metrics:**
- \`pendingRequests\` - Active HTTP requests
- \`pendingWebSockets\` - Active WebSocket connections
- \`subscribers\` - WebSocket subscribers per topic

\`\`\`typescript
// @see src/api/routes.ts:101
api.get('/health', async (c) => {
  const { getBunServerMetrics } = await import("../observability/metrics");
  const { getServer } = await import("../index");
  const server = getServer();
  const metrics = getBunServerMetrics(server);
  
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    metrics: {
      pendingRequests: metrics.pendingRequests,
      pendingWebSockets: metrics.pendingWebSockets,
      subscribers: metrics.subscribers,
    },
  });
});
\`\`\`

**See Also:**
- [Bun Server Metrics Documentation](https://bun.sh/docs/api/http-server#metrics)
- \`GET /metrics\` - Prometheus-formatted metrics endpoint
        `.trim(),
        responses: {
          200: {
            description: "Service is healthy",
            headers: {
              "X-Timezone": {
                $ref: "#/components/headers/Timezone",
              },
              "X-Timezone-Offset": {
                $ref: "#/components/headers/TimezoneOffset",
              },
              "X-Timezone-Env-Var": {
                $ref: "#/components/headers/TimezoneEnvVar",
              },
              "X-Timezone-Default": {
                $ref: "#/components/headers/TimezoneDefault",
              },
              "X-Git-Commit": {
                $ref: "#/components/headers/GitCommit",
              },
              "X-Git-Branch": {
                $ref: "#/components/headers/GitBranch",
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["ok", "degraded", "error"],
                      example: "ok",
                    },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                      example: "2025-01-15T12:00:00.000Z",
                    },
                    metrics: {
                      type: "object",
                      properties: {
                        pendingRequests: {
                          type: "number",
                          description: "Active HTTP requests",
                          example: 5,
                        },
                        pendingWebSockets: {
                          type: "number",
                          description: "Active WebSocket connections",
                          example: 2,
                        },
                        subscribers: {
                          type: "object",
                          description: "WebSocket subscribers per topic",
                          additionalProperties: {
                            type: "number",
                          },
                          example: {
                            chat: 10,
                            telegram: 5,
                          },
                        },
                      },
                      required: ["pendingRequests", "pendingWebSockets", "subscribers"],
                    },
                  },
                  required: ["status", "timestamp", "metrics"],
                },
                example: {
                  status: "ok",
                  timestamp: "2025-01-15T12:00:00.000Z",
                  metrics: {
                    pendingRequests: 5,
                    pendingWebSockets: 2,
                    subscribers: {
                      chat: 10,
                      telegram: 5,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Metrics ============
    "/metrics": {
      get: {
        operationId: "getMetrics",
        tags: ["Health", "Observability"],
        summary: "Prometheus metrics endpoint",
        description: `
**[OBSERVABILITY][METRICS][PROMETHEUS][#REF:routes.ts:96]**

Returns Prometheus-formatted metrics including:
- Custom application metrics (counters, histograms)
- Bun server metrics (\`bun_server_pending_requests\`, \`bun_server_pending_websockets\`, \`bun_server_subscribers\`)

\`\`\`typescript
// @see src/api/routes.ts:96
api.get('/metrics', async (c) => {
  const { getMetrics } = await import("../observability/metrics");
  const { getServer } = await import("../index");
  const server = getServer();
  const metrics = await getMetrics(server);
  return new Response(metrics, {
    headers: { "Content-Type": "text/plain" },
  });
});
\`\`\`

**Bun Server Metrics:**
- \`bun_server_pending_requests\` (gauge) - Active HTTP requests
- \`bun_server_pending_websockets\` (gauge) - Active WebSocket connections
- \`bun_server_subscribers{topic="..."}\` (gauge) - WebSocket subscribers per topic

**See Also:**
- [Bun Server Metrics Documentation](https://bun.sh/docs/api/http-server#metrics)
- \`GET /health\` - JSON health check with metrics
        `.trim(),
        responses: {
          200: {
            description: "Prometheus-formatted metrics",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  format: "text",
                },
                example: `# HELP bun_server_pending_requests Active HTTP requests
# TYPE bun_server_pending_requests gauge
bun_server_pending_requests 5

# HELP bun_server_pending_websockets Active WebSocket connections
# TYPE bun_server_pending_websockets gauge
bun_server_pending_websockets 2

# HELP bun_server_subscribers WebSocket subscribers per topic
# TYPE bun_server_subscribers gauge
bun_server_subscribers{topic="chat"} 10`,
              },
            },
          },
        },
      },
    },

    // ============ MCP Secrets Management ============
    "/api/mcp/secrets": {
      get: {
        operationId: "getMCPSecretsStatus",
        tags: ["MCP", "Secrets"],
        summary: "Get MCP secrets status",
        description: `
**[MCP][SECRETS][STATUS]{api-keys,sessions}[#REF:routes.ts:api/mcp/secrets]**

Returns status of all MCP server secrets (API keys and session cookies).
All secrets are stored securely using Bun.secrets (OS keychain).

\`\`\`typescript
// Get all MCP secrets status
const response = await fetch('/api/mcp/secrets');
const data = await response.json();
// { servers: [...], totalConfigured: 2, totalServers: 5 }
\`\`\`

**See Also:**
- [Bun.secrets API](https://bun.sh/docs/runtime/bun-apis)
- [MCP Secrets Integration](./docs/MCP-SECRETS-INTEGRATION.md)
        `.trim(),
        responses: {
          200: {
            description: "Secrets status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    servers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", example: "bun" },
                          hasApiKey: { type: "boolean", example: true },
                          hasCookies: { type: "boolean", example: false },
                          configured: { type: "boolean", example: true },
                        },
                      },
                    },
                    totalConfigured: { type: "number", example: 2 },
                    totalServers: { type: "number", example: 5 },
                  },
                },
                example: {
                  servers: [
                    {
                      name: "bun",
                      hasApiKey: true,
                      hasCookies: false,
                      configured: true,
                    },
                    {
                      name: "nexus",
                      hasApiKey: false,
                      hasCookies: true,
                      configured: true,
                    },
                  ],
                  totalConfigured: 2,
                  totalServers: 5,
                },
              },
            },
          },
        },
      },
    },
    "/api/mcp/secrets/{server}": {
      get: {
        operationId: "getMCPSecret",
        tags: ["MCP", "Secrets"],
        summary: "Get MCP server secret status",
        description: `
**[MCP][SECRETS][GET]{api-key,cookies}[#REF:routes.ts:api/mcp/secrets/:server]**

Get secret status for a specific MCP server. API key is masked for security.

\`\`\`typescript
// Get secret status (masked)
const response = await fetch('/api/mcp/secrets/bun');
const data = await response.json();
// { server: "bun", hasApiKey: true, apiKeyMasked: "sk-****...1234", ... }
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "server",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MCP server name (e.g., 'bun', 'nexus')",
          },
        ],
        responses: {
          200: {
            description: "Secret status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    server: { type: "string" },
                    hasApiKey: { type: "boolean" },
                    apiKeyMasked: { type: "string", nullable: true },
                    apiKeyLength: { type: "number" },
                    hasCookies: { type: "boolean" },
                    cookieCount: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/mcp/secrets/{server}/api-key": {
      post: {
        operationId: "setMCPApiKey",
        tags: ["MCP", "Secrets"],
        summary: "Store MCP server API key",
        description: `
**[MCP][SECRETS][SET]{api-key}[#REF:routes.ts:api/mcp/secrets/:server/api-key]**

Store API key for an MCP server securely using Bun.secrets.

\`\`\`typescript
// Store API key
const response = await fetch('/api/mcp/secrets/bun/api-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'sk-abc123...' })
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "server",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  apiKey: { type: "string", description: "API key to store" },
                },
                required: ["apiKey"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "API key stored",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    server: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid API key format" },
        },
      },
      delete: {
        operationId: "deleteMCPApiKey",
        tags: ["MCP", "Secrets"],
        summary: "Delete MCP server API key",
        description: "Delete API key for an MCP server from Bun.secrets.",
        parameters: [
          {
            name: "server",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "API key deleted" },
        },
      },
    },
    "/api/mcp/secrets/{server}/cookies": {
      post: {
        operationId: "setMCPCookies",
        tags: ["MCP", "Secrets"],
        summary: "Store MCP server session cookies",
        description: `
**[MCP][SECRETS][SET]{cookies}[#REF:routes.ts:api/mcp/secrets/:server/cookies]**

Store session cookies for an MCP server securely using Bun.secrets.

\`\`\`typescript
// Store cookies
const response = await fetch('/api/mcp/secrets/bun/cookies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cookieString: 'sessionId=abc123; Path=/; HttpOnly' })
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "server",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  cookieString: {
                    type: "string",
                    description: "Cookie string or Set-Cookie header",
                  },
                },
                required: ["cookieString"],
              },
            },
          },
        },
        responses: {
          200: { description: "Cookies stored" },
        },
      },
      delete: {
        operationId: "deleteMCPCookies",
        tags: ["MCP", "Secrets"],
        summary: "Delete MCP server session cookies",
        description: "Delete session cookies for an MCP server from Bun.secrets.",
        parameters: [
          {
            name: "server",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Cookies deleted" },
        },
      },
    },
    "/api/mcp/tools": {
      get: {
        operationId: "listMCPTools",
        tags: ["MCP", "Tools"],
        summary: "List all available MCP tools",
        description: `
**[MCP][TOOLS][LIST]{multi-layer-correlation}[#REF:routes.ts:api/mcp/tools]**

Returns a list of all available MCP (Model Context Protocol) research tools.

\`\`\`typescript
// List all tools
const response = await fetch('/api/mcp/tools');
const data = await response.json();
// { tools: [{ name: "research-build-multi-layer-graph", ... }, ...] }
\`\`\`

**Available Tools:**
- \`research-build-multi-layer-graph\` - Build complete multi-layer correlation graph
- \`research-query-layer-anomalies\` - Query anomalies by layer
- \`research-predict-propagation\` - Predict propagation paths
- \`research-find-cross-sport-edges\` - Find cross-sport correlation edges
- \`research-stream-anomalies\` - Stream real-time anomalies
- \`research-generate-visualization\` - Generate graph visualization data
- \`research-get-graph-stats\` - Get graph statistics

**See Also:**
- [Model Context Protocol](https://modelcontextprotocol.io/)
- \`POST /api/mcp/tools/:toolName\` - Execute a specific tool
- \`GET /api/mcp/tools/:toolName\` - Get tool information
        `.trim(),
        responses: {
          200: {
            description: "List of available tools",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tools: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          method: { type: "string", example: "POST" },
                          endpoint: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/mcp/tools/{toolName}": {
      get: {
        operationId: "getMCPToolInfo",
        tags: ["MCP", "Tools"],
        summary: "Get MCP tool information",
        security: [],
        description: `
**[MCP][TOOLS][INFO]{schema,description}[#REF:routes.ts:api/mcp/tools/:toolName]**

Get information about a specific MCP tool, including its input schema and description.

\`\`\`typescript
// Get tool info
const response = await fetch('/api/mcp/tools/research-build-multi-layer-graph');
const data = await response.json();
// { name: "...", description: "...", inputSchema: {...}, method: "POST" }
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "toolName",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MCP tool name (e.g., 'research-build-multi-layer-graph')",
          },
        ],
        responses: {
          200: {
            description: "Tool information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    inputSchema: { type: "object" },
                    method: { type: "string", example: "POST" },
                    note: { type: "string" },
                  },
                },
              },
            },
          },
          404: {
            description: "Tool not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "boolean" },
                    message: { type: "string" },
                    availableTools: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "executeMCPTool",
        tags: ["MCP", "Tools"],
        summary: "Execute an MCP tool",
        security: [{ CSRFToken: [] }],
        description: `
**[MCP][TOOLS][EXECUTE]{multi-layer-correlation}[#REF:routes.ts:api/mcp/tools/:toolName]**

Execute a Model Context Protocol research tool via HTTP. This endpoint provides HTTP access to MCP tools for dashboard integration.

\`\`\`typescript
// Execute tool
const response = await fetch('/api/mcp/tools/research-build-multi-layer-graph', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-CSRF-Token': '...' // Required for POST requests
  },
  body: JSON.stringify({
    eventId: 'nba-lakers-warriors-2024-01-15',
    layers: 'all'
  })
});
const data = await response.json();
// { nodes: [...], edges: [...], layers: [...], summary: {...} }
\`\`\`

**CSRF Protection:**
- GET requests to \`/api/\` endpoint return \`X-CSRF-Token\` header
- Include this token in \`X-CSRF-Token\` header for POST requests
- For localhost development, \`X-Dev-Bypass: true\` header can be used

**Available Tools:**
- \`research-build-multi-layer-graph\` - Build complete multi-layer correlation graph
- \`research-query-layer-anomalies\` - Query anomalies by layer
- \`research-predict-propagation\` - Predict propagation paths
- \`research-find-cross-sport-edges\` - Find cross-sport correlation edges
- \`research-stream-anomalies\` - Stream real-time anomalies
- \`research-generate-visualization\` - Generate graph visualization data
- \`research-get-graph-stats\` - Get graph statistics

**See Also:**
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Multi-Layer Correlation Graph Dashboard](/dashboard/multi-layer-graph.html)
- \`GET /api/mcp/tools\` - List all available tools
- \`GET /api/mcp/tools/:toolName\` - Get tool information
        `.trim(),
        parameters: [
          {
            name: "toolName",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MCP tool name (e.g., 'research-build-multi-layer-graph')",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Tool-specific input parameters",
                example: {
                  eventId: "nba-lakers-warriors-2024-01-15",
                  layers: "all",
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tool execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Tool-specific result format",
                  example: {
                    nodes: [],
                    edges: [],
                    layers: [],
                    summary: {
                      totalHiddenEdges: 0,
                      avgConfidence: 0,
                      buildTime: 123,
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "boolean" },
                    message: { type: "string" },
                    type: { type: "string", example: "validation_error" },
                  },
                },
              },
            },
          },
          404: {
            description: "Tool not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "boolean" },
                    message: { type: "string" },
                    availableTools: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Tool execution error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Factory Wager Mini App ============
    "/api/miniapp/status": {
      get: {
        operationId: "getMiniappStatus",
        tags: ["Mini App"],
        summary: "Get Factory Wager Mini App status",
        description: `
**[INTEGRATION][MINIAPP][STATUS]{online,offline,degraded}[#REF:routes.ts:api/miniapp/status]**

Returns status of the Factory Wager Mini App (staging environment).

\`\`\`typescript
// Get miniapp status
const response = await fetch('/api/miniapp/status');
const data = await response.json();
// { url: "...", status: "online", responseTime: 123, ... }
\`\`\`

**See Also:**
- [Factory Wager Mini App](https://staging.factory-wager-miniapp.pages.dev)
- [Miniapp Monitor](./src/utils/miniapp-native.ts)
        `.trim(),
        responses: {
          200: {
            description: "Miniapp status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                      example: "https://staging.factory-wager-miniapp.pages.dev",
                    },
                    status: {
                      type: "string",
                      enum: ["online", "offline", "degraded"],
                    },
                    responseTime: {
                      type: "number",
                      description: "Response time in milliseconds",
                    },
                    statusCode: { type: "number", example: 200 },
                    timestamp: {
                      type: "number",
                      description: "Unix timestamp",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/miniapp/info": {
      get: {
        operationId: "getMiniappInfo",
        tags: ["Mini App"],
        summary: "Get complete Factory Wager Mini App information",
        description: `
**[INTEGRATION][MINIAPP][INFO]{status,health,deployment,config}[#REF:routes.ts:api/miniapp/info]**

Returns complete miniapp information including status, health, deployment, and config.

\`\`\`typescript
// Get all miniapp info
const response = await fetch('/api/miniapp/info');
const data = await response.json();
// { url: "...", status: {...}, health: {...}, deployment: {...}, config: {...} }
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Complete miniapp information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    status: { type: "object", nullable: true },
                    health: { type: "object", nullable: true },
                    deployment: { type: "object", nullable: true },
                    config: { type: "object", nullable: true },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/miniapp/health": {
      get: {
        operationId: "getMiniappHealth",
        tags: ["Mini App"],
        summary: "Get Factory Wager Mini App health",
        description: "Returns health information from the miniapp's /health endpoint.",
        responses: {
          200: { description: "Health information" },
          404: { description: "Health endpoint not available" },
        },
      },
    },
    "/api/dashboard/correlation-graph": {
      get: {
        operationId: "getCorrelationGraph",
        tags: ["Dashboard", "Analytics"],
        summary: "Get correlation graph data for visualization",
        description: `
**[DASHBOARD][CORRELATION][GRAPH]{multi-layer,vis.js}[#REF:routes.ts:api/dashboard/correlation-graph]**

Get multi-layer correlation graph data aggregated from line movement and URL anomaly audit tables.
Returns nodes, edges, layer summaries, and statistics for frontend visualization.

\`\`\`typescript
// Get correlation graph for an event
const response = await fetch('/api/dashboard/correlation-graph?event_id=nba-lakers-warriors-2024-01-15&time_window=24');
const graphData = await response.json();
// {
//   eventId: "nba-lakers-warriors-2024-01-15",
//   timeWindow: 24,
//   generatedAt: 1234567890,
//   nodes: [...],
//   edges: [...],
//   layers: [...],
//   statistics: {...}
// }
\`\`\`

**Query Parameters:**
- \`event_id\` (required): Event identifier, 10-100 chars, pattern: \`/^[a-z]+-[\\w-]{6,}$/\`
- \`time_window\` (optional): Hours to look back, 1-168 (7 days), default: 24

**Response Format:**
- \`nodes\`: Array of correlation nodes with layer, severity, bookmaker, and summary data
- \`edges\`: Array of edges connecting nodes with correlation strength and confidence
- \`layers\`: Summary statistics per layer (1-4)
- \`statistics\`: Overall graph statistics including total nodes/edges, correlation strengths, bookmakers

**Performance:**
- Results are cached for 5 minutes (same event_id + time_window)
- SQL queries optimized with indexes on eventId, timestamp, bookmaker
- Supports datasets with 1000+ nodes

**See Also:**
- [Correlation Graph Dashboard](/dashboard/correlation-graph.html)
- \`GET /api/dashboard/data\` - Get dashboard data
- Multi-layer correlation engine in \`src/analytics/correlation-engine.ts\`
        `.trim(),
        parameters: [
          {
            name: "event_id",
            in: "query",
            required: true,
            schema: {
              type: "string",
              minLength: 10,
              maxLength: 100,
              pattern: "^[a-z]+-[\\w-]{6,}$",
            },
            description: "Event identifier (e.g., 'nba-lakers-warriors-2024-01-15')",
          },
          {
            name: "time_window",
            in: "query",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 168,
              default: 24,
            },
            description: "Hours to look back (1-168, default: 24)",
          },
        ],
        responses: {
          200: {
            description: "Correlation graph data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    eventId: { type: "string" },
                    timeWindow: { type: "number" },
                    generatedAt: { type: "number" },
                    nodes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          label: { type: "string" },
                          layer: { type: "integer", enum: [1, 2, 3, 4] },
                          bookmaker: { type: "string" },
                          severity: {
                            type: "string",
                            enum: ["low", "medium", "high", "critical"],
                          },
                          correlationStrength: { type: "number", minimum: 0, maximum: 1 },
                          summaryData: { type: "object" },
                          deeplinkUrl: { type: "string" },
                        },
                      },
                    },
                    edges: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          source: { type: "string" },
                          target: { type: "string" },
                          layer: { type: "integer", enum: [1, 2, 3, 4] },
                          correlationStrength: { type: "number", minimum: 0, maximum: 1 },
                          confidence: { type: "number", minimum: 0, maximum: 1 },
                        },
                      },
                    },
                    layers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          layer: { type: "integer" },
                          nodeCount: { type: "integer" },
                          edgeCount: { type: "integer" },
                          avgCorrelationStrength: { type: "number" },
                        },
                      },
                    },
                    statistics: {
                      type: "object",
                      properties: {
                        totalNodes: { type: "integer" },
                        totalEdges: { type: "integer" },
                        avgCorrelationStrength: { type: "number" },
                        maxCorrelationStrength: { type: "number" },
                        bookmakers: { type: "array", items: { type: "string" } },
                        timeRange: {
                          type: "object",
                          properties: {
                            start: { type: "number" },
                            end: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  eventId: "nba-lakers-warriors-2024-01-15",
                  timeWindow: 24,
                  generatedAt: 1705276800000,
                  nodes: [
                    {
                      id: "pinnacle-nba-lakers-warriors-2024-01-15",
                      label: "pinnacle (nba-lake)",
                      layer: 1,
                      bookmaker: "pinnacle",
                      severity: "medium",
                      correlationStrength: 0.75,
                      summaryData: {
                        anomalyCount: 5,
                        movementCount: 12,
                        threatLevel: "medium",
                        lastSeen: 1705276800000,
                      },
                      deeplinkUrl:
                        "/dashboard?deeplink=event_id%3Dnba-lakers-warriors-2024-01-15%26node_id%3Dpinnacle-nba-lakers-warriors-2024-01-15",
                    },
                  ],
                  edges: [
                    {
                      id: "pinnacle-nba-lakers-warriors-2024-01-15-draftkings-nba-lakers-warriors-2024-01-15",
                      source: "pinnacle-nba-lakers-warriors-2024-01-15",
                      target: "draftkings-nba-lakers-warriors-2024-01-15",
                      layer: 2,
                      correlationStrength: 0.65,
                      confidence: 0.52,
                    },
                  ],
                  layers: [
                    { layer: 1, nodeCount: 5, edgeCount: 8, avgCorrelationStrength: 0.72 },
                    { layer: 2, nodeCount: 12, edgeCount: 24, avgCorrelationStrength: 0.58 },
                    { layer: 3, nodeCount: 8, edgeCount: 15, avgCorrelationStrength: 0.45 },
                    { layer: 4, nodeCount: 3, edgeCount: 5, avgCorrelationStrength: 0.32 },
                  ],
                  statistics: {
                    totalNodes: 28,
                    totalEdges: 52,
                    avgCorrelationStrength: 0.58,
                    maxCorrelationStrength: 0.95,
                    bookmakers: ["pinnacle", "draftkings", "betfair"],
                    timeRange: { start: 1705190400000, end: 1705276800000 },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid event_id format or time_window range",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
                example: {
                  error:
                    "Invalid event_id format. Must be 10-100 characters matching pattern: /^[a-z]+-[\\w-]{6,}$/",
                },
              },
            },
          },
          500: {
            description: "Server error generating graph data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/miniapp/deployment": {
      get: {
        operationId: "getMiniappDeployment",
        tags: ["Mini App"],
        summary: "Get Factory Wager Mini App deployment info",
        description: "Returns deployment information (commit, environment, deployedAt).",
        responses: {
          200: { description: "Deployment information" },
          404: { description: "Deployment info not available" },
        },
      },
    },
    "/api/miniapp/config": {
      get: {
        operationId: "getMiniappConfig",
        tags: ["Mini App"],
        summary: "Get Factory Wager Mini App config",
        description: "Returns config.js status and content from the Mini App.",
        responses: {
          200: { description: "Config information" },
          404: { description: "Config not available" },
        },
      },
    },

    // ============ Streams ============
    "/streams": {
      get: {
        operationId: "listStreams",
        tags: ["Streams"],
        summary: "List all data streams",
        description: `
**[CORE][DATA][QUERY]{streams,metadata}[CLASS:StreamController][FUNCTION:listStreams][GROUP:STREAMS][HEADERS:{ETag,X-Stream-Count}][ETAG:{strategy="content-hash",ttl=30}][PROPERTIES:{limit:number,offset:number}][TYPES:{StreamQuery,StreamResponse}][#REF:routes.ts:35]**

Returns all imported data streams with metadata including date range and trade counts.

Uses \`Bun.file\` for file metadata when source is 'file'.
        `.trim(),
        responses: {
          200: {
            description: "List of streams",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    streams: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StreamMeta" },
                    },
                    total: {
                      type: "integer",
                      description: "Total trade count across all streams",
                    },
                    dateRange: { $ref: "#/components/schemas/DateRange" },
                  },
                },
                example: {
                  streams: [
                    {
                      id: "api-bitmex-1234",
                      name: "BitMEX BTC/USD",
                      source: "api",
                      symbol: "BTC/USD",
                      count: 1500,
                    },
                  ],
                  total: 1500,
                  dateRange: {
                    from: "2024-01-01T00:00:00Z",
                    to: "2025-01-15T00:00:00Z",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/streams/file": {
      post: {
        operationId: "importFile",
        tags: ["Streams"],
        summary: "Import trades from file",
        description: `
**[CORE][DATA][IMPORT]{csv,json,Bun.file}[#REF:routes.ts:50]**

Import trades from a CSV or JSON file on the server.

\`\`\`typescript
// Bun native file reading
const file = Bun.file(path);
const text = await file.text();
const trades = parseCSV(text); // or JSON.parse for .json
\`\`\`

**Supported formats**:
- CSV with headers: \`datetime,symbol,side,price,amount,fee\`
- JSON array: \`[{ datetime, symbol, side, price, amount }]\`
        `.trim(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["path"],
                properties: {
                  path: {
                    type: "string",
                    description: "Server file path",
                    example: "./data/trades.csv",
                  },
                  name: {
                    type: "string",
                    description: "Stream display name",
                    example: "Historical Trades",
                  },
                  symbol: {
                    type: "string",
                    description: "Trading symbol override",
                    example: "BTC/USD",
                  },
                },
              },
              examples: {
                csv: {
                  summary: "Import CSV file",
                  value: {
                    path: "./data/bitmex-trades.csv",
                    name: "BitMEX 2024",
                    symbol: "BTC/USD",
                  },
                },
                json: {
                  summary: "Import JSON file",
                  value: {
                    path: "./data/trades.json",
                    name: "Exported Trades",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Import successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    stream: { $ref: "#/components/schemas/StreamMeta" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid request, file not found, or no trades parsed",
          },
          500: { description: "Import failed - file read or parse error" },
        },
      },
    },
    "/streams/api": {
      post: {
        operationId: "fetchFromExchange",
        tags: ["Streams"],
        summary: "Fetch trades from exchange API",
        description: `
**[CORE][DATA][IMPORT]{ccxt,exchange,api}[#REF:routes.ts:80]**

Connect to a crypto exchange via CCXT and fetch trade history.

\`\`\`typescript
// Uses CCXT unified API
import ccxt from 'ccxt';
const exchange = new ccxt[exchangeId]({ apiKey, secret });
const trades = await exchange.fetchMyTrades(symbol);
\`\`\`

**Supported exchanges**: bitmex, binance, bybit, okx
        `.trim(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["exchange", "apiKey", "apiSecret"],
                properties: {
                  exchange: {
                    type: "string",
                    enum: ["bitmex", "binance", "bybit", "okx"],
                    example: "bitmex",
                  },
                  apiKey: {
                    type: "string",
                    description: "Exchange API key (read-only recommended)",
                  },
                  apiSecret: {
                    type: "string",
                    description: "Exchange API secret",
                  },
                  symbol: {
                    type: "string",
                    description: "Trading pair",
                    example: "BTC/USD:BTC",
                  },
                  testnet: {
                    type: "boolean",
                    description: "Use testnet/sandbox",
                    default: false,
                  },
                  since: {
                    type: "string",
                    format: "date-time",
                    description: "Fetch trades since this date",
                  },
                },
              },
              example: {
                exchange: "bitmex",
                apiKey: "your-api-key",
                apiSecret: "your-api-secret",
                symbol: "BTC/USD:BTC",
                testnet: false,
              },
            },
          },
        },
        responses: {
          200: { description: "Fetch successful, trades imported" },
          400: { description: "Missing required fields or invalid exchange" },
          401: { description: "Invalid API credentials" },
          500: { description: "Connection or fetch failed" },
        },
      },
    },
    "/streams/{id}": {
      delete: {
        operationId: "deleteStream",
        tags: ["Streams"],
        summary: "Delete a stream",
        description:
          "**[CORE][DATA][DELETE]{stream}[#REF:routes.ts:110]**\n\nRemove a data stream by ID. Trades associated with the stream are also removed.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Stream ID",
            example: "api-bitmex-1234567890",
          },
        ],
        responses: {
          200: { description: "Stream deleted successfully" },
          404: { description: "Stream not found" },
        },
      },
    },
    "/sync": {
      post: {
        operationId: "syncTrades",
        tags: ["Streams"],
        summary: "Sync latest trades",
        description: `
**[CORE][DATA][SYNC]{incremental,since}[#REF:routes.ts:120]**

Fetch new trades since last sync using saved credentials. Only fetches trades newer than the most recent stored trade.
        `.trim(),
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  symbol: { type: "string", example: "BTC/USD:BTC" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Sync completed" },
          401: { description: "No saved credentials - use /streams/api first" },
          500: { description: "Sync failed" },
        },
      },
    },

    // ============ Trades ============
    "/trades": {
      get: {
        operationId: "listTrades",
        tags: ["Trades"],
        summary: "List trades with pagination",
        description: `
**[CORE][DATA][QUERY]{pagination,filter,sort}[CLASS:TradeController][FUNCTION:getTrades][GROUP:TRADES][HEADERS:{ETag,X-Page-Count,X-Total-Count}][ETAG:{strategy="content-hash",ttl=60}][PROPERTIES:{limit:number,offset:number,bookmaker:string}][TYPES:{TradeQuery,TradeResponse,TradeFilter}][#REF:routes.ts:150]**

Get paginated list of trades with optional filtering by symbol and date range.
        `.trim(),
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, minimum: 1, maximum: 1000 },
            description: "Items per page",
          },
          {
            name: "symbol",
            in: "query",
            schema: { type: "string" },
            description: "Filter by symbol",
            example: "BTC/USD",
          },
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date (YYYY-MM-DD)",
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date (YYYY-MM-DD)",
          },
          {
            name: "side",
            in: "query",
            schema: { type: "string", enum: ["buy", "sell"] },
            description: "Filter by side",
          },
        ],
        responses: {
          200: {
            description: "Paginated trades",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    trades: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Trade" },
                    },
                    total: {
                      type: "integer",
                      description: "Total matching trades",
                    },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    pages: { type: "integer", description: "Total pages" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Analytics ============
    "/stats": {
      get: {
        operationId: "getStats",
        tags: ["Analytics"],
        summary: "Get trading statistics",
        description: `
**[CORE][COMPUTE][STATS]{pnl,winrate,metrics}[#REF:analytics/stats.ts]**

Calculate comprehensive trading statistics including PnL, win rate, profit factor, and risk metrics.

\`\`\`typescript
interface TradingStats {
  totalTrades: number;
  winRate: number;        // 0-100
  profitFactor: number;   // gross profit / gross loss
  expectancy: number;     // average expected profit per trade
  sharpeRatio: number;    // risk-adjusted return
}
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date",
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date",
          },
          {
            name: "symbol",
            in: "query",
            schema: { type: "string" },
            description: "Filter by symbol",
          },
        ],
        responses: {
          200: {
            description: "Trading statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    stats: { $ref: "#/components/schemas/TradingStats" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/profile": {
      get: {
        operationId: "getTraderProfile",
        tags: ["Analytics"],
        summary: "Get trader profile analysis",
        description: `
**[CORE][COMPUTE][PROFILE]{style,risk,insights}[#REF:analytics/profile.ts]**

Analyze trading patterns to determine style, risk preference, and generate actionable insights.

**Profile Categories**:
- Style: scalper, day_trader, swing_trader, position_trader
- Risk: aggressive, moderate, conservative
- Level: beginner, intermediate, advanced
        `.trim(),
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Trader profile with insights",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    profile: { $ref: "#/components/schemas/TraderProfile" },
                    stats: { $ref: "#/components/schemas/TradingStats" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/sessions": {
      get: {
        operationId: "getPositionSessions",
        tags: ["Analytics"],
        summary: "Get position sessions",
        description: `
**[CORE][COMPUTE][SESSIONS]{positions,pnl,duration}[#REF:analytics/sessions.ts]**

List trading sessions (open-to-close position cycles) with PnL and duration metrics.

A session represents a complete position lifecycle from first entry to full exit.
        `.trim(),
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          { name: "symbol", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Position sessions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PositionSession" },
                    },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Polymarket ============
    "/polymarket/markets": {
      get: {
        operationId: "listPolymarketMarkets",
        tags: ["Polymarket"],
        summary: "List Polymarket prediction markets",
        description: `
**[PREDICTION][EXTERNAL][QUERY]{markets,prices}[#REF:polymarket/client.ts]**

Fetch active prediction markets from Polymarket with current prices and volume.
        `.trim(),
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100, maximum: 500 },
          },
          {
            name: "active",
            in: "query",
            schema: { type: "boolean", default: true },
          },
        ],
        responses: {
          200: {
            description: "Active markets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    markets: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PredictionMarket" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/polymarket/fetch": {
      post: {
        operationId: "fetchPolymarketTrades",
        tags: ["Polymarket"],
        summary: "Fetch Polymarket trades for wallet",
        description: `
**[PREDICTION][EXTERNAL][IMPORT]{wallet,trades}[#REF:polymarket/client.ts]**

Fetch trade history from Polymarket for an Ethereum wallet address.
        `.trim(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["funderAddress"],
                properties: {
                  funderAddress: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                    description: "Ethereum wallet address",
                    example: "0x1234567890abcdef1234567890abcdef12345678",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Trades fetched and saved" },
          400: { description: "Invalid or missing wallet address" },
        },
      },
    },

    // ============ Kalshi ============
    "/kalshi/markets": {
      get: {
        operationId: "listKalshiMarkets",
        tags: ["Kalshi"],
        summary: "List Kalshi prediction markets",
        description: `
**[PREDICTION][EXTERNAL][QUERY]{markets,status}[#REF:kalshi/client.ts]**

Get prediction markets from Kalshi (regulated US exchange).
        `.trim(),
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["open", "closed", "settled"],
              default: "open",
            },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100 },
          },
          {
            name: "series",
            in: "query",
            schema: { type: "string" },
            description: "Filter by market series",
          },
        ],
        responses: {
          200: {
            description: "Markets list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    markets: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PredictionMarket" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/kalshi/connect": {
      post: {
        operationId: "connectKalshi",
        tags: ["Kalshi"],
        summary: "Authenticate with Kalshi",
        description:
          "**[PREDICTION][EXTERNAL][AUTH]{email,apikey}[#REF:kalshi/client.ts]**\n\nAuthenticate with Kalshi API for trade fetching.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                  apiKey: {
                    type: "string",
                    description: "Alternative: API key authentication",
                  },
                  demo: {
                    type: "boolean",
                    default: false,
                    description: "Use demo environment",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Connected successfully" },
          401: { description: "Invalid credentials" },
        },
      },
    },

    // ============ Prediction Stats ============
    "/prediction/stats": {
      get: {
        operationId: "getPredictionStats",
        tags: ["Analytics"],
        summary: "Prediction market statistics",
        description: `
**[PREDICTION][COMPUTE][STATS]{calibration,edge,kelly}[#REF:analytics/prediction.ts]**

Analytics for prediction market trades including calibration score and edge analysis.

\`\`\`typescript
interface EdgeAnalysis {
  impliedEdge: number;   // Edge at entry vs 50%
  realizedEdge: number;  // Actual outcome vs entry
  kellyCriterion: number; // Optimal bet fraction
}
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Prediction statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    stats: { $ref: "#/components/schemas/PredictionStats" },
                    edge: { $ref: "#/components/schemas/EdgeAnalysis" },
                    sizing: { $ref: "#/components/schemas/SizingAnalysis" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Market Making ============
    "/mm/stats": {
      get: {
        operationId: "getMMStats",
        tags: ["Market Making"],
        summary: "Market making statistics",
        description: `
**[TRADING][COMPUTE][MM]{maker,taker,inventory}[#REF:analytics/mm.ts]**

Market making analytics including maker/taker ratio, inventory management, and rebate tracking.
        `.trim(),
        responses: {
          200: {
            description: "Market making stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    stats: { $ref: "#/components/schemas/MarketMakingStats" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/mm/sessions": {
      get: {
        operationId: "getMMSessions",
        tags: ["Market Making"],
        summary: "Market making sessions",
        description:
          "**[TRADING][COMPUTE][SESSIONS]{mm,gap}[#REF:analytics/mm.ts]**\n\nGet market making sessions grouped by activity gaps.",
        parameters: [
          {
            name: "gap",
            in: "query",
            schema: { type: "integer", default: 30 },
            description: "Gap in minutes to split sessions",
          },
        ],
        responses: {
          200: {
            description: "MM sessions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MMSession" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/clear": {
      post: {
        operationId: "clearAllData",
        tags: ["Streams"],
        summary: "Clear all data",
        description:
          "**[CORE][DATA][DELETE]{all}[#REF:routes.ts:200]**\n\nRemove all streams and stored data. **Destructive operation.**",
        responses: { 200: { description: "All data cleared" } },
      },
    },

    // ============ ORCA Endpoints ============
    "/orca/normalize": {
      post: {
        operationId: "orcaNormalize",
        tags: ["ORCA"],
        summary: "Normalize market input to canonical format",
        description: `
**[SPORTS][NORMALIZE][UUIDv5]{event,market,selection}[CLASS:OrcaNormalizer][HEADERS:{ETag,X-ORCA-Version,X-ORCA-Namespace}][ETAG:{strategy="uuid-based",ttl=86400}][PROPERTIES:{bookmaker:string,sport:string,homeTeam:string,awayTeam:string}][TYPES:{OrcaRawInput,OrcaNormalizedOutput,OrcaEventId}][#REF:orca/normalizer.ts:50]**

Transform bookmaker-specific market data into canonical ORCA format with **deterministic UUIDv5 identifiers**.

**Class-Specific Elements**:
- **Headers**: \`ETag\`, \`X-ORCA-Version\`, \`X-ORCA-Namespace\`
- **ETag Strategy**: UUID-based with 24-hour TTL
- **Properties**: \`bookmaker\`, \`sport\`, \`homeTeam\`, \`awayTeam\`
- **Types**: \`OrcaRawInput\`, \`OrcaNormalizedOutput\`, \`OrcaEventId\`

**Bookmaker Header Management:**
The ORCA system uses \`HeaderManager\` ([#REF:orca/aliases/bookmakers/headers.ts]) to manage exchange-specific headers:

- **Betfair**: Requires \`X-Application\` and \`X-Authentication\` headers
- **Pinnacle**: Uses \`Authorization: Basic {apiKey}\` header
- **DraftKings**: Uses \`Authorization: Bearer {token}\` header
- **William Hill**: Uses \`X-API-Key\` header
- **BetMGM**: Uses \`Authorization: Bearer {token}\` header

Headers support template variables: \`{token}\`, \`{apiKey}\` are replaced from params or environment variables.

**See Also:**
- [HeaderManager](./src/orca/aliases/bookmakers/headers.ts) - Exchange-specific header management
- [SecureAuthService](./src/hyper-bun/secure-auth-service.ts) - Authentication header generation
        `.trim(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrcaRawInput" },
              examples: {
                draftkings: {
                  summary: "DraftKings NBA spread",
                  value: {
                    bookmaker: "draftkings",
                    sport: "NBA Basketball",
                    league: "NBA",
                    homeTeam: "LA Lakers",
                    awayTeam: "BOS Celtics",
                    startTime: "2025-01-15T19:30:00Z",
                    marketType: "Point Spread",
                    line: -3.5,
                    selection: "LA Lakers -3.5",
                  },
                },
                pinnacle: {
                  summary: "Pinnacle same game (will produce same eventId)",
                  value: {
                    bookmaker: "pinnacle",
                    sport: "Basketball",
                    league: "NBA",
                    homeTeam: "Los Angeles Lakers",
                    awayTeam: "Boston Celtics",
                    startTime: "2025-01-15T19:30:00Z",
                    marketType: "Spread",
                    line: -3.5,
                    selection: "Los Angeles Lakers",
                  },
                },
                betfair: {
                  summary: "Betfair exchange moneyline",
                  value: {
                    bookmaker: "betfair",
                    sport: "Basketball - NBA",
                    league: "NBA",
                    homeTeam: "L.A. Lakers",
                    awayTeam: "Boston",
                    startTime: "2025-01-15T19:30:00Z",
                    marketType: "Match Odds",
                    selection: "L.A. Lakers",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Normalized output with deterministic UUIDv5 IDs",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrcaNormalizedOutput" },
                example: {
                  event: {
                    id: "a1b2c3d4-e5f6-5a7b-8c9d-0e1f2a3b4c5d",
                    sport: "NBA",
                    leagueId: "b2c3d4e5-f6a7-5b8c-9d0e-1f2a3b4c5d6e",
                    homeTeamId: "c3d4e5f6-a7b8-5c9d-0e1f-2a3b4c5d6e7f",
                    awayTeamId: "d4e5f6a7-b8c9-5d0e-1f2a-3b4c5d6e7f8a",
                    startTime: "2025-01-15T19:30:00Z",
                  },
                  market: {
                    id: "e5f6a7b8-c9d0-5e1f-2a3b-4c5d6e7f8a9b",
                    eventId: "a1b2c3d4-e5f6-5a7b-8c9d-0e1f2a3b4c5d",
                    type: "spread",
                    period: "full",
                    line: -3.5,
                  },
                  selection: {
                    id: "f6a7b8c9-d0e1-5f2a-3b4c-5d6e7f8a9b0c",
                    marketId: "e5f6a7b8-c9d0-5e1f-2a3b-4c5d6e7f8a9b",
                    name: "Los Angeles Lakers",
                    type: "home",
                    line: -3.5,
                  },
                  confidence: 0.95,
                },
              },
            },
          },
          400: {
            description: "Invalid input, unknown bookmaker, or unrecognized team",
          },
        },
      },
    },
    "/orca/normalize/batch": {
      post: {
        operationId: "orcaNormalizeBatch",
        tags: ["ORCA"],
        summary: "Batch normalize multiple markets",
        description: `
**[SPORTS][NORMALIZE][BATCH]{parallel}[#REF:orca/normalizer.ts:100]**

Normalize multiple market inputs in a single request. Useful for bulk processing odds feeds.

\`\`\`typescript
// Process in parallel for performance
const results = await Promise.all(inputs.map(input => normalizer.normalize(input)));
\`\`\`
        `.trim(),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/OrcaRawInput" },
                maxItems: 100,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Batch results with success/failure for each input",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer" },
                          success: { type: "boolean" },
                          data: {
                            $ref: "#/components/schemas/OrcaNormalizedOutput",
                          },
                          error: { type: "string", nullable: true },
                        },
                      },
                    },
                    total: { type: "integer" },
                    successful: { type: "integer" },
                    failed: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orca/lookup/team": {
      get: {
        operationId: "orcaLookupTeam",
        tags: ["ORCA"],
        summary: "Look up team alias",
        description: `
**[SPORTS][NORMALIZE][LOOKUP]{alias,canonical}[AliasRegistry][#REF:orca/aliases/registry.ts]**

Find canonical team name and deterministic ID from bookmaker-specific naming.

\`\`\`typescript
// Stored in bun:sqlite
registry.lookup('team', 'draftkings', 'LA Lakers');
// → { canonical: 'Los Angeles Lakers', id: 'uuid...' }
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "bookmaker",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "draftkings",
          },
          {
            name: "name",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "LA Lakers",
          },
        ],
        responses: {
          200: {
            description: "Team lookup result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    found: { type: "boolean" },
                    canonical: {
                      type: "string",
                      example: "Los Angeles Lakers",
                      nullable: true,
                    },
                    id: { type: "string", format: "uuid", nullable: true },
                    bookmaker: { type: "string" },
                    query: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orca/bookmakers": {
      get: {
        operationId: "orcaListBookmakers",
        tags: ["ORCA"],
        summary: "List supported bookmakers",
        description: `
**[SPORTS][CONFIG][BOOKMAKERS]{us,sharp,exchange}[#REF:orca/taxonomy/bookmaker.ts]**

Get all supported bookmakers grouped by category.

| Category | Books | Notes |
|----------|-------|-------|
| US | DraftKings, FanDuel, BetMGM, Caesars | Regulated US books |
| Sharp | Pinnacle, Circa, Bookmaker.eu | Low-vig, high limits |
| Exchanges | Betfair, Smarkets, Matchbook | Peer-to-peer |

**Header Requirements:**
Each bookmaker has specific header requirements managed by \`HeaderManager\`:
- **Betfair**: \`X-Application\`, \`X-Authentication\` (Bearer token)
- **Pinnacle**: \`Authorization\` (Basic auth)
- **DraftKings**: \`Authorization\` (Bearer token)
- **Generic**: \`X-API-Key\`, \`X-API-Secret\` (if applicable)

See: [HeaderManager](./src/orca/aliases/bookmakers/headers.ts) for header configuration details.
        `.trim(),
        responses: {
          200: {
            description: "Bookmaker categories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    us: {
                      type: "array",
                      items: { type: "string" },
                      example: ["draftkings", "fanduel", "betmgm", "caesars"],
                    },
                    sharp: {
                      type: "array",
                      items: { type: "string" },
                      example: ["pinnacle", "ps3838", "circa", "bookmaker"],
                    },
                    exchanges: {
                      type: "array",
                      items: { type: "string" },
                      example: ["betfair", "smarkets", "matchbook"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orca/sports": {
      get: {
        operationId: "orcaListSports",
        tags: ["ORCA"],
        summary: "List supported sports",
        description: `
**[SPORTS][CONFIG][SPORTS]{id,category,markets}[#REF:orca/taxonomy/sport.ts]**

Get all supported sports with market type availability.
        `.trim(),
        responses: {
          200: {
            description: "Sports list with metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sports: {
                      type: "array",
                      items: { $ref: "#/components/schemas/OrcaSportInfo" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orca/markets": {
      get: {
        operationId: "orcaListMarketTypes",
        tags: ["ORCA"],
        summary: "List market types",
        description:
          "**[SPORTS][CONFIG][MARKETS]{moneyline,spread,total}[#REF:orca/taxonomy/market.ts]**",
        responses: {
          200: {
            description: "Market type definitions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    marketTypes: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/OrcaMarketTypeInfo",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orca/stats": {
      get: {
        operationId: "orcaGetStats",
        tags: ["ORCA"],
        summary: "Get ORCA module statistics",
        description: `
**[SPORTS][STATUS][STATS]{aliases,streaming}[#REF:orca/index.ts]**

Get normalizer statistics including loaded aliases, sports coverage, and streaming status.
        `.trim(),
        responses: {
          200: {
            description: "ORCA module stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    teams: {
                      type: "integer",
                      description: "Total team aliases loaded",
                      example: 985,
                    },
                    leagues: { type: "integer", example: 45 },
                    sports: { type: "integer", example: 15 },
                    status: {
                      type: "string",
                      enum: ["initialized", "loading", "error"],
                      example: "initialized",
                    },
                    streaming: {
                      type: "object",
                      properties: {
                        running: { type: "boolean" },
                        port: { type: "integer" },
                        clients: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ ORCA Streaming ============
    "/orca/stream/start": {
      post: {
        operationId: "orcaStreamStart",
        tags: ["ORCA Streaming"],
        summary: "Start WebSocket streaming server",
        description: `
**[SPORTS][REALTIME][WEBSOCKET]{Bun.serve,ServerWebSocket}[OrcaStreamServer][#REF:orca/streaming.ts:20]**

Start the real-time odds streaming server using **Bun native WebSocket**.

\`\`\`typescript
// @see src/orca/streaming.ts
const server = Bun.serve({
  port: 3002,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('Upgrade required', { status: 426 });
  },
  websocket: {
    open(ws) { ws.subscribe('odds'); },
    message(ws, msg) { /* handle subscriptions */ },
    close(ws) { ws.unsubscribe('odds'); },
  },
});
\`\`\`

**Client connection**: \`ws://localhost:$WS_PORT\` (default: ${WS_PORT})
        `.trim(),
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  port: {
                    type: "integer",
                    default: 3002,
                    minimum: 1024,
                    maximum: 65535,
                    description: "WebSocket server port",
                  },
                  pollInterval: {
                    type: "integer",
                    default: 5000,
                    minimum: 1000,
                    description: "Odds polling interval (ms)",
                  },
                  bookmakers: {
                    type: "array",
                    items: { type: "string" },
                    example: ["ps3838", "betfair"],
                    description: "Bookmakers to stream",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Streaming server started" },
          400: { description: "Server already running" },
        },
      },
    },
    "/orca/stream/stop": {
      post: {
        operationId: "orcaStreamStop",
        tags: ["ORCA Streaming"],
        summary: "Stop streaming server",
        description: "**[SPORTS][REALTIME][STOP]{cleanup}[#REF:orca/streaming.ts:100]**",
        responses: {
          200: { description: "Server stopped" },
          400: { description: "Server not running" },
        },
      },
    },
    "/orca/stream/status": {
      get: {
        operationId: "orcaStreamStatus",
        tags: ["ORCA Streaming"],
        summary: "Get streaming status",
        description: `
**[SPORTS][REALTIME][STATUS]{clients,fetcher}[#REF:orca/streaming.ts:120]**

Get current streaming server status including connected clients count.

Uses \`ServerWebSocket.subscriptions\` (Bun 1.3.2) for subscription tracking.
        `.trim(),
        responses: {
          200: {
            description: "Streaming status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    running: { type: "boolean" },
                    port: { type: "integer", example: 3002 },
                    clients: {
                      type: "integer",
                      description: "Connected WebSocket clients",
                    },
                    fetcher: {
                      type: "object",
                      properties: {
                        bookmakers: {
                          type: "array",
                          items: { type: "string" },
                        },
                        pollInterval: { type: "integer" },
                        lastFetch: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ ORCA Storage ============
    "/orca/storage/stats": {
      get: {
        operationId: "orcaStorageStats",
        tags: ["ORCA Storage"],
        summary: "Get SQLite storage statistics",
        description: `
**[SPORTS][PERSIST][STATS]{bun:sqlite,aliases,odds}[OrcaStorage][#REF:orca/storage.ts:30]**

Get database statistics including record counts and file size.

\`\`\`typescript
// @see src/orca/storage.ts
import { Database } from 'bun:sqlite';

const db = new Database('./data/orca.db');
const stats = db.query('SELECT COUNT(*) as count FROM team_aliases').get();
\`\`\`

**SQLite Version**: Uses \`bun:sqlite\` with SQLite 3.51.1 (Bun latest)

**Performance**: SQLite 3.51.1 includes critical fixes for EXISTS-to-JOIN optimization and query planner improvements. Enhanced performance for WAL mode, concurrent operations, and query optimization. See [Bun Latest Updates](../docs/BUN-LATEST-UPDATES.md) for details.
        `.trim(),
        responses: {
          200: {
            description: "Storage statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    teamAliases: {
                      type: "integer",
                      description: "Team alias records",
                    },
                    sportAliases: { type: "integer" },
                    oddsRecords: {
                      type: "integer",
                      description: "Historical odds snapshots",
                    },
                    events: { type: "integer" },
                    dbSize: { type: "string", example: "52.00 KB" },
                    sqliteVersion: { type: "string", example: "3.51.1" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orca/storage/odds/{marketId}": {
      get: {
        operationId: "orcaGetOddsHistory",
        tags: ["ORCA Storage"],
        summary: "Get historical odds for market",
        description: `
**[SPORTS][PERSIST][QUERY]{history,backtest}[#REF:orca/storage.ts:80]**

Retrieve historical odds snapshots for a specific market. Useful for backtesting and line movement analysis.

\`\`\`sql
SELECT * FROM odds_history
WHERE market_id = ?
AND timestamp > ?
ORDER BY timestamp DESC
LIMIT ?
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "marketId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "ORCA market UUID",
          },
          {
            name: "bookmaker",
            in: "query",
            schema: { type: "string" },
            description: "Filter by bookmaker",
          },
          {
            name: "since",
            in: "query",
            schema: { type: "integer" },
            description: "Unix timestamp (ms)",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100, maximum: 1000 },
          },
        ],
        responses: {
          200: {
            description: "Odds history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    marketId: { type: "string", format: "uuid" },
                    history: {
                      type: "array",
                      items: { $ref: "#/components/schemas/OrcaOddsUpdate" },
                    },
                    count: { type: "integer" },
                  },
                },
              },
            },
          },
          404: { description: "Market not found" },
        },
      },
    },

    // ============ Debug Endpoints ============
    "/debug/memory": {
      get: {
        operationId: "debugGetMemory",
        tags: ["Debug"],
        summary: "Get memory usage statistics",
        description: `
**[DEV][RUNTIME][MEMORY]{heap,rss,external}[#REF:routes.ts:860]**

Get current process memory usage using Node-compatible API.

\`\`\`typescript
// Uses process.memoryUsage() - available in Bun
const mem = process.memoryUsage();
return {
  heapUsed: formatBytes(mem.heapUsed),
  heapTotal: formatBytes(mem.heapTotal),
  rss: formatBytes(mem.rss),
  external: formatBytes(mem.external),
};
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Memory statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    heapUsed: {
                      type: "string",
                      example: "10.93 MB",
                      description: "V8 heap used",
                    },
                    heapTotal: {
                      type: "string",
                      example: "15.19 MB",
                      description: "V8 heap total",
                    },
                    external: {
                      type: "string",
                      example: "3.31 MB",
                      description: "External memory (C++ objects)",
                    },
                    rss: {
                      type: "string",
                      example: "35.05 MB",
                      description: "Resident set size",
                    },
                    arrayBuffers: { type: "string", example: "0.50 MB" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/debug/runtime": {
      get: {
        operationId: "debugGetRuntime",
        tags: ["Debug"],
        summary: "Get Bun runtime information",
        description: `
**[DEV][RUNTIME][INFO]{bun,version,platform}[#REF:routes.ts:880]**

Get Bun runtime version and platform information.

\`\`\`typescript
// Bun global object
return {
  bunVersion: Bun.version,
  revision: Bun.revision,
  platform: process.platform,
  arch: process.arch,
  pid: process.pid,
};
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Runtime information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    bunVersion: { type: "string", example: "1.3.2" },
                    revision: { type: "string", example: "a1b2c3d4" },
                    platform: {
                      type: "string",
                      example: "darwin",
                      enum: ["darwin", "linux", "win32"],
                    },
                    arch: {
                      type: "string",
                      example: "arm64",
                      enum: ["arm64", "x64"],
                    },
                    pid: { type: "integer", example: 12345 },
                    uptime: { type: "string", example: "5.23 minutes" },
                    cwd: {
                      type: "string",
                      example: "/Users/dev/trader-analyzer-bun",
                    },
                    hostname: { type: "string", example: "localhost" },
                    ipv4: {
                      type: "string",
                      nullable: true,
                      example: "192.168.1.100",
                    },
                    ipv6: {
                      type: "string",
                      nullable: true,
                      example: "fe80::1",
                    },
                    localIP: {
                      type: "string",
                      nullable: true,
                      example: "192.168.1.100",
                    },
                    socket: {
                      type: "object",
                      nullable: true,
                      properties: {
                        localAddress: { type: "string", example: "127.0.0.1" },
                        localPort: { type: "integer", example: 54321 },
                        localFamily: {
                          type: "string",
                          example: "IPv4",
                          enum: ["IPv4", "IPv6"],
                        },
                        remoteAddress: { type: "string", example: "127.0.0.1" },
                        remotePort: { type: "integer", example: 80 },
                        remoteFamily: {
                          type: "string",
                          example: "IPv4",
                          enum: ["IPv4", "IPv6"],
                        },
                      },
                      description: "Bun 1.3+ enhanced socket information",
                    },
                    rapidhash: {
                      type: "object",
                      properties: {
                        available: { type: "boolean", example: true },
                        example: {
                          type: "string",
                          nullable: true,
                          example: "9166712279701818032",
                        },
                      },
                      description: "Bun 1.3+ rapidhash (fast non-cryptographic hashing)",
                    },
                    processFeatures: {
                      type: "object",
                      nullable: true,
                      properties: {
                        timeout: { type: "boolean", example: true },
                        maxBuffer: { type: "boolean", example: true },
                        readableStreamStdin: { type: "boolean", example: true },
                      },
                      description:
                        "Bun 1.3+ process spawning features (timeout, maxBuffer, ReadableStream stdin)",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/debug/heap-snapshot": {
      post: {
        operationId: "debugHeapSnapshot",
        tags: ["Debug"],
        summary: "Generate V8 heap snapshot",
        description: `
**[DEV][RUNTIME][HEAP]{v8,snapshot,devtools}[#REF:routes.ts:900]**

Generate V8 heap snapshot for memory analysis. Open in Chrome DevTools Memory tab.

\`\`\`typescript
// Bun native heap snapshot
Bun.generateHeapSnapshot(path);
\`\`\`

**Usage**: Open \`.heapsnapshot\` file in Chrome DevTools → Memory → Load
        `.trim(),
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "Output file path",
                    example: "./data/heap-2025-01-15.heapsnapshot",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Snapshot generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    path: { type: "string" },
                    size: { type: "string", example: "5.2 MB" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/debug/cpu-profile": {
      post: {
        operationId: "debugCpuProfile",
        tags: ["Debug"],
        summary: "CPU profiling instructions (Bun 1.3.2+)",
        description: `
**[DEV][RUNTIME][CPU]{bun:1.3.2,--cpu-prof,devtools}[#REF:routes.ts:930]**

Get instructions for CPU profiling with \`bun --cpu-prof\` (Bun 1.3.2+).

\`\`\`bash
# Generate CPU profile
bun --cpu-prof --cpu-prof-dir=./data --cpu-prof-name=profile.cpuprofile src/index.ts

# Analyze in Chrome DevTools
# 1. Open chrome://inspect
# 2. Click "Open dedicated DevTools for Node"
# 3. Go to Performance tab
# 4. Load the .cpuprofile file
\`\`\`
        `.trim(),
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  duration: {
                    type: "integer",
                    default: 5000,
                    description: "Suggested sampling duration (ms)",
                  },
                  outputDir: { type: "string", default: "./data" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profiling instructions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    instructions: {
                      type: "object",
                      properties: {
                        cli: {
                          type: "string",
                          example: "bun --cpu-prof --cpu-prof-dir=./data src/index.ts",
                        },
                        duration: { type: "string" },
                        analyze: {
                          type: "string",
                          example: "Open .cpuprofile in Chrome DevTools Performance tab",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/debug/ws-subscriptions": {
      get: {
        operationId: "debugWsSubscriptions",
        tags: ["Debug"],
        summary: "WebSocket subscriptions (Bun 1.3.2+)",
        description: `
**[DEV][RUNTIME][WEBSOCKET]{bun:1.3.2,ServerWebSocket.subscriptions}[#REF:routes.ts:960]**

Get ORCA streaming WebSocket subscription info using \`ServerWebSocket.subscriptions\` getter (Bun 1.3.2+).

\`\`\`typescript
// New in Bun 1.3.2
websocket: {
  open(ws) {
    ws.subscribe('odds');
    console.log(ws.subscriptions); // Set { 'odds' }
  }
}
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "WebSocket subscription info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    available: {
                      type: "boolean",
                      description: "Whether streaming server is running",
                    },
                    serverPort: { type: "integer" },
                    connectedClients: { type: "integer" },
                    topics: {
                      type: "array",
                      items: { type: "string" },
                      example: ["odds", "events"],
                    },
                    note: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ Radiance WebSocket Pub-Sub ============
    "/ws/radiance": {
      get: {
        operationId: "connectRadianceIdentity",
        tags: ["Radiance WebSocket"],
        summary: "Connect to Radiance Identity WebSocket (17.11.0.0.0.0.0)",
        security: [{ QueryToken: [] }, { BearerAuth: [] }, { SessionCookie: [] }],
        description: `
**[RADIANCE][REALTIME][WEBSOCKET]{per-socket-identity,contextual-filtering}[RadianceIdentityServer][#REF:17.11.0.0.0.0.0-identity/17.11.1.0.0.0.0-ws.identity.server.ts]**

Connect to the Radiance Identity WebSocket server with per-socket contextual identity and server-side filtering.

**Features:**
- Per-socket identity via Bun-native \`ws.data\` injection
- Server-side filtering based on user role and preferences
- No shared state, no client-side filtering needed
- Full 17.0.0.0.0.0.0 semantic fidelity

**Authentication:**
- Query parameter: \`?token=<token>\`
- Authorization header: \`Authorization: Bearer <token>\`
- Cookie: \`session=<token>\`

**Auto-Subscribe by Role:**
- Engineer: CRITICAL + HIGH severity, min 5% profit
- Analyst: CRITICAL only, min 10% profit, Pinnacle/Cloudbet only
- Observer: Full firehose (all events)

**Client Connection:**
\`\`\`typescript
const ws = new WebSocket("ws://localhost:8080/ws/radiance?token=eng-alpha-001");

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "RADIANCE_IDENTITY_CONFIRMED") {
    console.log("Identity:", msg.identity);
  }
  if (msg.type === "RADIANCE_EVENT_17_11") {
    console.log("Event:", msg.data); // Already filtered for your role
  }
};
\`\`\`

**See Also:**
- [17.11.0.0.0.0.0 Per-Socket Contextual Radiance Identity](./src/17.11.0.0.0.0.0-identity/)
- [17.5.0.0.0.0.0 README](./src/17.0.0.0.0.0.0-dashboard/17.5.0.0.0.0.0-README.md)
        `.trim(),
        parameters: [
          {
            name: "token",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Authentication token (or use Authorization header/Cookie)",
            example: "eng-alpha-001",
          },
        ],
        responses: {
          101: {
            description: "Switching Protocols - WebSocket upgrade successful",
          },
          401: {
            description: "Unauthorized - Invalid or missing token",
          },
          400: {
            description: "Bad Request - WebSocket upgrade failed",
          },
        },
      },
    },
    "/ws/pubsub": {
      get: {
        operationId: "connectRadiancePubSub",
        tags: ["Radiance WebSocket"],
        summary: "Connect to Radiance Pub-Sub WebSocket (17.12.0.0.0.0.0 / 17.13.0.0.0.0.0)",
        security: [{ QueryToken: [] }, { BearerAuth: [] }, { SessionCookie: [] }],
        description: `
**[RADIANCE][REALTIME][WEBSOCKET]{pub-sub,compression,multi-channel}[RadiancePubSubServer][#REF:17.13.0.0.0.0.0-compression/17.13.1.0.0.0.0-pubsub.compressed.server.ts]**

Connect to the Hyper-Bun Radiance Pub-Sub WebSocket server with multi-channel support and per-message deflate compression.

**Features:**
- Bun-native multi-channel pub-sub with \`subscribe\`/\`publish\`/\`unsubscribe\`
- Per-role auto-subscribe: engineers get "critical" + "high", analysts get "critical", observers get "all"
- Per-message deflate compression (RFC 7692) - ~68-74% bandwidth reduction
- Server-side filtering: events published to severity channels, only subscribers receive
- Dynamic subscribe/unsubscribe via WebSocket messages

**Channels:**
- \`radiance-critical\` - CRITICAL severity events
- \`radiance-high\` - HIGH severity events
- \`radiance-warn\` - WARN severity events
- \`radiance-info\` - INFO severity events
- \`radiance-all\` - Full firehose (all events)
- \`radiance-custom\` - User-defined channels

**Compression (17.13.0.0.0.0.0):**
- Per-message deflate enabled globally via \`perMessageDeflate: true\`
- ~68-74% bandwidth reduction on RadiantLog streams
- Sub-10ms perception latency preserved (streaming, non-blocking)
- Zero client-side code changes required (browser automatically decompresses)

**Authentication:**
- Query parameter: \`?token=<token>\`
- Authorization header: \`Authorization: Bearer <token>\`
- Cookie: \`session=<token>\`

**Client Connection:**
\`\`\`typescript
const ws = new WebSocket("ws://localhost:8080/ws/pubsub?token=eng-alpha-001");

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data); // Bun already decompressed
  if (msg.type === "RADIANCE_IDENTITY_CONFIRMED") {
    console.log("Subscribed to:", msg.payload.channels);
  }
  if (msg.type === "RADIANCE_PUBLISH") {
    console.log("Event:", msg.payload);
  }
};

// Manual subscribe/unsubscribe
ws.send(JSON.stringify({ type: "SUBSCRIBE", channel: "radiance-warn" }));
ws.send(JSON.stringify({ type: "UNSUBSCRIBE", channel: "radiance-high" }));
\`\`\`

**Message Types:**
- \`SUBSCRIBE\` - Subscribe to a channel
- \`UNSUBSCRIBE\` - Unsubscribe from a channel
- \`RADIANCE_PUBLISH\` - Publish custom message to channel (if subscribed)
- \`RADIANCE_IDENTITY_CONFIRMED\` - Connection confirmation with subscribed channels
- \`RADIANCE_EVENT_17_11\` - Radiance telemetry event (compressed)

**See Also:**
- [17.12.0.0.0.0.0 Pub-Sub Server](./src/17.12.0.0.0.0.0-pubsub/)
- [17.13.0.0.0.0.0 Compressed Pub-Sub](./src/17.13.0.0.0.0.0-compression/)
- [17.5.0.0.0.0.0 README](./src/17.0.0.0.0.0.0-dashboard/17.5.0.0.0.0.0-README.md)
        `.trim(),
        parameters: [
          {
            name: "token",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Authentication token (or use Authorization header/Cookie)",
            example: "eng-alpha-001",
          },
        ],
        responses: {
          101: {
            description: "Switching Protocols - WebSocket upgrade successful",
          },
          401: {
            description: "Unauthorized - Invalid or missing token",
          },
          400: {
            description: "Bad Request - WebSocket upgrade failed",
          },
        },
      },
    },

    // ============ Terminal Environment ============
    "/docs/terminal": {
      get: {
        operationId: "getTerminalEnvironmentDocs",
        tags: ["Terminal Environment"],
        summary: "Terminal Environment Documentation (11.0.0.0.0.0.0)",
        description: `
**[DEV][TERMINAL][MLGS]{tmux,bun-console,ripgrep-discovery}[TerminalEnvironment][#REF:docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md]**

Complete terminal development environment optimized for Multi-Layer Graph System (MLGS) development.

**Features:**
- **Tmux Sessions**: Pre-configured tmux sessions for MLGS development
- **Bun Console**: Interactive console with preloaded shadow graph, steam detector, and arbitrage modules
- **Module-Specific Sessions**: Core, Analytics, Research, Monitoring sessions
- **Ripgrep Discovery**: Version numbers enable instant cross-file, cross-language discovery
- **Color Integration**: Unified tmux ↔ dashboard color schemes

**Quick Start:**
\`\`\`bash
# Setup (one-time)
bun run tmux:setup

# Start development environment
bun run tmux:start

# Or start specific module session
./scripts/tmux-mlgs.sh core        # Core development
./scripts/tmux-mlgs.sh analytics   # Analytics & correlation
./scripts/tmux-mlgs.sh research    # Research tools
./scripts/tmux-mlgs.sh monitoring  # Monitoring & observability
\`\`\`

**Module Sessions:**
- **Core** (\`mlgs-core\`): Main development workflow with dev server, tests, type checking
- **Analytics** (\`mlgs-analytics\`): Dashboard, correlation engine, performance monitoring
- **Research** (\`mlgs-research\`): Research console, scripts, data analysis tools
- **Monitoring** (\`mlgs-monitoring\`): Logs, chaos tests, health checks

**Bun Console Features:**
- Auto-completion for MLGS-specific commands and IDs
- Performance tools: Built-in benchmarking and timing
- Research commands: Quick access to research data
- Context awareness: Project-specific globals pre-loaded
- Persistent command history

**Ripgrep Discovery:**
Version numbers (\`11.x.x.x.x.x.x\`) enable instant discovery across:
- TypeScript implementation code
- Shell scripts and configuration
- Markdown documentation
- Test suites
- Package.json scripts

**Example Ripgrep Commands:**
\`\`\`bash
# Find all terminal environment references
rg "11\.0\.0\.0\.0\.0\.0" .

# Find tmux configuration
rg "11\.1\." .

# Find console configuration
rg "11\.2\." .

# Find setup scripts
rg "11\.3\." .
\`\`\`

**See Also:**
- [Terminal Environment Documentation](./docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md)
- [Color Mapping Quick Reference](./docs/11.4.5-COLOR-MAPPING-QUICK-REFERENCE.md)
- [Tmux CSS Ecosystem Integration](./docs/11.4.6-TMUX-CSS-ECOSYSTEM-INTEGRATION.md)
        `.trim(),
        responses: {
          200: {
            description: "Terminal environment documentation",
            content: {
              "text/markdown": {
                schema: {
                  type: "string",
                  description: "Markdown documentation content",
                },
              },
            },
          },
        },
      },
    },

    // ============ Registry System ============
    "/registry": {
      get: {
        operationId: "getRegistriesOverview",
        tags: ["Registry"],
        summary: "Get all registries overview",
        description: `
**[REGISTRY][SYSTEM][OVERVIEW]{16-registries,categories,metrics}[#REF:api/registry.ts:108]**

Returns comprehensive overview of all 16 platform registries with metadata, tags, use cases, and metrics.

**Categories**: \`data\`, \`tooling\`, \`security\`, \`research\`, \`integration\`, \`cli\`

**Registry Types**:
1. **Data Registries**: properties, data-sources, sharp-books
2. **Tooling Registries**: mcp-tools, css-bundler, bun-apis
3. **Security Registries**: bookmaker-profiles, security-threats
4. **Research Registries**: url-anomaly-patterns, tension-patterns
5. **Integration Registries**: errors, team-departments, topics, api-examples, mini-app
6. **CLI Registries**: cli-commands
        `.trim(),
        responses: {
          200: {
            description: "Registry overview",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegistryOverview" },
              },
            },
          },
        },
      },
    },
    "/registry/{registryId}": {
      get: {
        operationId: "getRegistry",
        tags: ["Registry"],
        summary: "Get specific registry",
        description: `
**[REGISTRY][SYSTEM][QUERY]{by-id,items,metadata}[#REF:api/routes.ts:4759]**

Get all items in a specific registry by ID.

**Supported Registry IDs**:
- \`properties\` - Property definitions with versioning
- \`data-sources\` - Data source definitions with RBAC
- \`sharp-books\` - Sharp bookmaker configurations
- \`bookmaker-profiles\` - Bookmaker endpoint profiles
- \`mcp-tools\` - Model Context Protocol tools
- \`css-bundler\` - CSS bundler utilities
- \`bun-apis\` - Bun API coverage
- \`errors\` - Error code registry
- \`security-threats\` - Security threat monitoring
- \`url-anomaly-patterns\` - URL anomaly patterns
- \`tension-patterns\` - Market tension patterns
- \`cli-commands\` - CLI commands registry
- \`team-departments\` - Team structure and departments
- \`topics\` - GitHub topics and categories
- \`api-examples\` - API usage examples
- \`mini-app\` - Factory Wager Mini App registry
        `.trim(),
        parameters: [
          {
            name: "registryId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "properties",
                "data-sources",
                "sharp-books",
                "bookmaker-profiles",
                "mcp-tools",
                "css-bundler",
                "bun-apis",
                "errors",
                "security-threats",
                "url-anomaly-patterns",
                "tension-patterns",
                "cli-commands",
                "team-departments",
                "topics",
                "api-examples",
                "mini-app",
              ],
            },
            description: "Registry identifier",
          },
        ],
        responses: {
          200: {
            description: "Registry data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegistryResponse" },
              },
            },
          },
          404: {
            description: "Registry not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/registry/cli-commands": {
      get: {
        operationId: "getCLICommandsRegistry",
        tags: ["Registry"],
        summary: "Get CLI commands registry",
        description: `
**[REGISTRY][CLI][COMMANDS]{telegram,mcp,dashboard,fetch,security}[#REF:api/registry.ts:1189]**

Returns all CLI commands with version tracking (11.x.x.x.x.x.x system), usage examples, and cross-references.

**Commands**: telegram, mcp, dashboard, fetch, security, management, github, password
        `.trim(),
        responses: {
          200: {
            description: "CLI commands registry",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CLICommandsRegistry" },
              },
            },
          },
        },
      },
    },
    "/registry/errors": {
      get: {
        operationId: "getErrorRegistry",
        tags: ["Registry"],
        summary: "Get error code registry",
        description: `
**[REGISTRY][ERRORS][CODES]{nx-xxx,categories,recoverable}[#REF:api/registry.ts:708]**

Returns error code registry with NX-xxx codes, categories, and documentation references.
        `.trim(),
        responses: {
          200: {
            description: "Error registry",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorRegistry" },
              },
            },
          },
        },
      },
    },
    "/registry/url-anomaly-patterns": {
      get: {
        operationId: "getURLAnomalyPatterns",
        tags: ["Registry"],
        summary: "Get URL anomaly patterns",
        description: `
**[REGISTRY][RESEARCH][PATTERNS]{url-anomalies,false-steam,forensic}[#REF:api/registry.ts:812]**

Returns URL anomaly patterns discovered from forensic logging for false steam detection.

**Query Parameters**:
- \`sport\` (optional): Sport filter (default: "NBA")
- \`hours\` (optional): Time window in hours (default: 24)
        `.trim(),
        parameters: [
          {
            name: "sport",
            in: "query",
            schema: { type: "string", default: "NBA" },
            description: "Sport filter",
          },
          {
            name: "hours",
            in: "query",
            schema: { type: "integer", default: 24 },
            description: "Time window in hours",
          },
        ],
        responses: {
          200: {
            description: "URL anomaly patterns",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/URLAnomalyPatternsRegistry",
                },
              },
            },
          },
        },
      },
    },
    "/registry/category/{category}": {
      get: {
        operationId: "getRegistriesByCategory",
        tags: ["Registry"],
        summary: "Filter registries by category",
        description: `
**[REGISTRY][SYSTEM][FILTER]{category,data,tooling,security,research,integration,cli}[#REF:api/registry.ts]**

Filter registries by category: \`data\`, \`tooling\`, \`security\`, \`research\`, \`integration\`, \`cli\`
        `.trim(),
        parameters: [
          {
            name: "category",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: ["data", "tooling", "security", "research", "integration", "cli"],
            },
            description: "Registry category",
          },
        ],
        responses: {
          200: {
            description: "Filtered registries",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegistryOverview" },
              },
            },
          },
        },
      },
    },
    "/registry/search": {
      get: {
        operationId: "searchRegistries",
        tags: ["Registry"],
        summary: "Search registries by tag and/or category",
        description: `
**[REGISTRY][SYSTEM][SEARCH]{tag,category,filter}[#REF:api/registry.ts]**

Search registries by tag and/or category filter.
        `.trim(),
        parameters: [
          {
            name: "tag",
            in: "query",
            schema: { type: "string" },
            description: "Tag to search for",
          },
          {
            name: "category",
            in: "query",
            schema: {
              type: "string",
              enum: ["data", "tooling", "security", "research", "integration", "cli"],
            },
            description: "Category filter",
          },
        ],
        responses: {
          200: {
            description: "Search results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegistryOverview" },
              },
            },
          },
        },
      },
    },
    // ============ Market Graph & Shadow Graph Endpoints ============
    "/api/events/{eventId}/market-graph": {
      get: {
        operationId: "getMarketGraph",
        tags: ["Market Graph"],
        summary: "Get shadow movement graph for an event",
        description: `
**[MARKET][GRAPH][SHADOW]{nodes,links,propagation}[#REF:arbitrage/shadow-graph/]**

Retrieve the ShadowMovementGraph for an event, including MarketOfferingNode objects and MarketPropagationLink relationships.

**Graph Structure:**
- \`MarketOfferingNode\` - Represents market offerings with liquidity profiles
- \`MarketPropagationLink\` - Represents propagation relationships between nodes
- Dark pool offerings are included when detected

**Example:**
\`\`\`typescript
const response = await fetch('/api/events/nba-lakers-warriors-2024-01-15/market-graph');
const graph = await response.json();
// { nodes: [...], links: [...], metadata: {...} }
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Event identifier (e.g., 'nba-lakers-warriors-2024-01-15')",
          },
        ],
        responses: {
          200: {
            description: "Shadow movement graph data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShadowMovementGraph" },
              },
            },
          },
          404: {
            description: "Event not found",
          },
        },
      },
    },
    "/api/events/{eventId}/market-offerings/dark-pool": {
      get: {
        operationId: "getDarkPoolOfferings",
        tags: ["Market Graph"],
        summary: "Get discovered dark pool offerings for an event",
        description: `
**[MARKET][GRAPH][DARK-POOL]{offerings,liquidity}[#REF:arbitrage/shadow-graph/]**

Expose discovered dark pool market offerings that are not publicly visible but detected through shadow graph analysis.

**Dark Pool Characteristics:**
- Hidden liquidity sources
- Non-public market offerings
- Detected through propagation patterns
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Event identifier",
          },
        ],
        responses: {
          200: {
            description: "Dark pool offerings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    eventId: { type: "string" },
                    offerings: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DarkPoolOffering" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/events/{eventId}/market-offerings/{nodeId}/liquidity": {
      get: {
        operationId: "getNodeLiquidity",
        tags: ["Market Graph"],
        summary: "Get true liquidity profile for a market node",
        description: `
**[MARKET][GRAPH][LIQUIDITY]{profile,true-liquidity}[#REF:arbitrage/shadow-graph/]**

Retrieve the true liquidity profile for a specific market offering node, including hidden liquidity sources.

**Liquidity Profile Includes:**
- Public liquidity
- Hidden/dark pool liquidity
- Aggregate true liquidity
- Liquidity distribution over time
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "nodeId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Market offering node ID",
          },
        ],
        responses: {
          200: {
            description: "Liquidity profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LiquidityProfile" },
              },
            },
          },
        },
      },
    },
    "/api/events/{eventId}/market-offerings/{nodeId}/is-deceptive": {
      get: {
        operationId: "checkDeceptiveLine",
        tags: ["Market Graph"],
        summary: "Check if a market line is deceptive",
        description: `
**[MARKET][GRAPH][DECEPTIVE]{line-detection,false-steam}[#REF:arbitrage/shadow-graph/]**

Check if a specific market offering node represents a deceptive line that could cause false steam signals.

**Deceptive Line Indicators:**
- URL anomaly patterns
- Hidden propagation paths
- False liquidity signals
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "nodeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Deceptive line analysis",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nodeId: { type: "string" },
                    isDeceptive: { type: "boolean" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    reasons: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ============ Covert Steam & Arbitrage Endpoints ============
    "/api/events/{eventId}/covert-steam-events": {
      get: {
        operationId: "getCovertSteamEvents",
        tags: ["Covert Steam"],
        summary: "List detected covert steam events for an event",
        description: `
**[COVERT-STEAM][EVENTS][LIST]{detection,severity}[#REF:arbitrage/shadow-graph/covert-steam-detector.ts]**

List all detected CovertSteamEventRecord objects for a specific event.

**Covert Steam Events:**
- Detected through shadow graph analysis
- Include severity scoring (0-10)
- Track propagation paths
- Include bookmaker and dark node information
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "severity",
            in: "query",
            schema: { type: "number", minimum: 0, maximum: 10 },
            description: "Minimum severity score filter",
          },
          {
            name: "bookmaker",
            in: "query",
            schema: { type: "string" },
            description: "Filter by bookmaker name",
          },
        ],
        responses: {
          200: {
            description: "List of covert steam events",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    eventId: { type: "string" },
                    events: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CovertSteamEventRecord" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/events/{eventId}/concealed-arbitrage-opportunities": {
      get: {
        operationId: "getConcealedArbitrageOpportunities",
        tags: ["Arbitrage"],
        summary: "List concealed arbitrage opportunities",
        description: `
**[ARBITRAGE][CONCEALED][OPPORTUNITIES]{shadow-graph,hidden}[#REF:arbitrage/shadow-graph/concealed-arb-scanner.ts]**

List ConcealedArbOpportunities detected through shadow graph analysis. These are arbitrage opportunities that exist in dark pools or hidden markets.

**Concealed Arbitrage:**
- Hidden market opportunities
- Dark pool arbitrage
- Cross-market concealed edges
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "minSpread",
            in: "query",
            schema: { type: "number" },
            description: "Minimum spread percentage",
          },
        ],
        responses: {
          200: {
            description: "Concealed arbitrage opportunities",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    eventId: { type: "string" },
                    opportunities: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ConcealedArbOpportunity" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ============ Circuit Breaker Endpoints ============
    "/api/circuit-breakers/status": {
      get: {
        operationId: "getCircuitBreakerStatus",
        tags: ["Circuit Breaker"],
        summary: "Get circuit breaker status for all bookmakers",
        description: `
**[CIRCUIT-BREAKER][STATUS][ALL]{bookmakers,tripped,metrics}[#REF:utils/production-circuit-breaker.ts]**

Get status for all bookmakers monitored by the production circuit breaker system.

**Status Information:**
- Tripped state (boolean)
- Failure counts
- Average latency
- Trip history
- Last reset information

**See Also:**
- \`GET /api/circuit-breakers/{bookmaker}\` - Get status for specific bookmaker
- \`POST /api/circuit-breakers/{bookmaker}/reset\` - Manual reset (Admin only)
- \`POST /api/circuit-breakers/{bookmaker}/trip\` - Manual trip (Admin only)
        `.trim(),
        responses: {
          200: {
            description: "Circuit breaker status for all bookmakers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    bookmakers: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CircuitBreakerStatus" },
                    },
                    total: { type: "integer" },
                    trippedCount: { type: "integer" },
                    healthyCount: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/circuit-breakers/{bookmaker}": {
      get: {
        operationId: "getCircuitBreakerStatusForBookmaker",
        tags: ["Circuit Breaker"],
        summary: "Get circuit breaker status for a specific bookmaker",
        description: `
**[CIRCUIT-BREAKER][STATUS][BOOKMAKER]{tripped,failures,latency}[#REF:utils/production-circuit-breaker.ts]**

Get detailed circuit breaker status for a specific bookmaker.
        `.trim(),
        parameters: [
          {
            name: "bookmaker",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Bookmaker name (e.g., 'draftkings', 'fanduel')",
          },
        ],
        responses: {
          200: {
            description: "Circuit breaker status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CircuitBreakerStatus" },
              },
            },
          },
          404: {
            description: "Bookmaker not found",
          },
        },
      },
    },
    "/api/circuit-breakers/{bookmaker}/trip": {
      post: {
        operationId: "tripCircuitBreaker",
        tags: ["Circuit Breaker"],
        summary: "Manually trip circuit breaker (Admin only)",
        description: `
**[CIRCUIT-BREAKER][ADMIN][TRIP]{maintenance,manual}[#REF:utils/production-circuit-breaker.ts]**

Manually trip the circuit breaker for a bookmaker. Useful for scheduled maintenance or incident response.

**Admin Only**: Requires authentication and admin privileges.

**Use Cases:**
- Scheduled maintenance windows
- Known API issues
- Emergency incident response
        `.trim(),
        parameters: [
          {
            name: "bookmaker",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: {
                    type: "string",
                    description: "Reason for manual trip",
                    example: "Scheduled maintenance window",
                  },
                },
                required: ["reason"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Circuit breaker tripped successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    bookmaker: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized - Admin access required",
          },
        },
      },
    },
    "/api/circuit-breakers/{bookmaker}/reset": {
      post: {
        operationId: "resetCircuitBreaker",
        tags: ["Circuit Breaker"],
        summary: "Manually reset circuit breaker (Admin only)",
        description: `
**[CIRCUIT-BREAKER][ADMIN][RESET]{recovery,manual}[#REF:utils/production-circuit-breaker.ts]**

Manually reset the circuit breaker for a bookmaker after incident resolution.

**Admin Only**: Requires authentication and admin privileges.

**Cooldown Period**: Resets are subject to cooldown periods to prevent rapid toggling.

**Force Reset**: Can bypass cooldown with \`force: true\` (use with caution).
        `.trim(),
        parameters: [
          {
            name: "bookmaker",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: {
                    type: "string",
                    description: "Reason for reset",
                    example: "API team cleared incident",
                  },
                  force: {
                    type: "boolean",
                    description: "Force reset (bypass cooldown)",
                    default: false,
                  },
                },
                required: ["reason"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Circuit breaker reset successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    bookmaker: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Reset failed (e.g., cooldown period active)",
          },
          401: {
            description: "Unauthorized - Admin access required",
          },
        },
      },
    },
    // ============ Logging & Operational Controls ============
    "/api/logs/codes": {
      get: {
        operationId: "getLogCodes",
        tags: ["Logging"],
        summary: "Get log codes registry",
        description: `
**[LOGGING][CODES][REGISTRY]{log-codes,levels}[#REF:logging/log-codes.ts]**

Retrieve the LOG_CODES registry containing all standardized log codes used throughout the system.

**Log Code Format:**
- Structured codes for consistent logging
- Category-based organization
- Includes severity levels and descriptions
        `.trim(),
        responses: {
          200: {
            description: "Log codes registry",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    codes: {
                      type: "object",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          code: { type: "string" },
                          level: {
                            type: "string",
                            enum: ["error", "warn", "info", "debug"],
                          },
                          description: { type: "string" },
                          category: { type: "string" },
                        },
                      },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/log-level/{sourceModule}": {
      patch: {
        operationId: "updateLogLevel",
        tags: ["Logging"],
        summary: "Dynamically adjust log level for a source module",
        description: `
**[LOGGING][CONTROL][DYNAMIC]{log-level,module}[#REF:logging/index.ts]**

Dynamically adjust the log level for a specific source module at runtime.

**Supported Levels:**
- \`error\` - Only errors
- \`warn\` - Warnings and errors
- \`info\` - Info, warnings, and errors
- \`debug\` - All log levels

**Use Cases:**
- Debugging specific modules
- Reducing noise in production
- Temporary verbose logging for troubleshooting

**Version**: 16.5.1.0.0.0.0
        `.trim(),
        parameters: [
          {
            name: "sourceModule",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Source module identifier (e.g., 'arbitrage.shadow-graph', 'api.routes')",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  level: {
                    type: "string",
                    enum: ["error", "warn", "info", "debug"],
                    description: "New log level",
                  },
                },
                required: ["level"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Log level updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    module: { type: "string" },
                    previousLevel: { type: "string" },
                    newLevel: { type: "string" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid log level or module",
          },
        },
      },
    },

    // ============ RSS & Discovery Endpoints ============
    "/rss.xml": {
      get: {
        operationId: "getRSSFeed",
        tags: ["Discovery"],
        summary: "RSS 2.0 compliant feed",
        description: `
**[CORE][DISCOVERY][FEEDS]{rss,version,updates}[#REF:routes.ts:1253]**

RSS feed with system updates, endpoint changes, and version information.

**RSS 2.0 Compliance:**
- Required elements: \`<rss version="2.0">\`, \`<channel>\`, \`<title>\`, \`<link>\`, \`<description>\`
- RFC 822 date format for timestamps
- Enhanced metadata with git commit information

\`\`\`typescript
// @see src/api/routes.ts:1253
api.get('/rss.xml', async (c) => {
  c.header('Content-Type', 'application/rss+xml; charset=utf-8');
  return c.text(await generateRSSFeed());
});
\`\`\`

**See Also:**
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- \`GET /rss\` - RSS feed alias
- \`GET /sitemap.xml\` - XML Sitemap
        `.trim(),
        responses: {
          200: {
            description: "RSS feed XML",
            headers: {
              "Content-Type": {
                schema: {
                  type: "string",
                  example: "application/rss+xml; charset=utf-8",
                },
              },
            },
            content: {
              "application/rss+xml": {
                schema: {
                  type: "string",
                  description: "RSS 2.0 XML feed",
                },
                example: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NEXUS Trading Platform</title>
    <link>http://localhost:3001/api</link>
    <description>NEXUS Trading Intelligence Platform</description>
    <item>
      <title>System Update</title>
      <link>http://localhost:3001/api</link>
      <description>Latest system updates</description>
      <pubDate>Mon, 15 Jan 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`,
              },
            },
          },
        },
      },
    },
    "/rss": {
      get: {
        operationId: "getRSSFeedAlias",
        tags: ["Discovery"],
        summary: "RSS feed alias",
        description: `
**[CORE][DISCOVERY][FEEDS]{rss-alias}[#REF:routes.ts:1258]**

Alias for \`GET /rss.xml\`. Returns the same RSS 2.0 compliant feed.
        `.trim(),
        responses: {
          200: {
            description: "RSS feed XML",
            content: {
              "application/rss+xml": {
                schema: {
                  type: "string",
                  description: "RSS 2.0 XML feed",
                },
              },
            },
          },
        },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "getSitemap",
        tags: ["Discovery"],
        summary: "XML Sitemap",
        description: `
**[CORE][DISCOVERY][FEEDS]{sitemap,seo}[#REF:routes.ts:1270]**

Standard XML sitemap for crawlers/SEO. Lists all available API endpoints and their priorities.

\`\`\`typescript
// @see src/api/routes.ts:1270
api.get('/sitemap.xml', (c) => {
  const sitemap = generateSitemap();
  c.header('Content-Type', 'application/xml');
  return c.text(sitemap);
});
\`\`\`

**See Also:**
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
        `.trim(),
        responses: {
          200: {
            description: "XML sitemap",
            headers: {
              "Content-Type": {
                schema: {
                  type: "string",
                  example: "application/xml",
                },
              },
            },
            content: {
              "application/xml": {
                schema: {
                  type: "string",
                  description: "XML sitemap format",
                },
              },
            },
          },
        },
      },
    },
    "/discovery": {
      get: {
        operationId: "getApiDiscovery",
        tags: ["Discovery"],
        summary: "API Discovery",
        description: `
**[CORE][DISCOVERY][API]{endpoints,methods,paths}[#REF:routes.ts:1686]**

List all available endpoints from OpenAPI spec. Provides programmatic discovery of API capabilities.

\`\`\`typescript
// @see src/api/routes.ts:1686
api.get('/discovery', (c) => {
  return c.json(getApiDiscovery());
});
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "API discovery data",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DiscoveryResponse",
                },
              },
            },
          },
        },
      },
    },

    // ============ Changelog Endpoints ============
    "/changelog": {
      get: {
        operationId: "getChangelog",
        tags: ["Changelog"],
        summary: "Get changelog entries",
        description: `
**[CORE][VERSIONING][CHANGELOG]{git-commits,structured-data}[#REF:routes.ts:1309]**

Get structured changelog data from git commits. Returns version information, commits grouped by category, and optional CHANGELOG.md content.

\`\`\`typescript
// @see src/api/routes.ts:1309
api.get('/changelog', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  const category = c.req.query('category');
  // Returns structured changelog data
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of commits to return",
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category (feat, fix, docs, etc.)",
            schema: {
              type: "string",
              enum: ["feat", "fix", "docs", "refactor", "test", "chore"],
            },
          },
        ],
        responses: {
          200: {
            description: "Changelog entries",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChangelogResponse",
                },
              },
            },
          },
        },
      },
    },
    "/changelog/table": {
      get: {
        operationId: "getChangelogTable",
        tags: ["Changelog"],
        summary: "Get changelog as formatted table",
        description: `
**[CORE][VERSIONING][CHANGELOG]{cli-friendly,table}[#REF:routes.ts:1532]**

CLI-friendly tabular changelog using Bun.inspect.table(). Supports ANSI colors and customizable columns.

\`\`\`typescript
// @see src/api/routes.ts:1532
api.get('/changelog/table', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  const properties = c.req.query('properties')?.split(',');
  const colors = c.req.query('colors') !== 'false';
  // Returns formatted table using Bun.inspect.table()
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of commits to return",
            schema: {
              type: "integer",
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category",
            schema: {
              type: "string",
              enum: ["feat", "fix", "docs", "refactor", "test", "chore"],
            },
          },
          {
            name: "properties",
            in: "query",
            description: "Comma-separated list of columns to show",
            schema: {
              type: "string",
              example: "hash,category,message",
            },
          },
          {
            name: "colors",
            in: "query",
            description: "Enable ANSI colors",
            schema: {
              type: "boolean",
              default: true,
            },
          },
        ],
        responses: {
          200: {
            description: "Formatted changelog table",
            headers: {
              "Content-Type": {
                schema: {
                  type: "string",
                  example: "text/plain",
                },
              },
            },
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  description: "ANSI-colored table output",
                },
              },
            },
          },
        },
      },
    },

    // ============ Examples Endpoints ============
    "/examples": {
      get: {
        operationId: "getExamples",
        tags: ["Examples"],
        summary: "Get all API examples",
        description: `
**[DEV][DOCUMENTATION][EXAMPLES]{code-samples,bun-apis}[#REF:routes.ts:1715]**

Returns code examples for key Bun APIs and integrations. Supports filtering by category or name.

\`\`\`typescript
// @see src/api/routes.ts:1715
api.get('/examples', async (c) => {
  const category = c.req.query('category');
  const name = c.req.query('name');
  // Returns examples array with categories
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "category",
            in: "query",
            description: "Filter examples by category",
            schema: {
              type: "string",
            },
          },
          {
            name: "name",
            in: "query",
            description: "Get specific example by name",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "API examples",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ExamplesResponse",
                },
              },
            },
          },
        },
      },
    },
    "/examples/{name}": {
      get: {
        operationId: "getExampleByName",
        tags: ["Examples"],
        summary: "Get example by name",
        description: `
**[DEV][DOCUMENTATION][EXAMPLES]{code-sample-by-name}[#REF:routes.ts:1771]**

Get a specific API example by name.

\`\`\`typescript
// @see src/api/routes.ts:1771
api.get('/examples/:name', async (c) => {
  const name = c.req.param('name');
  // Returns specific example object
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            description: "Example name",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Example object",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Example",
                },
              },
            },
          },
          404: {
            description: "Example not found",
          },
        },
      },
    },

    // ============ Security Endpoints ============
    "/security/threats": {
      get: {
        operationId: "getSecurityThreats",
        tags: ["Security"],
        summary: "Get security threat summary",
        description: `
**[SECURITY][MONITORING][THREATS]{threat-summary,grouped}[#REF:routes.ts:1786]**

Get recent security threats grouped by type. Provides threat intelligence and monitoring data.

\`\`\`typescript
// @see src/api/routes.ts:1786
api.get('/security/threats', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24');
  // Returns threats grouped by type
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "hours",
            in: "query",
            description: "Hours to look back",
            schema: {
              type: "integer",
              default: 24,
              minimum: 1,
              maximum: 168,
            },
          },
        ],
        responses: {
          200: {
            description: "Security threat summary",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SecurityThreatSummary",
                },
              },
            },
          },
        },
      },
    },
    "/security/incidents": {
      get: {
        operationId: "getSecurityIncidents",
        tags: ["Security"],
        summary: "Get active security incidents",
        description: `
**[SECURITY][MONITORING][INCIDENTS]{active-incidents}[#REF:routes.ts:1884]**

Get currently active security incidents. Returns incidents that are currently being tracked.

\`\`\`typescript
// @see src/api/routes.ts:1884
api.get('/security/incidents', async (c) => {
  // Returns active security incidents
});
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Active security incidents",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SecurityIncidentsResponse",
                },
              },
            },
          },
        },
      },
    },
    "/security/compliance": {
      get: {
        operationId: "getComplianceStatus",
        tags: ["Security"],
        summary: "Get compliance status",
        description: `
**[SECURITY][MONITORING][COMPLIANCE]{status,checks}[#REF:routes.ts:1900]**

Get compliance status and checks. Provides current compliance state and validation results.

\`\`\`typescript
// @see src/api/routes.ts:1900
api.get('/security/compliance', async (c) => {
  const { ComplianceLogger } = await import('../security/compliance-logger');
  // Returns compliance status
});
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Compliance status",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ComplianceStatus",
                },
              },
            },
          },
        },
      },
    },
    "/security/compliance/report": {
      get: {
        operationId: "getComplianceReport",
        tags: ["Security"],
        summary: "Get compliance report",
        description: `
**[SECURITY][MONITORING][COMPLIANCE]{detailed-report}[#REF:routes.ts:1916]**

Generate detailed compliance report. Provides comprehensive compliance analysis and recommendations.

\`\`\`typescript
// @see src/api/routes.ts:1916
api.get('/security/compliance/report', async (c) => {
  const { ComplianceLogger } = await import('../security/compliance-logger');
  // Returns detailed compliance report
});
\`\`\`
        `.trim(),
        responses: {
          200: {
            description: "Compliance report",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ComplianceReport",
                },
              },
            },
          },
        },
      },
    },

    // ============ Shadow Graph & Market Analysis Endpoints ============
    "/events/{eventId}/market-graph": {
      get: {
        operationId: "getShadowMarketGraph",
        tags: ["Shadow Graph", "Analytics"],
        summary: "Get shadow movement graph",
        description: `
**[ANALYTICS][SHADOW-GRAPH][MARKET-ANALYSIS]{nodes,links,propagation}[#REF:routes.ts:2289]**

Get shadow graph for an event showing hidden market movements. Returns nodes (market offerings) and links (movement propagation) with metadata.

\`\`\`typescript
// @see src/api/routes.ts:2289
api.get('/events/:eventId/market-graph', async (c) => {
  const eventId = c.req.param('eventId');
  // Builds shadow graph using ShadowGraphOrchestrator
  // Returns nodes and links with metadata
});
\`\`\`

**See Also:**
- [Shadow Graph System Documentation](https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/SHADOW-GRAPH-SYSTEM.md)
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Event identifier",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Shadow graph data",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ShadowGraphResponse",
                },
              },
            },
          },
          404: {
            description: "Event not found or no graph data available",
          },
        },
      },
    },
    "/events/{eventId}/market-offerings/dark-pool": {
      get: {
        operationId: "getDarkPoolOfferings",
        tags: ["Shadow Graph", "Analytics"],
        summary: "Get dark pool offerings",
        description: `
**[ANALYTICS][SHADOW-GRAPH][DARK-POOL]{hidden-liquidity}[#REF:routes.ts:2354]**

Get dark pool (hidden liquidity) offerings for an event. Returns market nodes with visibility set to "dark".

\`\`\`typescript
// @see src/api/routes.ts:2354
api.get('/events/:eventId/market-offerings/dark-pool', async (c) => {
  const eventId = c.req.param('eventId');
  // Filters nodes where visibility === 'dark'
  // Returns offerings array with true liquidity
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Event identifier",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Dark pool offerings",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DarkPoolOfferingsResponse",
                },
              },
            },
          },
        },
      },
    },
    "/events/{eventId}/market-offerings/{nodeId}/liquidity": {
      get: {
        operationId: "getNodeLiquidity",
        tags: ["Shadow Graph", "Analytics"],
        summary: "Get node liquidity analysis",
        description: `
**[ANALYTICS][SHADOW-GRAPH][LIQUIDITY]{public,hidden,true}[#REF:routes.ts:2403]**

Analyze liquidity for a specific market node. Returns breakdown of public, hidden, and true liquidity.

\`\`\`typescript
// @see src/api/routes.ts:2403
api.get('/events/:eventId/market-offerings/:nodeId/liquidity', async (c) => {
  const eventId = c.req.param('eventId');
  const nodeId = c.req.param('nodeId');
  // Returns liquidity breakdown for specific node
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Event identifier",
            schema: {
              type: "string",
            },
          },
          {
            name: "nodeId",
            in: "path",
            required: true,
            description: "Node identifier",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Liquidity analysis",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LiquidityAnalysis",
                },
              },
            },
          },
          404: {
            description: "Event or node not found",
          },
        },
      },
    },
    "/events/{eventId}/market-offerings/{nodeId}/is-deceptive": {
      get: {
        operationId: "checkDeceptiveLine",
        tags: ["Shadow Graph", "Analytics"],
        summary: "Check if line is deceptive",
        description: `
**[ANALYTICS][SHADOW-GRAPH][DECEPTIVE]{bait-line,correlation-deviation}[#REF:routes.ts:2443]**

Detect if a market line is deceptive (intentionally misleading). Checks for bait lines and correlation deviations.

\`\`\`typescript
// @see src/api/routes.ts:2443
api.get('/events/:eventId/market-offerings/:nodeId/is-deceptive', async (c) => {
  const eventId = c.req.param('eventId');
  const nodeId = c.req.param('nodeId');
  // Checks for bait lines and correlation deviation
  // Returns isDeceptive boolean with confidence and reasons
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Event identifier",
            schema: {
              type: "string",
            },
          },
          {
            name: "nodeId",
            in: "path",
            required: true,
            description: "Node identifier",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Deceptive line analysis",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DeceptiveLineAnalysis",
                },
              },
            },
          },
          404: {
            description: "Event or node not found",
          },
        },
      },
    },
    "/events/{eventId}/covert-steam-events": {
      get: {
        operationId: "getCovertSteamEvents",
        tags: ["Shadow Graph", "Analytics"],
        summary: "Get covert steam events",
        description: `
**[ANALYTICS][SHADOW-GRAPH][COVERT-STEAM]{hidden-line-movement}[#REF:routes.ts:2501]**

Get detected covert steam (hidden line movement) events. Returns events where significant line movements occurred without public visibility.

\`\`\`typescript
// @see src/api/routes.ts:2501
api.get('/events/:eventId/covert-steam-events', async (c) => {
  const eventId = c.req.param('eventId');
  const severity = c.req.query('severity');
  const bookmaker = c.req.query('bookmaker');
  // Queries covert_steam_events table
  // Returns events with severity scores
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Event identifier",
            schema: {
              type: "string",
            },
          },
          {
            name: "severity",
            in: "query",
            description: "Filter by minimum severity score",
            schema: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          {
            name: "bookmaker",
            in: "query",
            description: "Filter by bookmaker",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Covert steam events",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CovertSteamEventsResponse",
                },
              },
            },
          },
        },
      },
    },
    "/events/{eventId}/concealed-arbitrage-opportunities": {
      get: {
        operationId: "getConcealedArbitrageOpportunities",
        tags: ["Shadow Graph", "Arbitrage"],
        summary: "Get concealed arbitrage opportunities",
        description: `
**[ANALYTICS][SHADOW-GRAPH][ARBITRAGE]{dark-pool-arbitrage}[#REF:routes.ts:2553]**

Find arbitrage opportunities hidden in dark pools. Uses ShadowArbitrageScanner to detect opportunities not visible in public markets.

\`\`\`typescript
// @see src/api/routes.ts:2553
api.get('/events/:eventId/concealed-arbitrage-opportunities', async (c) => {
  const eventId = c.req.param('eventId');
  const minSpread = c.req.query('minSpread');
  // Uses ShadowArbitrageScanner to find opportunities
  // Filters by minimum profit spread
});
\`\`\`
        `.trim(),
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Event identifier",
            schema: {
              type: "string",
            },
          },
          {
            name: "minSpread",
            in: "query",
            description: "Minimum profit spread filter",
            schema: {
              type: "number",
              minimum: 0,
            },
          },
        ],
        responses: {
          200: {
            description: "Concealed arbitrage opportunities",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ConcealedArbitrageOpportunitiesResponse",
                },
              },
            },
          },
        },
      },
    },

    // ============ Logging Endpoints ============
    "/logs/codes": {
      get: {
        operationId: "getLogCodes",
        tags: ["Logging"],
        summary: "Get log codes registry",
        description: `
**[LOGGING][CONTROL][REGISTRY]{log-codes,descriptions}[#REF:routes.ts:2773]**

Get all registered log codes with descriptions. Returns the complete LOG_CODES registry used throughout the system.

\`\`\`typescript
// @see src/api/routes.ts:2773
api.get('/logs/codes', async (c) => {
  // Returns LOG_CODES registry
});
\`\`\`

**See Also:**
- [Centralized Logging Documentation](https://github.com/trader-analyzer/trader-analyzer/blob/main/docs/16.0.0.0.0.0.0-CENTRALIZED-LOGGING.md)
        `.trim(),
        responses: {
          200: {
            description: "Log codes registry",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    codes: {
                      type: "object",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          code: { type: "string" },
                          level: {
                            type: "string",
                            enum: ["error", "warn", "info", "debug"],
                          },
                          description: { type: "string" },
                          category: { type: "string" },
                        },
                      },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Bearer token authentication for API access",
      },
      CSRFToken: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
        description:
          "CSRF token for state-changing requests. Get token from GET request header first.",
      },
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "sessionId",
        description: "Session cookie for authenticated requests",
      },
      QueryToken: {
        type: "apiKey",
        in: "query",
        name: "token",
        description: "Query parameter token for WebSocket authentication",
      },
    },
    parameters: {
      TimezoneHeaders: {
        name: "X-Timezone",
        in: "header",
        description: "Timezone information headers (automatically added to all responses)",
        schema: {
          type: "object",
          properties: {
            "X-Timezone": {
              type: "string",
              description: "Current timezone name",
              example: "America/Chicago",
            },
            "X-Timezone-Offset": {
              type: "string",
              description: "UTC offset string",
              example: "UTC-06:00",
            },
            "X-Timezone-Env-Var": {
              type: "string",
              description: "Environment variable name",
              example: "TZ",
            },
            "X-Timezone-Default": {
              type: "string",
              description: "Default timezone",
              example: "Etc/UTC",
            },
          },
        },
      },
    },
    headers: {
      Timezone: {
        description: "Current timezone name",
        schema: {
          type: "string",
          example: "America/Chicago",
        },
      },
      TimezoneOffset: {
        description: "UTC offset string",
        schema: {
          type: "string",
          example: "UTC-06:00",
        },
      },
      TimezoneEnvVar: {
        description: "Environment variable name",
        schema: {
          type: "string",
          example: "TZ",
        },
      },
      TimezoneDefault: {
        description: "Default timezone",
        schema: {
          type: "string",
          example: "Etc/UTC",
        },
      },
      CSRFToken: {
        description: "CSRF token for state-changing requests",
        schema: {
          type: "string",
          example: "csrf-token-abc123",
        },
      },
      ETag: {
        description: "Entity tag for cache validation",
        schema: {
          type: "string",
          example: '"abc123def456"',
        },
      },
      GitCommit: {
        description: "Git commit hash",
        schema: {
          type: "string",
          example: "a1b2c3d4e5f6",
        },
      },
      GitBranch: {
        description: "Git branch name",
        schema: {
          type: "string",
          example: "main",
        },
      },
      RadianceVersion: {
        description: "Radiance contract version",
        schema: {
          type: "string",
          example: "17.1.0",
        },
      },
      BookmakerApplication: {
        description: "Betfair application key header (X-Application)",
        schema: {
          type: "string",
          example: "your-betfair-app-key",
        },
      },
      BookmakerAuthentication: {
        description: "Betfair authentication token header (X-Authentication)",
        schema: {
          type: "string",
          example: "Bearer {token}",
        },
      },
      BookmakerAPIKey: {
        description: "Generic API key header for bookmakers (X-API-Key)",
        schema: {
          type: "string",
          example: "your-api-key",
        },
      },
      BookmakerUserAgent: {
        description: "User-Agent header for bookmaker API requests",
        schema: {
          type: "string",
          example: "Hyper-Bun/1.0",
        },
      },
    },
    examples: {
      BetfairHeaders: {
        summary: "Betfair API request headers",
        description: "Example headers for Betfair API requests using HeaderManager",
        value: {
          "X-Application": "your-betfair-app-key",
          "X-Authentication": "Bearer your-session-token",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
      PinnacleHeaders: {
        summary: "Pinnacle API request headers",
        description: "Example headers for Pinnacle API requests using HeaderManager",
        value: {
          Authorization: "Basic base64-encoded-api-key",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
      DraftKingsHeaders: {
        summary: "DraftKings API request headers",
        description: "Example headers for DraftKings API requests using HeaderManager",
        value: {
          Authorization: "Bearer your-session-token",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    },
    schemas: {
      // ============ Core Schemas ============
      StreamMeta: {
        type: "object",
        description: "Data stream metadata",
        properties: {
          id: {
            type: "string",
            example: "api-bitmex-1234567890",
            description: "Unique stream identifier",
          },
          name: {
            type: "string",
            example: "BitMEX BTC/USD",
            description: "Display name",
          },
          source: {
            type: "string",
            enum: ["file", "api"],
            description: "Import source type",
          },
          symbol: { type: "string", example: "BTC/USD" },
          exchange: { type: "string", example: "bitmex" },
          from: {
            type: "string",
            format: "date-time",
            description: "Earliest trade date",
          },
          to: {
            type: "string",
            format: "date-time",
            description: "Latest trade date",
          },
          count: {
            type: "integer",
            example: 1500,
            description: "Total trades in stream",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DateRange: {
        type: "object",
        properties: {
          from: { type: "string", format: "date-time", nullable: true },
          to: { type: "string", format: "date-time", nullable: true },
        },
      },
      Trade: {
        type: "object",
        description: "Individual trade record",
        properties: {
          id: { type: "string", description: "Trade ID from exchange" },
          datetime: { type: "string", format: "date-time" },
          symbol: { type: "string", example: "BTC/USD" },
          side: { type: "string", enum: ["buy", "sell"] },
          price: { type: "number", example: 42500.5 },
          amount: { type: "number", example: 0.5, description: "Quantity" },
          cost: {
            type: "number",
            example: 21250.25,
            description: "price * amount",
          },
          fee: { type: "number", example: 10.62 },
          feeCurrency: { type: "string", example: "USD" },
          orderID: { type: "string" },
          ordType: {
            type: "string",
            enum: ["limit", "market", "stop", "stop_limit"],
          },
          maker: { type: "boolean", description: "Was this a maker order?" },
        },
      },
      TradingStats: {
        type: "object",
        description: "Comprehensive trading statistics",
        properties: {
          totalTrades: { type: "integer" },
          totalVolume: {
            type: "number",
            description: "Total traded volume (USD)",
          },
          avgTradeSize: { type: "number" },
          tradingDays: { type: "integer" },
          winRate: {
            type: "number",
            description: "Win percentage (0-100)",
            minimum: 0,
            maximum: 100,
          },
          profitFactor: {
            type: "number",
            description: "Gross profit / gross loss",
          },
          avgWin: { type: "number" },
          avgLoss: { type: "number" },
          largestWin: { type: "number" },
          largestLoss: { type: "number" },
          totalPnl: { type: "number" },
          totalFees: { type: "number" },
          netPnl: { type: "number", description: "PnL after fees" },
          expectancy: {
            type: "number",
            description: "Expected profit per trade",
          },
          sharpeRatio: { type: "number", description: "Risk-adjusted return" },
          maxDrawdown: {
            type: "number",
            description: "Maximum peak-to-trough decline",
          },
          maxDrawdownPct: {
            type: "number",
            description: "Max drawdown as percentage",
          },
        },
      },
      TraderProfile: {
        type: "object",
        description: "Trader style and behavior analysis",
        properties: {
          style: {
            type: "string",
            enum: ["scalper", "day_trader", "swing_trader", "position_trader"],
          },
          risk: {
            type: "string",
            enum: ["aggressive", "moderate", "conservative"],
          },
          level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced", "expert"],
          },
          metrics: {
            type: "object",
            properties: {
              winRate: { type: "number" },
              profitFactor: { type: "number" },
              avgHoldingMinutes: { type: "number" },
              tradesPerWeek: { type: "number" },
              disciplineScore: { type: "integer", minimum: 0, maximum: 100 },
              consistencyScore: { type: "integer", minimum: 0, maximum: 100 },
            },
          },
          insights: {
            type: "object",
            properties: {
              summary: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      PositionSession: {
        type: "object",
        description: "Complete position lifecycle from open to close",
        properties: {
          id: { type: "string" },
          symbol: { type: "string" },
          side: { type: "string", enum: ["long", "short"] },
          openTime: { type: "string", format: "date-time" },
          closeTime: { type: "string", format: "date-time", nullable: true },
          durationMs: {
            type: "integer",
            description: "Duration in milliseconds",
          },
          maxSize: { type: "number", description: "Peak position size" },
          entryPrice: { type: "number", description: "Volume-weighted entry" },
          exitPrice: { type: "number", nullable: true },
          realizedPnl: { type: "number" },
          totalFees: { type: "number" },
          tradeCount: { type: "integer" },
          status: { type: "string", enum: ["open", "closed"] },
        },
      },
      PredictionMarket: {
        type: "object",
        description: "Prediction market from Polymarket or Kalshi",
        properties: {
          id: { type: "string" },
          question: {
            type: "string",
            example: "Will Bitcoin reach $100k in 2025?",
          },
          description: { type: "string" },
          outcomes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", example: "Yes" },
                price: {
                  type: "number",
                  description: "Implied probability (0-1)",
                  minimum: 0,
                  maximum: 1,
                },
                volume: { type: "number" },
              },
            },
          },
          status: {
            type: "string",
            enum: ["open", "closed", "resolved", "active", "settled"],
          },
          resolution: { type: "string", nullable: true },
          endDate: { type: "string", format: "date-time" },
          volume: { type: "number", description: "Total traded volume" },
          liquidity: { type: "number" },
          category: { type: "string", example: "crypto" },
        },
      },
      PredictionStats: {
        type: "object",
        properties: {
          totalTrades: { type: "integer" },
          totalContracts: { type: "number" },
          totalVolume: { type: "number" },
          resolvedPositions: { type: "integer" },
          winRate: { type: "number" },
          realizedPnl: { type: "number" },
          unrealizedPnl: { type: "number" },
          calibrationScore: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "How well predictions match outcomes",
          },
        },
      },
      EdgeAnalysis: {
        type: "object",
        description: "Edge analysis for prediction market trading",
        properties: {
          impliedEdge: {
            type: "number",
            description: "Average edge at entry vs 50%",
          },
          realizedEdge: {
            type: "number",
            description: "Actual outcome vs entry price",
          },
          edgeDecay: {
            type: "number",
            description: "Implied minus realized edge",
          },
          bestCategories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                edge: { type: "number" },
                trades: { type: "integer" },
              },
            },
          },
        },
      },
      SizingAnalysis: {
        type: "object",
        properties: {
          avgPositionSize: { type: "number" },
          maxPositionSize: { type: "number" },
          kellyCriterion: {
            type: "number",
            description: "Optimal bet fraction based on edge",
          },
          actualVsKelly: {
            type: "number",
            description: "How close to Kelly optimal (0-1)",
          },
        },
      },
      MarketMakingStats: {
        type: "object",
        description: "Market making specific analytics",
        properties: {
          totalTrades: { type: "integer" },
          makerTrades: { type: "integer" },
          takerTrades: { type: "integer" },
          makerRatio: {
            type: "number",
            description: "Fraction of maker trades (0-1)",
          },
          totalVolume: { type: "number" },
          avgSpread: { type: "number", description: "Average captured spread" },
          avgInventory: { type: "number" },
          maxInventory: { type: "number" },
          inventoryTurnover: { type: "number" },
          inventorySkew: {
            type: "number",
            description: "-1 to 1, negative = net short",
          },
          grossPnl: { type: "number" },
          rebates: { type: "number", description: "Maker fee rebates earned" },
          fees: { type: "number" },
          netPnl: { type: "number" },
          maxDrawdown: { type: "number" },
          sharpeRatio: { type: "number" },
        },
      },
      MMSession: {
        type: "object",
        properties: {
          id: { type: "string" },
          symbol: { type: "string" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time", nullable: true },
          durationMs: { type: "integer" },
          stats: { $ref: "#/components/schemas/MarketMakingStats" },
        },
      },

      // ============ ORCA Schemas ============
      OrcaRawInput: {
        type: "object",
        description: "Bookmaker-specific market input for normalization",
        required: [
          "bookmaker",
          "sport",
          "homeTeam",
          "awayTeam",
          "startTime",
          "marketType",
          "selection",
        ],
        properties: {
          bookmaker: {
            type: "string",
            example: "draftkings",
            description: "Source bookmaker ID",
            enum: [
              "draftkings",
              "fanduel",
              "betmgm",
              "caesars",
              "pinnacle",
              "ps3838",
              "circa",
              "bookmaker",
              "betfair",
              "smarkets",
              "matchbook",
            ],
          },
          sport: {
            type: "string",
            example: "NBA Basketball",
            description: "Sport name in bookmaker format",
          },
          league: { type: "string", example: "NBA" },
          homeTeam: {
            type: "string",
            example: "LA Lakers",
            description: "Home team in bookmaker format",
          },
          awayTeam: {
            type: "string",
            example: "BOS Celtics",
            description: "Away team in bookmaker format",
          },
          startTime: {
            type: "string",
            format: "date-time",
            description: "Event start time (ISO 8601)",
          },
          marketType: {
            type: "string",
            example: "Point Spread",
            description: "Market type in bookmaker format",
          },
          period: {
            type: "string",
            example: "full",
            enum: ["full", "h1", "h2", "q1", "q2", "q3", "q4", "1p", "2p", "3p"],
          },
          line: {
            type: "number",
            example: -3.5,
            description: "Spread/total line",
          },
          selection: {
            type: "string",
            example: "LA Lakers -3.5",
            description: "Selection name",
          },
        },
      },
      OrcaNormalizedOutput: {
        type: "object",
        description: "Normalized market data with deterministic UUIDv5 identifiers",
        properties: {
          event: {
            type: "object",
            description: "Normalized event (game)",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "Deterministic UUIDv5 - same game = same ID",
              },
              sport: { type: "string", example: "NBA" },
              leagueId: { type: "string", format: "uuid" },
              homeTeamId: { type: "string", format: "uuid" },
              awayTeamId: { type: "string", format: "uuid" },
              startTime: { type: "string", format: "date-time" },
            },
          },
          market: {
            type: "object",
            description: "Normalized market",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "Deterministic UUIDv5 market ID",
              },
              eventId: { type: "string", format: "uuid" },
              type: {
                type: "string",
                enum: ["moneyline", "spread", "total", "prop", "future"],
              },
              period: { type: "string", example: "full" },
              line: { type: "number", example: -3.5 },
            },
          },
          selection: {
            type: "object",
            description: "Normalized selection (bet option)",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "Deterministic UUIDv5 selection ID",
              },
              marketId: { type: "string", format: "uuid" },
              name: { type: "string", example: "Los Angeles Lakers" },
              type: {
                type: "string",
                enum: ["home", "away", "over", "under", "draw", "yes", "no"],
              },
              line: { type: "number" },
            },
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Normalization confidence score (1.0 = exact match)",
          },
        },
      },
      OrcaSportInfo: {
        type: "object",
        properties: {
          id: { type: "string", example: "NBA" },
          name: { type: "string", example: "NBA Basketball" },
          category: { type: "string", example: "basketball" },
          hasSpread: {
            type: "boolean",
            description: "Supports point spread markets",
          },
          hasTotal: {
            type: "boolean",
            description: "Supports over/under markets",
          },
          hasPeriods: {
            type: "boolean",
            description: "Supports half/quarter betting",
          },
          hasMoneyline: { type: "boolean" },
        },
      },
      OrcaMarketTypeInfo: {
        type: "object",
        properties: {
          id: { type: "string", example: "spread" },
          name: { type: "string", example: "Point Spread" },
          hasLine: { type: "boolean", description: "Requires a line value" },
          selections: {
            type: "array",
            items: { type: "string" },
            example: ["home", "away"],
          },
        },
      },
      OrcaOddsUpdate: {
        type: "object",
        description: "Historical odds snapshot",
        properties: {
          marketId: { type: "string", format: "uuid" },
          selectionId: { type: "string", format: "uuid" },
          eventId: { type: "string", format: "uuid" },
          bookmaker: { type: "string", example: "ps3838" },
          odds: { type: "number", example: 1.95, description: "Decimal odds" },
          americanOdds: {
            type: "integer",
            example: -105,
            description: "American odds format",
          },
          line: { type: "number", example: -3.5 },
          marketType: { type: "string", example: "spread" },
          timestamp: { type: "integer", description: "Unix timestamp (ms)" },
          isOpen: { type: "boolean" },
          maxStake: {
            type: "number",
            description: "Maximum bet amount allowed",
          },
        },
      },
      // ============ Registry Schemas ============
      RegistryInfo: {
        type: "object",
        description: "Registry metadata and information",
        properties: {
          id: { type: "string", example: "properties" },
          name: { type: "string", example: "Property Registry" },
          description: { type: "string" },
          category: {
            type: "string",
            enum: ["data", "tooling", "security", "research", "integration", "cli"],
          },
          type: {
            type: "string",
            enum: [
              "property",
              "data-source",
              "tool",
              "error",
              "config",
              "schema",
              "pattern",
              "endpoint",
              "cli-command",
            ],
          },
          endpoint: { type: "string", example: "/api/registry/properties" },
          tags: {
            type: "array",
            items: { type: "string" },
            example: ["schema", "versioning", "lineage"],
          },
          useCases: {
            type: "array",
            items: { type: "string" },
          },
          itemCount: { type: "integer" },
          lastUpdated: { type: "integer", format: "int64" },
          status: {
            type: "string",
            enum: ["healthy", "degraded", "offline", "unknown"],
          },
          metrics: { $ref: "#/components/schemas/RegistryMetrics" },
          schema: {
            type: "object",
            properties: {
              version: { type: "string" },
              properties: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
      RegistryMetrics: {
        type: "object",
        description: "Registry performance metrics",
        properties: {
          totalItems: { type: "integer" },
          activeItems: { type: "integer" },
          lastUpdated: { type: "integer", format: "int64" },
          queryCount24h: { type: "integer" },
          avgResponseMs: { type: "number" },
          errorRate: { type: "number" },
        },
      },
      RegistryOverview: {
        type: "object",
        description: "Complete registry system overview",
        properties: {
          registries: {
            type: "array",
            items: { $ref: "#/components/schemas/RegistryInfo" },
          },
          total: {
            type: "integer",
            description: "Total number of registries (16)",
          },
          totalItems: { type: "integer" },
          categories: {
            type: "object",
            additionalProperties: { type: "integer" },
            example: {
              data: 3,
              tooling: 3,
              security: 2,
              research: 2,
              integration: 5,
              cli: 1,
            },
          },
          byType: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
          byStatus: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
          summary: {
            type: "object",
            properties: {
              healthy: { type: "integer" },
              degraded: { type: "integer" },
              offline: { type: "integer" },
              lastRefresh: { type: "integer", format: "int64" },
            },
          },
        },
      },
      RegistryResponse: {
        type: "object",
        description: "Generic registry response",
        properties: {
          registry: { type: "string" },
          items: {
            type: "array",
            items: { type: "object" },
          },
          total: { type: "integer" },
        },
      },
      CLICommandsRegistry: {
        type: "object",
        description: "CLI commands registry",
        properties: {
          commands: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", example: "telegram" },
                name: { type: "string", example: "Telegram CLI" },
                version: { type: "string", example: "11.1.0.0.0.0.0" },
                description: { type: "string" },
                usage: { type: "string" },
                category: { type: "string" },
                file: { type: "string" },
                documentation: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
                examples: {
                  type: "array",
                  items: { type: "string" },
                },
                crossReferences: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          total: { type: "integer" },
          byCategory: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
          byVersion: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
        },
      },
      ErrorRegistry: {
        type: "object",
        description: "Error code registry",
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string", example: "NX-001" },
                status: { type: "integer" },
                message: { type: "string" },
                category: {
                  type: "string",
                  enum: [
                    "GENERAL",
                    "AUTH",
                    "VALIDATION",
                    "RESOURCE",
                    "EXTERNAL",
                    "RATE_LIMIT",
                    "DATA",
                    "WEBSOCKET",
                  ],
                },
                ref: { type: "string" },
                recoverable: { type: "boolean" },
              },
            },
          },
          byCategory: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { type: "object" },
            },
          },
          byStatus: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { type: "object" },
            },
          },
          total: { type: "integer" },
          categories: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      URLAnomalyPatternsRegistry: {
        type: "object",
        description: "URL anomaly patterns registry",
        properties: {
          registry: { type: "string", example: "url-anomaly-patterns" },
          timestamp: { type: "string", format: "date-time" },
          query: {
            type: "object",
            properties: {
              sport: { type: "string", example: "NBA" },
              hours: { type: "integer", example: 24 },
              timeRange: {
                type: "object",
                properties: {
                  start: { type: "string", format: "date-time" },
                  end: { type: "string", format: "date-time" },
                },
              },
            },
          },
          patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                patternId: { type: "string" },
                pattern_name: { type: "string" },
                anomaly_type: { type: "string" },
                affected_bookmakers: {
                  type: "array",
                  items: { type: "string" },
                },
                url_signature: { type: "string" },
                confidence_level: { type: "number", minimum: 0, maximum: 1 },
                market_impact: {
                  type: "object",
                  properties: {
                    avg_line_delta: { type: "number" },
                    frequency_per_hour: { type: "number" },
                    false_steam_probability: { type: "number" },
                  },
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          metrics: {
            type: "object",
            properties: {
              total: { type: "integer" },
              by_bookmaker: {
                type: "object",
                additionalProperties: { type: "integer" },
              },
              by_anomaly_type: {
                type: "object",
                additionalProperties: { type: "integer" },
              },
              market_impact_summary: {
                type: "object",
                properties: {
                  avg_line_delta: { type: "number" },
                  total_frequency_per_hour: { type: "number" },
                  avg_false_steam_probability: { type: "number" },
                },
              },
              confidence_summary: {
                type: "object",
                properties: {
                  avg_confidence: { type: "number" },
                  high_confidence_count: { type: "integer" },
                  medium_confidence_count: { type: "integer" },
                  low_confidence_count: { type: "integer" },
                },
              },
            },
          },
          database_stats: {
            type: "object",
            properties: {
              total_anomalies: { type: "integer" },
              total_movements: { type: "integer" },
              anomaly_rate: { type: "number" },
            },
          },
          diagnostics: {
            type: "object",
            properties: {
              database_accessible: { type: "boolean" },
              tables_exist: {
                type: "object",
                properties: {
                  url_anomaly_audit: { type: "boolean" },
                  line_movement_audit_v2: { type: "boolean" },
                },
              },
              anomalies_by_sport: {
                type: "object",
                additionalProperties: { type: "integer" },
              },
              anomalies_by_bookmaker: {
                type: "object",
                additionalProperties: { type: "integer" },
              },
              anomalies_all_time: { type: "integer" },
              movements_all_time: { type: "integer" },
              recent_security_threats: { type: "integer" },
              error: { type: "string" },
            },
          },
        },
      },
      // ============ Market Graph Schemas ============
      ShadowMovementGraph: {
        type: "object",
        description: "Shadow movement graph structure",
        properties: {
          eventId: { type: "string" },
          nodes: {
            type: "array",
            items: { $ref: "#/components/schemas/MarketOfferingNode" },
          },
          links: {
            type: "array",
            items: { $ref: "#/components/schemas/MarketPropagationLink" },
          },
          metadata: {
            type: "object",
            properties: {
              totalNodes: { type: "integer" },
              totalLinks: { type: "integer" },
              darkPoolNodes: { type: "integer" },
              generatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      MarketOfferingNode: {
        type: "object",
        description: "Market offering node in shadow graph",
        properties: {
          nodeId: { type: "string" },
          bookmaker: { type: "string" },
          marketType: { type: "string" },
          line: { type: "number" },
          isDarkPool: { type: "boolean" },
          liquidity: {
            type: "object",
            properties: {
              public: { type: "number" },
              hidden: { type: "number" },
              true: { type: "number" },
            },
          },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      MarketPropagationLink: {
        type: "object",
        description: "Propagation link between market nodes",
        properties: {
          sourceNodeId: { type: "string" },
          targetNodeId: { type: "string" },
          propagationDelay: { type: "number" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      DarkPoolOffering: {
        type: "object",
        description: "Dark pool market offering",
        properties: {
          nodeId: { type: "string" },
          bookmaker: { type: "string" },
          marketType: { type: "string" },
          line: { type: "number" },
          trueLiquidity: { type: "number" },
          detectionMethod: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      LiquidityProfile: {
        type: "object",
        description: "True liquidity profile for a market node",
        properties: {
          nodeId: { type: "string" },
          publicLiquidity: { type: "number" },
          hiddenLiquidity: { type: "number" },
          trueLiquidity: { type: "number" },
          liquidityDistribution: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                liquidity: { type: "number" },
              },
            },
          },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      // ============ Covert Steam Schemas ============
      CovertSteamEventRecord: {
        type: "object",
        description: "Covert steam event record",
        properties: {
          event_identifier: {
            type: "string",
            description: "Unique event identifier",
            example: "NFL-2025-001",
          },
          detection_timestamp: {
            type: "number",
            format: "int64",
            description: "Detection timestamp in epoch milliseconds",
          },
          bookmaker_name: {
            type: "string",
            description: "Bookmaker where event was detected",
            example: "DraftKings",
          },
          source_dark_node_id: {
            type: "string",
            description: "Source dark node ID",
          },
          impact_severity_score: {
            type: "number",
            minimum: 0,
            maximum: 10,
            description: "Impact severity score (0-10)",
          },
        },
        required: ["event_identifier", "detection_timestamp"],
      },
      ConcealedArbOpportunity: {
        type: "object",
        description: "Concealed arbitrage opportunity",
        properties: {
          opportunityId: { type: "string" },
          eventId: { type: "string" },
          sourceNode: {
            type: "object",
            properties: {
              nodeId: { type: "string" },
              bookmaker: { type: "string" },
              line: { type: "number" },
            },
          },
          targetNode: {
            type: "object",
            properties: {
              nodeId: { type: "string" },
              bookmaker: { type: "string" },
              line: { type: "number" },
            },
          },
          spread: { type: "number", description: "Spread percentage" },
          isDarkPool: { type: "boolean" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      // ============ Bookmaker Header Schemas ============
      HeaderRule: {
        type: "object",
        description: "Header rule configuration for a bookmaker exchange",
        properties: {
          exchange: {
            type: "string",
            description: "Exchange identifier",
            example: "betfair",
          },
          headers: {
            type: "object",
            description: "Exchange-specific headers with template variables",
            additionalProperties: {
              type: "string",
            },
            example: {
              "X-Application": "your-app-key",
              "X-Authentication": "Bearer {token}",
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          },
          validation: {
            type: "object",
            description: "Request validation rules",
            properties: {
              requiredParams: {
                type: "array",
                items: { type: "string" },
                description: "Required parameters for this exchange",
                example: ["marketId", "eventId"],
              },
              maxAge: {
                type: "integer",
                description: "Maximum cache age in seconds",
                example: 60,
              },
            },
            required: ["requiredParams"],
          },
        },
        required: ["exchange", "headers", "validation"],
      },
      BookmakerHeaders: {
        type: "object",
        description: "Bookmaker API request headers",
        properties: {
          "X-Application": {
            type: "string",
            description: "Betfair application key",
            example: "your-betfair-app-key",
          },
          "X-Authentication": {
            type: "string",
            description: "Betfair authentication token",
            example: "Bearer your-session-token",
          },
          Authorization: {
            type: "string",
            description: "Authorization header (Basic or Bearer)",
            example: "Bearer your-token",
          },
          "X-API-Key": {
            type: "string",
            description: "Generic API key header",
            example: "your-api-key",
          },
          "Content-Type": {
            type: "string",
            description: "Content type",
            example: "application/json",
          },
          Accept: {
            type: "string",
            description: "Accept header",
            example: "application/json",
          },
          "User-Agent": {
            type: "string",
            description: "User-Agent header",
            example: "Hyper-Bun/1.0",
          },
        },
      },
      // ============ Circuit Breaker Schemas ============
      CircuitBreakerStatus: {
        type: "object",
        description: "Circuit breaker status for a bookmaker",
        properties: {
          bookmaker: { type: "string", example: "draftkings" },
          tripped: {
            type: "boolean",
            description: "Whether circuit breaker is currently tripped",
          },
          failures: {
            type: "integer",
            description: "Current failure count in 1-minute window",
          },
          failureThreshold: {
            type: "integer",
            description: "Failure threshold that triggers trip",
          },
          lastError: {
            type: "string",
            nullable: true,
            description: "Last error message",
          },
          avgLatency: {
            type: "number",
            nullable: true,
            description: "Average latency in milliseconds",
          },
          lastFailureAt: {
            type: "number",
            format: "int64",
            nullable: true,
            description: "Timestamp of last failure",
          },
          tripCount: {
            type: "integer",
            description: "Total number of trips (lifetime)",
          },
          lastResetAt: {
            type: "number",
            format: "int64",
            nullable: true,
            description: "Timestamp of last reset",
          },
          lastResetBy: {
            type: "string",
            nullable: true,
            description: "User who performed last reset",
          },
          lastResetReason: {
            type: "string",
            nullable: true,
            description: "Reason for last reset",
          },
        },
      },
      // ============ Discovery & Feeds Schemas ============
      DiscoveryResponse: {
        type: "object",
        description: "API discovery response with all available endpoints",
        properties: {
          endpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string", example: "/health" },
                methods: {
                  type: "array",
                  items: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
                },
                summary: { type: "string", example: "Service health check" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          total: { type: "integer", description: "Total number of endpoints" },
        },
      },
      // ============ Changelog Schemas ============
      ChangelogResponse: {
        type: "object",
        description: "Structured changelog data from git commits",
        properties: {
          version: { type: "string", example: "2.0.0" },
          commits: {
            type: "array",
            items: { $ref: "#/components/schemas/ChangelogEntry" },
          },
          categories: {
            type: "object",
            additionalProperties: { type: "integer" },
            description: "Commit counts by category",
          },
          byCategory: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { $ref: "#/components/schemas/ChangelogEntry" },
            },
          },
          changelogMd: {
            type: "string",
            nullable: true,
            description: "CHANGELOG.md content if available",
          },
        },
      },
      ChangelogEntry: {
        type: "object",
        description: "Individual changelog entry from git commit",
        properties: {
          hash: { type: "string", example: "a1b2c3d" },
          message: { type: "string", example: "feat: add new endpoint" },
          category: {
            type: "string",
            enum: ["feat", "fix", "docs", "refactor", "test", "chore"],
          },
          author: { type: "string", example: "John Doe" },
          date: { type: "string", format: "date-time" },
        },
      },
      // ============ Examples Schemas ============
      ExamplesResponse: {
        type: "object",
        description: "API examples response",
        properties: {
          examples: {
            type: "array",
            items: { $ref: "#/components/schemas/Example" },
          },
          categories: {
            type: "array",
            items: { type: "string" },
            description: "Available example categories",
          },
          total: { type: "integer", description: "Total number of examples" },
        },
      },
      Example: {
        type: "object",
        description: "API example object",
        properties: {
          name: { type: "string", example: "Bun.serve Example" },
          category: { type: "string", example: "Server" },
          description: { type: "string" },
          code: { type: "string", description: "Example code snippet" },
          language: { type: "string", example: "typescript" },
        },
      },
      // ============ Security Schemas ============
      SecurityThreatSummary: {
        type: "object",
        description: "Security threat summary grouped by type",
        properties: {
          summary: {
            type: "array",
            items: { $ref: "#/components/schemas/SecurityThreat" },
          },
          total: { type: "integer", description: "Total number of threats" },
          hours: { type: "integer", description: "Hours looked back" },
        },
      },
      SecurityThreat: {
        type: "object",
        description: "Security threat entry",
        properties: {
          type: { type: "string", example: "malware" },
          count: { type: "integer", description: "Number of threats of this type" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          lastDetected: { type: "string", format: "date-time" },
        },
      },
      SecurityIncidentsResponse: {
        type: "object",
        description: "Active security incidents response",
        properties: {
          incidents: {
            type: "array",
            items: { $ref: "#/components/schemas/SecurityIncident" },
          },
          total: { type: "integer", description: "Total number of active incidents" },
        },
      },
      SecurityIncident: {
        type: "object",
        description: "Security incident entry",
        properties: {
          id: { type: "string", example: "inc-123" },
          type: { type: "string", example: "unauthorized_access" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          status: {
            type: "string",
            enum: ["active", "resolved", "investigating"],
          },
          detectedAt: { type: "string", format: "date-time" },
          description: { type: "string" },
        },
      },
      ComplianceStatus: {
        type: "object",
        description: "Compliance status and checks",
        properties: {
          status: {
            type: "string",
            enum: ["compliant", "non-compliant", "partial"],
          },
          checks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                status: {
                  type: "string",
                  enum: ["pass", "fail", "warning"],
                },
                description: { type: "string" },
              },
            },
          },
          lastChecked: { type: "string", format: "date-time" },
        },
      },
      ComplianceReport: {
        type: "object",
        description: "Detailed compliance report",
        properties: {
          overallStatus: {
            type: "string",
            enum: ["compliant", "non-compliant", "partial"],
          },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string" },
                status: {
                  type: "string",
                  enum: ["pass", "fail", "warning"],
                },
                findings: {
                  type: "array",
                  items: { type: "string" },
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
      // ============ Shadow Graph Schemas ============
      ShadowGraphResponse: {
        type: "object",
        description: "Shadow graph data for an event",
        properties: {
          eventId: { type: "string" },
          nodes: {
            type: "array",
            items: { $ref: "#/components/schemas/ShadowGraphNode" },
          },
          links: {
            type: "array",
            items: { $ref: "#/components/schemas/ShadowGraphEdge" },
          },
          metadata: {
            type: "object",
            properties: {
              totalNodes: { type: "integer" },
              totalLinks: { type: "integer" },
              darkPoolNodes: { type: "integer" },
              generatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      ShadowGraphNode: {
        type: "object",
        description: "Shadow graph node (market offering)",
        properties: {
          nodeId: { type: "string", example: "node-123" },
          bookmaker: { type: "string", example: "draftkings" },
          marketType: { type: "string", example: "moneyline" },
          line: { type: "number", description: "Last odds value" },
          isDarkPool: {
            type: "boolean",
            description: "Whether this is a dark pool node",
          },
          liquidity: {
            type: "object",
            properties: {
              public: { type: "number", description: "Public liquidity" },
              hidden: { type: "number", description: "Hidden liquidity" },
              true: { type: "number", description: "True total liquidity" },
            },
          },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      ShadowGraphEdge: {
        type: "object",
        description: "Shadow graph edge (movement propagation)",
        properties: {
          sourceNodeId: { type: "string", example: "node-123" },
          targetNodeId: { type: "string", example: "node-456" },
          propagationDelay: {
            type: "number",
            description: "Propagation delay in milliseconds",
          },
          confidence: {
            type: "number",
            description: "Confidence score (0-1)",
            minimum: 0,
            maximum: 1,
          },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      DarkPoolOfferingsResponse: {
        type: "object",
        description: "Dark pool offerings response",
        properties: {
          eventId: { type: "string" },
          offerings: {
            type: "array",
            items: { $ref: "#/components/schemas/DarkPoolOffering" },
          },
          total: { type: "integer" },
        },
      },
      DarkPoolOffering: {
        type: "object",
        description: "Dark pool offering entry",
        properties: {
          nodeId: { type: "string" },
          bookmaker: { type: "string" },
          marketType: { type: "string" },
          line: { type: "number" },
          trueLiquidity: { type: "number", description: "Total liquidity (public + hidden)" },
          detectionMethod: { type: "string", example: "shadow-graph-analysis" },
          confidence: {
            type: "number",
            description: "Detection confidence (0-1)",
            minimum: 0,
            maximum: 1,
          },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
      LiquidityAnalysis: {
        type: "object",
        description: "Liquidity analysis for a market node",
        properties: {
          nodeId: { type: "string" },
          publicLiquidity: { type: "number", description: "Publicly displayed liquidity" },
          hiddenLiquidity: { type: "number", description: "Hidden liquidity" },
          trueLiquidity: {
            type: "number",
            description: "True total liquidity (public + hidden)",
          },
          liquidityDistribution: {
            type: "array",
            items: { type: "object" },
            description: "Historical liquidity distribution (if available)",
          },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DeceptiveLineAnalysis: {
        type: "object",
        description: "Deceptive line analysis result",
        properties: {
          nodeId: { type: "string" },
          isDeceptive: {
            type: "boolean",
            description: "Whether the line is detected as deceptive",
          },
          confidence: {
            type: "number",
            description: "Confidence score (0-1)",
            minimum: 0,
            maximum: 1,
          },
          reasons: {
            type: "array",
            items: { type: "string" },
            description:
              "Reasons for deceptive detection (e.g., 'Bait line detected', 'High correlation deviation')",
          },
        },
      },
      CovertSteamEventsResponse: {
        type: "object",
        description: "Covert steam events response",
        properties: {
          eventId: { type: "string" },
          events: {
            type: "array",
            items: { $ref: "#/components/schemas/CovertSteamEvent" },
          },
          total: { type: "integer" },
        },
      },
      CovertSteamEvent: {
        type: "object",
        description: "Covert steam event entry",
        properties: {
          event_identifier: { type: "string" },
          detection_timestamp: { type: "string", format: "date-time" },
          bookmaker_name: { type: "string" },
          source_dark_node_id: { type: "string" },
          impact_severity_score: {
            type: "number",
            description: "Severity score (0-1)",
            minimum: 0,
            maximum: 1,
          },
        },
      },
      ConcealedArbitrageOpportunitiesResponse: {
        type: "object",
        description: "Concealed arbitrage opportunities response",
        properties: {
          eventId: { type: "string" },
          opportunities: {
            type: "array",
            items: { $ref: "#/components/schemas/ConcealedArbitrageOpportunity" },
          },
          total: { type: "integer" },
        },
      },
      ConcealedArbitrageOpportunity: {
        type: "object",
        description: "Concealed arbitrage opportunity entry",
        properties: {
          opportunityId: { type: "string" },
          eventId: { type: "string" },
          legs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nodeId: { type: "string" },
                bookmaker: { type: "string" },
                side: { type: "string", enum: ["back", "lay"] },
                odds: { type: "number" },
              },
            },
          },
          profit: {
            type: "number",
            description: "Expected profit percentage",
          },
          detectedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
}

/**
 * Serve OpenAPI JSON spec
 * @route GET /docs/openapi.json
 */
docs.get("/openapi.json", (c) => {
  return c.json(openApiSpec)
})

/**
 * Serve Error Registry JSON
 * @route GET /docs/errors.json
 */
docs.get("/errors.json", (c) => {
  // Group errors by category
  const grouped: Record<ErrorCategory, (typeof ERROR_REGISTRY)[string][]> = {
    GENERAL: [],
    AUTH: [],
    VALIDATION: [],
    RESOURCE: [],
    EXTERNAL: [],
    RATE_LIMIT: [],
    DATA: [],
    WEBSOCKET: [],
  }

  for (const error of Object.values(ERROR_REGISTRY)) {
    grouped[error.category].push(error)
  }

  return c.json({
    version: "1.0.0",
    totalErrors: Object.keys(ERROR_REGISTRY).length,
    categories: Object.keys(grouped),
    errors: grouped,
    registry: ERROR_REGISTRY,
  })
})

/**
 * Serve Error Documentation UI
 * @route GET /docs/errors
 */
docs.get("/errors", (c) => {
  // Group errors by category for display
  const grouped: Record<string, (typeof ERROR_REGISTRY)[string][]> = {}
  for (const error of Object.values(ERROR_REGISTRY)) {
    if (!grouped[error.category]) grouped[error.category] = []
    grouped[error.category].push(error)
  }

  const categoryInfo: Record<string, { icon: string; color: string; description: string }> = {
    GENERAL: {
      icon: "🔧",
      color: "#6b7280",
      description: "General server and routing errors",
    },
    AUTH: {
      icon: "🔐",
      color: "#ef4444",
      description: "Authentication and authorization failures",
    },
    VALIDATION: {
      icon: "📋",
      color: "#f59e0b",
      description: "Input validation and request format errors",
    },
    RESOURCE: {
      icon: "📦",
      color: "#8b5cf6",
      description: "Resource not found or conflict errors",
    },
    EXTERNAL: {
      icon: "🌐",
      color: "#3b82f6",
      description: "External service and API errors",
    },
    RATE_LIMIT: {
      icon: "⏱️",
      color: "#ec4899",
      description: "Rate limiting and quota errors",
    },
    DATA: {
      icon: "📊",
      color: "#10b981",
      description: "Data processing and normalization errors",
    },
    WEBSOCKET: {
      icon: "🔌",
      color: "#06b6d4",
      description: "WebSocket connection and subscription errors",
    },
  }

  const generateErrorRows = (errors: (typeof ERROR_REGISTRY)[string][]) => {
    return errors
      .map(
        (e) => `
      <tr class="error-row" data-code="${e.code}">
        <td class="code-cell">
          <code class="error-code">${e.code}</code>
        </td>
        <td class="status-cell">
          <span class="status-badge status-${Math.floor(e.status / 100)}xx">${e.status}</span>
        </td>
        <td class="message-cell">${e.message}</td>
        <td class="recoverable-cell">
          <span class="recoverable-badge ${e.recoverable ? "recoverable-yes" : "recoverable-no"}">
            ${e.recoverable ? "✓ Yes" : "✗ No"}
          </span>
        </td>
        <td class="ref-cell">
          <a href="${e.ref}" class="ref-link">${e.ref}</a>
        </td>
      </tr>
    `
      )
      .join("")
  }

  const generateCategorySections = () => {
    return Object.entries(grouped)
      .map(([category, errors]) => {
        const info = categoryInfo[category] || {
          icon: "❓",
          color: "#6b7280",
          description: "",
        }
        return `
        <section class="category-section" id="${category.toLowerCase()}">
          <div class="category-header" style="border-left-color: ${info.color}">
            <h2>
              <span class="category-icon">${info.icon}</span>
              ${category}
              <span class="error-count">${errors.length} errors</span>
            </h2>
            <p class="category-desc">${info.description}</p>
          </div>
          <div class="table-container">
            <table class="error-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Recoverable</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${generateErrorRows(errors)}
              </tbody>
            </table>
          </div>
        </section>
      `
      })
      .join("")
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEXUS Error Registry - Documentation</title>
  <link rel="icon" href="https://bun.com/favicon.ico">
  <style>
    :root {
      --bg-primary: #0f0f1a;
      --bg-secondary: #1a1a2e;
      --bg-tertiary: #252542;
      --text-primary: #ffffff;
      --text-secondary: #a0a0b0;
      --text-muted: #6b7280;
      --border-color: #333355;
      --accent-cyan: #00d4ff;
      --accent-purple: #8b5cf6;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-yellow: #f59e0b;
      --accent-blue: #3b82f6;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 1px solid var(--border-color);
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }

    .header .subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
    }

    .header .stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 25px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent-cyan);
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Navigation */
    .nav {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 40px;
    }

    .nav-link {
      padding: 8px 16px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .nav-link:hover {
      background: var(--accent-purple);
      color: white;
      border-color: var(--accent-purple);
    }

    /* Search */
    .search-container {
      max-width: 500px;
      margin: 0 auto 40px;
    }

    .search-input {
      width: 100%;
      padding: 14px 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 1rem;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    /* Category sections */
    .category-section {
      margin-bottom: 40px;
    }

    .category-header {
      background: var(--bg-secondary);
      padding: 20px 25px;
      border-radius: 12px 12px 0 0;
      border-left: 4px solid var(--accent-cyan);
    }

    .category-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .category-icon {
      font-size: 1.5rem;
    }

    .error-count {
      font-size: 0.8rem;
      font-weight: 400;
      background: var(--bg-tertiary);
      padding: 4px 10px;
      border-radius: 12px;
      color: var(--text-secondary);
    }

    .category-desc {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 8px;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
      background: var(--bg-secondary);
      border-radius: 0 0 12px 12px;
      border: 1px solid var(--border-color);
      border-top: none;
    }

    .error-table {
      width: 100%;
      border-collapse: collapse;
    }

    .error-table th {
      text-align: left;
      padding: 14px 16px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
    }

    .error-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    .error-row:last-child td {
      border-bottom: none;
    }

    .error-row:hover {
      background: rgba(0, 212, 255, 0.05);
    }

    /* Code cell */
    .error-code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--accent-cyan);
      background: var(--bg-tertiary);
      padding: 4px 10px;
      border-radius: 6px;
    }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .status-2xx { background: rgba(16, 185, 129, 0.2); color: var(--accent-green); }
    .status-3xx { background: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
    .status-4xx { background: rgba(245, 158, 11, 0.2); color: var(--accent-yellow); }
    .status-5xx { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }

    /* Recoverable badge */
    .recoverable-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .recoverable-yes {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-green);
    }

    .recoverable-no {
      background: rgba(239, 68, 68, 0.15);
      color: var(--accent-red);
    }

    /* Reference link */
    .ref-link {
      color: var(--accent-purple);
      text-decoration: none;
      font-family: monospace;
      font-size: 0.85rem;
    }

    .ref-link:hover {
      text-decoration: underline;
    }

    /* Message cell */
    .message-cell {
      color: var(--text-primary);
      font-weight: 400;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 30px;
      margin-top: 40px;
      border-top: 1px solid var(--border-color);
      color: var(--text-muted);
    }

    .footer a {
      color: var(--accent-cyan);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    /* JSON link */
    .json-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      margin-top: 20px;
    }

    .json-link:hover {
      background: var(--accent-cyan);
      color: var(--bg-primary);
      border-color: var(--accent-cyan);
    }

    /* Hidden class for filtering */
    .hidden { display: none !important; }

    /* Responsive */
    @media (max-width: 768px) {
      .header h1 { font-size: 1.8rem; }
      .header .stats { flex-direction: column; gap: 15px; }
      .error-table { font-size: 0.85rem; }
      .error-table th, .error-table td { padding: 10px 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>NEXUS Error Registry</h1>
      <p class="subtitle">Comprehensive error codes with references for the NEXUS Trading Platform API</p>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">${Object.keys(ERROR_REGISTRY).length}</div>
          <div class="stat-label">Total Errors</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Object.keys(grouped).length}</div>
          <div class="stat-label">Categories</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Object.values(ERROR_REGISTRY).filter((e) => e.recoverable).length}</div>
          <div class="stat-label">Recoverable</div>
        </div>
      </div>
      <a href="/docs/errors.json" class="json-link">
        <span>{ }</span> View as JSON
      </a>
    </header>

    <nav class="nav">
      ${Object.keys(grouped)
        .map((cat) => {
          const info = categoryInfo[cat] || { icon: "❓" }
          return `<a href="#${cat.toLowerCase()}" class="nav-link">${info.icon} ${cat}</a>`
        })
        .join("")}
    </nav>

    <div class="search-container">
      <input type="text" class="search-input" id="search" placeholder="Search errors by code, message, or category...">
    </div>

    <main>
      ${generateCategorySections()}
    </main>

    <footer class="footer">
      <p>NEXUS Trading Platform v1.0.0 | <a href="/docs">API Documentation</a> | <a href="/">Home</a></p>
      <p style="margin-top: 8px; font-size: 0.85rem;">Built with Bun ${typeof Bun !== "undefined" ? Bun.version : "1.3.x"} + Hono</p>
    </footer>
  </div>

  <script>
    // Search functionality
    const searchInput = document.getElementById('search');
    const errorRows = document.querySelectorAll('.error-row');
    const categorySections = document.querySelectorAll('.category-section');

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (!query) {
        // Show all
        errorRows.forEach(row => row.classList.remove('hidden'));
        categorySections.forEach(section => section.classList.remove('hidden'));
        return;
      }

      // Filter rows
      categorySections.forEach(section => {
        const rows = section.querySelectorAll('.error-row');
        let visibleCount = 0;

        rows.forEach(row => {
          const code = row.dataset.code.toLowerCase();
          const text = row.textContent.toLowerCase();
          const matches = code.includes(query) || text.includes(query);
          row.classList.toggle('hidden', !matches);
          if (matches) visibleCount++;
        });

        // Hide section if no matches
        section.classList.toggle('hidden', visibleCount === 0);
      });
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  </script>
</body>
</html>`

  return c.html(html)
})

/**
 * Serve Swagger UI documentation
 * @route GET /docs
 */
docs.get("/", (c) => {
  // Get the base URL from the request
  const protocol =
    c.req.header("x-forwarded-proto") || (c.req.url.startsWith("https") ? "https" : "http")
  const host = c.req.header("host") || c.req.header("x-forwarded-host") || "localhost:8080"
  const baseUrl = `${protocol}://${host}`
  const openApiUrl = `${baseUrl}/docs/openapi.json`

  // Get timezone config for display
  let tzInfo: {
    name: string
    offsetString: string
    defaultTimezone: string
    envVar: string
  } | null = null
  try {
    const tz = getTimezoneInfo()
    tzInfo = {
      name: tz.name,
      offsetString: tz.offsetString,
      defaultTimezone: tz.defaultTimezone,
      envVar: tz.envVar,
    }
  } catch {
    // Ignore errors
  }

  const htmlContent = html`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Trader Analyzer API - Documentation</title>
			<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
			<link rel="icon" href="https://bun.com/favicon.ico">
			<style>
				body { margin: 0; padding: 0; background: #1a1a2e; }
				.swagger-ui { max-width: 1400px; margin: 0 auto; }
				.swagger-ui .topbar { display: none; }
				.swagger-ui .info { margin: 30px 0; }
				.swagger-ui .info .title { color: #fff; }
				.swagger-ui .info .description { color: #ccc; }
				.swagger-ui .info .description p { margin: 10px 0; }
				.swagger-ui .info .description code { background: #2d2d44; padding: 2px 6px; border-radius: 4px; }
				.swagger-ui .info .description pre { background: #2d2d44; padding: 15px; border-radius: 8px; overflow-x: auto; }
				.swagger-ui .info .description table { border-collapse: collapse; margin: 15px 0; }
				.swagger-ui .info .description th, .swagger-ui .info .description td { border: 1px solid #444; padding: 8px 12px; }
				.swagger-ui .info .description th { background: #2d2d44; }
				.swagger-ui .scheme-container { background: #16213e; }
				.swagger-ui .opblock-tag { color: #fff; border-bottom: 1px solid #333; }
				.swagger-ui .opblock { border-radius: 8px; margin: 10px 0; }
				.swagger-ui .opblock .opblock-summary { border-radius: 8px; }
				.swagger-ui .opblock.opblock-get { background: rgba(97, 175, 254, 0.1); border-color: #61affe; }
				.swagger-ui .opblock.opblock-post { background: rgba(73, 204, 144, 0.1); border-color: #49cc90; }
				.swagger-ui .opblock.opblock-delete { background: rgba(249, 62, 62, 0.1); border-color: #f93e3e; }
				.swagger-ui .btn { border-radius: 6px; }
				.swagger-ui select { border-radius: 6px; }
				.swagger-ui input[type=text] { border-radius: 6px; }
				.swagger-ui textarea { border-radius: 6px; }
				.swagger-ui .model-box { background: #2d2d44; }
				.swagger-ui section.models { border: 1px solid #333; border-radius: 8px; }
				.swagger-ui section.models h4 { color: #fff; }
				/* Tag badges */
				.swagger-ui .opblock-tag small {
					font-family: monospace;
					background: #2d2d44;
					padding: 2px 8px;
					border-radius: 4px;
					font-size: 11px;
				}
			</style>
		</head>
		<body>
			<div id="swagger-ui"></div>
			<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
			<script>
				const ui = SwaggerUIBundle({
					url: '${openApiUrl}',
					dom_id: '#swagger-ui',
					presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
					layout: 'BaseLayout',
					deepLinking: true,
					displayRequestDuration: true,
					filter: true,
					showExtensions: true,
					showCommonExtensions: true,
					defaultModelsExpandDepth: 2,
					defaultModelExpandDepth: 2,
					docExpansion: 'list',
					syntaxHighlight: { theme: 'monokai' },
					onComplete: function() {
						console.log('Swagger UI loaded successfully');
					},
					onFailure: function(data) {
						console.error('Failed to load OpenAPI spec:', data);
						document.getElementById('swagger-ui').innerHTML = 
							'<div style="color: #fff; padding: 20px; text-align: center;">' +
							'<h2>Failed to load API definition</h2>' +
							'<p>Error: ' + (data.message || 'Unknown error') + '</p>' +
							'<p>URL: ${openApiUrl}</p>' +
							'<p><a href="${openApiUrl}" style="color: #61affe;">Try opening the JSON directly</a></p>' +
							'</div>';
					}
				});
				window.ui = ui;
			</script>
		</body>
		</html>
	`
  return c.html(htmlContent)
})

export default docs
