# BUN\_ Constants Reference Table

**Version**: 1.0.0

Complete reference of all `BUN_` prefixed constants across the scanner and mcp-bun-docs projects.

## About Bun

**Bun** is an all-in-one toolkit for JavaScript and TypeScript applications. It ships as a single executable called
`bun` and includes:

- **Runtime**: Fast JavaScript runtime designed as a drop-in replacement for Node.js
- **Package Manager**: Fast installs, workspaces, overrides, and audits with `bun install`
- **Test Runner**: Jest-compatible, TypeScript-first tests with snapshots, DOM, and watch mode
- **Bundler**: Native bundling for JS/TS/JSX with splitting, plugins, and HTML imports

### Key Features

- **Fast**: Written in Zig and powered by JavaScriptCore, dramatically reducing startup times and memory usage
- **TypeScript Native**: TS and JSX supported out of the box without configuration
- **Node.js Compatible**: Drop-in replacement for Node.js with minimal changes required
- **Built-in APIs**: Database drivers (SQL, SQLite, Redis, S3), HTTP server, file I/O, and more
- **Single Binary**: All tools included in one executable
- **Debug fetch**: Set `BUN_CONFIG_VERBOSE_FETCH=curl` for copy-paste curl commands, or `true` for request/response
  only. `[fetch] >` = request, `[fetch] <` = response. Works with both `fetch()` and `node:http`.

### Official Resources

- **Documentation**: https://bun.com/docs
- **API Reference**: https://bun.com/reference - Complete API reference generated from TypeScript definitions
- **TypeScript Definitions**: https://github.com/oven-sh/bun/tree/main/packages/bun-types - Source TypeScript
  definitions
- **GitHub**: https://github.com/oven-sh/bun
- **Installation**: https://bun.sh/install
- **Feedback**: https://bun.com/docs/feedback
- **Blog**: https://bun.com/blog - Release notes and announcements

### Quick Start

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Run TypeScript/JavaScript files
bun run index.tsx

# Install packages
bun install <pkg>

# Run tests
bun test

# Bundle projects
bun build ./index.tsx
```

## Scanner Project Constants

| Constant               | Type                                                  | Location                     | Count/Value              | Description                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------- | ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUN_DOC_BASE`         | `string`                                              | `bun-api-matrix.ts:47`       | `"https://bun.com/docs"` | Canonical base URL (legacy alias)                                                                                                                                       |
| `BUN_DOCS_BASE`        | `string`                                              | `bun-api-matrix.ts:45`       | `"https://bun.com/docs"` | Docs base URL                                                                                                                                                           |
| `BUN_API_CATALOG`      | `readonly BunApiEntry[]`                              | `bun-api-matrix.ts:89`       | **133 entries**          | Complete Bun API catalog                                                                                                                                                |
| `BUN_SCANNER_APIS`     | `ReadonlySet<string>`                                 | `bun-api-matrix.ts:1844`     | **16 APIs**              | APIs used by scanner                                                                                                                                                    |
| `BUN_API_PROVENANCE`   | `Readonly<Record<string, string>>`                    | `doc-cross-reference.ts:48`  | **96 entries**           | API version tracking                                                                                                                                                    |
| `BUN_PERF_ANNOTATIONS` | `Readonly<Record<string, readonly PerfAnnotation[]>>` | `doc-cross-reference.ts:160` | **6 entries**            | Performance annotations                                                                                                                                                 |
| `BUN_RELATED_APIS`     | `Readonly<Record<string, readonly string[]>>`         | `doc-cross-reference.ts:215` | **91 entries**           | API cross-references                                                                                                                                                    |
| `BUN_SEARCH_KEYWORDS`  | `Readonly<Record<string, readonly string[]>>`         | `doc-cross-reference.ts:344` | **92 entries**           | Search keywords per API                                                                                                                                                 |
| `BUN_SCANNER_COLUMNS`  | `object`                                              | `src/scan-columns.ts:3`      | 8 groups, 78 cols total  | Column schema definitions (PROJECT_SCAN:18, DELTA_FOOTER:6, AUDIT_LOG:8, ADVISORY_MATCHES:5, LIFECYCLE_HOOKS:12, BUNFIG_COVERAGE:3, INFRA_READINESS:5, RSS_ENHANCED:21) |

### Scanner Project — Additional Constants

| Constant                           | Type                            | Location                                 | Value/Count              | Description                                                    |
| ---------------------------------- | ------------------------------- | ---------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| `BUN_KEYCHAIN_SERVICE`             | `string`                        | `src/scan.ts`                            | `'dev.bun.scanner'`      | Keychain service name                                          |
| `BUN_KEYCHAIN_SERVICE_LEGACY`      | `string`                        | `src/scan.ts`                            | `'bun-scanner'`          | Legacy keychain service                                        |
| `BUN_KEYCHAIN_TOKEN_NAMES`         | `readonly string[]`             | `src/scan.ts`                            | 2 items                  | Token names for keychain lookup                                |
| `BUN_TOKEN_AUDIT_RSS_PATH`         | `string`                        | `src/scan.ts`                            | Path                     | Token audit RSS output path                                    |
| `BUN_SCAN_RESULTS_RSS_PATH`        | `string`                        | `src/scan.ts`                            | Path                     | Scan results RSS output path                                   |
| `BUN_ADVISORY_MATCHES_PATH`        | `string`                        | `src/scan.ts`                            | Path                     | Advisory matches JSONL path                                    |
| `BUN_R2_COOKIE_FORMAT_VERSION`     | `number`                        | `lib/r2-cookie-stream.ts`                | 1                        | R2 cookie format version                                       |
| `BUN_R2_COOKIE_COMPRESS_THRESHOLD` | `number`                        | `lib/r2-cookie-stream.ts`                | 1024                     | Compress threshold (bytes)                                     |
| `BUN_MAX_SAFE_SIZE`                | `number`                        | `optimizations/runtime-optimizations.ts` | MAX_SAFE_INTEGER         | Max safe buffer size                                           |
| `BUN_RISK_CONSTANTS`               | `object`                        | `optimizations/bun-optimizations.ts`     | NANO/MICRO/MILLI_RISK    | Risk thresholds                                                |
| `BUN_STATUS_GLYPHS`                | `Record`                        | `cli/renderers/status-glyphs.ts`         | Status → glyph           | Status display glyphs                                          |
| `BUN_PROJECT_PRESETS`              | `Record`                        | `cli/renderers/status-glyphs.ts`         | Preset configs           | Project presets                                                |
| `BUN_PROFILES_KEYCHAIN_PREFIX`     | `string`                        | `src/profiles.ts`                        | `'bun-tier1380'`         | Profiles keychain prefix                                       |
| `BUN_PROFILES_DEFAULT_NAMESPACE`   | `string`                        | `src/profiles.ts`                        | `'com.tier1380.scanner'` | Default namespace                                              |
| `BUN_PROFILES_SECRET_NAMES`        | `readonly string[]`             | `src/profiles.ts`                        | 4 items                  | Secret names                                                   |
| `BUN_PROFILES_ENV_MAP`             | `object`                        | `src/profiles.ts`                        | Env var mapping          | Profile env map                                                |
| `BUN_KEYCHAIN_ERROR_CODES`         | `readonly string[]`             | `src/profiles.ts`                        | 4 items                  | Error codes                                                    |
| `BUN_COOKIE_SESSION_PREFIX`        | `string`                        | `src/cookie-sessions.ts`                 | `'cookie-session'`       | Session prefix                                                 |
| `BUN_DEFAULT_SESSION_TTL`          | `number`                        | `src/cookie-sessions.ts`                 | 24h (ms)                 | Default TTL                                                    |
| `BUN_COOKIE_SECRET_NAMES`          | `readonly string[]`             | `src/cookie-sessions.ts`                 | 3 items                  | Secret names                                                   |
| `BUN_SECRET_STATUS_COLUMNS`        | `readonly string[]`             | `src/service-color-secrets.ts`           | 4 items                  | Status columns                                                 |
| `BUN_FIX_PROJECTIONS`              | `Record<string, FixProjection>` | `src/cli-constants.ts`                   | 6 entries                | FactoryWager v4.2 dry-run R-score projections for fix commands |
| `BUN_R_SCORE_BASELINE`             | `number`                        | `src/cli-constants.ts`                   | `0.82`                   | Baseline R-Score for dry-run projections                       |

## MCP Bun Docs Project Constants

### Base URLs & Configuration

| Constant                 | Type     | Location     | Value                      | Description                    |
| ------------------------ | -------- | ------------ | -------------------------- | ------------------------------ |
| `BUN_BASE_URL`           | `string` | `lib.ts:11`  | `"https://bun.com"`        | Canonical base URL             |
| `BUN_DOCS_BASE`          | `string` | `lib.ts:16`  | `"https://bun.com/docs"`   | Documentation base URL         |
| `BUN_INSTALL_SCRIPT_URL` | `string` | `lib.ts:14`  | `"https://bun.sh/install"` | Install script URL             |
| `BUN_URL_CONFIG`         | `object` | `lib.ts:107` | Object                     | Consolidated URL configuration |

### Documentation Data

| Constant               | Type                     | Location      | Count/Value    | Description                |
| ---------------------- | ------------------------ | ------------- | -------------- | -------------------------- |
| `BUN_DOC_MAP`          | `Record<string, string>` | `lib.ts:2141` | **88 entries** | Term → path mapping        |
| `BUN_DOC_ENTRIES`      | `BunDocEntry[]`          | `lib.ts:295`  | **88 entries** | Full documentation entries |
| `BUN_DOCS_VERSION`     | `string`                 | `lib.ts:17`   | `"1.3.7"`      | Current docs version       |
| `BUN_DOCS_MIN_VERSION` | `string`                 | `lib.ts:18`   | `"1.3.6"`      | Minimum supported version  |

### Reference & Links

| Constant                 | Type       | Location      | Count/Value                            | Description                  |
| ------------------------ | ---------- | ------------- | -------------------------------------- | ---------------------------- |
| `BUN_REFERENCE_URL`      | `string`   | `lib.ts:42`   | `"https://bun.com/reference"`          | Reference documentation URL  |
| `BUN_TEST_REFERENCE_URL` | `string`   | `lib.ts:43`   | `"https://bun.com/reference/bun/test"` | Test reference URL           |
| `BUN_REFERENCE_LINKS`    | `object`   | `lib.ts:74`   | **27 keys**                            | Quick reference links object |
| `BUN_REFERENCE_KEYS`     | `string[]` | `lib.ts:2240` | **27 keys**                            | Array of reference link keys |

### Blog, Guides & Community

| Constant            | Type     | Location    | Value                       | Description        |
| ------------------- | -------- | ----------- | --------------------------- | ------------------ |
| `BUN_BLOG_URL`      | `string` | `lib.ts:24` | `"https://bun.com/blog"`    | Blog URL           |
| `BUN_BLOG_RSS_URL`  | `string` | `lib.ts:26` | `"https://bun.com/rss.xml"` | Blog RSS feed      |
| `BUN_CHANGELOG_RSS` | `string` | `lib.ts:19` | `"https://bun.com/rss.xml"` | Changelog RSS feed |
| `BUN_GUIDES_URL`    | `string` | `lib.ts:29` | `"https://bun.com/guides"`  | Guides URL         |
| `BUN_SHOP_URL`      | `string` | `lib.ts:23` | `"https://shop.bun.com/"`   | Shop URL           |

### Repository & Package Management

| Constant                | Type     | Location    | Value                                       | Description          |
| ----------------------- | -------- | ----------- | ------------------------------------------- | -------------------- |
| `BUN_REPO_URL`          | `string` | `lib.ts:46` | `"https://github.com/oven-sh/bun"`          | Main repository URL  |
| `BUN_REPO_RELEASES_URL` | `string` | `lib.ts:30` | `"https://github.com/oven-sh/bun/releases"` | Releases URL         |
| `BUN_PM_URL`            | `string` | `lib.ts:32` | `"https://bun.com/package-manager"`         | Package manager URL  |
| `BUN_PM_CLI_URL`        | `string` | `lib.ts:33` | `"https://bun.com/docs/cli/pm"`             | PM CLI documentation |
| `BUN_INSTALL_ADD_URL`   | `string` | `lib.ts:34` | `"https://bun.com/docs/guides/install/add"` | Install add guide    |

### TypeScript & Compatibility

| Constant                  | Type       | Location    | Value                                           | Description                     |
| ------------------------- | ---------- | ----------- | ----------------------------------------------- | ------------------------------- |
| `BUN_NODE_COMPAT_URL`     | `string`   | `lib.ts:35` | `"https://bun.com/docs/runtime/nodejs-apis"`    | Node.js compatibility docs      |
| `BUN_TYPES_REPO_URL`      | `string`   | `lib.ts:49` | `"https://github.com/oven-sh/bun-types"`        | Bun types repository            |
| `BUN_TYPES_README_URL`    | `string`   | `lib.ts:53` | `"https://github.com/oven-sh/bun-types#readme"` | Types README                    |
| `BUN_TYPES_AUTHORING_URL` | `string`   | `lib.ts:57` | `"https://bun.com/docs/typescript/types"`       | Type authoring guide            |
| `BUN_TYPES_KEY_FILES`     | `string[]` | `lib.ts:61` | **9 files**                                     | Key TypeScript definition files |

### Globals & API

| Constant              | Type               | Location      | Count/Value                          | Description               |
| --------------------- | ------------------ | ------------- | ------------------------------------ | ------------------------- |
| `BUN_GLOBALS`         | `BunGlobalEntry[]` | `lib.ts:2254` | **50 entries**                       | Bun top-level globals     |
| `BUN_GLOBALS_API_URL` | `string`           | `lib.ts:2565` | `"https://bun.com/docs/api/globals"` | Globals API documentation |

### Feedback & Support

| Constant                     | Type     | Location    | Value                             | Description           |
| ---------------------------- | -------- | ----------- | --------------------------------- | --------------------- |
| `BUN_FEEDBACK_URL`           | `string` | `lib.ts:36` | `"https://bun.com/docs/feedback"` | Feedback URL          |
| `BUN_FEEDBACK_UPGRADE_FIRST` | `string` | `lib.ts:39` | Message string                    | Upgrade first message |

### Comparison & Testing

| Constant                         | Type                        | Location      | Count/Value   | Description            |
| -------------------------------- | --------------------------- | ------------- | ------------- | ---------------------- |
| `BUN_NODE_API_COMPARISON_MATRIX` | `BunNodeApiComparisonRow[]` | `lib.ts:1823` | Array         | Node.js API comparison |
| `BUN_TEST_CLI_OPTIONS`           | `array`                     | `lib.ts:1292` | **8 options** | Test CLI options       |

### Version Matrices

| Constant                  | Type     | Location      | Count           | Description                                                                        |
| ------------------------- | -------- | ------------- | --------------- | ---------------------------------------------------------------------------------- |
| `BUN_137_FEATURE_MATRIX`  | `Array`  | `lib.ts:1399` | **7 entries**   | Bun v1.3.7 feature matrix (Term, Ver, PerfGain, Security, Platforms, Status)       |
| `BUN_137_COMPLETE_MATRIX` | `Array`  | `lib.ts:1459` | **18+ entries** | Bun v1.3.7 complete matrix (Category, Term, PerfFeature, SecurityPlatform)         |
| `BUN_DOCS_JSON_URL`       | `string` | `lib.ts`      | GitHub URL      | Mintlify docs.json source (https://github.com/oven-sh/bun/blob/.../docs/docs.json) |

## Summary Statistics

### Scanner Project

- **Total Constants**: 30
- **API Catalog Entries**: 133
- **Provenance Entries**: 96
- **Related APIs**: 91
- **Search Keywords**: 92
- **Performance Annotations**: 6
- **Scanner APIs**: 16

### MCP Bun Docs Project

- **Total Constants**: 33+
- **Documentation Entries**: 88
- **Reference Links**: 27
- **Globals**: 50
- **TypeScript Key Files**: 9
- **Test CLI Options**: 8

## Detailed Metrics

### Coverage Metrics

#### Scanner Project API Coverage

| Metric                     | Value | Percentage     |
| -------------------------- | ----- | -------------- |
| APIs with Provenance       | 96    | 72.2% (96/133) |
| APIs with Related APIs     | 91    | 68.4% (91/133) |
| APIs with Search Keywords  | 92    | 69.2% (92/133) |
| APIs with Performance Data | 6     | 4.5% (6/133)   |
| Scanner-Specific APIs      | 16    | 12.0% (16/133) |

#### Documentation Completeness

| Metric                   | Value | Notes                            |
| ------------------------ | ----- | -------------------------------- |
| Provenance Coverage      | 72.2% | 96 of 133 APIs have version info |
| Cross-Reference Coverage | 68.4% | 91 APIs have related API links   |
| Searchability            | 69.2% | 92 APIs have search keywords     |
| Performance Annotations  | 4.5%  | 6 APIs have performance data     |

### Data Structure Metrics

#### Scanner Project

| Constant               | Structure | Avg Entries/Key | Max Entries/Key | Total Keys |
| ---------------------- | --------- | --------------- | --------------- | ---------- |
| `BUN_API_CATALOG`      | Array     | 1               | 1               | 133        |
| `BUN_API_PROVENANCE`   | Record    | 1               | 1               | 96         |
| `BUN_RELATED_APIS`     | Record    | ~3.2            | ~8              | 91         |
| `BUN_SEARCH_KEYWORDS`  | Record    | ~4.5            | ~10             | 92         |
| `BUN_PERF_ANNOTATIONS` | Record    | ~2.0            | ~4              | 6          |
| `BUN_SCANNER_APIS`     | Set       | 1               | 1               | 16         |

#### MCP Bun Docs Project

| Constant               | Structure | Avg Entries/Key | Max Entries/Key | Total Keys |
| ---------------------- | --------- | --------------- | --------------- | ---------- |
| `BUN_DOC_MAP`          | Record    | 1               | 1               | 88         |
| `BUN_DOC_ENTRIES`      | Array     | 1               | 1               | 88         |
| `BUN_GLOBALS`          | Array     | 1               | 1               | 50         |
| `BUN_REFERENCE_LINKS`  | Record    | 1               | 1               | 27         |
| `BUN_TYPES_KEY_FILES`  | Array     | 1               | 1               | 9          |
| `BUN_TEST_CLI_OPTIONS` | Array     | 1               | 1               | 8          |

### Size Metrics

#### Scanner Project

- **Total API Entries**: 133
- **Total Provenance Records**: 96
- **Total Cross-References**: ~291 (91 APIs × ~3.2 avg)
- **Total Search Keywords**: ~414 (92 APIs × ~4.5 avg)
- **Total Performance Annotations**: ~12 (6 APIs × ~2.0 avg)

#### MCP Bun Docs Project

- **Total Documentation Entries**: 88
- **Total Globals**: 50
- **Total Reference Links**: 27
- **Total TypeScript Files**: 9
- **Total Test Options**: 8

### Relationship Metrics

#### Cross-Reference Analysis

- **APIs with Cross-References**: 91 (68.4% coverage)
- **Average Related APIs per Entry**: ~3.2
- **Most Connected API**: Likely `Bun.serve` or `Bun.file` (estimated 6-8 related APIs)
- **Isolated APIs**: ~42 APIs (31.6%) without cross-references

#### Search Keyword Analysis

- **APIs with Keywords**: 92 (69.2% coverage)
- **Average Keywords per API**: ~4.5
- **Total Unique Keywords**: Estimated ~150-200 unique terms
- **Most Tagged API**: Likely core APIs like `Bun.serve`, `Bun.file` (estimated 8-10 keywords)

### Version Tracking Metrics

#### Provenance Distribution

| Version Pattern  | Count | Percentage |
| ---------------- | ----- | ---------- |
| `<1.2` (Pre-1.2) | ~60   | ~62.5%     |
| `1.2.0`          | ~15   | ~15.6%     |
| `1.3.x`          | ~20   | ~20.8%     |
| `1.4.x+`         | ~1    | ~1.0%      |

### Scanner Usage Metrics

#### Scanner API Distribution

- **Total Scanner APIs**: 16
- **Percentage of Total**: 12.0% (16/133)
- **Precise Percentage**: 12.03% (16 ÷ 133)
- **APIs Not Used by Scanner**: 117 (88.0%)

#### Scanner API Usage by Category

| Category               | Used | Total | Percentage | Scanner APIs                                                                                                   |
| ---------------------- | ---- | ----- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| **Semver**             | 1    | 1     | **100.0%** | `Bun.semver`                                                                                                   |
| **Shell & Process**    | 2    | 5     | **40.0%**  | `Bun.spawn`, `Bun.spawnSync`                                                                                   |
| **File I/O**           | 2    | 7     | **28.6%**  | `Bun.file`, `Bun.write`                                                                                        |
| **Utilities**          | 7    | 48    | **14.6%**  | `Bun.version`, `Bun.env`, `Bun.nanoseconds`, `Bun.inspect`, `Bun.inspect.table`, `Bun.stringWidth`, `Bun.Glob` |
| **Advanced**           | 2    | 14    | **14.3%**  | `bun:test`, `import.meta`                                                                                      |
| **HTTP & Networking**  | 1    | 9     | **11.1%**  | `Bun.dns.getCacheStats`                                                                                        |
| **Hashing & Security** | 1    | 14    | **7.1%**   | `Bun.hash`                                                                                                     |
| **Build & Bundling**   | 0    | 5     | **0.0%**   | _(none)_                                                                                                       |
| **Databases**          | 0    | 8     | **0.0%**   | _(none)_                                                                                                       |
| **Compression**        | 0    | 9     | **0.0%**   | _(none)_                                                                                                       |
| **Streaming**          | 0    | 9     | **0.0%**   | _(none)_                                                                                                       |
| **Routing**            | 0    | 4     | **0.0%**   | _(none)_                                                                                                       |

#### Complete Scanner API List (16 APIs)

1. **Process Management** (2):
    - `Bun.spawn` - Child process spawning
    - `Bun.spawnSync` - Synchronous child process

2. **File I/O** (2):
    - `Bun.file` - File handle creation
    - `Bun.write` - File writing

3. **Utilities** (7):
    - `Bun.version` - Runtime version
    - `Bun.env` - Environment variables
    - `Bun.nanoseconds` - High-resolution timing
    - `Bun.inspect` - Object inspection
    - `Bun.inspect.table` - Table formatting
    - `Bun.stringWidth` - Unicode-aware string width
    - `Bun.Glob` - File pattern matching

4. **Hashing & Security** (1):
    - `Bun.hash` - Fast hash function

5. **HTTP & Networking** (1):
    - `Bun.dns.getCacheStats` - DNS cache statistics

6. **Advanced** (2):
    - `bun:test` - Testing framework
    - `import.meta` - ESM metadata

7. **Semver** (1):
    - `Bun.semver` - Semantic versioning utilities

#### Category Analysis

**Highest Usage Categories:**

- **Semver**: 100% (1/1) - Fully utilized
- **Shell & Process**: 40% (2/5) - Core process management
- **File I/O**: 28.6% (2/7) - Essential file operations

**Moderate Usage Categories:**

- **Utilities**: 14.6% (7/48) - Core utility functions
- **Advanced**: 14.3% (2/14) - Testing and ESM support

**Low Usage Categories:**

- **HTTP & Networking**: 11.1% (1/9) - Only DNS stats
- **Hashing & Security**: 7.1% (1/14) - Only basic hashing

**Unused Categories:**

- **Build & Bundling**: 0% (0/5) - No bundler/transpiler usage
- **Databases**: 0% (0/8) - No database operations
- **Compression**: 0% (0/9) - No compression utilities
- **Streaming**: 0% (0/9) - No stream processing
- **Routing**: 0% (0/4) - No URL pattern matching

### Documentation Quality Metrics

#### Well-Documented URL Fragment

APIs with full cross-reference coverage (provenance, related APIs, and search keywords) receive the `#well-documented`
fragment on their doc URLs. Use `isWellDocumented(api)` and `withWellDocumentedFragment(docUrl, api)` from
[doc-cross-reference.ts](scanner/cli/renderers/doc-cross-reference.ts).

#### MCP Bun Docs Project

- **Documentation Coverage**: 88 entries (100% of `BUN_DOC_MAP`)
- **Global Coverage**: 50 globals documented
- **Reference Link Coverage**: 27 quick reference links
- **TypeScript Coverage**: 9 key definition files tracked
- **Test Coverage**: 8 CLI options documented

### Trending Metrics

#### API Growth Trends by Version

| Version            | APIs Added | Cumulative | Growth Rate | Scanner Adoption |
| ------------------ | ---------- | ---------- | ----------- | ---------------- |
| **<1.2** (Pre-1.2) | 70         | 70         | Baseline    | 16 APIs (22.9%)  |
| **1.2.0**          | 7          | 77         | +10.0%      | 0 APIs (0%)      |
| **1.3.0**          | 2          | 79         | +2.6%       | 0 APIs (0%)      |
| **1.3.4**          | 7          | 86         | +8.9%       | 0 APIs (0%)      |
| **1.3.5**          | 2          | 88         | +2.3%       | 0 APIs (0%)      |
| **1.3.6**          | 2          | 90         | +2.3%       | 0 APIs (0%)      |
| **1.3.7**          | 1          | 91         | +1.1%       | 0 APIs (0%)      |
| **1.3.8**          | 5          | 96         | +5.5%       | 0 APIs (0%)      |

**Key Insights:**

- **Total Growth**: 96 APIs tracked (from 70 pre-1.2 to 96 in 1.3.8)
- **Growth Rate**: +37.1% since pre-1.2 baseline
- **Peak Growth**: 1.3.4 added 7 APIs (largest single-version addition)
- **Recent Trend**: Steady growth with 5 APIs in latest version (1.3.8)
- **Scanner Adoption**: All 16 scanner APIs are from pre-1.2 (100% legacy APIs)

#### Version Distribution Trends

| Version Range     | Count | Percentage | Trend                         |
| ----------------- | ----- | ---------- | ----------------------------- |
| **<1.2** (Legacy) | 70    | 72.9%      | Stable foundation             |
| **1.2.x**         | 7     | 7.3%       | Database/S3 focus             |
| **1.3.x**         | 19    | 19.8%      | **Growing** (rapid expansion) |

**Trend Analysis:**

- **Legacy Dominance**: 72.9% of APIs predate 1.2 (stable core)
- **1.3.x Growth**: 19.8% of APIs added in 1.3.x series (accelerating)
- **1.2.x Bridge**: 7.3% added in 1.2.0 (database/storage focus)
- **Projected**: If trend continues, 1.3.x could reach 25%+ by 1.4.0

#### API Status Trends

| Status           | Count | Percentage | Scanner Usage   | Trend                          |
| ---------------- | ----- | ---------- | --------------- | ------------------------------ |
| **stable**       | 77    | 57.9%      | 16 APIs (20.8%) | Mature, production-ready       |
| **new**          | 55    | 41.4%      | 0 APIs (0%)     | **Growing** (recent additions) |
| **experimental** | 1     | 0.8%       | 0 APIs (0%)     | Early stage                    |

**Status Insights:**

- **Stable APIs**: 57.9% of catalog (mature ecosystem)
- **New APIs**: 41.4% marked as "new" (rapid innovation)
- **Scanner Preference**: 100% of scanner APIs are stable (risk-averse)
- **Adoption Gap**: 0% scanner usage of "new" APIs (conservative approach)

#### Surface (Adoption) Trends

| Surface Level          | Count | Percentage | Scanner Usage  | Description       |
| ---------------------- | ----- | ---------- | -------------- | ----------------- |
| **Surface 3** (High)   | 29    | 21.8%      | 5 APIs (17.2%) | Widely adopted    |
| **Surface 2** (Medium) | 45    | 33.8%      | 6 APIs (13.3%) | Moderate adoption |
| **Surface 1** (Low)    | 59    | 44.4%      | 5 APIs (8.5%)  | Niche/specialized |

**Adoption Insights:**

- **High Adoption**: 21.8% of APIs have high surface (widely used)
- **Scanner Alignment**: Scanner uses 17.2% of high-surface APIs (above average)
- **Low Adoption**: 44.4% of APIs have low surface (specialized use cases)
- **Balanced Usage**: Scanner distributes across all surface levels

#### Category Growth Trends

| Category               | Total APIs | Scanner Usage | Growth Potential | Trend            |
| ---------------------- | ---------- | ------------- | ---------------- | ---------------- |
| **Utilities**          | 48         | 7 (14.6%)     | High             | **Expanding**    |
| **HTTP & Networking**  | 9          | 1 (11.1%)     | Medium           | Stable           |
| **Advanced**           | 14         | 2 (14.3%)     | High             | **Growing**      |
| **File I/O**           | 7          | 2 (28.6%)     | Low              | Mature           |
| **Shell & Process**    | 5          | 2 (40.0%)     | Low              | Stable           |
| **Databases**          | 8          | 0 (0%)        | **High**         | **Rapid Growth** |
| **Compression**        | 9          | 0 (0%)        | Medium           | Stable           |
| **Streaming**          | 9          | 0 (0%)        | Medium           | Stable           |
| **Build & Bundling**   | 5          | 0 (0%)        | Low              | Mature           |
| **Routing**            | 4          | 0 (0%)        | Low              | Stable           |
| **Hashing & Security** | 14         | 1 (7.1%)      | Medium           | Stable           |
| **Semver**             | 1          | 1 (100%)      | Low              | Complete         |

**Category Insights:**

- **Fastest Growing**: Databases (8 APIs, all new in 1.2.0-1.3.0)
- **Most Stable**: Utilities (48 APIs, core functionality)
- **Untapped Potential**: Databases, Compression, Streaming (0% scanner usage)
- **Mature Categories**: File I/O, Shell & Process (high scanner adoption)

#### Scanner Adoption Trends

**Current State:**

- **Total Scanner APIs**: 16 (12.0% of catalog)
- **All Pre-1.2**: 100% of scanner APIs are legacy (stable foundation)
- **Zero New APIs**: 0% adoption of APIs added after 1.2.0

**Adoption Patterns:**

- **Conservative**: Scanner favors stable, pre-1.2 APIs
- **Core Focus**: Heavy emphasis on utilities, file I/O, process management
- **No Database**: Zero adoption of database APIs (SQL, Redis, S3)
- **No Streaming**: Zero adoption of streaming APIs

**Projected Growth Opportunities:**

- **Database APIs**: 8 APIs available, 0% adoption (high potential)
- **Compression**: 9 APIs available, 0% adoption (medium potential)
- **Streaming**: 9 APIs available, 0% adoption (medium potential)
- **New Utilities**: 55 "new" APIs available, 0% adoption (exploration opportunity)

#### Version Release Cadence

| Period          | APIs Added | Avg per Release | Trend            |
| --------------- | ---------- | --------------- | ---------------- |
| **Pre-1.2**     | 70         | N/A             | Foundation       |
| **1.2.0**       | 7          | 7.0             | Major release    |
| **1.3.0-1.3.3** | 2          | 0.5             | Slow period      |
| **1.3.4**       | 7          | 7.0             | **Peak release** |
| **1.3.5-1.3.7** | 5          | 1.7             | Steady growth    |
| **1.3.8**       | 5          | 5.0             | **Accelerating** |

**Release Insights:**

- **Peak Activity**: 1.3.4 and 1.3.8 added most APIs (7 and 5 respectively)
- **Steady Growth**: Average 2-3 APIs per minor version
- **Acceleration**: Recent versions (1.3.7-1.3.8) showing increased activity
- **Projected**: If trend continues, 1.4.0 could add 8-10 APIs

### Signal Coverage Metrics

#### Signal Usage Overview

- **Total Signals Available**: 37 (POSIX/platform signals)
- **Total Signals Used**: 2 (5.4% coverage)
- **Signal Call Sites**: 6 (process.on, process.off, process.removeListener)

#### Signal Coverage by Category

| Signal Category         | Used | Available | Coverage  | Used Signals        |
| ----------------------- | ---- | --------- | --------- | ------------------- |
| **Error signals**       | 0    | 5         | **0.0%**  | _(none)_            |
| **Termination signals** | 2    | 5         | **40.0%** | `SIGTERM`, `SIGINT` |
| **User signals**        | 0    | 2         | **0.0%**  | _(none)_            |
| **Child signals**       | 0    | 1         | **0.0%**  | _(none)_            |
| **Input signals**       | 0    | 2         | **0.0%**  | _(none)_            |
| **Operation signals**   | 0    | 6         | **0.0%**  | _(none)_            |
| **Job control**         | 0    | 4         | **0.0%**  | _(none)_            |
| **Misc**                | 0    | 12        | **0.0%**  | _(none)_            |

#### Signal Category Details

**Error Signals (0/5 - 0.0%)**

- `SIGABRT` - Abort signal
- `SIGBUS` - Bus error
- `SIGFPE` - Floating-point exception
- `SIGILL` - Illegal instruction
- `SIGSEGV` - Segmentation violation
- **Usage**: None (error handling not implemented)

**Termination Signals (2/5 - 40.0%)** ✅

- `SIGTERM` ✅ - Graceful termination (used)
- `SIGINT` ✅ - Interrupt (Ctrl+C, used)
- `SIGKILL` - Force kill (not used)
- `SIGHUP` - Hangup (not used)
- `SIGQUIT` - Quit (not used)
- **Usage**: Graceful shutdown handlers (`process.on('SIGINT')`, `process.on('SIGTERM')`)

**User Signals (0/2 - 0.0%)**

- `SIGUSR1` - User-defined signal 1
- `SIGUSR2` - User-defined signal 2
- **Usage**: None (custom signaling not implemented)

**Child Signals (0/1 - 0.0%)**

- `SIGCHLD` - Child process status change
- **Usage**: None (child process monitoring not implemented)

**Input Signals (0/2 - 0.0%)**

- `SIGTTIN` - Terminal input for background process
- `SIGTTOU` - Terminal output for background process
- **Usage**: None (terminal control not implemented)

**Operation Signals (0/6 - 0.0%)**

- `SIGPIPE` - Broken pipe
- `SIGALRM` - Alarm clock
- `SIGPROF` - Profiling timer
- `SIGVTALRM` - Virtual alarm
- `SIGIO` - I/O ready
- `SIGPOLL` - Pollable event
- **Usage**: None (async operations not monitored)

**Job Control (0/4 - 0.0%)**

- `SIGSTOP` - Stop process
- `SIGTSTP` - Terminal stop
- `SIGCONT` - Continue stopped process
- `SIGURG` - Urgent condition
- **Usage**: None (job control not implemented)

**Misc Signals (0/12 - 0.0%)**

- `SIGTRAP`, `SIGSYS`, `SIGXCPU`, `SIGXFSZ`, `SIGWINCH`, `SIGPWR`, `SIGSTKFLT`, `SIGIOT`, `SIGUNUSED`, `SIGBREAK`,
  `SIGLOST`, `SIGINFO`
- **Usage**: None (specialized signals not used)

#### Signal Usage Contexts

| Context                    | Count | Signals                     |
| -------------------------- | ----- | --------------------------- |
| **process.on**             | 3     | `SIGINT` (2), `SIGTERM` (1) |
| **process.off**            | 2     | `SIGINT` (1), `SIGTERM` (1) |
| **process.removeListener** | 1     | `SIGINT` (1)                |
| **proc.kill**              | 0     | _(none)_                    |
| **spawn.killSignal**       | 0     | _(none)_                    |
| **spawn.signal**           | 0     | _(none)_                    |

#### Signal Coverage Insights

**Current State:**

- **Minimal Coverage**: Only 5.4% of available signals used (2/37)
- **Focus**: Graceful shutdown only (`SIGINT`, `SIGTERM`)
- **No Process Control**: Zero usage of kill signals or child process monitoring
- **No Error Handling**: Zero usage of error signals for crash recovery

**Usage Patterns:**

- **Graceful Shutdown**: Both `SIGINT` and `SIGTERM` handled for clean exit
- **Cleanup**: Signal handlers properly removed with `process.off()` and `process.removeListener()`
- **Conservative Approach**: Only using standard termination signals

**Potential Expansion:**

- **Error Recovery**: Could add `SIGABRT`, `SIGSEGV` handlers for crash recovery
- **Process Management**: Could use `SIGKILL` for force termination, `SIGCHLD` for child monitoring
- **User Signals**: Could use `SIGUSR1`/`SIGUSR2` for custom control (reload config, etc.)
- **Job Control**: Could use `SIGSTOP`/`SIGCONT` for process suspension

**Coverage Summary:**

- **Termination Signals**: 40% (2/5) - Good coverage for graceful shutdown
- **All Other Categories**: 0% - Untapped potential for advanced process control
- **Overall**: 5.4% (2/37) - Minimal but focused signal usage

### Terminal (PTY) Coverage Metrics

#### Terminal Usage Overview

- **Terminal Options Available**: 6 (`cols`, `rows`, `name`, `data`, `exit`, `drain`)
- **Terminal Options Used**: 0 (0.0% coverage)
- **Terminal Members Available**: 6 (`write`, `resize`, `setRawMode`, `ref`, `unref`, `close`)
- **Terminal Members Used**: 0 (0.0% coverage)
- **API Version**: `Bun.Terminal` introduced in Bun 1.3.5
  ([Release Notes](https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support))

#### Bun.Terminal API Overview

Bun now has a built-in API for creating and managing pseudo-terminals, enabling interactive terminal applications like
shells, `vim`, `htop`, and any program that expects to run in a real TTY.

**Key Features:**

- **PTY Attachment**: Use the new `terminal` option in `Bun.spawn()` to attach a PTY to your subprocess
- **TTY Detection**: With a PTY attached, the subprocess sees `process.stdout.isTTY` as `true`, enabling colored output,
  cursor movement, and interactive prompts that normally require a real terminal
- **Interactive Programs**: Full support for interactive applications like `vim`, `htop`, and shells
- **Reusable Terminals**: Create standalone terminals with `new Bun.Terminal()` for reuse across multiple subprocesses
- **Full Control**: Methods for writing, resizing, raw mode, ref/unref, and closing

**Usage Patterns:**

1. **Basic PTY with spawn:** Use the new `terminal` option in `Bun.spawn()` to attach a PTY to your subprocess:

```typescript
const commands = ['echo Hello from PTY!', 'exit'];
const proc = Bun.spawn(['bash'], {
	terminal: {
		cols: 80,
		rows: 24,
		data(terminal, data) {
			process.stdout.write(data);

			if (data.includes('$')) {
				terminal.write(commands.shift() + '\n');
			}
		},
	},
});

await proc.exited;
proc.terminal.close();
```

2. **Running interactive programs (complete example):**

```typescript
const proc = Bun.spawn(['vim', 'file.txt'], {
	terminal: {
		cols: process.stdout.columns,
		rows: process.stdout.rows,
		data(term, data) {
			process.stdout.write(data);
		},
	},
});

proc.exited.then(code => process.exit(code));

// Handle terminal resize
process.stdout.on('resize', () => {
	proc.terminal.resize(process.stdout.columns, process.stdout.rows);
});

// Forward input
process.stdin.setRawMode(true);
for await (const chunk of process.stdin) {
	proc.terminal.write(chunk);
}
```

**Key Points:**

- **isTTY Behavior**: When a PTY is attached, `process.stdout.isTTY` returns `true` in the subprocess, enabling:
    - Colored output (ANSI escape sequences)
    - Cursor movement commands
    - Interactive prompts and readline functionality
    - Terminal-aware program behavior

- **Terminal Resize**: Handle window resize events by calling `proc.terminal.resize()` with new dimensions

- **Input Forwarding**: Set raw mode on stdin and forward chunks to `proc.terminal.write()` for full bidirectional
  communication

3. **Reusable terminals:**

Create a standalone terminal with `new Bun.Terminal()` to reuse across multiple subprocesses:

```typescript
await using terminal = new Bun.Terminal({
	cols: 80,
	rows: 24,
	data(term, data) {
		process.stdout.write(data);
	},
});

const proc1 = Bun.spawn(['echo', 'first'], {terminal});
await proc1.exited;

const proc2 = Bun.spawn(['echo', 'second'], {terminal});
await proc2.exited;
// Terminal is closed automatically by `await using`
```

The `Terminal` object provides full PTY control with `write()`, `resize()`, `setRawMode()`, `ref()`/`unref()`, and
`close()` methods.

**Note:** Terminal support is only available on POSIX systems (Linux, macOS). If you're interested in using this API on
Windows, please [file an issue](https://github.com/oven-sh/bun/issues) and we will implement it.

#### Terminal Options Coverage

| Item      | Used | Available | Coverage | Description                                          |
| --------- | ---- | --------- | -------- | ---------------------------------------------------- |
| **cols**  | 0    | 1         | **0.0%** | Terminal columns (default: 80)                       |
| **rows**  | 0    | 1         | **0.0%** | Terminal rows (default: 24)                          |
| **name**  | 0    | 1         | **0.0%** | Terminal type (default: xterm-color)                 |
| **data**  | 0    | 1         | **0.0%** | Data callback `(terminal, data: Uint8Array) => void` |
| **exit**  | 0    | 1         | **0.0%** | Exit callback `(terminal, exitCode, signal) => void` |
| **drain** | 0    | 1         | **0.0%** | Drain callback `(terminal) => void`                  |

#### Terminal Members Coverage

| Member         | Used | Available | Coverage | Description                  |
| -------------- | ---- | --------- | -------- | ---------------------------- |
| **write**      | 0    | 1         | **0.0%** | Write data to terminal       |
| **resize**     | 0    | 1         | **0.0%** | Resize terminal (cols, rows) |
| **setRawMode** | 0    | 1         | **0.0%** | Enable/disable raw mode      |
| **ref**        | 0    | 1         | **0.0%** | Keep event loop alive        |
| **unref**      | 0    | 1         | **0.0%** | Allow event loop to exit     |
| **close**      | 0    | 1         | **0.0%** | Close terminal               |

#### Terminal Coverage Insights

**Current State:**

- **Zero Usage**: 0% coverage of all terminal options and members
- **No PTY Usage**: Scanner does not use `Bun.Terminal` or PTY-backed subprocesses
- **No Interactive Terminals**: No terminal-based interactive features implemented
- **API Available**: `Bun.Terminal` is available (since Bun 1.3.5) but unused

**Usage Patterns:**

- **No Terminal Options**: Zero usage of `cols`, `rows`, `name`, `data`, `exit`, `drain` options
- **No Terminal Methods**: Zero usage of `write`, `resize`, `setRawMode`, `ref`, `unref`, `close`
- **No PTY Spawns**: No `Bun.spawn({ terminal: true })` calls detected
- **No Terminal Access**: No `proc.terminal` property access found

**Potential Use Cases:**

- **Interactive CLI**: Could use PTY for interactive terminal sessions
- **Terminal Emulation**: Could implement terminal emulation features
- **Real-time Output**: Could use `data` callback for real-time terminal output
- **Terminal Control**: Could use `resize` and `setRawMode` for terminal control
- **Process Monitoring**: Could use `exit` callback for process lifecycle management

**Coverage Summary:**

- **Options Coverage**: 0% (0/6) - No terminal options configured
- **Members Coverage**: 0% (0/6) - No terminal methods called
- **Overall**: 0% (0/12) - Complete absence of PTY/terminal features

**Note**: The scanner has a `createTerminal` helper function in `process-management.ts` but it's not actually used in
the codebase. This suggests terminal support was planned but not implemented.

**Reference**:
[Bun v1.3.5 Release Notes - Bun.Terminal API](https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support)

### Resource Usage Coverage Metrics

#### Resource Usage Overview

- **ResourceUsage Fields Available**: 8 main fields (with sub-fields)
- **ResourceUsage Fields Used**: 0 (0.0% coverage)
- **ResourceUsage Call Sites**: 0
- **API**: `proc.resourceUsage()` - Returns OS-level resource consumption metrics
- **Documentation**: https://bun.com/docs/api/spawn#resourceusage

#### Resource Usage Fields Coverage

| Field                           | Type     | Used | Available | Coverage | Description                           |
| ------------------------------- | -------- | ---- | --------- | -------- | ------------------------------------- |
| **contextSwitches.voluntary**   | `number` | ✗    | 1         | **0.0%** | Context switches requested by process |
| **contextSwitches.involuntary** | `number` | ✗    | 1         | **0.0%** | Context switches by OS                |
| **cpuTime.user**                | `number` | ✗    | 1         | **0.0%** | User-mode CPU time (ms)               |
| **cpuTime.system**              | `number` | ✗    | 1         | **0.0%** | Kernel-mode CPU time (ms)             |
| **cpuTime.total**               | `number` | ✗    | 1         | **0.0%** | Total CPU time (user + system)        |
| **maxRSS**                      | `number` | ✗    | 1         | **0.0%** | Max resident set size (bytes)         |
| **messages.sent**               | `number` | ✗    | 1         | **0.0%** | IPC messages sent                     |
| **messages.received**           | `number` | ✗    | 1         | **0.0%** | IPC messages received                 |
| **ops.in**                      | `number` | ✗    | 1         | **0.0%** | File system read operations           |
| **ops.out**                     | `number` | ✗    | 1         | **0.0%** | File system write operations          |
| **shmSize**                     | `number` | ✗    | 1         | **0.0%** | Shared memory size (bytes)            |
| **signalCount**                 | `number` | ✗    | 1         | **0.0%** | Signals received count                |
| **swapCount**                   | `number` | ✗    | 1         | **0.0%** | Swap operations count                 |

#### Resource Usage Field Groups

**Context Switches (0/2 - 0.0%)**

- `contextSwitches.voluntary` - Process-initiated context switches
- `contextSwitches.involuntary` - OS-initiated context switches
- **Usage**: None (process scheduling metrics not monitored)

**CPU Time (0/3 - 0.0%)**

- `cpuTime.user` - User-mode CPU time in milliseconds
- `cpuTime.system` - Kernel-mode CPU time in milliseconds
- `cpuTime.total` - Total CPU time (user + system)
- **Usage**: None (CPU profiling not implemented)

**Memory Metrics (0/1 - 0.0%)**

- `maxRSS` - Maximum resident set size in bytes
- **Usage**: None (memory monitoring not implemented)

**IPC Messages (0/2 - 0.0%)**

- `messages.sent` - IPC messages sent by process
- `messages.received` - IPC messages received by process
- **Usage**: None (IPC monitoring not implemented)

**File System Operations (0/2 - 0.0%)**

- `ops.in` - File system read operations
- `ops.out` - File system write operations
- **Usage**: None (I/O operation tracking not implemented)

**System Metrics (0/3 - 0.0%)**

- `shmSize` - Shared memory size in bytes
- `signalCount` - Total signals received
- `swapCount` - Swap operations count
- **Usage**: None (system-level metrics not tracked)

#### Resource Usage Coverage Insights

**Current State:**

- **Zero Usage**: 0% coverage of all ResourceUsage fields (0/13 sub-fields)
- **No Monitoring**: Scanner does not call `proc.resourceUsage()`
- **No Performance Tracking**: No CPU, memory, or I/O metrics collected
- **API Available**: `resourceUsage()` method exists on Subprocess but unused

**Usage Patterns:**

- **No ResourceUsage Calls**: Zero calls to `proc.resourceUsage()`
- **No Field Access**: Zero access to any ResourceUsage fields
- **No Performance Monitoring**: No process performance tracking implemented

**Potential Use Cases:**

- **Performance Profiling**: Track CPU time for spawned processes
- **Memory Monitoring**: Monitor `maxRSS` for memory leaks
- **I/O Analysis**: Track file system operations via `ops.in`/`ops.out`
- **Process Debugging**: Use context switches and signal counts for debugging
- **Resource Limits**: Monitor resource usage to enforce limits
- **Benchmarking**: Collect metrics for performance comparisons

**Coverage Summary:**

- **All Fields**: 0% (0/13) - Complete absence of resource usage monitoring
- **Call Sites**: 0 - No `resourceUsage()` calls detected
- **Overall**: 0% - ResourceUsage API completely unused

**Note**: ResourceUsage provides detailed OS-level metrics via `getrusage(2)` on POSIX systems. This is useful for
performance monitoring, debugging, and resource management, but requires explicit calls to `proc.resourceUsage()` to
access.

### Prioritized Improvement Recommendations

Based on coverage analysis and impact assessment, here are prioritized recommendations for enhancing Bun API usage:

| Priority      | Item                     | Impact            | Effort | Current Coverage    | Recommendation                                                                                                                             |
| ------------- | ------------------------ | ----------------- | ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔴 **High**   | **ResourceUsage**        | Observability     | Low    | 0% (0/13 fields)    | Add `proc.resourceUsage()` calls to track CPU, memory, and I/O metrics for spawned processes                                               |
| 🔴 **High**   | **Signal handling**      | Reliability       | Medium | 5.4% (2/37 signals) | Expand signal handling beyond `SIGINT`/`SIGTERM` to include error recovery (`SIGABRT`, `SIGSEGV`) and child process monitoring (`SIGCHLD`) |
| 🟡 **Medium** | **Terminal (PTY)**       | Interactivity     | Medium | 0% (0/12 features)  | Implement PTY support for interactive CLI features and terminal emulation                                                                  |
| 🟡 **Medium** | **Subprocess.ref/unref** | Lifecycle control | Low    | 0% (not used)       | Use `ref()`/`unref()` for better event loop control and process lifecycle management                                                       |
| 🟢 **Low**    | **IPC serialization**    | Performance       | Low    | Partial             | Optimize IPC message serialization for better performance in worker processes                                                              |

#### High Priority Items

**1. ResourceUsage (🔴 High Priority)**

- **Why**: Critical for observability and performance monitoring
- **Impact**: Enables CPU profiling, memory leak detection, I/O analysis
- **Effort**: Low - Simple API calls, no complex logic required
- **Implementation**: Add `proc.resourceUsage()` calls after process completion
- **Fields to Track**: `cpuTime.total`, `maxRSS`, `ops.in`, `ops.out` (start with these)

**2. Signal Handling (🔴 High Priority)**

- **Why**: Improves reliability and error recovery
- **Impact**: Better crash recovery, child process monitoring, graceful degradation
- **Effort**: Medium - Requires careful signal handler design
- **Implementation**: Add handlers for `SIGABRT`, `SIGSEGV`, `SIGCHLD`
- **Benefits**: Automatic crash recovery, better process monitoring

#### Medium Priority Items

**3. Terminal (PTY) Support (🟡 Medium Priority)**

- **Why**: Enables interactive CLI features
- **Impact**: Better user experience for interactive tools
- **Effort**: Medium - Requires terminal management logic
- **Implementation**: Use `Bun.spawn({ terminal: true })` for interactive commands
- **Use Cases**: Interactive prompts, terminal-based UIs, command-line tools

**4. Subprocess.ref/unref (🟡 Medium Priority)**

- **Why**: Better event loop and lifecycle control
- **Impact**: Prevents event loop from exiting prematurely, better resource cleanup
- **Effort**: Low - Simple method calls
- **Implementation**: Use `proc.ref()` when keeping process alive, `proc.unref()` when allowing exit

#### Low Priority Items

**5. IPC Serialization (🟢 Low Priority)**

- **Why**: Performance optimization for worker communication
- **Impact**: Faster IPC message passing
- **Effort**: Low - Configuration change
- **Implementation**: Use `serialization: "advanced"` for complex data structures

### Performance Optimization Metrics

#### Optimization Analysis

Performance optimization opportunities identified through native vs userland comparison:

| ID  | P_native (ns) | P_userland (ns) | P_ratio | M_saved (B) | M_impact | E_elim | S_harden | D_ergo | R-Score      |
| --- | ------------- | --------------- | ------- | ----------- | -------- | ------ | -------- | ------ | ------------ |
| 1   | 45            | 320             | 0.35    | 128         | 0.85     | 1.00   | 1.00     | 0.95   | **1.000000** |
| 2   | 50            | 425             | 0.35    | 192         | 0.88     | 1.00   | 1.00     | 0.95   | **1.000000** |
| 3   | 55            | 480             | 0.35    | 256         | 0.90     | 1.00   | 1.00     | 0.95   | **1.000000** |
| 4   | 65            | 680             | 0.35    | 160         | 0.86     | 1.00   | 1.00     | 0.95   | **1.000000** |
| 5   | 70            | 320             | 0.35    | 128         | 0.85     | 1.00   | 1.00     | 0.95   | **1.000000** |
| 6   | 48            | 290             | 0.35    | 144         | 0.86     | 0.98   | 1.00     | 0.90   | **0.995000** |
| 7   | 60            | 410             | 0.35    | 160         | 0.86     | 1.00   | 1.00     | 0.95   | **1.000000** |
| 8   | 90            | 1850            | 0.35    | 320         | 0.93     | 1.00   | 1.00     | 0.95   | **1.000000** |

#### Key Takeaways

**All 8 optimizations are highly recommended** - Every optimization achieves an R-Score ≥0.995, indicating exceptional
value across performance, security, and developer experience metrics.

**ID 8 provides the largest gains** - With a 20.6x performance improvement (90ns vs 1850ns) and the highest memory
impact (320 bytes saved, M_impact: 0.93), ID 8 represents the most impactful optimization opportunity.

**All improve security (S_harden = 1.00)** - Every optimization achieves a perfect security hardening score, eliminating
potential vulnerabilities inherent in userland implementations.

**Native implementations provide significant benefits** - Native implementations deliver an average of 2.86x performance
improvement while reducing memory footprint by 1,488 bytes total, with excellent elimination, security, and ergonomics
scores across the board.

#### Metric Definitions

- **P_native (ns)**: Native implementation performance in nanoseconds
- **P_userland (ns)**: Userland/JavaScript implementation performance in nanoseconds
- **P_ratio**: Performance ratio (native/userland) - lower is better (native faster)
- **M_saved (B)**: Memory saved in bytes by using native implementation
- **M_impact**: Memory impact score (0-1, higher is better)
- **E_elim**: Elimination score - how well the optimization eliminates overhead (0-1)
- **S_harden**: Security hardening score - security benefits (0-1)
- **D_ergo**: Ergonomics score - developer experience improvement (0-1)
- **R-Score**: Overall recommendation score (0-1, higher is better)

#### Optimization Insights

**Performance Gains:**

- **Average Native Performance**: ~54ns (range: 45-90ns)
- **Average Userland Performance**: ~597ns (range: 290-1850ns)
- **Average Performance Ratio**: 0.35 (native is ~2.86x faster on average)
- **Best Performance Gain**: ID 8 (90ns vs 1850ns = 20.6x faster)
- **Smallest Performance Gain**: ID 6 (48ns vs 290ns = 6.0x faster)

**Memory Benefits:**

- **Total Memory Saved**: 1,488 bytes across all optimizations
- **Average Memory Saved**: 186 bytes per optimization
- **Highest Memory Impact**: ID 8 (0.93) - 320 bytes saved
- **Memory Impact Range**: 0.85-0.93 (all high impact)

**Quality Scores:**

- **Elimination Score**: 0.98-1.00 (excellent overhead elimination)
- **Security Hardening**: 1.00 (all optimizations improve security)
- **Ergonomics**: 0.90-0.95 (good developer experience)
- **R-Score**: 0.995-1.000 (highly recommended optimizations)

**Recommendations:**

- All 8 optimizations show **excellent R-Scores** (≥0.995)
- **ID 8** provides the largest performance gain (20.6x) and highest memory impact
- **ID 6** has slightly lower scores but still highly recommended (0.995)
- All optimizations improve security (S_harden = 1.00)
- Native implementations provide significant performance and memory benefits

### Coverage Benchmark Snapshot

#### Snapshot Metadata

- **Generated**: 2026-02-03T15:45:20.508Z
- **File Analyzed**: `scan.ts`
- **Runtime**: Bun 1.3.9 (revision: eba4da23)
- **Platform**: darwin arm64
- **File Size**: 201,015 bytes (4,416 lines)

#### Overall Coverage Metrics

| Metric                     | Value | Coverage  |
| -------------------------- | ----- | --------- |
| **Runtime APIs Available** | 104   | -         |
| **Runtime APIs Used**      | 23    | **22.1%** |
| **API Call Sites**         | 127   | -         |
| **Spawn Options**          | 5/17  | **29.4%** |
| **Spawn Members**          | 4/16  | **25.0%** |
| **Signals**                | 2/37  | **5.4%**  |
| **Terminal Options**       | 0/6   | **0.0%**  |
| **Terminal Members**       | 0/6   | **0.0%**  |
| **ResourceUsage Fields**   | 0/8   | **0.0%**  |

#### Surface Coverage Breakdown

| Surface                  | Used | Available | Coverage  |
| ------------------------ | ---- | --------- | --------- |
| **Bun Runtime APIs**     | 23   | 104       | **22.1%** |
| **Spawn Options**        | 5    | 17        | **29.4%** |
| **Subprocess Members**   | 4    | 16        | **25.0%** |
| **Signals**              | 2    | 37        | **5.4%**  |
| **Terminal Options**     | 0    | 6         | **0.0%**  |
| **Terminal Members**     | 0    | 6         | **0.0%**  |
| **ResourceUsage Fields** | 0    | 8         | **0.0%**  |

#### Category Coverage

| Category               | Used | Available | Coverage   |
| ---------------------- | ---- | --------- | ---------- |
| **Shell & Process**    | 4    | 8         | **50.0%**  |
| **Semver**             | 1    | 1         | **100.0%** |
| **File I/O**           | 5    | 7         | **71.4%**  |
| **Utilities**          | 6    | 35        | **17.1%**  |
| **Hashing & Security** | 1    | 11        | **9.1%**   |
| **HTTP & Networking**  | 0    | 9         | **0.0%**   |
| **Databases**          | 0    | 8         | **0.0%**   |
| **Compression**        | 0    | 9         | **0.0%**   |
| **Streaming**          | 0    | 2         | **0.0%**   |
| **Build & Bundling**   | 0    | 5         | **0.0%**   |
| **Routing**            | 0    | 4         | **0.0%**   |
| **Advanced**           | 0    | 14        | **0.0%**   |

#### Top API Usage (by Call Count)

| API                  | Call Sites | Description            |
| -------------------- | ---------- | ---------------------- |
| `Bun.file`           | 31         | File handle creation   |
| `Bun.spawn`          | 18         | Async child process    |
| `Bun.write`          | 17         | File writing           |
| `Bun.env`            | 14         | Environment variables  |
| `proc.stderr.text()` | 9          | Read stderr stream     |
| `Bun.nanoseconds`    | 7          | High-resolution timing |
| `proc.stdout.text()` | 6          | Read stdout stream     |
| `Bun.inspect.table`  | 4          | Table formatting       |
| `Bun.version`        | 3          | Runtime version        |
| `Bun.stringWidth`    | 2          | Unicode string width   |

#### Spawn Coverage Details

**Spawn Sites:**

- **Async**: 15 sites
- **Sync**: 1 site
- **Total**: 16 sites

**Options Used (5/17 - 29.4%):**

- `stdout`: Used (pipe, ignore)
- `stderr`: Used (pipe, ignore)
- `cwd`: Used
- `env`: Used
- `stdio`: Used

**Members Used (4/16 - 25.0%):**

- `exited`: Used (await proc.exited)
- `stdout`: Used (proc.stdout.text())
- `stderr`: Used (proc.stderr.text())
- `exitCode`: Used

**Members Not Used:**

- `stdin`, `readable`, `terminal`, `kill`, `ref`, `unref`, `send`, `disconnect`, `resourceUsage`, `pid`, `killed`,
  `signalCode`

#### Unicode Handling

| Type              | Count | Description          |
| ----------------- | ----- | -------------------- |
| **Full**          | 12    | Full Unicode support |
| **Passthrough**   | 4     | Passthrough handling |
| **Binary**        | 1     | Binary mode          |
| **N/A**           | 6     | Not applicable       |
| **Total Handled** | 17    | -                    |

#### Legacy Pattern Usage

- **Response Wrapper**: 0 (not used)
- **URL Pathname**: 0 (not used)
- **Strip ANSI Regex**: 0 (not used)

**Status**: ✅ No legacy patterns detected (modern API usage)

#### Benchmark Insights

**Strengths:**

- **High File I/O Coverage**: 71.4% (5/7 APIs)
- **Good Process Management**: 50% Shell & Process coverage
- **Complete Semver Usage**: 100% (1/1)
- **Modern API Usage**: Zero legacy patterns

**Areas for Growth:**

- **Low Utilities Coverage**: 17.1% (6/35 APIs)
- **Zero Database Usage**: 0% (0/8 APIs)
- **Zero Terminal Usage**: 0% (0/12 features)
- **Zero ResourceUsage**: 0% (0/8 fields)

**Usage Patterns:**

- **Heavy File Operations**: 31 `Bun.file` calls, 17 `Bun.write` calls
- **Process Spawning**: 18 async spawns, 1 sync spawn
- **Stream Reading**: 9 stderr reads, 6 stdout reads
- **Performance Monitoring**: 7 `Bun.nanoseconds` calls

### Compliance Metrics

- **Scanner Project Compliance**: 100% (9/9 constants)
- **MCP Bun Docs Compliance**: 100% (30+/30+ constants)
- **Overall Compliance**: 100%
- **ESLint Rule**: `bun/require-bun-prefix` enforced

## Usage Examples

### Scanner Project

```typescript
// Option 1: Direct imports from domain files
import {BUN_API_CATALOG, BUN_DOCS_BASE} from './cli/renderers/bun-api-matrix';
import {BUN_API_PROVENANCE, BUN_RELATED_APIS} from './cli/renderers/doc-cross-reference';
import {BUN_FIX_PROJECTIONS, BUN_R_SCORE_BASELINE} from './src/cli-constants';

// Option 2: From centralized constants hub (convenience)
import {BUN_FIX_PROJECTIONS, BUN_API_CATALOG, BUN_R_SCORE_BASELINE} from './src/constants';

// Get API count
const apiCount = BUN_API_CATALOG.length;

// Get version for an API
const version = BUN_API_PROVENANCE['Bun.serve']; // "<1.2"

// Get related APIs
const related = BUN_RELATED_APIS['Bun.resolve']; // ["Bun.resolveSync", ...]

// Access fix projections
const fixEngineProj = BUN_FIX_PROJECTIONS['fixengine'];
const baseline = BUN_R_SCORE_BASELINE; // 0.82
```

### MCP Bun Docs Project

```typescript
import {BUN_DOC_MAP, BUN_DOCS_BASE, BUN_BASE_URL, buildDocUrl} from 'mcp-bun-docs/lib';

// Get doc path for a term
const path = BUN_DOC_MAP['spawn']; // "api/spawn"

// Build full URL
const url = buildDocUrl(path); // "https://bun.com/docs/api/spawn"

// Access base URLs
console.log(BUN_BASE_URL); // "https://bun.com"
console.log(BUN_DOCS_BASE); // "https://bun.com/docs"
```

## Compliance Status

✅ **All constants follow the `BUN_` prefix convention**

- Scanner project: 100% compliant
- MCP Bun Docs project: 100% compliant
- ESLint rule `bun/require-bun-prefix` enforces this convention

## Bun Documentation Structure

Bun's documentation is organized into several main sections, each covering different aspects of the platform. The
structure is defined in [`docs/docs.json`](https://github.com/oven-sh/bun/blob/main/docs/docs.json).

### Documentation Tabs

1. **Runtime** - Core runtime features and APIs
2. **Package Manager** - Package management commands and features
3. **Bundler** - Build and bundling tools
4. **Test Runner** - Testing framework and utilities
5. **Guides** - Step-by-step guides and tutorials
6. **Reference** - Complete API reference (links to https://bun.com/reference)
7. **Blog** - Release notes and announcements
8. **Feedback** - How to report issues and suggest improvements

### Runtime Documentation Groups

The Runtime tab includes:

- **Get Started** - Installation, quickstart, TypeScript setup
- **Core Runtime** - Watch mode, debugger, bunfig configuration
- **File & Module System** - File types, module resolution, JSX, plugins
- **HTTP server** - Server, routing, cookies, TLS, error handling, metrics
- **Networking** - Fetch, WebSockets, TCP, UDP, DNS
- **Data & Storage** - Cookies, file I/O, streams, binary data, archive, SQL, SQLite, S3, Redis
- **Concurrency** - Workers
- **Process & System** - Environment variables, shell, child processes
- **Interop & Tooling** - Node.js API, FFI, C compiler, transpiler
- **Utilities** - Secrets, console, YAML, Markdown, JSON5, JSONL, HTML rewriter, hashing, glob, semver, color, utils
- **Standards & Compatibility** - Globals, Bun APIs, Web APIs, Node.js compatibility

### Package Manager Documentation Groups

- **Core Commands** - install, add, remove, update, bunx
- **Publishing & Analysis** - publish, outdated, why, audit, info
- **Workspace Management** - Workspaces, catalogs, link, pm
- **Advanced Configuration** - Patch, filter, global cache, isolated installs, lockfile, lifecycle, scopes/registries,
  overrides, security scanner API, npmrc

### Bundler Documentation Groups

- **Core** - Basic bundling
- **Development Server** - Fullstack, hot reloading
- **Asset Processing** - HTML static, CSS, loaders
- **Single File Executable** - Executable generation
- **Extensions** - Plugins, macros
- **Optimization** - Bytecode, minifier
- **Migration** - esbuild migration

### Test Runner Documentation Groups

- **Getting Started** - Index, writing tests, configuration
- **Test Execution** - Runtime behavior, discovery
- **Test Features** - Lifecycle, mocks, snapshots, dates/times
- **Specialized Testing** - DOM testing
- **Reporting** - Code coverage, reporters

### Guides Documentation Groups

The Guides tab includes comprehensive tutorials organized by:

- **Overview** - General guides
- **Deployment** - Vercel, Railway, Render, AWS Lambda, Digital Ocean, Google Cloud Run
- **Runtime & Debugging** - TypeScript, debugging, heap snapshots, build-time constants, CI/CD
- **Utilities** - Upgrade, version detection, hashing, UUIDs, base64, compression, file operations
- **Ecosystem & Frameworks** - Astro, Discord.js, Docker, Drizzle, Elysia, Express, Hono, Next.js, Nuxt, Prisma, React,
  Remix, SvelteKit, Vite, and more
- **HTTP & Networking** - Server setup, fetch, hot reloading, TLS, proxy, file uploads
- **WebSocket** - Simple, pubsub, context, compression
- **Processes & System** - Spawn, stdin/stdout/stderr, IPC, signals, nanoseconds
- **Package Manager** - Installation guides, workspaces, registries, trusted dependencies
- **Test Runner** - Running tests, watch mode, Jest migration, mocks, snapshots, coverage
- **Module System** - Import JSON/TOML/YAML/JSON5/HTML, import.meta utilities
- **File System** - Reading/writing files, streams, file operations
- **HTML Processing** - HTMLRewriter examples
- **Binary Data** - ArrayBuffer, Buffer, Blob, TypedArray conversions
- **Streams** - Stream conversions and Node.js stream compatibility

### Documentation Configuration

The documentation is powered by **Mintlify** with:

- **Theme**: Aspen
- **Canonical URL**: `https://bun.com/docs`
- **Brand Color**: `#ff73a8` (Bun pink)
- **Code Themes**: GitHub Light (light mode), Dracula (dark mode)
- **Contextual Options**: Copy, view, ChatGPT, Claude, Perplexity, MCP, Cursor, VSCode integration

### Bun API Reference

The [Bun API Reference](https://bun.com/reference) is the complete API documentation for Bun, generated from TypeScript
definitions in the [`bun-types` package](https://github.com/oven-sh/bun/tree/main/packages/bun-types).

#### Reference Structure

The API reference is organized by modules:

**Bun Core Modules:**

- `Bun` - Core runtime APIs
- `bun:bundle` - Bundler APIs
- `bun:ffi` - Foreign Function Interface
- `bun:jsc` - JavaScriptCore engine APIs
- `bun:sqlite` - SQLite database integration
- `bun:test` - Testing utilities
- `Globals` - Global scope variables and classes

**Node.js Compatibility Modules:**

- `node:*` - 50+ Node.js-compatible modules (assert, buffer, crypto, fs, http, etc.)

#### TypeScript Definitions

The TypeScript definitions are maintained in:

- **Repository**: [oven-sh/bun/packages/bun-types](https://github.com/oven-sh/bun/tree/main/packages/bun-types)
- **Location**: `packages/bun-types/` directory
- **Key Files**: `index.d.ts`, `bun.d.ts`, `globals.d.ts`, `test.d.ts`, etc.
- **Source**: [docs.json configuration](https://github.com/oven-sh/bun/blob/main/docs/docs.json)

#### Documentation Generation

The API reference is generated from these TypeScript definitions, ensuring:

- **Type Safety**: All APIs are properly typed
- **Completeness**: Every exported API is documented
- **Accuracy**: Documentation matches implementation
- **Color Coding**: APIs are color-coded by type (function, class, interface, etc.)

#### Relationship to Constants

The constants documented in this table (`BUN_*`) are:

- **Derived from**: Bun's runtime APIs and documentation structure
- **Used by**: Scanner project for API cataloging and cross-referencing
- **Mapped to**: Bun API Reference entries via `BUN_DOC_MAP` and `BUN_DOC_ENTRIES`
- **Linked to**: Official documentation URLs in `BUN_DOCS_BASE` and `BUN_DOC_BASE`
- **Organized by**: Documentation structure defined in `docs/docs.json`

## Documentation Validation Utilities

### Quick Reference

**One-liner to validate docs.json and check for 404s:**

```bash
bun -e 'const c=await Bun.file("docs.json").json(); const reqs=c.navigation.tabs.flatMap(t=>t.groups?.flatMap(g=>g.pages)||[]); console.table(await Promise.all(reqs.slice(0,10).map(async p=>({path:p,status:(await fetch(`https://bun.com/docs${p}`).catch(()=>({status:0}))).status}))))'
```

**Standalone script (recommended):**

```bash
bun scripts/validate-docs-links.ts docs.json
```

### Validate JSON Schema and Check for 404s

Validate the `docs.json` structure and check for broken links in the navigation.

#### Quick One-Liner

```bash
bun -e 'const c=await Bun.file("docs.json").json(); const reqs=c.navigation.tabs.flatMap(t=>t.groups?.flatMap(g=>g.pages)||[]); console.table(await Promise.all(reqs.slice(0,10).map(async p=>({path:p,status:(await fetch(`https://bun.com/docs${p}`).catch(()=>({status:0}))).status}))))'
```

**What it does:**

- Reads `docs.json` file
- Extracts all page paths from navigation tabs and groups
- Checks HTTP status for first 10 pages
- Displays results in a table format

#### Standalone Script

A more robust validation script is available at `scripts/validate-docs-links.ts`:

```bash
# Check all pages
bun scripts/validate-docs-links.ts docs.json

# Check first 10 pages only
CHECK_LIMIT=10 bun scripts/validate-docs-links.ts docs.json

# Use custom base URL
DOCS_BASE_URL=https://bun.com/docs bun scripts/validate-docs-links.ts docs.json
```

**Features:**

- ✅ Validates JSON schema structure
- ✅ Extracts all page paths from navigation
- ✅ Checks HTTP status codes (HEAD requests)
- ✅ Displays results in table format
- ✅ Summary statistics (total, OK, broken)
- ✅ Exit code 1 if broken links found
- ✅ Configurable via environment variables

#### Extended One-Liner (Check All Pages)

```bash
bun -e 'const c=await Bun.file("docs.json").json(); const reqs=c.navigation.tabs.flatMap(t=>t.groups?.flatMap(g=>g.pages)||[]); const results=await Promise.all(reqs.map(async p=>({path:p,status:(await fetch(`https://bun.com/docs${p}`).catch(()=>({status:0}))).status}))); const broken=results.filter(r=>r.status!==200); console.log(`Total pages: ${results.length}`); console.log(`Broken links: ${broken.length}`); if(broken.length>0) console.table(broken);'
```

## Link Normalization Utility

For web pages or documentation sites that need to normalize internal Bun documentation links, use this utility script:

```javascript
(function () {
	function normalizeInternalLinks() {
		const selectors = [
			'a[href*="bun.com/docs/installation"]',
			'a[href="https://bun.com/reference"]',
			'a[href="https://bun.com/blog"]',
		];

		selectors.forEach(selector => {
			const elements = document.querySelectorAll(selector);
			elements.forEach(element => {
				if (element.hasAttribute('target')) {
					element.removeAttribute('target');
					// Also remove rel="noreferrer" if present, typically paired with target="_blank"
					if (element.getAttribute('rel') === 'noreferrer') {
						element.removeAttribute('rel');
					}
				}
			});
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', normalizeInternalLinks);
	} else {
		normalizeInternalLinks();
	}

	const observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			if (mutation.type === 'childList' || mutation.type === 'attributes') {
				normalizeInternalLinks();
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['target', 'href'],
	});
})();
```

**Purpose:**

- Removes `target="_blank"` from internal Bun documentation links
- Removes `rel="noreferrer"` when paired with target attributes
- Handles dynamically added content via MutationObserver
- Ensures internal links open in the same window/tab

**Target Links:**

- `bun.com/docs/installation`
- `bun.com/reference`
- `bun.com/blog`

**Usage:** Include this script in any HTML page that contains links to Bun documentation to ensure they behave as
internal navigation links rather than external links.

## Related Documentation

- [CONSTANTS_RENAME_SUMMARY.md](./CONSTANTS_RENAME_SUMMARY.md) - Scanner constants rename history
- [docs/CUSTOM_ESLINT_RULES.md](./docs/CUSTOM_ESLINT_RULES.md) - ESLint rules for Bun constants
- [matrix-analysis/mcp-bun-docs/EXPORTS.md](../matrix-analysis/mcp-bun-docs/EXPORTS.md) - MCP Bun Docs exports
- [Bun API Reference](https://bun.com/reference) - Complete API documentation
- [Bun TypeScript Definitions](https://github.com/oven-sh/bun/tree/main/packages/bun-types) - Source TypeScript
  definitions
