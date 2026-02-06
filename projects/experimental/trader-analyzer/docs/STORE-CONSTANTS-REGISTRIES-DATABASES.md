# Store Constants, Registries, and Databases Overview

## 📋 Store Constants (Headers/Footers)

### What Are Store Constants?

**Store constants** are **timezone-related constants** used to dynamically populate headers and footers across the platform. They are **NOT** part of the header/footer structure itself, but rather **data values** that get injected into header/footer elements.

### Location

**Source**: `src/utils/time-constants.ts`

### Constants Defined

```typescript
export const TZ_ENV_VAR = "TZ";                    // Environment variable name
export const DEFAULT_TIMEZONE = "Etc/UTC";         // Default timezone
export const TIMEZONE_CONSTANTS = {                // Exported object
  TZ_ENV_VAR,
  DEFAULT_TIMEZONE,
  getCurrentTimezone,
  getTimezoneConfig,
  isSetSystemTimeAvailable,
}
```

### Usage in Headers/Footers

These constants are displayed in **both headers and footers** with the format:
```text
[$TZ][Etc/UTC][setSystemTime]
```

**Where they appear:**
- **Dashboard**: `dashboard/index.html` (lines 4974, 4978)
  - `id="headerTimezoneConstants"` (header)
  - `id="footerTimezoneConstants"` (footer)
- **Registry Page**: `dashboard/registry.html`
- **Other dashboard pages**

### How They Work

1. **JavaScript updates** these elements dynamically via `dashboard/js/timezone-utils.js`
2. **Format**: `[$TZ_ENV_VAR][DEFAULT_TIMEZONE][setSystemTime]`
3. **Purpose**: Show timezone configuration for debugging and system awareness

### Example Display

```text
[$TZ][Etc/UTC][setSystemTime]
```

This shows:
- `$TZ` - Environment variable name
- `Etc/UTC` - Default timezone
- `setSystemTime` - Whether setSystemTime is available (or "setSystemTime (N/A)")

---

## 📚 Registries Overview

### Total Registries: **12+ Registries**

The platform uses a unified registry system organized into **5 categories**:

### Registry Categories

1. **Data Registries** (3)
2. **Security Registries** (2)
3. **Tooling Registries** (3)
4. **Research Registries** (2)
5. **Integration Registries** (2)

---

### 1. Data Registries

#### Property Registry (`properties`)
- **Location**: `src/properties/registry.ts`
- **Database**: `data/properties.db` (SQLite)
- **Purpose**: Property definitions with versioning, lineage tracking, schema validation
- **Endpoint**: `GET /api/registry/properties`
- **Tags**: `schema`, `versioning`, `lineage`, `validation`, `types`

#### Data Source Registry (`data-sources`)
- **Location**: `src/sources/registry.ts`
- **Database**: `data/sources.db` (SQLite)
- **Purpose**: Data source definitions with RBAC, feature flags, pipeline integration
- **Endpoint**: `GET /api/registry/data-sources`
- **Tags**: `sources`, `rbac`, `feature-flags`, `pipeline`, `connectors`

#### Sharp Books Registry (`sharp-books`)
- **Location**: `src/orca/sharp-books/registry.ts`
- **Storage**: In-memory Map (no database)
- **Purpose**: Sharp bookmaker configurations with tier rankings (S+ to B+)
- **Endpoint**: `GET /api/registry/sharp-books`
- **Tags**: `bookmakers`, `sharp`, `tiers`, `endpoints`, `latency`, `odds`

---

### 2. Security Registries

#### Bookmaker Profile Registry (`bookmaker-profiles`)
- **Location**: `src/logging/bookmaker-profile.ts`
- **Database**: `data/security.db` (table: `bookmaker_profiles`)
- **Purpose**: Bookmaker endpoint parameter configurations for forensic logging
- **Endpoint**: `GET /api/registry/bookmaker-profiles`
- **Tags**: `bookmakers`, `endpoints`, `forensic`, `parameters`, `profiling`

#### Security Threats Registry (`security-threats`)
- **Location**: `src/security/incident-response.ts`
- **Storage**: Runtime/database
- **Purpose**: Real-time security threat monitoring and incident tracking
- **Endpoint**: `GET /api/security/threats`
- **Tags**: `security`, `threats`, `incidents`, `monitoring`, `compliance`

---

### 3. Tooling Registries

#### MCP Tools Registry (`mcp-tools`)
- **Location**: `src/mcp/tools/*.ts`
- **Storage**: Runtime (dynamically loaded)
- **Purpose**: Model Context Protocol tools for AI integration (34+ tools)
- **Endpoint**: `GET /api/registry/mcp-tools`
- **Tags**: `mcp`, `tools`, `ai`, `integration`, `claude`, `llm`
- **Categories**: 
  - `bun-tooling` (5 tools)
  - `bun-shell` (shell tools)
  - `docs-integration` (5 tools)
  - `security` (4 tools)
  - `research` (9 tools)
  - `anomaly-research` (4 tools)

#### CSS Bundler Registry (`css-bundler`)
- **Location**: `src/utils/css-bundler.ts`
- **Storage**: Runtime
- **Purpose**: Bun CSS bundler integration with syntax lowering
- **Endpoint**: `GET /api/registry/css-bundler`
- **Tags**: `css`, `bundler`, `bun`, `color`, `syntax-lowering`

#### Bun APIs Registry (`bun-apis`)
- **Location**: Documentation/runtime
- **Storage**: Runtime
- **Purpose**: Comprehensive Bun API coverage
- **Endpoint**: `GET /api/registry/bun-apis`
- **Tags**: `bun`, `apis`, `runtime`, `serve`, `sqlite`, `file`, `1.3`

---

### 4. Research Registries

#### URL Anomaly Pattern Registry (`url-anomaly-patterns`)
- **Location**: `src/research/patterns/url-anomaly-patterns.ts`
- **Database**: `data/research.db`
- **Purpose**: URL anomaly patterns discovered from forensic logging
- **Endpoint**: `GET /api/registry/url-anomaly-patterns`
- **Tags**: `url`, `anomalies`, `patterns`, `forensic`, `steam`, `false-positives`

#### Tension Pattern Registry (`tension-patterns`)
- **Location**: Research system
- **Storage**: Database
- **Purpose**: Market tension patterns between sub-market nodes
- **Endpoint**: `GET /api/registry/tension-patterns`
- **Tags**: `tension`, `arbitrage`, `patterns`, `nodes`, `correlation`

---

### 5. Integration Registries

#### Error Registry (`errors`)
- **Location**: `src/errors/index.ts`
- **Storage**: TypeScript exports (no database)
- **Purpose**: Error code registry with NX-xxx codes and references
- **Endpoint**: `GET /api/registry/errors`
- **Tags**: `errors`, `codes`, `nx-xxx`, `references`, `categories`

#### Team & Departments Registry (`team-departments`)
- **Location**: `.github/TEAM.md`
- **Storage**: Static file
- **Purpose**: Team structure, departments, and code review assignments
- **Endpoint**: `GET /api/registry/team-departments`
- **Tags**: `team`, `departments`, `review`, `organization`, `ownership`

#### Topics & Categories Registry (`topics`)
- **Location**: `.github/TOPICS.md`
- **Storage**: Static file
- **Purpose**: GitHub topics, labels, and categorization system
- **Endpoint**: `GET /api/registry/topics`
- **Tags**: `topics`, `labels`, `categories`, `github`, `organization`

#### API Examples Registry (`api-examples`)
- **Location**: `src/api/examples.ts`
- **Storage**: Runtime
- **Purpose**: Comprehensive API usage examples with request/response samples
- **Endpoint**: `GET /api/examples`
- **Tags**: `examples`, `api`, `documentation`, `requests`, `responses`

---

## 🗄️ Databases

### Database Storage Locations

All databases are stored in the `data/` directory (relative to project root).

### Database Files

#### Core Databases

1. **`data/properties.db`** (or `properties.sqlite`)
   - Property Registry
   - Schema definitions, versioning, lineage

2. **`data/sources.db`** (or `sources.sqlite`)
   - Data Source Registry
   - Source definitions, RBAC, feature flags

3. **`data/security.db`**
   - Security-related data
   - Bookmaker profiles table
   - Security threats and incidents

4. **`data/research.db`**
   - Research patterns
   - URL anomaly patterns
   - Tension patterns

5. **`data/pipeline.sqlite`**
   - Pipeline configuration and state
   - Pipeline stages and orchestration

6. **`data/rbac.sqlite`**
   - RBAC (Role-Based Access Control)
   - Users, roles, permissions
   - Data scopes

7. **`data/features.sqlite`**
   - Feature flags
   - Feature flag configurations
   - Rollout percentages

#### Specialized Databases

8. **`data/orca-arbitrage.sqlite`**
   - ORCA arbitrage opportunities
   - Book pair statistics
   - Scan statistics

9. **`data/markets.db`** (if exists)
   - Market data storage

### Database Configuration

**Constants Location**: `src/pipeline/constants.ts`

```typescript
export const DATABASE_PATHS = {
  pipeline: "./data/pipeline.sqlite",
  properties: "./data/properties.sqlite",
  rbac: "./data/rbac.sqlite",
  features: "./data/features.sqlite",
  sources: "./data/sources.sqlite",
} as const;
```

### Database Features

- **SQLite 3.51.0** (Bun 1.3.3+)
- **WAL Mode** (Write-Ahead Logging) for better concurrency
- **Foreign Keys** enabled
- **Normal Synchronous** mode for performance

### Database Initialization

**Location**: `src/utils/database-initialization.ts`

Provides utilities for:
- Database schema initialization
- Table creation
- Migration support
- Health checks

---

## 📊 Summary

### Store Constants
- **1 set of constants**: Timezone constants (`TIMEZONE_CONSTANTS`)
- **Used in**: Headers and footers across dashboard pages
- **Purpose**: Display timezone configuration for debugging

### Registries
- **Total**: **12+ registries**
- **Categories**: 5 (Data, Security, Tooling, Research, Integration)
- **Storage Types**: 
  - SQLite databases (5)
  - In-memory Maps (1)
  - Runtime/TypeScript (6+)

### Databases
- **Total**: **9+ database files**
- **Location**: `data/` directory
- **Type**: SQLite 3.51.0
- **Features**: WAL mode, foreign keys, optimized for concurrency

---

## 🔗 Related Documentation

- [Registry System](./REGISTRY-SYSTEM.md) - Complete registry documentation
- [Timezone Constants](../src/utils/time-constants.ts) - Source code
- [Database Initialization](../src/utils/database-initialization.ts) - Database utilities
- [Pipeline Constants](../src/pipeline/constants.ts) - Database paths
- [SQLite Best Practices](./SQLITE-BEST-PRACTICES.md) - Database guidelines

---

**Last Updated**: 2025-01-XX