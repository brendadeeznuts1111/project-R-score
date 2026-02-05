# [PATTERNS.NAMING.PATHS.RG] Naming and Path Patterns

**Metadata**: `[[PATTERNS][NAMING][PATHS][META:{blueprint=BP-NAMING-PATHS@1.0.0;instance-id=PATTERNS-001;version=1.0.0}][PROPERTIES:{patterns={value:"naming-path-patterns";@root:"ROOT-DOC";@chain:["BP-NAMING-CONVENTIONS","BP-PATH-STRUCTURE"];@version:"1.0.0"}}][CLASS:NamingPathPatterns][#REF:v-1.0.0.BP.PATTERNS.NAMING.PATHS.1.0.A.1.1.DOC.1.1]]`

## 1. [PATTERNS.OVERVIEW.RG] Overview

Comprehensive guide to naming conventions and path patterns across the Hyper-Bun codebase. This document extends the base naming conventions with path-specific patterns, import/export conventions, and domain-specific naming strategies.

**Related Documentation**:
- [Naming Conventions](../guides/NAMING-CONVENTIONS.md) - Base naming standards
- [Naming Patterns Quick Reference](../NAMING-PATTERNS-QUICK-REFERENCE.md) - Quick reference
- [Structure Beneath Chaos](./STRUCTURE-BENEATH-CHAOS.md) - Architectural philosophy
- [Root Directory Organization](../root-docs/ROOT-DIRECTORY-ORGANIZATION.md) - Directory structure

**Code Reference**: `#REF:v-1.0.0.BP.PATTERNS.NAMING.PATHS.1.0.A.1.1.DOC.1.1`

---

## 2. [PATTERNS.FILE.PATHS.RG] File Path Patterns

### 2.1. [FILES.SOURCE.PATHS.RG] Source File Paths

**Pattern**: `src/[domain]/[component]/[file-name].ts`

**Domain Structure**:
```
src/
├── api/                    # API routes and handlers
│   ├── routes.ts          # Main route definitions
│   ├── routers/           # Route handlers
│   │   └── urlpattern-router.ts
│   └── docs.ts            # OpenAPI specification
├── orca/                  # ORCA identity normalization
│   ├── arbitrage/         # Arbitrage storage
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── normalizer.ts      # Core normalizer
│   └── sharp-books/       # Sharp books registry
├── arbitrage/             # Cross-market arbitrage
│   ├── scanner.ts
│   └── executor.ts
├── analytics/             # Trading analytics
│   ├── correlation-engine.ts
│   └── stats.ts
├── security/              # Security monitoring
│   ├── bun-scanner.ts
│   └── incident-response.ts
└── utils/                 # Utility functions
    ├── bun.ts
    └── logger.ts
```

**Rules**:
- Use `kebab-case` for all file names
- Match file name to primary export (class or function)
- Use descriptive, domain-specific names
- Group related files in domain directories

**Examples**:
- ✅ `src/orca/arbitrage/storage.ts` → exports `OrcaArbitrageStorage`
- ✅ `src/api/routers/urlpattern-router.ts` → exports `UrlPatternRouter`
- ✅ `src/analytics/correlation-engine.ts` → exports `DoDMultiLayerCorrelationGraph`
- ❌ `src/orca/ArbitrageStorage.ts` (PascalCase)
- ❌ `src/orca/arbitrage_storage.ts` (snake_case)

### 2.2. [FILES.TEST.PATHS.RG] Test File Paths

**Pattern**: `test/[domain]/[component]/[file-name].test.ts` or `src/[domain]/[component]/[file-name].test.ts`

**Co-located Tests** (Preferred for unit tests):
```
src/orca/arbitrage/
├── storage.ts
└── storage.test.ts
```

**Dedicated Test Directory** (Preferred for integration tests):
```
test/
├── api/
│   └── routes.test.ts
├── orca/
│   └── arbitrage-storage.test.ts
└── integration/
    └── end-to-end.test.ts
```

**Rules**:
- Match test file name to source file name
- Use `.test.ts` for unit tests
- Use `.spec.ts` for specification/behavior tests
- Co-locate unit tests with source
- Use dedicated directory for integration tests

### 2.3. [FILES.INDEX.PATHS.RG] Index File Paths

**Pattern**: `[domain]/index.ts` or `[domain]/[component]/index.ts`

**Purpose**: Re-export public API from a module

**Examples**:
```typescript
// src/orca/arbitrage/index.ts
export { OrcaArbitrageStorage } from './storage';
export type { OrcaArbitrageOpportunity } from './types';

// src/orca/index.ts
export * from './arbitrage';
export * from './normalizer';
export * from './sharp-books';
```

**Rules**:
- Use `index.ts` for module boundaries
- Re-export only public API
- Keep exports organized and minimal
- Avoid deep re-export chains (>2 levels)

### 2.4. [FILES.CONSTANTS.PATHS.RG] Constants File Paths

**Pattern**: `[domain]/constants.ts` or `[domain]/[component]/constants.ts`

**Examples**:
- `src/orca/constants.ts`
- `src/api/constants.ts`
- `src/telegram/constants.ts`

**Rules**:
- Group related constants in domain-specific files
- Use `UPPER_SNAKE_CASE` for constant names
- Export as `const` objects for namespacing

---

## 3. [PATTERNS.DIRECTORY.PATHS.RG] Directory Path Patterns

### 3.1. [DIRS.SOURCE.STRUCTURE.RG] Source Directory Structure

**Pattern**: `src/[domain]/[subdomain]/[component]/`

**Domain Hierarchy**:
```
src/
├── [domain]/              # Top-level domain (e.g., orca, api, arbitrage)
│   ├── [subdomain]/       # Subdomain (e.g., arbitrage, sharp-books)
│   │   ├── [component]/   # Component (e.g., storage, registry)
│   │   │   ├── index.ts
│   │   │   └── [component-name].ts
│   │   └── index.ts
│   └── index.ts
```

**Examples**:
- `src/orca/arbitrage/storage/` → `OrcaArbitrageStorage`
- `src/api/routers/urlpattern/` → `UrlPatternRouter`
- `src/analytics/correlation/engine/` → `CorrelationEngine`

**Rules**:
- Use `kebab-case` for directory names
- Match directory structure to domain hierarchy
- Keep depth reasonable (max 4 levels from `src/`)
- Use `index.ts` at each level for clean imports

### 3.2. [DIRS.DOCUMENTATION.PATHS.RG] Documentation Directory Structure

**Pattern**: `docs/[category]/[topic]/[file-name].md`

**Category Structure**:
```
docs/
├── guides/                # Developer guides
│   ├── NAMING-CONVENTIONS.md
│   └── CONTRIBUTING.md
├── api/                   # API documentation
│   ├── MCP-SERVER.md
│   └── HEADERS-ETAGS-PROPERTIES-TYPES.md
├── patterns/              # Pattern documentation
│   ├── STRUCTURE-BENEATH-CHAOS.md
│   └── NAMING-AND-PATH-PATTERNS.md
├── bun/                   # Bun-specific docs
│   └── BUN-UTILS.md
└── root-docs/             # Project-level docs
    └── ROOT-DIRECTORY-ORGANIZATION.md
```

**Rules**:
- Use `UPPER-KEBAB-CASE.md` for important docs
- Use `PascalCase.md` for topic-specific docs
- Group by category (guides, api, patterns, etc.)
- Use descriptive, searchable names

### 3.3. [DIRS.CONFIG.PATHS.RG] Configuration Directory Structure

**Pattern**: `config/[config-name].[ext]`

**Examples**:
- `config/bunfig.toml` - Bun configuration
- `config/tsconfig.json` - TypeScript configuration
- `config/wrangler.toml` - Cloudflare Workers config
- `config/nexus.toml` - Nexus platform config

**Rules**:
- Keep all config files in `config/` directory
- Use standard file extensions (`.toml`, `.json`, `.yaml`)
- Use descriptive names matching tool/framework

### 3.4. [DIRS.SCRIPTS.PATHS.RG] Scripts Directory Structure

**Pattern**: `scripts/[category]/[script-name].ts` or `scripts/[script-name].ts`

**Examples**:
- `scripts/dashboard-server.ts` - Dashboard server script
- `scripts/bun-runtime-utils.ts` - Runtime utilities
- `scripts/build-standalone.ts` - Build script
- `scripts/profiling/` - Profiling scripts directory

**Rules**:
- Use `kebab-case` for script names
- Group related scripts in subdirectories
- Use descriptive names indicating purpose

---

## 4. [PATTERNS.IMPORT.PATHS.RG] Import Path Patterns

### 4.1. [IMPORTS.RELATIVE.PATHS.RG] Relative Import Paths

**Pattern**: `./[file-name]` or `../[directory]/[file-name]`

**Rules**:
- Use relative paths for same-domain imports
- Prefer `./` for same-directory imports
- Use `../` for parent directory imports
- Limit depth to 3 levels (`../../../` max)

**Examples**:
```typescript
// Same directory
import { OrcaArbitrageStorage } from './storage';
import type { OrcaArbitrageOpportunity } from './types';

// Parent directory
import { createOrcaNormalizer } from '../normalizer';

// Sibling directory
import { getBooksByTag } from '../sharp-books';
```

### 4.2. [IMPORTS.ABSOLUTE.PATHS.RG] Absolute Import Paths

**Pattern**: `src/[domain]/[component]` (via TypeScript path mapping)

**TypeScript Path Mapping** (in `config/tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@orca/*": ["./src/orca/*"],
      "@api/*": ["./src/api/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

**Usage**:
```typescript
// Absolute imports (preferred for cross-domain)
import { logger } from '@utils/logger';
import { OrcaArbitrageStorage } from '@orca/arbitrage';
import { Hono } from 'hono'; // External packages
```

**Rules**:
- Use absolute paths for cross-domain imports
- Use path aliases (`@/*`) for cleaner imports
- Prefer relative paths for same-domain imports
- Use external package names directly (no aliases)

### 4.3. [IMPORTS.INDEX.PATHS.RG] Index File Imports

**Pattern**: `[domain]/[component]` (resolves to `index.ts`)

**Examples**:
```typescript
// These resolve to index.ts files
import { OrcaArbitrageStorage } from '../orca/arbitrage';
import { getBooksByTag } from '../orca/sharp-books';
import { logger } from '../utils';

// Explicit index.ts import (not needed)
import { logger } from '../utils/index'; // ❌ Redundant
```

**Rules**:
- Omit `index.ts` from import paths
- Let module resolution handle `index.ts` automatically
- Use explicit `index.ts` only when necessary for disambiguation

### 4.4. [IMPORTS.EXTERNAL.PATHS.RG] External Package Imports

**Pattern**: `[package-name]` or `[package-name]/[subpath]`

**Examples**:
```typescript
// Standard package imports
import { Hono } from 'hono';
import { Database } from 'bun:sqlite';
import { cors } from 'hono/cors';

// Bun built-in modules
import { $ } from 'bun';
import { join } from 'path';
import { EventEmitter } from 'events';
```

**Rules**:
- Use package names directly (no path aliases)
- Use Bun built-in modules (`bun:*`) directly
- Use Node.js built-ins (`path`, `fs`, `events`) directly
- Group external imports before internal imports

---

## 5. [PATTERNS.EXPORT.PATHS.RG] Export Path Patterns

### 5.1. [EXPORTS.NAMED.PATHS.RG] Named Exports

**Pattern**: `export { [name] } from './[file]'` or `export const [name] = ...`

**Examples**:
```typescript
// Direct export
export class OrcaArbitrageStorage { ... }
export function createOrcaNormalizer() { ... }
export const DEFAULT_RATE_LIMIT = 100;

// Re-export from index.ts
export { OrcaArbitrageStorage } from './storage';
export type { OrcaArbitrageOpportunity } from './types';
```

**Rules**:
- Prefer named exports over default exports
- Use `export type` for TypeScript types
- Group related exports in `index.ts` files
- Keep exports minimal (only public API)

### 5.2. [EXPORTS.DEFAULT.PATHS.RG] Default Exports

**Pattern**: `export default [name]`

**Usage**: Only for single-purpose modules (e.g., main class, primary function)

**Examples**:
```typescript
// Single-purpose module
export default class OrcaArbitrageStorage { ... }

// Not recommended for multi-export modules
export default { storage, types, utils }; // ❌ Use named exports
```

**Rules**:
- Use default exports sparingly
- Prefer named exports for flexibility
- Use default exports for single-class modules
- Avoid default exports in `index.ts` files

---

## 6. [PATTERNS.API.PATHS.RG] API Endpoint Path Patterns

### 6.1. [API.REST.PATHS.RG] REST API Endpoint Paths

**Pattern**: `/api/[domain]/[resource]/[action]` or `/api/[domain]/[resource]/:id`

**Examples**:
```
GET    /api/orca/arbitrage/opportunities
POST   /api/orca/arbitrage/store
GET    /api/orca/arbitrage/opportunity/:id
DELETE /api/orca/arbitrage/opportunity/:id

GET    /api/health
GET    /api/stats
GET    /api/cache/stats
```

**Rules**:
- Use `kebab-case` for all path segments
- Use plural nouns for collections (`/opportunities`)
- Use singular nouns for resources (`/opportunity/:id`)
- Use HTTP verbs implicitly (GET, POST, PUT, DELETE)
- Group by domain (`/api/orca/`, `/api/arbitrage/`)

### 6.2. [API.QUERY.PARAMS.RG] Query Parameter Patterns

**Pattern**: `?[param]=[value]&[param]=[value]`

**Examples**:
```
GET /api/orca/arbitrage/opportunities?status=detected&minEdge=1.5
GET /api/orca/arbitrage/opportunities?book_pair=pinnacle-ps3838&limit=50
GET /api/changelog?limit=50&format=json
```

**Rules**:
- Use `snake_case` for query parameters (API convention)
- Use descriptive parameter names
- Document parameter types and constraints
- Use consistent naming across endpoints

### 6.3. [API.ROUTE.HANDLERS.RG] Route Handler File Paths

**Pattern**: `src/api/routers/[domain]-[handler].ts` or `src/api/routes.ts`

**Examples**:
- `src/api/routes.ts` - Main route definitions
- `src/api/routers/urlpattern-router.ts` - URL pattern router
- `src/api/routers/security-validation.ts` - Security validation router

**Rules**:
- Use `kebab-case` for router file names
- Use `-router.ts` suffix for route handlers
- Group related routes in domain-specific routers
- Keep main `routes.ts` for top-level route registration

---

## 7. [PATTERNS.DATABASE.PATHS.RG] Database Path Patterns

### 7.1. [DB.FILE.PATHS.RG] Database File Paths

**Pattern**: `data/[database-name].db` or `[database-name].db` (root)

**Examples**:
- `data/orca-arbitrage.db` - ORCA arbitrage database
- `data/registry.db` - Registry database
- `*.db-wal` - SQLite WAL files (gitignored)
- `*.db-shm` - SQLite shared memory files (gitignored)

**Rules**:
- Use `kebab-case` for database file names
- Store databases in `data/` directory
- Use descriptive names matching domain
- Gitignore WAL and SHM files

### 7.2. [DB.TABLE.NAMES.RG] Table Name Patterns

**Pattern**: `[domain]_[resource]_[type]` (snake_case plural)

**Examples**:
- `arbitrage_opportunities` - Arbitrage opportunities table
- `book_pair_stats` - Book pair statistics table
- `scan_statistics` - Scan statistics table
- `orca_events` - ORCA events table

**Rules**:
- Use `snake_case` for table names
- Use plural nouns for table names
- Prefix with domain when needed (`orca_`, `arbitrage_`)
- Use descriptive, searchable names

### 7.3. [DB.COLUMN.NAMES.RG] Column Name Patterns

**Pattern**: `[attribute]_[suffix]` (snake_case)

**Examples**:
- `opportunity_id` - Primary key
- `event_id` - Foreign key
- `detected_at` - Timestamp
- `updated_at` - Timestamp
- `book_pair` - Attribute
- `edge_percentage` - Calculated attribute

**Rules**:
- Use `snake_case` for column names
- Use `_id` suffix for primary/foreign keys
- Use `_at` suffix for timestamps
- Use descriptive attribute names

---

## 8. [PATTERNS.MODULE.RESOLUTION.RG] Module Resolution Patterns

### 8.1. [MODULES.BUN.RESOLUTION.RG] Bun Module Resolution

**Bun Resolution Order**:
1. Relative paths (`./`, `../`)
2. Absolute paths (`/`)
3. Node modules (`node_modules/`)
4. Bun built-ins (`bun:*`)
5. TypeScript path mappings (`@/*`)

**Examples**:
```typescript
// Bun.resolveSync() usage
const path = Bun.resolveSync('./plugins/parser', import.meta.dir);
const zodPath = Bun.resolveSync('zod', process.cwd());
```

**Rules**:
- Use `Bun.resolveSync()` for dynamic resolution
- Use `import.meta.dir` for current directory context
- Use `process.cwd()` for project root context
- Handle resolution errors gracefully

### 8.2. [MODULES.TYPESCRIPT.PATHS.RG] TypeScript Path Mappings

**Pattern**: `@[alias]/*` → `./src/[domain]/*`

**Configuration** (`config/tsconfig.json`):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@orca/*": ["./src/orca/*"],
      "@api/*": ["./src/api/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

**Usage**:
```typescript
import { logger } from '@utils/logger';
import { OrcaArbitrageStorage } from '@orca/arbitrage';
import type { ArbitrageStatus } from '@types/arbitrage';
```

**Rules**:
- Use `@` prefix for path aliases
- Match alias to domain (`@orca/*`, `@api/*`)
- Keep aliases consistent across codebase
- Document aliases in `tsconfig.json` comments

---

## 9. [PATTERNS.DOCUMENTATION.PATHS.RG] Documentation Path Patterns

### 9.1. [DOCS.HEADER.PATTERNS.RG] Documentation Header Patterns

**Pattern**: `[DOMAIN.CATEGORY.KEYWORD.RG]`

**Examples**:
- `[PATTERNS.NAMING.PATHS.RG]` - This document
- `[ORCA.ARBITRAGE.STORAGE.RG]` - ORCA arbitrage storage
- `[API.ROUTES.HANDLERS.RG]` - API route handlers
- `[SECURITY.BUN.SCANNER.RG]` - Bun security scanner

**Rules**:
- Use uppercase for domain and category
- Use descriptive keywords
- Always end with `.RG` for ripgrep searchability
- Keep headers consistent within documents

### 9.2. [DOCS.SECTION.NUMBERING.RG] Section Numbering Patterns

**Pattern**: `[number].[number].[number]...` (hierarchical)

**Examples**:
- `## 1. Overview`
- `### 1.1. Subsection`
- `#### 1.1.1. Sub-subsection`
- `##### 1.1.1.1. Sub-sub-subsection`

**Rules**:
- Use hierarchical numbering
- Don't skip levels
- Keep consistent across documents
- Use at least 2 levels for major sections

### 9.3. [DOCS.CROSS.REFERENCES.RG] Cross-Reference Patterns

**Pattern**: `[Link Text](./relative/path/to/file.md)` or `[Link Text](../category/file.md)`

**Examples**:
```markdown
**Related Documentation**:
- [Naming Conventions](../guides/NAMING-CONVENTIONS.md)
- [Structure Beneath Chaos](./STRUCTURE-BENEATH-CHAOS.md)
- [Root Directory Organization](../root-docs/ROOT-DIRECTORY-ORGANIZATION.md)
```

**Rules**:
- Use relative paths for internal documentation
- Use descriptive link text
- Group related links in "Related Documentation" sections
- Verify links are valid (use `test -f` or `ripgrep`)

---

## 10. [PATTERNS.DOMAIN.SPECIFIC.RG] Domain-Specific Naming Patterns

### 10.1. [DOMAIN.ORCA.PATTERNS.RG] ORCA Domain Patterns

**File Paths**:
- `src/orca/arbitrage/storage.ts` → `OrcaArbitrageStorage`
- `src/orca/normalizer.ts` → `createOrcaNormalizer()`
- `src/orca/sharp-books/registry.ts` → `sharpBookRegistry`

**API Endpoints**:
- `GET /api/orca/arbitrage/opportunities`
- `POST /api/orca/normalize`
- `GET /api/orca/sharp-books`

**Database Tables**:
- `orca_arbitrage_opportunities`
- `orca_events`
- `orca_sharp_books`

**Rules**:
- Prefix with `orca` for ORCA domain
- Use `Orca` prefix for classes (`OrcaArbitrageStorage`)
- Use `createOrca` prefix for factory functions
- Use `orca_` prefix for database tables

### 10.2. [DOMAIN.ARBITRAGE.PATTERNS.RG] Arbitrage Domain Patterns

**File Paths**:
- `src/arbitrage/scanner.ts` → `ArbitrageScanner`
- `src/arbitrage/executor.ts` → `ArbitrageExecutor`
- `src/arbitrage/matcher.ts` → `CryptoMatcher`

**API Endpoints**:
- `GET /api/arbitrage/opportunities`
- `POST /api/arbitrage/execute`
- `GET /api/arbitrage/scanner/status`

**Rules**:
- Use `Arbitrage` prefix for classes
- Use `arbitrage` for API paths
- Use `arbitrage_` prefix for database tables

### 10.3. [DOMAIN.API.PATTERNS.RG] API Domain Patterns

**File Paths**:
- `src/api/routes.ts` - Main route definitions
- `src/api/routers/[domain]-router.ts` - Domain routers
- `src/api/docs.ts` - OpenAPI specification

**API Endpoints**:
- `GET /api/health` - Health check
- `GET /api/stats` - Statistics
- `GET /api/docs` - OpenAPI docs

**Rules**:
- Use `api` prefix for API domain
- Use `-router.ts` suffix for route handlers
- Use `/api/` prefix for all API endpoints
- Keep routes organized by domain

---

## 11. [PATTERNS.VERIFICATION.RG] Pattern Verification

### 11.1. [VERIFY.RIPGREP.PATTERNS.RG] Ripgrep Verification Patterns

**Find all files matching pattern**:
```bash
# Find all TypeScript files
rg "\.ts$" --type ts

# Find all test files
rg "\.test\.ts$|\.spec\.ts$"

# Find all index files
rg "^index\.ts$" --files

# Find files with naming violations
rg "PascalCase\.ts$" --files  # Should be kebab-case.ts
```

**Find imports**:
```bash
# Find all imports from a domain
rg "^import.*from ['\"]@orca/" src/

# Find relative imports
rg "^import.*from ['\"]\.\./" src/

# Find external imports
rg "^import.*from ['\"][^@\.]" src/
```

**Find documentation headers**:
```bash
# Find all documentation headers
rg "^##+\s+.*\[.*\.RG\]" docs/

# Find headers by domain
rg "^##+\s+.*\[ORCA\." docs/

# Count headers in a file
rg "^##+\s+.*\[.*\.RG\]" docs/patterns/NAMING-AND-PATH-PATTERNS.md | wc -l
```

### 11.2. [VERIFY.PATH.CONSISTENCY.RG] Path Consistency Verification

**Check file naming consistency**:
```bash
# Find files not using kebab-case
find src/ -name "*.ts" | grep -E "[A-Z]|_" | head -20

# Find directories not using kebab-case
find src/ -type d | grep -E "[A-Z]|_" | head -20
```

**Check import path consistency**:
```bash
# Find imports using incorrect paths
rg "from ['\"]\.\.\/\.\.\/\.\.\/" src/  # Too deep

# Find imports that should use aliases
rg "from ['\"]\.\.\/\.\.\/utils\/" src/  # Should use @utils/*
```

### 11.3. [VERIFY.API.PATHS.RG] API Path Verification

**Check API endpoint consistency**:
```bash
# Find all API route definitions
rg "\.(get|post|put|delete)\(" src/api/

# Find API paths not using kebab-case
rg "['\"]\/api\/[^'\"]*[A-Z_]" src/api/

# Find API paths not starting with /api/
rg "\.(get|post|put|delete)\(['\"][^\/]" src/api/
```

---

## 12. [PATTERNS.EXAMPLES.RG] Complete Examples

### 12.1. [EXAMPLES.FILE.STRUCTURE.RG] Complete File Structure Example

```
src/orca/arbitrage/
├── index.ts                    # Re-exports public API
├── storage.ts                  # OrcaArbitrageStorage class
├── storage.test.ts             # Unit tests (co-located)
├── types.ts                    # TypeScript types
└── constants.ts                # Domain constants

# index.ts contents:
export { OrcaArbitrageStorage } from './storage';
export type { OrcaArbitrageOpportunity } from './types';
export { DEFAULT_RATE_LIMIT } from './constants';
```

### 12.2. [EXAMPLES.IMPORT.PATTERNS.RG] Complete Import Pattern Example

```typescript
// External imports (grouped first)
import { Hono } from 'hono';
import { Database } from 'bun:sqlite';
import { $ } from 'bun';
import { join } from 'path';

// Absolute imports (cross-domain, using aliases)
import { logger } from '@utils/logger';
import { OrcaArbitrageStorage } from '@orca/arbitrage';
import type { ArbitrageStatus } from '@types/arbitrage';

// Relative imports (same-domain)
import { createOrcaNormalizer } from '../normalizer';
import { getBooksByTag } from '../sharp-books';
import type { OrcaRawInput } from './types';
```

### 12.3. [EXAMPLES.API.ROUTES.RG] Complete API Route Example

```typescript
// src/api/routes.ts
import { Hono } from 'hono';
import { OrcaArbitrageStorage } from '@orca/arbitrage';
import { ArbitrageScanner } from '@arbitrage/scanner';

const app = new Hono();

// Domain-organized routes
app.get('/api/orca/arbitrage/opportunities', async (c) => {
  const storage = new OrcaArbitrageStorage();
  const opportunities = await storage.getOpportunities();
  return c.json(opportunities);
});

app.post('/api/orca/arbitrage/store', async (c) => {
  const body = await c.req.json();
  const storage = new OrcaArbitrageStorage();
  await storage.storeOpportunity(body);
  return c.json({ success: true });
});

app.get('/api/arbitrage/scanner/status', async (c) => {
  const scanner = new ArbitrageScanner();
  const status = await scanner.getStatus();
  return c.json(status);
});
```

---

## 13. [PATTERNS.SUMMARY.RG] Quick Reference Summary

### 13.1. [SUMMARY.FILE.NAMING.RG] File Naming Quick Reference

| Type | Pattern | Example |
|------|---------|---------|
| Source files | `kebab-case.ts` | `arbitrage-storage.ts` |
| Test files | `[name].test.ts` | `arbitrage-storage.test.ts` |
| Index files | `index.ts` | `src/orca/index.ts` |
| Constants files | `constants.ts` | `src/orca/constants.ts` |

### 13.2. [SUMMARY.DIRECTORY.NAMING.RG] Directory Naming Quick Reference

| Type | Pattern | Example |
|------|---------|---------|
| Source directories | `kebab-case/` | `src/orca/arbitrage/` |
| Documentation | `docs/[category]/` | `docs/api/`, `docs/patterns/` |
| Configuration | `config/[name].[ext]` | `config/bunfig.toml` |
| Scripts | `scripts/[name].ts` | `scripts/dashboard-server.ts` |

### 13.3. [SUMMARY.IMPORT.PATTERNS.RG] Import Patterns Quick Reference

| Type | Pattern | Example |
|------|---------|---------|
| Relative (same domain) | `./[file]` or `../[dir]/[file]` | `import { Storage } from './storage'` |
| Absolute (cross-domain) | `@[domain]/[path]` | `import { logger } from '@utils/logger'` |
| External packages | `[package]` | `import { Hono } from 'hono'` |
| Index files | `[domain]/[component]` | `import { Storage } from '../orca'` |

### 13.4. [SUMMARY.API.PATTERNS.RG] API Patterns Quick Reference

| Type | Pattern | Example |
|------|---------|---------|
| REST endpoints | `/api/[domain]/[resource]` | `/api/orca/arbitrage/opportunities` |
| Query parameters | `?[param]=[value]` | `?status=detected&limit=50` |
| Route handlers | `[domain]-router.ts` | `urlpattern-router.ts` |

---

## 14. [PATTERNS.STATUS.RG] Status

**Status**: ✅ Enhanced naming and path patterns established

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0

**Related Patterns**:
- [Naming Conventions](../guides/NAMING-CONVENTIONS.md) - Base naming standards
- [Structure Beneath Chaos](./STRUCTURE-BENEATH-CHAOS.md) - Architectural philosophy
- [Root Directory Organization](../root-docs/ROOT-DIRECTORY-ORGANIZATION.md) - Directory structure
