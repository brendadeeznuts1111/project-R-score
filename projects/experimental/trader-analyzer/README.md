# [NEXUS.README.RG] NEXUS

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-NEXUS-README@0.1.0;instance-id=NEXUS-README-001;version=0.1.0}][PROPERTIES:{readme={value:"nexus-readme";@root:"ROOT-DOC";@chain:["BP-MARKDOWN","BP-GETTING-STARTED"];@version:"0.1.0"}}][CLASS:NexusReadme][#REF:v-0.1.0.BP.NEXUS.README.1.0.A.1.1.DOC.1.1]]`

**Unified Trading Intelligence Platform**

Cross-market arbitrage detection connecting crypto exchanges, prediction markets, and sports betting with deterministic identity resolution across 100+ venues.

**Code Reference**: `#REF:v-0.1.0.BP.NEXUS.README.1.0.A.1.1.DOC.1.1`

**Bun Version**: 1.3+ recommended (1.2+ compatible with fallbacks)

---

## 1. [NEXUS.FEATURES.RG] Features

- **ORCA Identity Layer** - UUIDv5-based canonical IDs for events across all venues
- **Cross-Market Arbitrage** - Detect price discrepancies between Polymarket, Kalshi, Deribit, and sports books
- **Real-Time Streaming** - WebSocket feeds for live price updates
- **Trader Profiling** - Behavioral analytics and performance tracking
- **100+ Exchange Support** - Via CCXT integration
- **Enterprise Data Pipeline** - Multi-stage ingestion, transformation, enrichment, and serving
- **RBAC System** - Role-based access control with feature flags
- **Properties Registry** - Schema registry with data lineage and versioning
- **ORCA Arbitrage Storage** - Persistent storage for sports betting arbitrage opportunities
- **Security & Threat Monitoring** - Runtime security monitoring, forensic logging, and automated incident response
- **Forensic Logging** - URL entity parsing correction and bookmaker profile registry integration
- **Bun 1.3 Security Scanner** - Custom security scanner for package vulnerability detection (CVE, malware, license compliance)
- **Factory Wager Mini App** - Integration with Factory Wager Mini App for monitoring and management
- **Bun.secrets Integration** - OS-native encrypted credential storage (macOS Keychain, Linux libsecret, Windows Credential Manager)
- **Bun.CSRF Protection** - Native CSRF token generation and verification for API security
- **Performance Monitoring** - High-resolution operation tracking with anomaly detection using Bun.nanoseconds()
- **Bun 1.3 Features** - YAML support, native cookies, Zstandard compression, WebSocket improvements, DisposableStack

### 1.1. [NEXUS.BUN_UTILITIES.RG] Bun Native Utilities

This project includes a comprehensive suite of **zero-dependency, high-performance utilities** built exclusively with Bun's native APIs. These utilities replace 20+ npm packages while delivering **683x average performance improvements**.

#### Core Utilities

- **Rate Limiter** (`rate-limiter.ts`) - Token bucket and sliding window rate limiting with sync/async support
- **Promise Utils** (`promise-utils.ts`) - Advanced promise patterns: retry, timeout, race, pool, memoization
- **Path Resolver** (`path-resolver.ts`) - Cross-platform path resolution, URL conversion, globbing, executable finding
- **Migration Helper** (`migration-helper.ts`) - NPM → Bun package replacement guide with 20+ mappings
- **Performance Benchmarks** (`performance-benchmarks.ts`) - Comprehensive benchmark suite comparing Bun vs NPM

#### Performance Highlights

| Operation | Bun Performance | NPM Equivalent | Speedup |
|-----------|----------------|----------------|---------|
| String Width (Unicode) | 15.83ms | 106,939ms | **6,756x** |
| ANSI Strip | 8.76ms | 499.50ms | **57x** |
| Deep Equality | 1.63ms | 4.89ms | **3x** |
| SHA-256 Hashing | 1.14ms | 5.72ms | **5x** |
| GZIP Compression | 1.93ms | 2.89ms | **2x** |

**Average Performance Improvement: 683x**

#### Usage Examples

```typescript
// Rate limiting API calls
import { RateLimiter } from './scripts/bun-runtime-utils';
const limiter = new RateLimiter(5, 1); // 5 requests/second
if (limiter.acquireSync()) {
  // Make API call
}

// Promise retry with backoff
import { PromiseUtils } from './scripts/bun-runtime-utils';
const result = await PromiseUtils.retry(
  unreliableOperation,
  { retries: 3, delay: 100 }
);

// Path resolution and URL conversion
import { PathResolver } from './scripts/bun-runtime-utils';
const fileURL = PathResolver.toFileURL('./config.json');
const path = PathResolver.fromFileURL(fileURL);
```

#### Integration Testing

Run the comprehensive integration test to validate all utilities:

```bash
bun run integration-test.ts
```

This demonstrates all utilities working together in real-world scenarios including rate limiting, promise pools, progress bars, and performance benchmarking.

#### Migration Benefits

- **Zero Dependencies**: Eliminates 20+ npm packages
- **Bundle Size Reduction**: ~95% smaller bundle sizes
- **Performance**: Native Bun APIs with nanosecond precision
- **Security**: No third-party dependencies to audit
- **Maintenance**: No package updates or security patches needed

---

## 2. [NEXUS.QUICKSTART.RG] Quick Start

### 2.1. [QUICKSTART.INSTALLATION.RG] Installation

```bash
# Clone repository
git clone https://github.com/brendadeeznuts1111/trader-analyzer-bun.git
cd trader-analyzer-bun

# Install dependencies
bun install

# Verify installation
bun run typecheck
bun test
```

### 2.2. [QUICKSTART.DEVELOPMENT.RG] Development

```bash
# Start development server (with HMR)
bun run dev

# Run production server
bun run start

# Run tests
bun test

# Type check
bun run typecheck

# Lint code
bun run lint
```

### 2.3. [QUICKSTART.CLI.RG] CLI Tools

```bash
# Live trading dashboard
bun run dashboard

# Dashboard server (serves dashboard HTML with API integration)
bun run dashboard:serve

# Trading data import
bun run fetch

# Security testing
bun run security

# Management & Integration
bun run management services      # Check service statuses
bun run management integrations   # Check integration statuses
bun run management health         # Full health check
bun run management config         # Show configuration
bun run management validate       # Validate configuration

# Type matrix visualization
bun run type-matrix stats

# Telegram management
bun run telegram send "Message" --topic 2 --pin

# MCP tools
bun run mcp list
bun run mcp exec tooling-diagnostics

# GitHub integration
bun run github prs
```

---

## 3. [NEXUS.API.RG] API Endpoints

### 3.1. [API.HEALTH.RG] Health & Status

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /health` | Health check with Bun server metrics | `#REF:routes.ts:101` |
| `GET /metrics` | Prometheus metrics (includes Bun server metrics) | `#REF:routes.ts:96` |
| `GET /api/orca/stats` | ORCA normalizer statistics | `#REF:routes.ts:120]` |
| `GET /api/arbitrage/status` | Arbitrage scanner status | `#REF:routes.ts:150]` |
| `GET /api/arbitrage/crypto/stats` | Crypto matcher statistics | `#REF:routes.ts:200]` |

### 3.2. [API.DOCUMENTATION.RG] Documentation

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /docs` | OpenAPI documentation | `#REF:docs.ts]` |
| `GET /docs/errors` | Error registry | `#REF:errors/index.ts]` |

### 3.3. [API.ORCA_ARBITRAGE.RG] ORCA Arbitrage

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `POST /orca/arbitrage/store` | Store opportunity | `#REF:routes.ts:2455]` |
| `GET /orca/arbitrage/opportunities` | Query opportunities | `#REF:routes.ts:2476]` |
| `GET /orca/arbitrage/book-pairs` | Book pair statistics | `#REF:routes.ts:2520]` |

### 3.4. [API.RESEARCH.RG] Research & Pattern Discovery

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /research/url-anomalies` | Discover URL anomaly patterns | `#REF:routes.ts:research/url-anomalies` |
| `GET /research/url-anomalies/:bookmaker` | Get bookmaker anomalies | `#REF:routes.ts:research/url-anomalies/:bookmaker` |
| `GET /research/url-anomalies/:bookmaker/false-steam-rate` | Calculate false steam rate | `#REF:routes.ts:research/url-anomalies/:bookmaker/false-steam-rate` |
| `GET /research/sitemap/:eventId` | Generate node sitemap | `#REF:routes.ts:research/sitemap` |

---

## 4. [NEXUS.RESEARCH.RG] Research Scripts & Automation

### 4.1. [RESEARCH.OVERVIEW.RG] Overview

Automated research scripts for covert steam detection, shadow market analysis, deceptive line identification, and automated arbitrage trading. All scripts integrate with the alert system and advanced research orchestrator for intelligent, automated analysis.

**Key Features:**
- **Nightly Covert Steam Scanning** - Automated detection of hidden sharp money movements
- **Weekly Shadow Market Analysis** - Comprehensive market structure and arbitrage analysis
- **Deceptive Line Detection** - Pre-game bait line identification
- **Automated Trading** - Paper and live trading execution with risk management

### 4.2. [RESEARCH.SCRIPTS.RG] Available Scripts

#### 4.2.1. [RESEARCH.SCAN_COVERT_STEAM.RG] Covert Steam Scan

Nightly automated scan for covert steam events across all sports.

```bash
bun run scripts/research-scan-covert-steam-events.ts \
  --sport_category=all \
  --minimum_severity_score=7 \
  --sharp_money_confirmation_only=true \
  --output=/var/log/hyper-bun/covert-steam-nightly.jsonl.zst \
  --enable_alerts=true
```

**Cron:** `0 2 * * *` (daily at 2 AM)

#### 4.2.2. [RESEARCH.SHADOW_MARKET_GRAPH.RG] Shadow Market Graph Analysis

Weekly comprehensive shadow market graph analysis with orchestrator integration.

```bash
bun run scripts/research-generate-shadow-market-graph.ts \
  --event_identifier=all-nfl \
  --analyze=arbitrage,latency,comprehensive \
  --export=./data/shadow-market-graphs-weekly.db \
  --use_orchestrator=true \
  --enable_alerts=true
```

**Cron:** `0 4 * * 0` (weekly on Sunday at 4 AM)

#### 4.2.3. [RESEARCH.DECEPTIVE_LINES.RG] Deceptive Line Identification

Identify bait lines before major games.

```bash
bun run scripts/research-identify-deceptive-lines.ts \
  --bookmaker_name=DraftKings \
  --event_identifier=nfl-2025-001 \
  --probe_activation=true
```

#### 4.2.4. [RESEARCH.AUTO_TRADER.RG] Automated Covert Arbitrage Trading

Automated trading system with paper and live modes.

```bash
# Paper trading (simulation)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=paper \
  --enable_alerts=true

# Live trading (⚠️ executes real trades)
bun run scripts/research-auto-covert-arb-trader.ts \
  --minimum_profit_percentage=0.02 \
  --maximum_risk_usd=1000 \
  --trade_mode=live \
  --enable_alerts=true
```

### 4.3. [RESEARCH.INTEGRATION.RG] Integration Features

- **Alert System Integration** - Automatic alert processing via `ShadowGraphAlertSystem`
- **Orchestrator Support** - Comprehensive analysis via `AdvancedResearchOrchestrator`
- **YAML Configuration** - Flexible alert rules via `config/advanced-research-alerts.yaml`
- **Cron Ready** - Production-ready cron configurations included

**See:** [Research Scripts Integration](docs/RESEARCH-SCRIPTS-INTEGRATION.md) for complete documentation.

### 3.5. [API.SECURITY.RG] Security & Compliance

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /api/security/threats` | Security threat summary | `#REF:routes.ts:security/threats` |
| `GET /api/security/incidents` | Active security incidents | `#REF:routes.ts:security/incidents` |
| `GET /api/security/compliance` | Compliance status | `#REF:routes.ts:security/compliance` |
| `GET /api/security/compliance/report` | Compliance report download | `#REF:routes.ts:security/compliance/report` |

### 3.6. [API.REGISTRY.RG] Registry System

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /api/registry` | Overview of all registries | `#REF:routes.ts:api/registry` |
| `GET /api/registry/:registryId` | Get specific registry | `#REF:routes.ts:api/registry/:registryId` |
| `GET /api/registry/category/:category` | Filter by category | `#REF:routes.ts:api/registry/category/:category` |
| `GET /api/registry/search?tag=...` | Search registries | `#REF:routes.ts:api/registry/search` |

**Registry Types**:
- `properties` - Property definitions with versioning
- `data-sources` - Data source definitions with RBAC
- `sharp-books` - Sharp bookmaker configurations
- `bookmaker-profiles` - Bookmaker endpoint profiles
- `mcp-tools` - MCP tools registry
- `errors` - Error code registry
- `url-anomaly-patterns` - URL anomaly patterns

### 3.7. [API.MINIAPP.RG] Factory Wager Mini App

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /api/miniapp/status` | Get Factory Wager Mini App status | `#REF:routes.ts:api/miniapp/status` |
| `GET /api/miniapp/info` | Get complete miniapp information | `#REF:routes.ts:api/miniapp/info` |
| `GET /api/miniapp/health` | Get miniapp health information | `#REF:routes.ts:api/miniapp/health` |
| `GET /api/miniapp/deployment` | Get deployment information | `#REF:routes.ts:api/miniapp/deployment` |
| `GET /api/miniapp/config` | Get config.js status and content | `#REF:routes.ts:api/miniapp/config` |

### 3.8. [API.MCP_SECRETS.RG] MCP Secrets Management

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /api/mcp/secrets` | Get MCP secrets status (API keys and sessions) | `#REF:routes.ts:api/mcp/secrets` |

### 3.9. [API.DASHBOARD.RG] Dashboard API Endpoints

Hyper-Bun's operational and developer dashboards consume these APIs for real-time data retrieval and manipulation, demonstrating the dynamism and real-time nature of the intelligence system.

| Endpoint | Method | Description | Returns | Usage | Reference |
|----------|--------|-------------|---------|-------|-----------|
| `GET /api/dashboard/trading-overview` | GET | Real-time trading dashboard data | `TMATradingDashboardData` | TMA Trading Dashboard, Main Dashboard trading widgets | `9.1.1.5.0.0.0` |
| `GET /api/dashboard/bookmaker-balances` | GET | Bookmaker balance and liquidity overview | `TMABalanceOverview` | TMA Balance Overview, Main Dashboard balance widgets | `9.1.1.5.0.0.0` |
| `GET /api/dashboard/alerts` | GET | Recent alerts with filtering | `TMAAlertSummary[]` | TMA Alert List, Main Dashboard alert panel | `9.1.1.5.0.0.0` |
| `POST /api/dashboard/alerts/{alert_id}/action` | POST | Acknowledge, dismiss, or escalate alert | `TMAAlertActionResponse` | TMA Alert Actions, Main Dashboard alert controls | `9.1.1.5.0.0.0` |
| `GET /api/dashboard/correlation-graph` | GET | Multi-layer correlation graph data | `MultiLayerCorrelationGraphData` | Developer Dashboard correlation graph, TMA visualization | `4.2.2.0.0.0.0`, `9.1.1.5.0.0.0` |
| `POST /api/trade/execute` | POST | Execute trade order | `TMATradeOrderResponse` | TMA Trading Execution, Automated trading components | `9.1.1.5.0.0.0` |
| `POST /api/actions/trigger` | POST | Trigger predefined action or CLI command | `TMAActionTriggerResponse` | TMA Action Triggers, Administrative controls | `9.1.1.5.0.0.0` |
| `GET /api/telegram/bot/status` | GET | Telegram bot status and metrics | `TelegramBotStatus` | Operational Dashboard status widget, TMA status | `9.1.1.5.0.0.0` |
| `GET /api/telegram/routing-config` | GET | Telegram routing configuration | `RoutingConfig` | Operational Dashboard routing visualization | `9.1.3.2.0.0.0` |
| `POST /api/policies/telegram-routing` | POST | Update Telegram routing configuration | `RoutingConfig` | Operational Dashboard routing controls | `9.1.3.2.0.0.0` |
| `POST /api/policies/telegram-throttling` | POST | Update throttling policy | `ThrottlingPolicy` | Operational Dashboard throttling controls | `9.1.3.4.0.0.0` |

**Dashboard API Consumption Patterns**:
- **Operational Dashboard** (`dashboard/registry.html`): Consumes status, routing, and alert APIs for real-time monitoring
- **Developer Dashboard** (`dashboard/index.html`): Consumes correlation graph and performance APIs for analysis
- **Telegram Mini App (TMA)**: Consumes trading, alert, and action APIs for mobile operational control

**Real-Time Updates**:
- WebSocket connections via `src/api/ui-policy-ws.ts` for live status updates
- Polling every 2-5 seconds for metrics that don't support WebSocket
- Event-driven updates when policies or configurations change

**Cross-Reference**: 
- Complete API documentation: [Communication & Notification Subsystem](./docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md) - Section `9.1.1.5.0.0.0`
- Dashboard API consumption patterns: [Communication & Notification Subsystem](./docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md) - Section `9.1.3.5.0.0.0`
- Multi-Layer Correlation Graph: [MCP Alerting](./docs/4.0.0.0.0.0.0-MCP-ALERTING.md) - Section `4.2.2.0.0.0.0`

**Ripgrep**: `rg "api.*dashboard|api.*trade|api.*actions|dashboard.*api" src/api/routes.ts`

---

## 4. [NEXUS.ARCHITECTURE.RG] Architecture

### 4.1. [ARCHITECTURE.STRUCTURE.RG] Project Structure

The project follows a well-organized directory structure with clear separation of concerns:

```text
src/
├── analytics/      # Trading analytics & profiling
├── arbitrage/      # Cross-market arbitrage detection
├── cache/          # API response caching
├── errors/         # Error registry (NX-xxx codes)
├── orca/           # ORCA identity normalization
│   ├── arbitrage/  # ORCA arbitrage storage
│   └── sharp-books/# Sharp books registry
├── pipeline/       # Enterprise data pipeline
│   ├── stages/     # Ingestion/Transformation/Enrichment/Serving
│   └── orchestrator.ts
├── rbac/           # Role-based access control
├── properties/     # Properties registry
├── funnel/         # Data funneling system
├── providers/      # Exchange & venue integrations
├── api/            # Hono API routes
├── types/          # TypeScript definitions
├── utils/          # Bun-native utilities
├── secrets/        # Bun.secrets integration (OS-native credential storage)
│   ├── index.ts    # Core secrets API
│   └── mcp.ts      # MCP secrets management
├── middleware/     # HTTP middleware
│   └── csrf.ts     # Bun.CSRF protection middleware
├── security/       # Security monitoring & incident response
│   ├── runtime-monitor.ts      # Runtime threat detection
│   ├── compliance-logger.ts    # SOC2/GDPR audit trail
│   ├── incident-response.ts    # Automated threat response
│   ├── secure-deployer.ts      # Binary signing & verification
│   └── bun-scanner.ts          # Bun 1.3 Security Scanner (CVE, malware detection)
├── logging/        # Forensic logging
│   ├── forensic-movement-logger.ts    # Base forensic logger
│   ├── corrected-forensic-logger.ts   # URL entity parsing correction
│   └── bookmaker-profile.ts           # Bookmaker profiling & registry
└── research/       # Pattern discovery & research
    ├── patterns/   # Pattern detection engines
    │   └── url-anomaly-patterns.ts   # URL anomaly pattern discovery
    ├── discovery/  # Pattern mining
    └── tension/    # Tension detection
```

**Organized Directories**:
- `/docs/` - Documentation organized by topic (guides, bun, telegram, dashboard, etc.)
- `/docs/root-docs/` - Project-level documentation moved from root
- `/scripts/` - Build and utility scripts
- `/scripts/root-scripts/` - Utility scripts moved from root
- `/config/` - Configuration files (bunfig.toml, nexus.toml, tsconfig.json, etc.)
- `/data/` - Data files and imports (CSV files, database files)
- `/test/` - Test files
- `/examples/` - Example code
- `/bench/` - Benchmark files
- `/commands/` - CLI command documentation
- `/dashboard/` - Dashboard HTML/JS files
- `/public/` - Public assets
- `/deploy/` - Deployment configurations

### 4.1.1. [ARCHITECTURE.ROOT_ORGANIZATION.RG] Root Directory Organization

The root directory is kept clean and organized, containing only essential project files:

**Essential Files (Root Directory)**:
- `README.md` - Project overview and documentation
- `CLAUDE.md` - Claude Code assistant guidelines
- `package.json` - Node.js/Bun package configuration
- `bun.lock` - Dependency lock file

**Configuration Files (in `/config/` directory)**:
- `config/tsconfig.json` - TypeScript configuration
- `config/bunfig.toml` - Bun configuration
- `config/nexus.toml` - Nexus configuration
- `config/wrangler.toml` - Cloudflare Workers configuration

**Organized File Locations**:
- **Documentation** → `/docs/` (topic-based subdirectories) or `/docs/root-docs/` (project-level)
- **Scripts** → `/scripts/` (build scripts) or `/scripts/root-scripts/` (utility scripts)
- **Configuration** → `/config/` (all configuration files)
- **Data Files** → `/data/` (CSV files, database files, imports)
- **Source Code** → `/src/` (application code)
- **Tests** → `/test/` (test files)
- **Examples** → `/examples/` (example code)

For detailed information about root directory organization and file placement guidelines, see **[docs/root-docs/ROOT-DIRECTORY-ORGANIZATION.md](docs/root-docs/ROOT-DIRECTORY-ORGANIZATION.md)**.

### 4.2. [ARCHITECTURE.STACK.RG] Technology Stack

- **Runtime**: [Bun](https://bun.sh) >= 1.3.0 (1.3+ required for Security Scanner, Bun.secrets, Bun.CSRF)
- **Framework**: [Hono](https://hono.dev) - Fast web framework
- **Exchanges**: [CCXT](https://ccxt.com) - 100+ crypto exchanges
- **Language**: TypeScript (strict mode)
- **Database**: `bun:sqlite` with WAL mode
- **Cache**: Redis (`bun:redis`) + in-memory `Map`

---

## 5. [NEXUS.CONFIGURATION.RG] Configuration

### 5.1. [CONFIG.ENVIRONMENT.RG] Environment Variables

```bash
PORT=3001              # Server port
NODE_ENV=development   # Environment
```

### 5.2. [CONFIG.PERFORMANCE.RG] Performance Targets

| Metric | Target | Reference |
|--------|--------|-----------|
| Latency | p95 < 150ms | `config/nexus.toml` |
| Throughput | 1000 rps | `config/nexus.toml` |
| Cache hit ratio | > 80% | `config/nexus.toml` |
| Memory usage | < 512MB | `config/nexus.toml` |
| Startup time | < 5s | `config/nexus.toml` |
| Query response | < 3ms | `config/nexus.toml` |

See `config/nexus.toml` for full performance configuration and alerting thresholds.

---

## 6. [NEXUS.DEVELOPMENT.RG] Development

### 6.1. [DEV.COMMANDS.RG] Commands

```bash
# Run benchmarks
bun run bench

# Lint code
bun run lint

# Fetch market data
bun run fetch

# Security testing
bun run security
```

### 6.2. [DEV.CONTRIBUTING.RG] Contributing

See [CONTRIBUTING.md](docs/guides/CONTRIBUTING.md) for:
- Commit message conventions
- Branching strategy
- Code style guidelines
- PR process
- Testing guidelines

---

## 7. [NEXUS.DOCUMENTATION.RG] Documentation

### 7.1. [DOCS.GUIDES.RG] Guides

- **[CONTRIBUTING.md](docs/guides/CONTRIBUTING.md)** - Contributing guidelines
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guidance
- **[DOCUMENTATION-STYLE.md](docs/guides/DOCUMENTATION-STYLE.md)** - Documentation style guide
- **[METADATA-DOCUMENTATION-MAPPING.md](docs/api/METADATA-DOCUMENTATION-MAPPING.md)** - Metadata system mapping
- **[docs/root-docs/ROOT-DIRECTORY-ORGANIZATION.md](docs/root-docs/ROOT-DIRECTORY-ORGANIZATION.md)** - Root directory organization guide

### 7.2. [DOCS.FEATURES.RG] Feature Documentation

- **[ORCA-ARBITRAGE-INTEGRATION.md](docs/api/ORCA-ARBITRAGE-INTEGRATION.md)** - ORCA arbitrage integration
- **[DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)** - Deployment guide
- **[docs/SECURITY-ARCHITECTURE.md](docs/SECURITY-ARCHITECTURE.md)** - Security architecture and threat monitoring
- **[docs/FORENSIC-LOGGING.md](docs/FORENSIC-LOGGING.md)** - Forensic logging and URL entity parsing correction
- **[docs/FORENSIC-LOGGING-IMPROVEMENTS.md](docs/FORENSIC-LOGGING-IMPROVEMENTS.md)** - Production-ready improvements
- **[docs/BOOKMAKER-PROFILING.md](docs/BOOKMAKER-PROFILING.md)** - Bookmaker profiling and registry integration
- **[docs/URL-PARSING-EDGE-CASE.md](docs/URL-PARSING-EDGE-CASE.md)** - URL parsing edge case documentation
- **[docs/URL-ANOMALY-PATTERNS.md](docs/URL-ANOMALY-PATTERNS.md)** - URL anomaly pattern detection engine
- **[docs/REGISTRY-SYSTEM.md](docs/REGISTRY-SYSTEM.md)** - Comprehensive registry system documentation
- **[docs/BUN-SECURITY-SCANNER.md](docs/BUN-SECURITY-SCANNER.md)** - Bun 1.3 Security Scanner integration
- **[docs/BUN-1.3-SECURITY-ENHANCEMENTS.md](docs/BUN-1.3-SECURITY-ENHANCEMENTS.md)** - Bun 1.3 security features overview
- **[docs/FACTORY-WAGER-MINIAPP-INTEGRATION.md](docs/FACTORY-WAGER-MINIAPP-INTEGRATION.md)** - Factory Wager Mini App integration guide
- **[docs/MCP-SECRETS-INTEGRATION.md](docs/MCP-SECRETS-INTEGRATION.md)** - MCP secrets management with Bun.secrets
- **[docs/BUN-1.3-FEATURES.md](docs/BUN-1.3-FEATURES.md)** - Bun 1.3 features integration (YAML, cookies, compression, etc.)
- **[docs/BUN-1.3-MIGRATION-GUIDE.md](docs/BUN-1.3-MIGRATION-GUIDE.md)** - Migration guide from Bun 1.2 to 1.3
- **[docs/BUN-1.3-QUICK-REFERENCE.md](docs/BUN-1.3-QUICK-REFERENCE.md)** - Quick reference card for Bun 1.3 features
- **[docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md](docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md)** - Authentication & session management with Bun native cookies
- **[docs/RESEARCH-SCRIPTS-INTEGRATION.md](docs/RESEARCH-SCRIPTS-INTEGRATION.md)** - Research scripts integration with alert system and orchestrator
- **[docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md](docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md)** - Communication & Notification Subsystem with dashboard API consumption patterns (`9.1.3.5.0.0.0`)
- **[docs/11.0.0.0.0.0.0-CODE-QUALITY-PR-AUTOMATION.md](docs/11.0.0.0.0.0.0-CODE-QUALITY-PR-AUTOMATION.md)** - Code Quality & PR Automation Subsystem with automated PR documentation

### 7.3. [DOCS.RESEARCH.RG] Research & Analysis Documentation

- **[docs/SHADOW-GRAPH-SYSTEM.md](docs/SHADOW-GRAPH-SYSTEM.md)** - Shadow graph architecture and detection system (63 components)
- **[docs/ADVANCED-DETECTION-SYSTEM.md](docs/ADVANCED-DETECTION-SYSTEM.md)** - Advanced detection components (RLM, steam origination, etc.) - 49 components
- **[docs/SHADOW-GRAPH-QUICK-REFERENCE.md](docs/SHADOW-GRAPH-QUICK-REFERENCE.md)** - Quick reference guide for shadow graph system
- **[docs/SHADOW-GRAPH-COMPLETE-HIERARCHY.md](docs/SHADOW-GRAPH-COMPLETE-HIERARCHY.md)** - Complete hierarchical component reference (112+ components)
- **[docs/SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md](docs/SHADOW-GRAPH-IMPLEMENTATION-VERIFICATION.md)** - Implementation verification report
- **[docs/1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md](docs/1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md)** - Multi-layer correlation graph system

### 7.4. [DOCS.SECURITY.RG] Security & API Endpoints

| Endpoint | Description | Reference |
|----------|-------------|-----------|
| `GET /api/security/threats` | Security threat summary | `#REF:routes.ts:security/threats` |
| `GET /api/security/incidents` | Active security incidents | `#REF:routes.ts:security/incidents` |
| `GET /api/security/compliance` | Compliance status | `#REF:routes.ts:security/compliance` |
| `GET /api/security/compliance/report` | Compliance report download | `#REF:routes.ts:security/compliance/report` |
| `GET /api/examples` | API examples | `#REF:routes.ts:examples` |

---

## 8. [NEXUS.LICENSE.RG] License

MIT

---

## 9. Status

**Status**: ✅ README established with metadata integration

**Last Updated**: 2025-01-28  
**Version**: 0.1.0
