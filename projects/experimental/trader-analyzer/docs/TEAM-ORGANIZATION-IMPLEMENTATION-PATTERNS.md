# [TEAM.ORGANIZATION.IMPLEMENTATION.PATTERNS.RG] Team Organization Implementation Patterns & Blueprint Integration

**Metadata**: [[TECH][MODULE][INTEGRATION][META:{blueprint=BP-TEAM-ORGANIZATION@1.3.4;instance-id=TEAM-ORG-VERIFICATION-001;version=1.3.4}][PROPERTIES:{integration={value:"team-structure-verification";@root:"23.0.0.0.0.0.0";@chain:["BP-MLGS-DEBUGGING","BP-BUN-API"];@version:"1.3.4"}}][CLASS:TeamOrganizationVerification][#REF:v-1.3.4.BP.TEAM.ORGANIZATION.1.0.A.1.1.DOC.1.1]]

**Ripgrep Pattern**: `TEAM.ORGANIZATION.IMPLEMENTATION.PATTERNS.RG|BP-RSS-CONSTANTS|BP-BENCHMARK-PUBLISHER|BP-TELEGRAM-CLIENT|BP-RSS-INTEGRATOR|BP-MCP-SERVER|BP-CIRCUIT-BREAKER`

---

## Table of Contents

1. [Overview](#1-overviewrg-overview)
2. [Implementation Pattern Matrix](#2-patternmatrixrg-implementation-pattern-matrix)
3. [Pattern Details](#3-patterndetailsrg-pattern-details)
4. [Integration Example](#4-integrationexamplerg-integration-example)
5. [Blueprint References](#5-blueprintreferencesrg-blueprint-references)
6. [Verification](#6-verificationrg-verification)
7. [Related Documentation](#7-relateddocumentationrg-related-documentation)
8. [Document Metadata](#8-metadatarg-document-metadata)
9. [Pattern Taxonomy & Discovery Matrix](#9-taxonomyrg-pattern-taxonomy--discovery-matrix)
10. [Ripgrep Recipes for Pattern Discovery](#10-rgrecipesrg-ripgrep-recipes-for-pattern-discovery)
11. [Changelog & Version History](#11-changelogrg-changelog--version-history)
   - 3.1. [Team-Based Routing](#31-teamroutingrg-team-based-routing-bp-rss-constants100)
     - 3.1.1. Implementation
     - 3.1.2. Source
     - 3.1.3. Files Using Pattern
   - 3.2. [Database Persistence](#32-databasepersistencerg-database-persistence-bp-benchmark-publisher100)
     - 3.2.1. Implementation
     - 3.2.2. Source
     - 3.2.3. Files Using Pattern
     - 3.2.4. Schema
   - 3.3. [Telegram Notifications](#33-telegramnotificationsrg-telegram-notifications-bp-telegram-client010)
     - 3.3.1. Implementation
     - 3.3.2. Source
     - 3.3.3. Files Using Pattern
     - 3.3.4. Features
   - 3.4. [RSS Cache Refresh](#34-rsscacherefreshrg-rss-cache-refresh-bp-rss-integrator100)
     - 3.4.1. Implementation
     - 3.4.2. Source
     - 3.4.3. Files Using Pattern
     - 3.4.4. Configuration
   - 3.5. [JSON Validation](#35-jsonvalidationrg-json-validation-bp-mcp-server020)
     - 3.5.1. Implementation
     - 3.5.2. Source
     - 3.5.3. Files Using Pattern
     - 3.5.4. Benefits
   - 3.6. [Graceful Error Handling](#36-errorhandlingrg-graceful-error-handling-bp-circuit-breaker010)
     - 3.6.1. Implementation
     - 3.6.2. Source
     - 3.6.3. Files Using Pattern
     - 3.6.4. Features
4. [Integration Example](#4-integrationexamplerg-integration-example)
5. [Blueprint References](#5-blueprintreferencesrg-blueprint-references)
6. [Verification](#6-verificationrg-verification)
7. [Related Documentation](#7-relateddocumentationrg-related-documentation)
8. [Document Metadata](#8-metadatarg-document-metadata)

---

## 1. [OVERVIEW.RG] Overview

**Scope**: This document maps implementation patterns used in team organization scripts to their source blueprints, ensuring consistency and maintainability across the Hyper-Bun platform.

**Ripgrep Pattern**: `OVERVIEW.RG|TEAM.ORGANIZATION.IMPLEMENTATION.PATTERNS`

**Coverage**:
- Team-based routing patterns
- Database persistence patterns
- Telegram notification patterns
- RSS cache refresh patterns
- JSON validation patterns
- Error handling patterns

**Related Documentation**:
- [`TEAM-ORGANIZATION-VERIFICATION.md`](./TEAM-ORGANIZATION-VERIFICATION.md) - Team structure verification system
- [`MCP-AI-TEAM-INTEGRATION.md`](./MCP-AI-TEAM-INTEGRATION.md) - MCP AI team tools integration
- [`RSS-TEAM-INTEGRATION.md`](./RSS-TEAM-INTEGRATION.md) - RSS feed team integration

---

## 2. [PATTERN.MATRIX.RG] Implementation Pattern Matrix

**Scope**: Quick reference table mapping features to implementation patterns, source blueprints, and files using each pattern.

**Ripgrep Pattern**: `PATTERN.MATRIX.RG|Implementation Pattern Matrix`

| Feature                     | Implementation Pattern                        | Source Blueprint               | Files Using Pattern                    |
| --------------------------- | --------------------------------------------- | ------------------------------ | -------------------------------------- |
| **Team-based routing**      | `--team` argument mapping to `RSS_TEAM_CATEGORIES` | `BP-RSS-CONSTANTS@1.0.0`       | `publish-audit-to-rss.ts`, `verify-team-organization.ts` |
| **Database persistence**    | SQLite INSERT to `rss_items` table            | `BP-BENCHMARK-PUBLISHER@1.0.0` | `publish-audit-to-rss.ts`, `benchmark-publisher.ts` |
| **Telegram notifications**   | `notifyTopic` pattern                         | `BP-TELEGRAM-CLIENT@0.1.0`     | `publish-audit-to-rss.ts`, `benchmark-publisher.ts`, `test-runner.ts` |
| **RSS cache refresh**       | `fetch(RSS_INTERNAL.benchmark_api/refresh)`   | `BP-RSS-INTEGRATOR@1.0.0`      | `publish-audit-to-rss.ts`, `benchmark-publisher.ts` |
| **JSON validation**         | Zod schema validation with fallback           | `BP-MCP-SERVER@0.2.0`          | `publish-audit-to-rss.ts`, `mcp-server.ts` |
| **Graceful error handling** | Circuit breaker + retry logic                 | `BP-CIRCUIT-BREAKER@0.1.0`     | `publish-audit-to-rss.ts`, `telegram/client.ts` |

---

## 3. [PATTERN.DETAILS.RG] Pattern Details

**Scope**: Detailed documentation of each implementation pattern, including code examples, source files, usage, and configuration.

**Ripgrep Pattern**: `PATTERN.DETAILS.RG|Pattern Details`

---

### 3.1. [TEAM.ROUTING.RG] Team-Based Routing (`BP-RSS-CONSTANTS@1.0.0`)

**Scope**: Team identification and routing via CLI arguments and RSS team categories mapping.

**Pattern**: Map `--team` CLI argument to `RSS_TEAM_CATEGORIES` for team identification.

**Ripgrep Pattern**: `TEAM.ROUTING.RG|RSS_TEAM_CATEGORIES|--team`

#### 3.1.1. [TEAM.ROUTING.IMPLEMENTATION.RG] Implementation

```typescript
// scripts/publish-audit-to-rss.ts
const team = RSS_TEAM_CATEGORIES[teamId];
if (!team) {
  throw new Error(`Invalid team ID: ${teamId}`);
}
```

#### 3.1.2. [TEAM.ROUTING.SOURCE.RG] Source

**File**: `src/utils/rss-constants.ts`  
**Key Export**: `RSS_TEAM_CATEGORIES`

#### 3.1.3. [TEAM.ROUTING.USAGE.RG] Files Using Pattern
- `scripts/publish-audit-to-rss.ts` - Team-based audit publishing
- `scripts/verify-team-organization.ts` - Team structure verification
- `src/mcp/tools/rss-monitor.ts` - Team RSS feed monitoring
- `scripts/mcp-scaffold.ts` - Team assignment in scaffolding

---

### 3.2. [DATABASE.PERSISTENCE.RG] Database Persistence (`BP-BENCHMARK-PUBLISHER@1.0.0`)

**Scope**: SQLite database persistence for RSS items, audit results, and benchmark data with automatic schema migration.

**Pattern**: SQLite INSERT to `rss_items` table with schema migration support.

**Ripgrep Pattern**: `DATABASE.PERSISTENCE.RG|rss_items|CREATE TABLE IF NOT EXISTS`

#### 3.2.1. [DATABASE.PERSISTENCE.IMPLEMENTATION.RG] Implementation

```typescript
// scripts/publish-audit-to-rss.ts
const db = new Database('registry.db');
db.exec(`CREATE TABLE IF NOT EXISTS rss_items (...)`);
// Add columns if needed
try {
  db.exec(`ALTER TABLE rss_items ADD COLUMN team_id TEXT`);
} catch { /* Column exists */ }

db.prepare(`INSERT INTO rss_items (...) VALUES (...)`).run(...);
```

#### 3.2.2. [DATABASE.PERSISTENCE.SOURCE.RG] Source

**File**: `scripts/benchmark-publisher.ts`  
**Pattern**: Benchmark result persistence

#### 3.2.3. [DATABASE.PERSISTENCE.USAGE.RG] Files Using Pattern
- `scripts/publish-audit-to-rss.ts` - Audit result persistence
- `scripts/benchmark-publisher.ts` - Benchmark result persistence
- `scripts/publish-telegram-alert.ts` - Telegram alert persistence

#### 3.2.4. [DATABASE.PERSISTENCE.SCHEMA.RG] Schema

- `feed_type`: Type of feed item ('audit', 'benchmark', 'scaffold', etc.)
- `package_name`: Package identifier or `@team/{teamId}` placeholder
- `team_id`: Team identifier (optional, added via migration)
- `title`: RSS item title
- `content`: JSON-encoded content
- `category`: Item category ('audit', 'development', 'security', etc.)
- `timestamp`: Creation timestamp (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

### 3.3. [TELEGRAM.NOTIFICATIONS.RG] Telegram Notifications (`BP-TELEGRAM-CLIENT@0.1.0`)

**Scope**: Team-aware Telegram notifications via topic-based routing with silent mode and Markdown support.

**Pattern**: Use `notifyTopic` with team's Telegram topic ID.

**Ripgrep Pattern**: `TELEGRAM.NOTIFICATIONS.RG|notifyTopic|telegram_topic`

#### 3.3.1. [TELEGRAM.NOTIFICATIONS.IMPLEMENTATION.RG] Implementation

```typescript
// scripts/publish-audit-to-rss.ts
import { notifyTopic } from '../packages/@graph/telegram/src/notifications';

await notifyTopic(team.telegram_topic, message, { 
  silent: criticalCount === 0 && highCount === 0 
});
```

#### 3.3.2. [TELEGRAM.NOTIFICATIONS.SOURCE.RG] Source

**File**: `packages/@graph/telegram/src/notifications.ts`

#### 3.3.3. [TELEGRAM.NOTIFICATIONS.USAGE.RG] Files Using Pattern
- `scripts/publish-audit-to-rss.ts` - Audit notification publishing
- `scripts/benchmark-publisher.ts` - Benchmark result notifications
- `src/mcp/tools/telegram-alerts.ts` - MCP tool notifications

#### 3.3.4. [TELEGRAM.NOTIFICATIONS.FEATURES.RG] Features

- Team-specific topic routing via `team.telegram_topic`
- Silent mode for non-critical notifications (`disable_notification: true`)
- Markdown formatting support (`parseMode: 'Markdown'`)
- Error handling with circuit breaker and retry logic
- Thread ID support for topic-based organization

---

### 3.4. [RSS.CACHE.REFRESH.RG] RSS Cache Refresh (`BP-RSS-INTEGRATOR@1.0.0`)

**Scope**: RSS feed cache invalidation via authenticated API endpoints after content updates.

**Pattern**: POST to RSS API refresh endpoint with authentication.

**Ripgrep Pattern**: `RSS.CACHE.REFRESH.RG|RSS_INTERNAL|/refresh`

#### 3.4.1. [RSS.CACHE.REFRESH.IMPLEMENTATION.RG] Implementation

```typescript
// scripts/publish-audit-to-rss.ts
const registryApiUrl = RSS_INTERNAL.registry_api || RSS_INTERNAL.benchmark_api;
await fetch(`${registryApiUrl}/refresh`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.REGISTRY_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ team: teamId }),
});
```

#### 3.4.2. [RSS.CACHE.REFRESH.SOURCE.RG] Source

**File**: `scripts/benchmark-publisher.ts`  
**Pattern**: RSS cache refresh pattern

#### 3.4.3. [RSS.CACHE.REFRESH.USAGE.RG] Files Using Pattern
- `scripts/publish-audit-to-rss.ts` - Audit RSS cache refresh
- `scripts/benchmark-publisher.ts` - Benchmark RSS cache refresh
- `src/utils/rss-cache-refresh.ts` - Centralized RSS cache refresh utility

#### 3.4.4. [RSS.CACHE.REFRESH.CONFIGURATION.RG] Configuration

- `RSS_INTERNAL.registry_api` - Registry API endpoint (primary)
- `RSS_INTERNAL.benchmark_api` - Benchmark API fallback
- `RSS_INTERNAL.team_metrics` - Team metrics API endpoint
- `REGISTRY_API_TOKEN` - Authentication token (Bearer token)

---

### 3.5. [JSON.VALIDATION.RG] JSON Validation (`BP-MCP-SERVER@0.2.0`)

**Scope**: Runtime type validation for external data sources using Zod schemas with graceful fallback to default values.

**Pattern**: Zod schema validation with graceful fallback to defaults.

**Ripgrep Pattern**: `JSON.VALIDATION.RG|z.object|AuditResultSchema`

#### 3.5.1. [JSON.VALIDATION.IMPLEMENTATION.RG] Implementation

```typescript
// scripts/publish-audit-to-rss.ts
import { z } from 'zod';

const AuditResultSchema = z.object({
  team: z.string(),
  findings: z.array(AuditFindingSchema),
  summary: z.object({...}).optional(),
});

// Validate with fallback
try {
  auditResult = AuditResultSchema.parse(rawData);
} catch (validationError) {
  console.warn('Validation failed, using fallback defaults');
  auditResult = {
    // Fallback structure with defaults
  };
}
```

#### 3.5.2. [JSON.VALIDATION.SOURCE.RG] Source

**File**: `src/mcp/server.ts`  
**Pattern**: MCP tool input validation

#### 3.5.3. [JSON.VALIDATION.USAGE.RG] Files Using Pattern
- `scripts/publish-audit-to-rss.ts` - Audit result validation
- `src/mcp/server.ts` - MCP tool input validation
- `scripts/mcp-scaffold.ts` - Scaffold options validation

#### 3.5.4. [JSON.VALIDATION.BENEFITS.RG] Benefits

- Type-safe data structures with TypeScript integration
- Graceful degradation on invalid input (fallback to defaults)
- Clear error messages with Zod error formatting
- Default value fallbacks for optional fields
- Runtime type checking for external data sources

---

### 3.6. [ERROR.HANDLING.RG] Graceful Error Handling (`BP-CIRCUIT-BREAKER@0.1.0`)

**Scope**: Resilient error handling with circuit breaker pattern and exponential backoff retry logic for external service calls.

**Pattern**: Circuit breaker + exponential backoff retry logic.

**Ripgrep Pattern**: `ERROR.HANDLING.RG|CircuitBreaker|retryWithBackoff`

#### 3.6.1. [ERROR.HANDLING.IMPLEMENTATION.RG] Implementation

```typescript
// scripts/publish-audit-to-rss.ts
import { CircuitBreaker, retryWithBackoff } from '../src/utils/enterprise-retry';

const breaker = new CircuitBreaker(3, 30000, 2);
const retryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

const result = await retryWithBackoff(
  () => breaker.execute(async () => {
    // Operation that may fail
  }),
  retryOptions,
);
```

#### 3.6.2. [ERROR.HANDLING.SOURCE.RG] Source

**File**: `src/utils/enterprise-retry.ts`

#### 3.6.3. [ERROR.HANDLING.USAGE.RG] Files Using Pattern
- `scripts/publish-audit-to-rss.ts` - Telegram and RSS refresh resilience
- `src/telegram/client.ts` - Telegram API resilience
- `src/utils/rss-cache-refresh.ts` - RSS cache refresh resilience

#### 3.6.4. [ERROR.HANDLING.FEATURES.RG] Features

- Circuit breaker prevents cascading failures (3 failure threshold)
- Exponential backoff reduces load on failing services (2x multiplier)
- Configurable retry attempts and delays (maxAttempts, initialDelayMs, maxDelayMs)
- State tracking (closed/open/half-open) with timeout-based recovery
- Success tracking for half-open state transitions

---

## 4. [INTEGRATION.EXAMPLE.RG] Integration Example

### 4.1. [COMPLETE.FLOW.RG] Complete Flow: `publish-audit-to-rss.ts`

```typescript
// 1. Team-based routing (BP-RSS-CONSTANTS@1.0.0)
const team = RSS_TEAM_CATEGORIES[teamId];

// 2. JSON validation with fallback (BP-MCP-SERVER@0.2.0)
const auditResult = AuditResultSchema.parse(rawData).catch(() => fallbackDefaults);

// 3. Database persistence (BP-BENCHMARK-PUBLISHER@1.0.0)
db.prepare(`INSERT INTO rss_items (...) VALUES (...)`).run(...);

// 4. Telegram notifications with circuit breaker (BP-TELEGRAM-CLIENT@0.1.0 + BP-CIRCUIT-BREAKER@0.1.0)
await retryWithBackoff(
  () => telegramBreaker.execute(() => notifyTopic(team.telegram_topic, message)),
  retryOptions,
);

// 5. RSS cache refresh with circuit breaker (BP-RSS-INTEGRATOR@1.0.0 + BP-CIRCUIT-BREAKER@0.1.0)
await retryWithBackoff(
  () => cacheBreaker.execute(() => fetch(`${apiUrl}/refresh`, {...})),
  retryOptions,
);
```

---

## 5. [BLUEPRINT.REFERENCES.RG] Blueprint References

**Scope**: Reference documentation for all blueprints used in team organization patterns, including file locations, key exports, and usage examples.

**Ripgrep Pattern**: `BLUEPRINT.REFERENCES.RG|BP-RSS-CONSTANTS|BP-BENCHMARK-PUBLISHER|BP-TELEGRAM-CLIENT|BP-RSS-INTEGRATOR|BP-MCP-SERVER|BP-CIRCUIT-BREAKER`

---

### 5.1. [BP.RSS.CONSTANTS.RG] BP-RSS-CONSTANTS@1.0.0

**Scope**: Team category definitions and RSS feed URL mappings.

**Ripgrep Pattern**: `BP.RSS.CONSTANTS.RG|RSS_TEAM_CATEGORIES`

- **File**: `src/utils/rss-constants.ts`
- **Key Export**: `RSS_TEAM_CATEGORIES`
- **Usage**: Team identification and RSS feed URL mapping
- **Teams**: `platform_tools`, `sports_correlation`, `market_analytics`

### 5.2. [BP.BENCHMARK.PUBLISHER.RG] BP-BENCHMARK-PUBLISHER@1.0.0

**Scope**: SQLite database persistence pattern for RSS items with automatic schema migration.

**RG Marker**: `[DATABASE.PERSISTENCE.RG]`

**Ripgrep Pattern**: `BP.BENCHMARK.PUBLISHER.RG|rss_items|CREATE TABLE IF NOT EXISTS`

**Implementation Locations**:
- `scripts/benchmark-publisher.ts:89` ← `[DATABASE.PERSISTENCE.RG:IMPLEMENTATION]`
- `scripts/publish-audit-to-rss.ts:88` ← `[DATABASE.PERSISTENCE.RG:IMPLEMENTATION]`
- `scripts/publish-audit-to-rss.ts:106` ← `[DATABASE.PERSISTENCE.RG:SCHEMA]`

- **File**: `scripts/benchmark-publisher.ts`
- **Pattern**: SQLite persistence to `rss_items` table
- **Usage**: Benchmark and audit result storage
- **Database**: `registry.db` (SQLite)

### 5.3. [BP.TELEGRAM.CLIENT.RG] BP-TELEGRAM-CLIENT@0.1.0

**Scope**: Telegram Bot API integration for team-specific topic notifications.

**RG Marker**: `[TELEGRAM.NOTIFICATIONS.RG]`

**Ripgrep Pattern**: `BP.TELEGRAM.CLIENT.RG|notifyTopic|telegram_topic`

**Implementation Locations**:
- `packages/@graph/telegram/src/notifications.ts:125` ← `[TELEGRAM.NOTIFICATIONS.RG:IMPLEMENTATION]`
- `scripts/publish-audit-to-rss.ts:127` ← `[TELEGRAM.NOTIFICATIONS.RG:IMPLEMENTATION]`
- `src/telegram/client.ts:45` ← `[TELEGRAM.NOTIFICATIONS.RG:CONFIG]`

- **File**: `packages/@graph/telegram/src/notifications.ts`
- **Key Function**: `notifyTopic(topicId, message, options)`
- **Usage**: Team-aware Telegram notifications
- **Features**: Topic routing, silent mode, Markdown support

### 5.4. [BP.RSS.INTEGRATOR.RG] BP-RSS-INTEGRATOR@1.0.0

**Scope**: RSS feed cache management and refresh via authenticated API endpoints.

**Ripgrep Pattern**: `BP.RSS.INTEGRATOR.RG|RSS_INTERNAL|/refresh`

- **File**: `packages/@graph/rss-integrator/src/team-feed.ts`
- **Pattern**: RSS feed refresh via API endpoint
- **Usage**: Cache invalidation after content updates
- **Endpoints**: `/refresh` (POST with Bearer token)

### 5.5. [BP.MCP.SERVER.RG] BP-MCP-SERVER@0.2.0

**Scope**: Runtime type validation for MCP tool inputs and external data sources using Zod.

**Ripgrep Pattern**: `BP.MCP.SERVER.RG|z.object|AuditResultSchema`

- **File**: `src/mcp/server.ts`
- **Pattern**: Zod schema validation with fallback
- **Usage**: Input validation and type safety
- **Library**: `zod` (runtime type validation)

### 5.6. [BP.CIRCUIT.BREAKER.RG] BP-CIRCUIT-BREAKER@0.1.0

**Scope**: Circuit breaker pattern with exponential backoff retry logic for resilient external service calls.

**Ripgrep Pattern**: `BP.CIRCUIT.BREAKER.RG|CircuitBreaker|retryWithBackoff`

- **File**: `src/utils/enterprise-retry.ts`
- **Classes**: `CircuitBreaker`, `retryWithBackoff`
- **Usage**: Resilient error handling and retry logic
- **States**: Closed, Open, Half-Open

---

## 6. [VERIFICATION.RG] Verification

**Scope**: Verification commands and checks to ensure all patterns are correctly implemented and team organization is consistent.

**Ripgrep Pattern**: `VERIFICATION.RG|verify:team|verify-team-organization`

---

### 6.1. [VERIFICATION.COMMANDS.RG] Verification Commands

**Scope**: CLI commands for running verification checks.

Run verification to ensure all patterns are correctly implemented:

```bash
# Verify team organization consistency
bun run verify:team

# Verify with detailed report
bun run verify:team:report

# Test audit publishing
bun run scripts/publish-audit-to-rss.ts --team platform_tools

# Run RG marker integrity check
./scripts/verify-rg-markers.sh
```

**Ripgrep Pattern**: `VERIFICATION.RG|verify:team|verify-team-organization`

### 6.2. [VERIFICATION.CHECKS.RG] Verification Checks

**Scope**: Automated checks performed by the verification system.

The verification system ensures:
- ✅ Team IDs match `RSS_TEAM_CATEGORIES` keys
- ✅ All team members have valid Telegram handles
- ✅ Package ownership matches team assignments
- ✅ RSS feed URLs are correctly configured
- ✅ Database schema includes all required columns

### 6.3. [VERIFICATION.AUTOMATED.RG] Automated Verification Suite

**Scope**: Executable verification scripts for CI/CD integration.

**Run this entire section as a script**: `cat docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md | sed -n '/^## 6.3/,/^## 7/p' | bash`

#### 6.3.1. [VERIFICATION.MARKERS.RG] Marker Consistency Check

```bash
#!/bin/bash
# [VERIFICATION.MARKERS.RG]
set -e

echo "Checking all patterns have ≥2 occurrences (doc + code)..."
while read marker; do
  count=$(rg -c "$marker" . 2>/dev/null || echo 0)
  if [ "$count" -lt 2 ]; then
    echo "❌ $marker has only $count occurrences"
    exit 1
  fi
done < <(rg -o '\[.*\.RG\]' docs/ dashboard/ | sort -u)

echo "✓ All markers validated"
```

#### 6.3.2. [VERIFICATION.NUMBERING.RG] Section Numbering Integrity

```bash
#!/bin/bash
# [VERIFICATION.NUMBERING.RG]
section_count=$(rg '^## \d+\.' docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md | wc -l | tr -d ' ')
expected_count=11  # Update as sections are added
if [ "$section_count" -ne "$expected_count" ]; then
  echo "⚠️  Expected $expected_count sections, found $section_count"
  exit 1
fi
echo "✓ Section numbering integrity verified"
```

#### 6.3.3. [VERIFICATION.TOC.RG] TOC Synchronization

```bash
#!/bin/bash
# [VERIFICATION.TOC.RG]
toc_count=$(rg '\]\(#.*\)\)' docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md | wc -l | tr -d ' ')
section_count=$(rg '^## ' docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md | wc -l | tr -d ' ')
if [ "$toc_count" -ne "$section_count" ]; then
  echo "⚠️  TOC/section mismatch: TOC=$toc_count, Sections=$section_count"
  exit 1
fi
echo "✓ TOC synchronization verified"
```

#### 6.3.4. [VERIFICATION.BIDIRECTIONAL.RG] Bidirectional Reference Check

```bash
#!/bin/bash
# [VERIFICATION.BIDIRECTIONAL.RG]
echo "Checking bidirectional references..."
markers=("TEAM.ROUTING.RG" "DATABASE.PERSISTENCE.RG" "RSS.CACHE.REFRESH.RG")
for marker in "${markers[@]}"; do
  doc_count=$(rg -c "\[$marker\]" docs/ dashboard/ 2>/dev/null || echo 0)
  code_count=$(rg -c "\[$marker\]" src/ scripts/ 2>/dev/null || echo 0)
  if [ "$doc_count" -eq 0 ] || [ "$code_count" -eq 0 ]; then
    echo "❌ $marker: docs=$doc_count, code=$code_count"
    exit 1
  fi
done
echo "✓ Bidirectional references verified"
```

---

## 7. [RELATED.DOCUMENTATION.RG] Related Documentation

**Scope**: Links to related documentation and source files implementing these patterns.

**Ripgrep Pattern**: `RELATED.DOCUMENTATION.RG|Documentation Links|Source Files`

---

### 7.1. [DOCUMENTATION.LINKS.RG] Documentation Links

**Scope**: Related documentation files covering team organization, MCP integration, and RSS feeds.

- [`TEAM-ORGANIZATION-VERIFICATION.md`](./TEAM-ORGANIZATION-VERIFICATION.md) - Team structure verification system
- [`MCP-AI-TEAM-INTEGRATION.md`](./MCP-AI-TEAM-INTEGRATION.md) - MCP AI team tools integration
- [`RSS-TEAM-INTEGRATION.md`](./RSS-TEAM-INTEGRATION.md) - RSS feed team integration
- [`23.0.0.0.0.0.0-MCP-SCAFFOLD-SUBSYSTEM.md`](./23.0.0.0.0.0.0-MCP-SCAFFOLD-SUBSYSTEM.md) - MCP Scaffold subsystem with metadata injection

### 7.2. [SOURCE.FILES.RG] Source Files

**Scope**: Key source files implementing the patterns documented in this guide.

- `src/utils/rss-constants.ts` - RSS constants and team categories (`RSS_TEAM_CATEGORIES`)
- `scripts/publish-audit-to-rss.ts` - Audit publishing with team routing
- `scripts/verify-team-organization.ts` - Team organization verification
- `src/mcp/tools/component-scaffold.ts` - Component scaffolding with metadata
- `scripts/mcp-scaffold.ts` - MCP scaffold script with enhanced metadata injection

---

## 8. [METADATA.RG] Document Metadata

**Scope**: Document version, status, and metadata for tracking and discovery.

**Last Updated**: 2025-01-27  
**Version**: 1.3.4  
**Status**: ✅ Active  
**Ripgrep Pattern**: `TEAM.ORGANIZATION.IMPLEMENTATION.PATTERNS.RG|METADATA.RG`

---

## 9. [TAXONOMY.RG] Pattern Taxonomy & Discovery Matrix

**Scope**: Searchable index of all implementation patterns with RG markers, code locations, and documentation references.

**Ripgrep Pattern**: `TAXONOMY.RG|Pattern Taxonomy|Discovery Matrix`

| Pattern Domain | RG Marker | Purpose | Code Files | Doc Section | Semantic Qualifiers |
|----------------|-----------|---------|------------|-------------|---------------------|
| **Team Routing** | `[TEAM.ROUTING.RG]` | Team-based message routing | `src/utils/rss-constants.ts`, `scripts/publish-audit-to-rss.ts` | §3.1 | `:IMPLEMENTATION`, `:CONFIG` |
| **Database Persistence** | `[DATABASE.PERSISTENCE.RG]` | SQLite database abstraction | `scripts/publish-audit-to-rss.ts`, `scripts/benchmark-publisher.ts` | §3.2 | `:IMPLEMENTATION`, `:SCHEMA` |
| **Telegram Notifications** | `[TELEGRAM.NOTIFICATIONS.RG]` | Telegram bot integration | `scripts/publish-audit-to-rss.ts`, `src/telegram/client.ts` | §3.3 | `:IMPLEMENTATION`, `:CONFIG` |
| **RSS Cache Refresh** | `[RSS.CACHE.REFRESH.RG]` | RSS feed caching strategy | `scripts/publish-audit-to-rss.ts`, `src/utils/rss-cache-refresh.ts` | §3.4 | `:IMPLEMENTATION`, `:CONFIG` |
| **JSON Validation** | `[JSON.VALIDATION.RG]` | Zod schema validation | `scripts/publish-audit-to-rss.ts`, `src/mcp/server.ts` | §3.5 | `:IMPLEMENTATION`, `:SCHEMA` |
| **Error Handling** | `[ERROR.HANDLING.RG]` | Circuit breaker & retry logic | `scripts/publish-audit-to-rss.ts`, `src/utils/enterprise-retry.ts` | §3.6 | `:IMPLEMENTATION`, `:CONFIG` |
| **MCP Scaffolding** | `[SCAFFOLD.TOC.RG]` | Component & tool generation | `scripts/mcp-scaffold.ts` | §23.0.0.0.0.0.0 | `:IMPLEMENTATION`, `:TEMPLATE` |
| **Dashboard** | `[TEAM.ORGANIZATION.DASHBOARD.RG]` | Team organization UI | `dashboard/team-organization.html` | Dashboard | `:UI`, `:JAVASCRIPT` |
| **Bunfig Configuration** | `[BUNFIG.CONFIGURATION.RG]` | Bun runtime & package config | `bunfig.toml`, `config/bunfig.toml` | `docs/BUNFIG-CONFIGURATION.md` | `:CONFIG` |
| **Install Configuration** | `[INSTALL.CONFIGURATION.RG]` | Package installation settings | `bunfig.toml` | `docs/BUNFIG-CONFIGURATION.md` | `:CONFIG` |
| **Console Configuration** | `[CONSOLE.CONFIGURATION.RG]` | Console depth & logging | `bunfig.toml`, `config/bunfig.toml` | `docs/BUNFIG-CONFIGURATION.md` | `:CONFIG` |
| **Performance Config** | `[BUNFIG.PERFORMANCE.RG]` | Performance monitoring | `config/bunfig-performance.toml` | Performance docs | `:CONFIG` |
| **Security Scanner** | `[SECURITY.SCANNER.RG]` | Package security scanning | `bunfig.toml`, `config/bunfig.toml` | `docs/BUN-SECURITY-SCANNER.md` | `:CONFIG` |

**Auto-Generate Taxonomy Table**:
```bash
# Extract all RG markers and their locations
rg '\[.*\.RG\]' docs/ scripts/ src/ dashboard/ -n | \
  awk -F: '{print $NF}' | sort -u | \
  while read marker; do
    files=$(rg -l "$marker" . 2>/dev/null | wc -l | tr -d ' ')
    echo "$marker|$files files"
  done
```

---

## 10. [RG.RECIPES.RG] Ripgrep Recipes for Pattern Discovery

**Scope**: Advanced ripgrep commands for discovering, analyzing, and verifying RG markers across the codebase.

**Ripgrep Pattern**: `RG.RECIPES.RG|Ripgrep Recipes`

### 10.1. [RG.RECIPES.BASIC.RG] Basic Discovery

```bash
# Find all RG markers
rg '\[.*\.RG\]' docs/ scripts/ src/ dashboard/

# Find markers with semantic qualifiers
rg '\[.*\.RG:\w+\]' .

# Count occurrences per marker
rg --no-heading -o '\[.*\.RG\]' . | sort | uniq -c | sort -nr
```

### 10.2. [RG.RECIPES.COVERAGE.RG] Coverage Analysis

```bash
# Find patterns without tests
rg '\[.*\.RG:IMPLEMENTATION\]' src/ scripts/ | \
  rg -v -f <(rg -o '\[.*\.RG:TEST\]' . | sort -u)

# Generate pattern coverage report
rg --no-heading -o '\[.*\.RG\]|\[.*\.RG:\w+\]' docs/ scripts/ src/ dashboard/ | \
  sort | uniq -c | sort -nr | \
  awk '$1 < 3 {print "⚠️  Low coverage:", $0}'
```

### 10.3. [RG.RECIPES.CONTEXT.RG] Context-Aware Search

```bash
# Show 5 lines before/after each marker for context
rg -n -A5 -B5 '\[TEAM\.ROUTING\.RG\]' --glob '!node_modules/**'

# Find markers in specific file types
rg '\[.*\.RG\]' --type ts --type md

# Search across markers (show all occurrences)
rg '\[TEAM\.ROUTING\.RG\]' -l
```

### 10.4. [RG.RECIPES.VALIDATION.RG] Validation Commands

```bash
# Find undocumented patterns (in code but not docs)
rg --no-heading -o '\[.*\.RG\]' src/ scripts/ | sort -u > /tmp/code-patterns.txt
rg --no-heading -o '\[.*\.RG\]' docs/ | sort -u > /tmp/doc-patterns.txt
comm -23 /tmp/code-patterns.txt /tmp/doc-patterns.txt

# Find recently changed patterns
git diff HEAD~7 --name-only | xargs rg '\[.*\.RG\]' || true

# Verify bidirectional references
for marker in "TEAM.ROUTING.RG" "DATABASE.PERSISTENCE.RG"; do
  doc_count=$(rg -c "\[$marker\]" docs/ || echo 0)
  code_count=$(rg -c "\[$marker\]" src/ scripts/ || echo 0)
  echo "$marker: docs=$doc_count, code=$code_count"
done
```

### 10.5. [RG.RECIPES.SEMANTIC.RG] Semantic Qualifier Search

```bash
# Find only implementation markers (ignore docs)
rg '\[.*\.RG:IMPLEMENTATION\]' --type-add 'code:*.{ts,js}' -t code

# Find configuration markers
rg '\[.*\.RG:CONFIG\]' .

# Find test markers
rg '\[.*\.RG:TEST\]' .

# Find markers without qualifiers (needs enhancement)
rg '\[.*\.RG\]' . | rg -v 'RG:'
```

---

## 11. [CHANGELOG.RG] Changelog & Version History

**Scope**: Version history with RG marker additions, modifications, and migration commands.

**Ripgrep Pattern**: `CHANGELOG.RG|Version History`

### 11.1. [VERSION.1.3.4.RG] Version 1.3.4 - 2025-01-27

**RG Markers Added**:
- `[ARGUMENT.PARSING.RG]` - CLI argument parsing pattern
- `[MCP.TOOL.TEMPLATES.RG]` - MCP tool scaffolding templates
- `[COMPONENT.TEMPLATES.RG]` - Component generation templates
- `[SERVICE.TEMPLATES.RG]` - Service scaffolding templates
- `[TEAM.ORGANIZATION.DASHBOARD.RG]` - Dashboard UI markers
- `[DASHBOARD.COMMAND.PALETTE.RG]` - Command palette functionality
- `[TAXONOMY.RG]` - Pattern taxonomy matrix
- `[RG.RECIPES.RG]` - Ripgrep recipes section

**Patterns Enhanced**:
- `[TEAM.ROUTING.RG]` → Added `:IMPLEMENTATION` and `:CONFIG` qualifiers
- `[DATABASE.PERSISTENCE.RG]` → Added `:SCHEMA` qualifier
- `[TELEGRAM.NOTIFICATIONS.RG]` → Added `:IMPLEMENTATION` qualifier

**Documentation Improvements**:
- Added hierarchical section structure with RG markers
- Enhanced TOC with anchor links
- Added scope information to all sections
- Created automated verification script

**Migration Commands**:
```bash
# Update old markers to new format (if needed)
sd '\[TELEGRAM.NOTIFICATIONS.RG\]' '[TELEGRAM.NOTIFICATIONS.RG:IMPLEMENTATION]' src/
sd '\[DATABASE.PERSISTENCE.RG\]' '[DATABASE.PERSISTENCE.RG:IMPLEMENTATION]' scripts/
```

**Verification**:
```bash
# Run integrity check
./scripts/verify-rg-markers.sh

# Verify all markers have ≥2 occurrences
rg --no-heading -o '\[.*\.RG\]' . | sort | uniq -c | awk '$1 < 2 {print "⚠️  ", $0}'
```

---

## 8. [METADATA.RG] Document Metadata

**Scope**: Document version, status, and metadata for tracking and discovery.

**Last Updated**: 2025-01-27  
**Version**: 1.3.4  
**Status**: ✅ Active  
**Ripgrep Pattern**: `TEAM.ORGANIZATION.IMPLEMENTATION.PATTERNS.RG|METADATA.RG`
