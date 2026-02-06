# NEXUS Registry System

Unified registry system for managing all platform registries: properties, data sources, tools, bookmakers, and more.

## 📚 Registry Overview

The NEXUS platform uses multiple registries organized by category:

### Categories

1. **Data Registries** - Store data definitions and schemas
2. **Tooling Registries** - Manage tools and integrations
3. **Security Registries** - Security-related configurations
4. **Research Registries** - Research patterns and discoveries
5. **Integration Registries** - Error codes and API references
6. **CLI Registries** - Command-line interface tools and utilities

## 🔍 Registry Types

### 1. Property Registry (`properties`)
- **Purpose**: Property definitions with versioning and lineage tracking
- **Location**: `src/properties/registry.ts`
- **Database**: `data/properties.db`
- **Tags**: `schema`, `versioning`, `lineage`, `validation`
- **Use Cases**:
  - Schema validation
  - Property versioning
  - Data lineage tracking
  - Usage analytics

**API Endpoint**: `GET /api/registry/properties`

### 2. Data Source Registry (`data-sources`)
- **Purpose**: Data source definitions with RBAC and feature flag integration
- **Location**: `src/sources/registry.ts`
- **Database**: `data/sources.db`
- **Tags**: `sources`, `rbac`, `feature-flags`, `pipeline`
- **Use Cases**:
  - Source registration
  - RBAC-based access control
  - Feature flag gating
  - Pipeline integration

**API Endpoint**: `GET /api/registry/data-sources`

### 3. Sharp Books Registry (`sharp-books`)
- **Purpose**: Sharp bookmaker configurations with tier rankings
- **Location**: `src/orca/sharp-books/registry.ts`
- **Storage**: In-memory Map
- **Tags**: `bookmakers`, `sharp`, `tiers`, `endpoints`
- **Use Cases**:
  - Bookmaker discovery
  - Sharp signal detection
  - Line movement tracking
  - Endpoint management

**API Endpoint**: `GET /api/registry/sharp-books`

### 4. Bookmaker Profile Registry (`bookmaker-profiles`)
- **Purpose**: Bookmaker endpoint parameter configurations for forensic logging
- **Location**: `src/logging/bookmaker-profile.ts`
- **Database**: `data/security.db` (table: `bookmaker_profiles`)
- **Tags**: `bookmakers`, `endpoints`, `forensic`, `parameters`
- **Use Cases**:
  - Endpoint profiling
  - Parameter validation
  - Forensic logging
  - Anomaly detection

**API Endpoint**: `GET /api/registry/bookmaker-profiles`

### 5. MCP Tools Registry (`mcp-tools`)
- **Purpose**: Model Context Protocol tools for AI integration
- **Location**: `src/mcp/tools/*.ts`
- **Storage**: Runtime (dynamically loaded)
- **Tags**: `mcp`, `tools`, `ai`, `integration`
- **Categories**:
  - `bun-tooling` - Bun diagnostic tools
  - `bun-shell` - Shell demonstration tools
  - `docs-integration` - Documentation tools
  - `security` - Security dashboard tools
  - `research` - Research exploration tools
  - `anomaly-research` - Anomaly research tools

**API Endpoint**: `GET /api/registry/mcp-tools`

### 6. CSS Bundler Utilities (`css-bundler`)
- **Purpose**: Bun CSS bundler integration with syntax lowering (nesting, color-mix, relative colors, LAB colors, logical properties, modern selectors, math functions)
- **Location**: `src/utils/css-bundler.ts`
- **Storage**: Runtime utilities
- **Tags**: `css`, `bundler`, `bun`, `color`, `syntax-lowering`, `nesting`, `color-mix`, `relative-colors`, `lab-colors`, `logical-properties`, `modern-selectors`, `math-functions`
- **Use Cases**:
  - CSS bundling with Bun.build
  - CSS modules with composition
  - Syntax lowering detection and validation
  - Color utilities with Bun.color
  - Golden CSS Template patterns
  - Modern CSS feature support
  - RTL/LTR with logical properties

**API Endpoint**: `GET /api/registry/css-bundler`

### 7. Bun APIs Registry (`bun-apis`)
- **Purpose**: Comprehensive Bun API coverage including Bun.serve, Bun.file, bun:sqlite, and Bun 1.3 features
- **Location**: `src/runtime/bun-native-utils-complete.ts`
- **Storage**: TypeScript definitions and runtime utilities
- **Tags**: `bun`, `apis`, `runtime`, `serve`, `sqlite`, `file`, `1.3`
- **Use Cases**:
  - Bun API discovery and documentation
  - API compatibility checking
  - Feature flag tracking for new APIs
  - Migration guides for Node.js
  - Performance benchmarking

**API Endpoint**: `GET /api/registry/bun-apis`

### 8. Error Registry (`errors`)
- **Purpose**: Error code registry with NX-xxx codes and references
- **Location**: `src/errors/index.ts`
- **Storage**: TypeScript exports
- **Tags**: `errors`, `codes`, `nx-xxx`, `references`
- **Use Cases**:
  - Error code lookup
  - Error documentation
  - Error tracking
  - API error handling

**API Endpoint**: `GET /api/registry/errors`

### 9. Security Threats Registry (`security-threats`)
- **Purpose**: Real-time security threat monitoring and incident tracking
- **Location**: `src/security/incident-response.ts`, `src/security/runtime-monitor.ts`
- **Storage**: Database (`data/security.db`)
- **Tags**: `security`, `threats`, `incidents`, `monitoring`, `compliance`
- **Use Cases**:
  - Real-time threat detection
  - Incident response tracking
  - Compliance audit logging
  - Security metrics dashboard
  - Threat pattern analysis

**API Endpoint**: `GET /api/security/threats`

### 10. URL Anomaly Pattern Registry (`url-anomaly-patterns`)
- **Purpose**: URL anomaly patterns discovered from forensic logging
- **Location**: `src/research/patterns/url-anomaly-patterns.ts`
- **Database**: `data/research.db`
- **Tags**: `url`, `anomalies`, `patterns`, `forensic`
- **Use Cases**:
  - Pattern discovery
  - False steam detection
  - URL artifact filtering
  - Research analysis

**API Endpoint**: `GET /api/registry/url-anomaly-patterns`

### 11. Tension Pattern Registry (`tension-patterns`)
- **Purpose**: Market tension patterns between sub-market nodes for arbitrage detection
- **Location**: `src/research/discovery/anomaly-aware-miner.ts`
- **Database**: `data/research.db`
- **Tags**: `tension`, `arbitrage`, `patterns`, `nodes`, `correlation`
- **Use Cases**:
  - Tension event discovery
  - Cross-market correlation analysis
  - Arbitrage opportunity detection
  - Pattern backtesting
  - ML clustering for new patterns

**API Endpoint**: `GET /api/registry/tension-patterns`

### 12. CLI Commands Registry (`cli-commands`)
- **Purpose**: Command-line interface tools for system management and operational control
- **Location**: `src/api/registry.ts` (`getCLICommandsRegistry()`)
- **Storage**: Static definitions
- **Tags**: `cli`, `commands`, `telegram`, `mcp`, `dashboard`, `fetch`, `security`, `management`
- **Commands**:
  - `telegram` (11.1.0.0.0.0.0) - Telegram supergroup management
  - `mcp` (11.2.0.0.0.0.0) - MCP tools execution
  - `dashboard` (11.3.0.0.0.0.0) - Live trading dashboard
  - `fetch` (11.4.0.0.0.0.0) - Trade data import
  - `security` (11.5.0.0.0.0.0) - Security testing
  - `management` (11.6.0.0.0.0.0) - System service management
  - `github` (11.7.0.0.0.0.0) - GitHub integration
  - `password` (11.8.0.0.0.0.0) - Password generation
- **Use Cases**:
  - CLI command discovery
  - Command documentation lookup
  - Usage examples and cross-references
  - Version tracking (11.x.x.x.x.x.x system)

**API Endpoint**: `GET /api/registry/cli-commands`

### 13. Team & Departments Registry (`team-departments`)
- **Purpose**: Team structure, departments, and code review assignments
- **Location**: `src/api/registry.ts` (`getRegistriesOverview()`)
- **Storage**: Static definitions
- **Tags**: `team`, `departments`, `review`, `organization`, `ownership`
- **Use Cases**:
  - Team structure lookup
  - Code review assignment
  - Department discovery
  - File ownership mapping
  - PR reviewer suggestions

**API Endpoint**: `GET /api/registry/team-departments`

### 14. Topics & Categories Registry (`topics`)
- **Purpose**: GitHub topics, labels, and categorization system for issues and PRs
- **Location**: `src/api/registry.ts` (`getRegistriesOverview()`)
- **Storage**: Static definitions
- **Tags**: `topics`, `labels`, `categories`, `github`, `organization`
- **Use Cases**:
  - Topic discovery and documentation
  - Label management
  - Category organization
  - Issue/PR categorization
  - Automated labeling

**API Endpoint**: `GET /api/registry/topics`

### 15. API Examples Registry (`api-examples`)
- **Purpose**: Comprehensive API usage examples with request/response samples
- **Location**: `src/api/examples.ts`
- **Storage**: Static definitions
- **Tags**: `examples`, `api`, `documentation`, `requests`, `responses`
- **Use Cases**:
  - API exploration and testing
  - Code generation from examples
  - Documentation generation
  - SDK development
  - Integration testing

**API Endpoint**: `GET /api/examples`

### 16. Factory Wager Mini App Registry (`mini-app`)
- **Purpose**: Telegram Mini App for real-time trading alerts and arbitrage monitoring
- **Location**: `src/telegram/mini-app.ts`, `src/api/routes.ts`
- **Storage**: Runtime configuration
- **Tags**: `telegram`, `miniapp`, `alerts`, `arbitrage`, `real-time`
- **Use Cases**:
  - Real-time covert steam alerts
  - Arbitrage opportunity notifications
  - Sports betting market monitoring
  - Telegram bot integration
  - Mobile trading interface

**API Endpoint**: `GET /api/miniapp/info`

## 🔗 API Endpoints

### Overview
```text
GET /api/registry
```
Returns overview of all registries with metadata, tags, and use cases.

### Specific Registry
```text
GET /api/registry/:registryId
```
Returns all items in a specific registry.

**Examples**:
- `GET /api/registry/properties`
- `GET /api/registry/mcp-tools`
- `GET /api/registry/cli-commands`
- `GET /api/registry/sharp-books`

### Category Filter
```text
GET /api/registry/category/:category
```
Filter registries by category (`data`, `tooling`, `security`, `research`, `integration`, `cli`).

### Search
```text
GET /api/registry/search?tag=...&category=...
```
Search registries by tag and/or category.

## 🎨 Registry Browser

**Location**: `dashboard/registry.html`

**Features**:
- Visual registry browser
- Category filtering
- Tag-based search
- Use cases display
- Item counts and statistics
- Direct API endpoint links

**Access**: Open `dashboard/registry.html` in browser or via dashboard link.

## 📊 Registry Structure

### Registry Metadata

Each registry includes:
- **id**: Unique identifier
- **name**: Human-readable name
- **description**: What the registry stores
- **category**: Classification (`data`, `tooling`, `security`, `research`, `integration`, `cli`)
- **endpoint**: API endpoint path
- **tags**: Searchable tags
- **useCases**: Common use cases
- **itemCount**: Number of items (if available)

### MCP Tools Registry Structure

MCP tools are organized by category:

1. **Bun Tooling** (`bun-tooling`)
   - `tooling-diagnostics`
   - `tooling-flush-forensics`
   - `tooling-profile-book`
   - `tooling-check-health`
   - `tooling-get-metrics`

2. **Bun Shell** (`bun-shell`)
   - Shell demonstration tools

3. **Docs Integration** (`docs-integration`)
   - `docs-get-headers`
   - `docs-get-footers`
   - `docs-bun-reference`
   - `docs-tooling-info`
   - `docs-get-sitemap`
   - `docs-metadata-mapping`

4. **Security** (`security`)
   - `security-threat-summary`
   - `security-incident-response`
   - `security-compliance-status`
   - `security-recent-threats`

5. **Research** (`research`)
   - `research-discover-patterns`
   - `research-explore-tension`
   - `research-analyze-correlation`
   - `research-backtest-pattern`
   - `research-discover-url-anomalies`
   - `research-calculate-false-steam-rate`
   - `research-discover-clean-patterns`
   - `research-correct-historical-data`
   - `research-correction-stats`

6. **Anomaly Research** (`anomaly-research`)
   - `research-discover-url-patterns`
   - `research-correct-historical-data`
   - `research-calculate-false-steam-rate`
   - `research-flag-url-artifacts`

## 🔧 Usage Examples

### Get All Registries
```bash
curl http://localhost:3000/api/registry
```

### Get Specific Registry
```bash
curl http://localhost:3000/api/registry/mcp-tools
```

### Filter by Category
```bash
curl http://localhost:3000/api/registry/category/tooling
```

### Search by Tag
```bash
curl "http://localhost:3000/api/registry/search?tag=bookmakers"
```

### TypeScript
```typescript
import { getRegistriesOverview } from './api/registry';

const overview = await getRegistriesOverview();
console.log(`Found ${overview.total} registries`);
console.log(`Categories:`, overview.categories);
```

## 📝 Registry Browser Page

The registry browser (`dashboard/registry.html`) provides:

- **Visual Cards**: Each registry displayed as a card with metadata
- **Category Filters**: Filter by category buttons
- **Statistics**: Total registries, items, and categories
- **Use Cases**: Displayed for each registry
- **Tags**: Visual tag display
- **API Links**: Direct links to API endpoints
- **Auto-refresh**: Updates every 30 seconds

## 🔗 Related Documentation

- [MCP Server](../MCP-SERVER.md) - MCP tools documentation
- [Property Registry](../ENTERPRISE-PIPELINE-IMPLEMENTATION.md) - Property system
- [Data Sources](../ENTERPRISE-PIPELINE-IMPLEMENTATION.md) - Data source registry
- [Sharp Books](../.claude/SHARP-BOOKS-REGISTRY.md) - Sharp books registry

---

**Status**: ✅ Registry System Complete | 📚 16 Registry Types | 🎨 Browser Page Available | 🔗 API Endpoints Ready
