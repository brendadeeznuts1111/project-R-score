# [NAMING.CONVENTIONS.RG] Naming Conventions

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-NAMING-CONVENTIONS@0.1.0;instance-id=NAMING-001;version=0.1.0}][PROPERTIES:{conventions={value:"naming-conventions";@root:"ROOT-DOC";@chain:["BP-CODE-STYLE","BP-CONVENTIONS"];@version:"0.1.0"}}][CLASS:NamingConventions][#REF:v-0.1.0.BP.NAMING.CONVENTIONS.1.0.A.1.1.DOC.1.1]]`

## 1. Overview

Naming conventions for code, files, branches, commits, and documentation across the NEXUS codebase.

**Code Reference**: `#REF:v-0.1.0.BP.NAMING.CONVENTIONS.1.0.A.1.1.DOC.1.1`

---

## 2. [NAMING.CODE.RG] Code Naming

### 2.1. [CODE.CLASSES.RG] Classes
**Format**: `PascalCase`

**Examples**:
- `OrcaArbitrageStorage`
- `PipelineOrchestrator`
- `RBACManager`
- `PropertyRegistry`
- `DataRouter`

**Rules**:
- Use descriptive names
- Avoid abbreviations unless widely understood
- Use noun phrases

### 2.2. [CODE.FUNCTIONS.RG] Functions & Methods
**Format**: `camelCase`

**Examples**:
- `getOpportunity()`
- `storeOpportunity()`
- `canAccess()`
- `filterData()`
- `transformData()`

**Rules**:
- Use verb phrases for actions
- Use `get*` for retrieval
- Use `set*` for assignment
- Use `is*`, `has*`, `can*` for boolean returns
- Use `create*`, `build*`, `make*` for construction

### 2.3. [CODE.VARIABLES.RG] Variables
**Format**: `camelCase`

**Examples**:
- `opportunityId`
- `userRole`
- `cacheKey`
- `rateLimit`

**Rules**:
- Use descriptive names
- Avoid single-letter names except in loops (`i`, `j`, `k`)
- Use plural for arrays (`opportunities`, `users`)

### 2.4. [CODE.CONSTANTS.RG] Constants
**Format**: `UPPER_SNAKE_CASE`

**Examples**:
- `DEFAULT_RATE_LIMIT`
- `DATABASE_PATHS`
- `CACHE_LIMITS`
- `PROPERTY_CATEGORY_KEYWORDS`

**Rules**:
- Use uppercase with underscores
- Group related constants in objects
- Export from `constants.ts` files

### 2.5. [CODE.TYPES.RG] Types & Interfaces
**Format**: `PascalCase`

**Examples**:
- `ArbitrageStatus`
- `OrcaArbitrageOpportunity`
- `PipelineUser`
- `DataScope`

**Rules**:
- Use descriptive names
- Use `I` prefix only for interfaces if needed (not preferred)
- Use `T` prefix for generic types (`T`, `K`, `V`)

### 2.6. [CODE.ENUMS.RG] Enums
**Format**: `PascalCase` for enum name, `UPPER_SNAKE_CASE` for values

**Examples**:
```typescript
enum ArbitrageStatus {
  DETECTED = "detected",
  LIVE = "live",
  EXECUTED = "executed",
  EXPIRED = "expired",
}
```

**Rules**:
- Use descriptive enum names
- Use descriptive value names
- Prefer string enums over numeric

---

## 3. [NAMING.FILES.RG] File Naming

### 3.1. [FILES.TYPESCRIPT.RG] TypeScript Files
**Format**: `kebab-case.ts`

**Examples**:
- `arbitrage-storage.ts`
- `pipeline-orchestrator.ts`
- `rbac-manager.ts`
- `type-matrix.ts`

**Rules**:
- Use kebab-case (lowercase with hyphens)
- Match file name to primary export
- Use descriptive names

### 3.2. [FILES.TESTS.RG] Test Files
**Format**: `*.test.ts` or `*.spec.ts`

**Examples**:
- `arbitrage-storage.test.ts`
- `rbac-manager.test.ts`
- `type-matrix-cli.spec.ts`

**Rules**:
- Co-locate with source: `src/**/*.test.ts`
- Dedicated directory: `test/**/*.test.ts`
- Match test file name to source file name

### 3.3. [FILES.INDEX.RG] Index Files
**Format**: `index.ts`

**Examples**:
- `src/orca/arbitrage/index.ts`
- `src/pipeline/index.ts`
- `src/rbac/index.ts`

**Rules**:
- Use `index.ts` for module exports
- Re-export public API
- Keep exports organized

### 3.4. [FILES.CONSTANTS.RG] Constants Files
**Format**: `constants.ts`

**Examples**:
- `src/pipeline/constants.ts`
- `src/rbac/constants.ts`

**Rules**:
- Use `constants.ts` for module constants
- Group related constants
- Export as `const` objects

---

## 4. [NAMING.DIRECTORIES.RG] Directory Naming

### 4.1. [DIRS.SOURCE.RG] Source Directories
**Format**: `kebab-case` or `camelCase`

**Examples**:
- `src/orca/arbitrage/`
- `src/pipeline/stages/`
- `src/rbac/`
- `src/api/`

**Rules**:
- Use lowercase
- Use kebab-case for multi-word directories
- Match directory structure to domain

### 4.2. [DIRS.TESTS.RG] Test Directories
**Format**: `test/` or `__tests__/`

**Examples**:
- `test/` - Integration tests
- `src/**/__tests__/` - Co-located tests (not preferred)

**Rules**:
- Use `test/` for integration tests
- Co-locate unit tests with source

---

## 5. [NAMING.BRANCHES.RG] Branch Naming

### 5.1. [BRANCHES.FEATURE.RG] Feature Branches
**Format**: `feature/[domain]-[description]`

**Examples**:
- `feature/orca-arbitrage-storage`
- `feature/pipeline-rbac-integration`
- `feature/api-telegram-bot`

**Rules**:
- Use lowercase
- Use hyphens to separate words
- Keep focused (one feature per branch)

### 5.2. [BRANCHES.FIX.RG] Bug Fix Branches
**Format**: `fix/[component]-[description]`

**Examples**:
- `fix/pipeline-rate-limit`
- `fix/orca-uuid-generation`
- `fix/api-validation-error`

### 5.3. [BRANCHES.DOCS.RG] Documentation Branches
**Format**: `docs/[topic]-[description]`

**Examples**:
- `docs/api-endpoints-guide`
- `docs/orca-integration-examples`
- `docs/contributing-update`

### 5.4. [BRANCHES.REFACTOR.RG] Refactoring Branches
**Format**: `refactor/[component]-[description]`

**Examples**:
- `refactor/pipeline-types`
- `refactor/orca-storage-optimization`
- `refactor/api-error-handling`

### 5.5. [BRANCHES.CHORE.RG] Chore Branches
**Format**: `chore/[task]-[description]`

**Examples**:
- `chore/dependencies-update`
- `chore/ci-config-update`
- `chore/linting-fixes`

---

## 6. [NAMING.COMMITS.RG] Commit Message Naming

### 6.1. [COMMITS.FORMAT.RG] Format
```
<type>[optional scope]: <subject>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes
- `build` - Build system changes

**Scopes** (optional):
- **Domain-level** (preferred): `orca`, `pipeline`, `rbac`, `api`, `arbitrage`, `storage`, `cache`, `cli`, `types`, `docs`, `security`, `analytics`, `funnel`, `properties`
- **Component-level** (when specific): `orca-arbitrage`, `orca-sharp-books`, `pipeline-ingestion`, `pipeline-serving`, `rbac-manager`, `api-routes`, `cache-redis`, `cli-dashboard`
- **Technical** (for Bun/deps): `bun`, `bun-sqlite`, `bun-redis`, `deps`, `config`

**Rules**:
- Prefer domain-level scopes (`orca` > `orca-arbitrage-storage`)
- Don't use class names (`OrcaArbitrageStorage`), function names (`Bun.serve`), or versions (`bun-1.3.3`) as scopes
- Keep scopes short and descriptive

**Examples**:
- `feat(orca): Add arbitrage opportunity storage` (domain-level)
- `fix(orca-arbitrage): Resolve SQLite WAL mode issue` (component-level)
- `perf(bun-sqlite): Use db.transaction() for batch inserts` (technical)
- `chore(deps): Update Hono to v4.6.0` (technical)
- `fix(pipeline): Resolve rate limit null assertion`
- `docs: Add metadata-documentation mapping guide`

### 6.2. [COMMITS.RULES.RG] Commit Rules
- **Subject**: 50 characters or less, imperative mood
- **Body**: Wrap at 72 characters, explain what and why
- **Footer**: Reference issues (`Closes #123`, `Fixes #456`)
- **One logical change per commit**

---

## 7. [NAMING.DOCUMENTATION.RG] Documentation Naming

### 7.1. [DOCS.FILES.RG] Documentation Files
**Format**: `UPPER-KEBAB-CASE.md` or `PascalCase.md`

**Examples**:
- `CONTRIBUTING.md`
- `FEATURES.md`
- `NAMING-CONVENTIONS.md`
- `ORCA-ARBITRAGE-INTEGRATION.md`

**Rules**:
- Use uppercase for important docs
- Use kebab-case for multi-word names
- Use descriptive names

### 7.2. [DOCS.HEADERS.RG] Documentation Headers
**Format**: `[DOMAIN.CATEGORY.KEYWORD.RG]`

**Examples**:
- `[ORCA.ARBITRAGE.STORAGE.RG]`
- `[PIPELINE.ORCHESTRATOR.RG]`
- `[RBAC.MANAGER.RG]`

**Rules**:
- Use uppercase for domain and category
- Use descriptive keywords
- Always end with `.RG` for ripgrep

### 7.3. [DOCS.SECTIONS.RG] Section Numbering
**Format**: `1.x.x.x.x`

**Examples**:
- `## 1. Overview`
- `### 1.1. Subsection`
- `#### 1.1.1. Sub-subsection`

**Rules**:
- Use hierarchical numbering
- Don't skip levels
- Keep consistent across documents

---

## 8. [NAMING.API.RG] API Naming

### 8.1. [API.ENDPOINTS.RG] API Endpoints
**Format**: `kebab-case` paths

**Examples**:
- `GET /orca/arbitrage/opportunities`
- `POST /orca/arbitrage/store`
- `GET /api/health`

**Rules**:
- Use lowercase
- Use hyphens for multi-word paths
- Use plural for collections (`/opportunities`)
- Use singular for resources (`/opportunity/:id`)

### 8.2. [API.PARAMETERS.RG] Query Parameters
**Format**: `camelCase` or `snake_case`

**Examples**:
- `?status=detected&minEdge=1.5`
- `?book_pair=pinnacle-ps3838`

**Rules**:
- Use consistent casing (prefer `snake_case` for API)
- Use descriptive names
- Document parameter types

### 8.3. [API.REQUEST_BODY.RG] Request Body Properties
**Format**: `camelCase`

**Examples**:
```json
{
  "opportunityId": "123",
  "eventId": "456",
  "bookA": {...},
  "bookB": {...}
}
```

**Rules**:
- Use camelCase for JSON properties
- Match TypeScript interface names
- Use descriptive names

---

## 9. [NAMING.DATABASE.RG] Database Naming

### 9.1. [DB.TABLES.RG] Table Names
**Format**: `snake_case` plural

**Examples**:
- `arbitrage_opportunities`
- `book_pair_stats`
- `scan_statistics`

**Rules**:
- Use lowercase
- Use underscores for multi-word names
- Use plural for table names

### 9.2. [DB.COLUMNS.RG] Column Names
**Format**: `snake_case`

**Examples**:
- `opportunity_id`
- `event_id`
- `detected_at`
- `updated_at`

**Rules**:
- Use lowercase
- Use underscores for multi-word names
- Use `_id` suffix for foreign keys
- Use `_at` suffix for timestamps

### 9.3. [DB.INDEXES.RG] Index Names
**Format**: `idx_[table]_[columns]`

**Examples**:
- `idx_arbitrage_opportunities_status`
- `idx_book_pair_stats_book_pair`

**Rules**:
- Use `idx_` prefix
- Include table name
- Include column names

---

## 10. [NAMING.METADATA.RG] Metadata Naming

### 10.1. [METADATA.BLUEPRINTS.RG] Blueprint Names
**Format**: `BP-[DOMAIN]-[COMPONENT]@[version]`

**Examples**:
- `BP-ORCA-ARBITRAGE@0.1.0`
- `BP-PIPELINE-RBAC@0.1.0`
- `BP-SHARP-BOOKS@0.1.0`

**Rules**:
- Use `BP-` prefix
- Use uppercase with hyphens
- Include version

### 10.2. [METADATA.INSTANCE_IDS.RG] Instance IDs
**Format**: `[DOMAIN]-[COMPONENT]-[NUMBER]`

**Examples**:
- `ORCA-ARB-STORAGE-001`
- `NEXUS-PIPELINE-001`
- `ORCA-SHARP-001`

**Rules**:
- Use uppercase with hyphens
- Include domain and component
- Use 3-digit number suffix

### 10.3. [METADATA.REFERENCES.RG] Reference IDs
**Format**: `#REF:[version].BP.[DOMAIN].[COMPONENT].[...]`

**Examples**:
- `#REF:v-0.1.0.BP.ORCA.ARBITRAGE.1.0.A.1.1.ORCA.1.1`
- `#REF:routes.ts:2455`
- `#REF:src/orca/arbitrage/storage.ts`

**Rules**:
- Use `#REF:` prefix
- Include version or file path
- Use consistent format

---

## 11. Status

**Status**: ✅ Naming conventions established

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0

**Related Documentation**:
- [Naming and Path Patterns](../patterns/NAMING-AND-PATH-PATTERNS.md) - Comprehensive path patterns, import/export conventions, and module resolution
- [Naming Patterns Quick Reference](../NAMING-PATTERNS-QUICK-REFERENCE.md) - Quick reference guide
