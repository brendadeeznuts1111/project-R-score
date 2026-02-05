# [COMMIT.SCOPES.GUIDE.RG] Commit Scope Guide

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-COMMIT-SCOPES@0.1.0;instance-id=COMMIT-SCOPES-001;version=0.1.0}][PROPERTIES:{guide={value:"commit-scopes";@root:"ROOT-DOC";@chain:["BP-GIT","BP-COMMITS"];@version:"0.1.0"}}][CLASS:CommitScopesGuide][#REF:v-0.1.0.BP.COMMIT.SCOPES.1.0.A.1.1.DOC.1.1]]`

## 1. Overview

Guide for choosing appropriate commit scopes, including when to use domain-level, component-level, or technical scopes.

**Code Reference**: `#REF:v-0.1.0.BP.COMMIT.SCOPES.1.0.A.1.1.DOC.1.1`

---

## 2. [SCOPES.ACCEPTABLE.RG] Acceptable Scopes

### 2.1. [SCOPES.DOMAIN_LEVEL.RG] Domain-Level Scopes (Preferred)

Use domain-level scopes for most commits. These represent high-level areas of the codebase.

**Acceptable Domain Scopes**:
- `orca` - ORCA sports betting system
- `pipeline` - Enterprise data pipeline
- `rbac` - Role-based access control
- `api` - API endpoints
- `arbitrage` - Arbitrage detection
- `storage` - Storage systems
- `cache` - Caching layer
- `cli` - CLI tools
- `types` - TypeScript types
- `docs` - Documentation
- `security` - Security features
- `analytics` - Analytics and profiling
- `funnel` - Data funneling system
- `properties` - Properties registry

**Examples**:
```bash
feat(orca): Add arbitrage opportunity storage
fix(pipeline): Resolve rate limit null assertion
perf(cache): Optimize Redis lookup performance
docs: Add metadata-documentation mapping guide
```

### 2.2. [SCOPES.COMPONENT_LEVEL.RG] Component-Level Scopes (When Needed)

Use component-level scopes when the change is specific to one component within a domain.

**Acceptable Component Scopes**:
- `orca-arbitrage` - ORCA arbitrage storage
- `orca-sharp-books` - Sharp books registry
- `pipeline-ingestion` - Pipeline ingestion stage
- `pipeline-transformation` - Pipeline transformation stage
- `pipeline-enrichment` - Pipeline enrichment stage
- `pipeline-serving` - Pipeline serving stage
- `rbac-manager` - RBAC manager
- `api-routes` - API routes
- `cache-redis` - Redis cache
- `cli-dashboard` - CLI dashboard
- `cli-fetch` - CLI fetch tool
- `cli-security` - CLI security tool

**Examples**:
```bash
fix(orca-arbitrage): Resolve SQLite WAL mode issue
refactor(pipeline-serving): Optimize RBAC filtering
feat(cli-dashboard): Add real-time refresh option
```

### 2.3. [SCOPES.TECHNICAL.RG] Technical Scopes (For Technical Changes)

Use technical scopes for Bun runtime-specific changes, dependency updates, or configuration changes.

**Acceptable Technical Scopes**:
- `bun` - Bun runtime/API changes
- `bun-sqlite` - Bun SQLite changes
- `bun-redis` - Bun Redis changes
- `deps` - Dependency updates
- `config` - Configuration changes
- `ci` - CI/CD changes
- `build` - Build system changes

**Examples**:
```bash
chore(bun): Migrate to Bun.serve() from Node.js http
chore(deps): Update Hono to v4.6.0
perf(bun-sqlite): Use db.transaction() for batch inserts
fix(config): Update nexus.toml performance targets
```

---

## 3. [SCOPES.UNACCEPTABLE.RG] Unacceptable Scopes

### 3.1. [SCOPES.NO_CLASS_NAMES.RG] Don't Use Class Names

**❌ Don't Use**:
```bash
feat(OrcaArbitrageStorage): Add new method
fix(RBACManager): Resolve null assertion
refactor(PropertyRegistry): Optimize queries
```

**✅ Use Domain/Component Instead**:
```bash
feat(orca): Add arbitrage opportunity storage
fix(rbac): Resolve null assertion in manager
refactor(properties): Optimize registry queries
```

### 3.2. [SCOPES.NO_FUNCTION_NAMES.RG] Don't Use Function Names

**❌ Don't Use**:
```bash
fix(Bun.serve): Fix WebSocket handling
feat(Bun.file): Add file reading utility
perf(Bun.nanoseconds): Optimize timing
```

**✅ Use Technical/Domain Instead**:
```bash
fix(api): Fix WebSocket handling in Bun.serve()
feat(utils): Add file reading utility using Bun.file()
perf(bun): Optimize timing with Bun.nanoseconds()
```

### 3.3. [SCOPES.NO_VERSIONS.RG] Don't Use Versions

**❌ Don't Use**:
```bash
chore(bun-1.3.3): Update Bun version
feat(v0.1.0): Add new feature
fix(typescript-5.0): Fix type errors
```

**✅ Use Technical/Domain Instead**:
```bash
chore(bun): Update to Bun 1.3.3
feat(orca): Add arbitrage opportunity storage
fix(types): Resolve TypeScript 5.0 type errors
```

### 3.4. [SCOPES.NO_FILE_NAMES.RG] Don't Use File Names

**❌ Don't Use**:
```bash
fix(storage.ts): Fix SQLite connection
feat(routes.ts): Add new endpoint
refactor(types.ts): Update type definitions
```

**✅ Use Domain/Component Instead**:
```bash
fix(orca): Fix SQLite connection in storage
feat(api): Add new endpoint to routes
refactor(types): Update type definitions
```

---

## 4. [SCOPES.DECISION_TREE.RG] Decision Tree

### 4.1. [DECISION.STEP1.RG] Step 1: Is it a Bun/Dependency/Config Change?

**Yes** → Use technical scope (`bun`, `deps`, `config`)

**Examples**:
- Migrating from Node.js to Bun API → `bun`
- Updating package.json → `deps`
- Changing nexus.toml → `config`

### 4.2. [DECISION.STEP2.RG] Step 2: Is it Specific to One Component?

**Yes** → Use component-level scope (`orca-arbitrage`, `pipeline-serving`)

**Examples**:
- Change only affects ORCA arbitrage storage → `orca-arbitrage`
- Change only affects pipeline serving stage → `pipeline-serving`

### 4.3. [DECISION.STEP3.RG] Step 3: Use Domain-Level Scope

**Default** → Use domain-level scope (`orca`, `pipeline`, `api`)

**Examples**:
- Change affects multiple ORCA components → `orca`
- Change affects entire pipeline → `pipeline`
- Change affects API endpoints → `api`

---

## 5. [SCOPES.EXAMPLES.RG] Real-World Examples

### 5.1. [EXAMPLES.FEATURE.RG] Feature Commits

```bash
# Domain-level (preferred)
feat(orca): Add arbitrage opportunity storage
feat(pipeline): Add RBAC integration to serving stage
feat(api): Add ORCA arbitrage endpoints

# Component-level (when specific)
feat(orca-arbitrage): Add batch storage operations
feat(pipeline-serving): Add RBAC filtering
feat(cli-dashboard): Add real-time refresh

# Technical (for Bun/deps)
feat(bun): Migrate to Bun.serve() for HTTP server
feat(deps): Add Hono v4.6.0 for API framework
```

### 5.2. [EXAMPLES.FIX.RG] Bug Fix Commits

```bash
# Domain-level (preferred)
fix(orca): Resolve SQLite WAL mode issue
fix(pipeline): Fix rate limit null assertion
fix(api): Fix WebSocket connection handling

# Component-level (when specific)
fix(orca-arbitrage): Fix opportunity status update
fix(pipeline-ingestion): Fix rate limit counter
fix(cli-dashboard): Fix refresh interval

# Technical (for Bun/deps)
fix(bun-sqlite): Fix transaction rollback
fix(config): Fix nexus.toml syntax error
```

### 5.3. [EXAMPLES.REFACTOR.RG] Refactoring Commits

```bash
# Domain-level (preferred)
refactor(orca): Optimize storage queries
refactor(pipeline): Improve error handling
refactor(api): Restructure route handlers

# Component-level (when specific)
refactor(orca-arbitrage): Use db.transaction() for batch
refactor(pipeline-serving): Optimize RBAC filtering
refactor(cache-redis): Improve connection pooling

# Technical (for Bun/deps)
refactor(bun): Migrate from Node.js APIs to Bun APIs
refactor(deps): Update to latest Hono version
```

### 5.4. [EXAMPLES.PERF.RG] Performance Commits

```bash
# Domain-level (preferred)
perf(orca): Optimize opportunity queries
perf(pipeline): Improve transformation performance
perf(cache): Reduce Redis lookup time

# Component-level (when specific)
perf(orca-arbitrage): Use batch inserts
perf(pipeline-serving): Single-pass filtering
perf(cache-redis): Connection pooling

# Technical (for Bun/deps)
perf(bun-sqlite): Use db.transaction() for batch
perf(bun): Use Bun.nanoseconds() for timing
```

---

## 6. [SCOPES.BEST_PRACTICES.RG] Best Practices

### 6.1. [PRACTICES.PREFER_SIMPLE.RG] Prefer Simple Scopes
- Use `orca` instead of `orca-arbitrage-storage`
- Use `api` instead of `api-routes-endpoints`
- Shorter is better when it's clear

### 6.2. [PRACTICES.BE_CONSISTENT.RG] Be Consistent
- Use same scope for related changes
- Follow existing patterns in codebase
- Check recent commits for scope usage

### 6.3. [PRACTICES.USE_DOMAIN.RG] Default to Domain-Level
- Start with domain-level scope
- Only use component-level if change is very specific
- Only use technical if it's Bun/deps/config related

### 6.4. [PRACTICES.AVOID_SPECIFICITY.RG] Avoid Over-Specificity
- Don't use class names, function names, or file names
- Don't use versions or implementation details
- Keep scopes at appropriate abstraction level

---

## 7. Status

**Status**: ✅ Commit scope guide established

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0
