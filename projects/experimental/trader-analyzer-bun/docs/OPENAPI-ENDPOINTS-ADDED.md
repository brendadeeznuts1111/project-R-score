# OpenAPI Endpoints Addition Summary

## Overview
This document summarizes all the endpoints added to the OpenAPI specification (`src/api/docs.ts`) as part of the comprehensive API documentation update.

## Date
January 2025

## New Tags Added

### 1. Discovery
- **Domain**: CORE
- **Scope**: DISCOVERY
- **Type**: FEEDS
- **Endpoints**: RSS feeds, sitemap, API discovery

### 2. Changelog
- **Domain**: CORE
- **Scope**: VERSIONING
- **Type**: CHANGELOG
- **Endpoints**: Git commit changelog endpoints

### 3. Examples
- **Domain**: DEV
- **Scope**: DOCUMENTATION
- **Type**: EXAMPLES
- **Endpoints**: API code examples

### 4. Security
- **Domain**: SECURITY
- **Scope**: MONITORING
- **Type**: THREATS
- **Endpoints**: Security monitoring and compliance

### 5. Shadow Graph
- **Domain**: ANALYTICS
- **Scope**: SHADOW-GRAPH
- **Type**: MARKET-ANALYSIS
- **Endpoints**: Shadow graph analysis and dark pool detection

## New Endpoints Added

### RSS & Discovery Endpoints

#### `GET /rss.xml`
- **Description**: RSS 2.0 compliant feed with system updates
- **Content-Type**: `application/rss+xml`
- **Tags**: Discovery
- **Reference**: `routes.ts:1253`

#### `GET /rss`
- **Description**: RSS feed alias (same as `/rss.xml`)
- **Tags**: Discovery
- **Reference**: `routes.ts:1258`

#### `GET /sitemap.xml`
- **Description**: Standard XML sitemap for crawlers/SEO
- **Content-Type**: `application/xml`
- **Tags**: Discovery
- **Reference**: `routes.ts:1270`

#### `GET /discovery`
- **Description**: List all available endpoints from OpenAPI spec
- **Response**: JSON with endpoints array
- **Tags**: Discovery
- **Reference**: `routes.ts:1686`

### Changelog Endpoints

#### `GET /changelog`
- **Description**: Get structured changelog data from git commits
- **Parameters**:
  - `limit` (query, integer, default: 20)
  - `category` (query, string) - Filter by category
- **Tags**: Changelog
- **Reference**: `routes.ts:1309`

#### `GET /changelog/table`
- **Description**: CLI-friendly tabular changelog using Bun.inspect.table()
- **Parameters**:
  - `limit` (query, integer, default: 20)
  - `category` (query, string)
  - `properties` (query, string) - Comma-separated columns
  - `colors` (query, boolean, default: true) - ANSI colors
- **Content-Type**: `text/plain`
- **Tags**: Changelog
- **Reference**: `routes.ts:1532`

### Examples Endpoints

#### `GET /examples`
- **Description**: Get all API examples with optional filtering
- **Parameters**:
  - `category` (query, string) - Filter by category
  - `name` (query, string) - Get specific example by name
- **Tags**: Examples
- **Reference**: `routes.ts:1715`

#### `GET /examples/{name}`
- **Description**: Get a specific API example by name
- **Parameters**:
  - `name` (path, string, required)
- **Tags**: Examples
- **Reference**: `routes.ts:1771`

### Security Endpoints

#### `GET /security/threats`
- **Description**: Get recent security threats grouped by type
- **Parameters**:
  - `hours` (query, integer, default: 24) - Hours to look back
- **Tags**: Security
- **Reference**: `routes.ts:1786`

#### `GET /security/incidents`
- **Description**: Get currently active security incidents
- **Tags**: Security
- **Reference**: `routes.ts:1884`

#### `GET /security/compliance`
- **Description**: Get compliance status and checks
- **Tags**: Security
- **Reference**: `routes.ts:1900`

#### `GET /security/compliance/report`
- **Description**: Generate detailed compliance report
- **Tags**: Security
- **Reference**: `routes.ts:1916`

### Shadow Graph & Market Analysis Endpoints

#### `GET /events/{eventId}/market-graph`
- **Description**: Get shadow graph for an event showing hidden market movements
- **Parameters**:
  - `eventId` (path, string, required)
- **Response**: JSON with nodes, links, metadata
- **Tags**: Shadow Graph, Analytics
- **Reference**: `routes.ts:2289`

#### `GET /events/{eventId}/market-offerings/dark-pool`
- **Description**: Get dark pool (hidden liquidity) offerings for an event
- **Parameters**:
  - `eventId` (path, string, required)
- **Tags**: Shadow Graph, Analytics
- **Reference**: `routes.ts:2354`

#### `GET /events/{eventId}/market-offerings/{nodeId}/liquidity`
- **Description**: Analyze liquidity for a specific market node
- **Parameters**:
  - `eventId` (path, string, required)
  - `nodeId` (path, string, required)
- **Response**: JSON with liquidity breakdown (public, hidden, true)
- **Tags**: Shadow Graph, Analytics
- **Reference**: `routes.ts:2403`

#### `GET /events/{eventId}/market-offerings/{nodeId}/is-deceptive`
- **Description**: Detect if a market line is deceptive (intentionally misleading)
- **Parameters**:
  - `eventId` (path, string, required)
  - `nodeId` (path, string, required)
- **Response**: JSON with isDeceptive boolean, confidence, reasoning
- **Tags**: Shadow Graph, Analytics
- **Reference**: `routes.ts:2443`

#### `GET /events/{eventId}/covert-steam-events`
- **Description**: Get detected covert steam (hidden line movement) events
- **Parameters**:
  - `eventId` (path, string, required)
  - `severity` (query, number) - Filter by minimum severity score
  - `bookmaker` (query, string) - Filter by bookmaker
- **Tags**: Shadow Graph, Analytics
- **Reference**: `routes.ts:2501`

#### `GET /events/{eventId}/concealed-arbitrage-opportunities`
- **Description**: Find arbitrage opportunities hidden in dark pools
- **Parameters**:
  - `eventId` (path, string, required)
  - `minSpread` (query, number) - Minimum profit spread filter
- **Tags**: Shadow Graph, Arbitrage
- **Reference**: `routes.ts:2553`

### Logging Endpoints

#### `GET /logs/codes`
- **Description**: Get all registered log codes with descriptions
- **Response**: JSON with log codes array
- **Tags**: Logging
- **Reference**: `routes.ts:2773`

## New Schemas Added

### Discovery & Feeds
- `DiscoveryResponse` - API discovery response structure

### Changelog
- `ChangelogResponse` - Structured changelog data
- `ChangelogEntry` - Individual changelog entry

### Examples
- `ExamplesResponse` - API examples response
- `Example` - Individual example object

### Security
- `SecurityThreatSummary` - Security threat summary
- `SecurityThreat` - Individual threat entry
- `SecurityIncidentsResponse` - Active incidents response
- `SecurityIncident` - Individual incident entry
- `ComplianceStatus` - Compliance status structure
- `ComplianceReport` - Detailed compliance report

### Shadow Graph
- `ShadowGraphResponse` - Shadow graph data structure
- `ShadowGraphNode` - Market offering node
- `ShadowGraphEdge` - Movement propagation edge
- `DarkPoolOfferingsResponse` - Dark pool offerings response
- `DarkPoolOffering` - Individual dark pool offering
- `LiquidityAnalysis` - Liquidity breakdown analysis
- `DeceptiveLineAnalysis` - Deceptive line detection result
- `CovertSteamEventsResponse` - Covert steam events response
- `CovertSteamEvent` - Individual covert steam event
- `ConcealedArbitrageOpportunitiesResponse` - Concealed arbitrage response
- `ConcealedArbitrageOpportunity` - Individual arbitrage opportunity

## Verification

### Endpoints Verified as Already Documented
- ✅ `/stats` - Trading statistics
- ✅ `/profile` - Trader profile
- ✅ `/sessions` - Position sessions
- ✅ `/trades` - Trade query
- ✅ `/log-level/{sourceModule}` - Update log level (PATCH)
- ✅ `/circuit-breakers/*` - Circuit breaker endpoints

## Statistics

- **New Tags**: 5
- **New Endpoints**: 18
- **New Schemas**: 20
- **Total Paths in Spec**: 215+ (includes all existing endpoints)

## Implementation Notes

1. All endpoints include:
   - Comprehensive descriptions with code references
   - Parameter definitions with types and constraints
   - Response schemas with examples
   - Cross-references to source files using `#REF:` format
   - Appropriate tags for categorization

2. Tag metadata includes:
   - Domain, scope, type classification
   - Category and priority
   - Version information
   - External documentation links

3. Schemas follow OpenAPI 3.0.3 specification:
   - Proper type definitions
   - Required/optional field marking
   - Example values
   - Description strings

## Next Steps

1. ✅ All endpoints from plan have been added
2. ✅ All schemas have been defined
3. ✅ Tag metadata has been added
4. ✅ Cross-references to source files included
5. ⏭️ Consider adding request/response examples in `components.examples`
6. ⏭️ Consider adding more detailed parameter examples
7. ⏭️ Consider adding rate limiting documentation where applicable

## Related Documentation

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Shadow Graph System Documentation](./SHADOW-GRAPH-SYSTEM.md)
- [Centralized Logging Documentation](./16.0.0.0.0.0.0-CENTRALIZED-LOGGING.md)
- [Production Circuit Breaker Documentation](./12.0.0.0.0.0.0-PRODUCTION-CIRCUIT-BREAKER-SUBSYSTEM.md)
