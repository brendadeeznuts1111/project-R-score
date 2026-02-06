# [CONTRIBUTING.GUIDE.RG] Contributing to NEXUS

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-CONTRIBUTING@0.1.0;instance-id=CONTRIBUTING-001;version=0.1.0}][PROPERTIES:{guide={value:"contributing";@root:"ROOT-DOC";@chain:["BP-GIT","BP-COMMITS","BP-PRS"];@version:"0.1.0"}}][CLASS:ContributingGuide][#REF:v-0.1.0.BP.CONTRIBUTING.1.0.A.1.1.DOC.1.1]]`

## 1. Overview

This guide covers how to contribute to NEXUS, including commit conventions, branching strategy, code style, and PR process.

**Code Reference**: `#REF:v-0.1.0.BP.CONTRIBUTING.1.0.A.1.1.DOC.1.1`  
**Related**: See [`DOCUMENTATION-STYLE.md`](DOCUMENTATION-STYLE.md) for documentation format

---

## 2. [CONTRIBUTING.SETUP.RG] Getting Started

### 2.1. [SETUP.REQUIREMENTS.RG] Requirements
- **Bun**: >= 1.1.0 (check with `bun --version`)
- **Git**: Latest version
- **Node.js**: Not required (Bun is standalone)

### 2.2. [SETUP.INSTALLATION.RG] Installation
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

### 2.3. [SETUP.DEVELOPMENT.RG] Development Setup
```bash
# Start development server (with HMR)
bun run dev

# Run tests
bun test

# Type check
bun run typecheck

# Lint code
bun run lint
```

---

## 3. [CONTRIBUTING.BRANCHING.RG] Branching Strategy

### 3.1. [BRANCHING.MAIN.RG] Main Branch
- `main` - Production-ready code
- Protected branch (requires PR)
- All commits must pass CI checks

### 3.2. [BRANCHING.FEATURE.RG] Feature Branches
**Format**: `feature/[domain]-[description]`

**Examples**:
- `feature/orca-arbitrage-storage`
- `feature/pipeline-rbac-integration`
- `feature/api-telegram-bot`

**Rules**:
- Branch from `main`
- Keep focused (one feature per branch)
- Rebase before PR: `git rebase main`

### 3.3. [BRANCHING.FIX.RG] Bug Fix Branches
**Format**: `fix/[component]-[description]`

**Examples**:
- `fix/pipeline-rate-limit`
- `fix/orca-uuid-generation`
- `fix/api-validation-error`

### 3.4. [BRANCHING.DOCS.RG] Documentation Branches
**Format**: `docs/[topic]-[description]`

**Examples**:
- `docs/api-endpoints-guide`
- `docs/orca-integration-examples`
- `docs/contributing-update`

### 3.5. [BRANCHING.REFACTOR.RG] Refactoring Branches
**Format**: `refactor/[component]-[description]`

**Examples**:
- `refactor/pipeline-types`
- `refactor/orca-storage-optimization`
- `refactor/api-error-handling`

### 3.6. [BRANCHING.CHORE.RG] Chore Branches
**Format**: `chore/[task]-[description]`

**Examples**:
- `chore/dependencies-update`
- `chore/ci-config-update`
- `chore/linting-fixes`

---

## 4. [CONTRIBUTING.COMMITS.RG] Commit Message Convention

### 4.1. [COMMITS.FORMAT.RG] Format
```text
<type>[optional scope]: <subject>

[optional body]

[optional footer]
```

### 4.2. [COMMITS.TYPES.RG] Commit Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring (no functional changes)
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks (dependencies, config, etc.)
- `ci` - CI/CD changes
- `build` - Build system changes

### 4.3. [COMMITS.SCOPES.RG] Scopes (Optional)

#### 4.3.1. [SCOPES.DOMAIN_LEVEL.RG] Domain-Level Scopes (Preferred)
Use domain-level scopes for most commits:
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

#### 4.3.2. [SCOPES.COMPONENT_LEVEL.RG] Component-Level Scopes (When Needed)
Use component-level scopes when change is specific to one component:
- `orca-arbitrage` - ORCA arbitrage storage
- `orca-sharp-books` - Sharp books registry
- `pipeline-ingestion` - Pipeline ingestion stage
- `pipeline-serving` - Pipeline serving stage
- `rbac-manager` - RBAC manager
- `api-routes` - API routes
- `cache-redis` - Redis cache
- `cli-dashboard` - CLI dashboard

#### 4.3.3. [SCOPES.TECHNICAL.RG] Technical Scopes (For Technical Changes)
Use technical scopes for Bun/runtime-specific changes:
- `bun` - Bun runtime/API changes
- `bun-sqlite` - Bun SQLite changes
- `bun-redis` - Bun Redis changes
- `deps` - Dependency updates
- `config` - Configuration changes

#### 4.3.4. [SCOPES.RULES.RG] Scope Rules
- **Prefer domain-level**: Use `orca` instead of `orca-arbitrage-storage`
- **Use component-level**: Only when change affects single component
- **Use technical scopes**: For Bun API migrations or dependency changes
- **Don't use**: Class names (`OrcaArbitrageStorage`), function names (`Bun.serve`), or versions (`bun-1.3.3`) as scopes
- **Keep it simple**: Shorter scopes are better (`orca` > `orca-arbitrage-storage`)

#### 4.3.5. [SCOPES.EXAMPLES.RG] Scope Examples

**Domain-Level (Preferred)**:
```bash
feat(orca): Add arbitrage opportunity storage
fix(pipeline): Resolve rate limit null assertion
perf(cache): Optimize Redis lookup performance
```

**Component-Level (When Specific)**:
```bash
fix(orca-arbitrage): Resolve SQLite WAL mode issue
refactor(pipeline-serving): Optimize RBAC filtering
feat(cli-dashboard): Add real-time refresh option
```

**Technical (For Bun/Deps)**:
```bash
chore(bun): Migrate to Bun.serve() from Node.js http
chore(deps): Update Hono to v4.6.0
perf(bun-sqlite): Use db.transaction() for batch inserts
```

**Don't Use**:
```bash
# ❌ Class names
feat(OrcaArbitrageStorage): Add new method

# ❌ Function names
fix(Bun.serve): Fix WebSocket handling

# ❌ Versions
chore(bun-1.3.3): Update Bun version

# ✅ Use domain/component instead
feat(orca): Add arbitrage opportunity storage
fix(api): Fix WebSocket handling in Bun.serve()
chore(bun): Update to Bun 1.3.3
```

### 4.4. [COMMITS.EXAMPLES.RG] Examples

#### 4.4.1. [COMMITS.FEATURE.RG] Feature Commit
```bash
feat(orca): Add arbitrage opportunity storage

- Implement OrcaArbitrageStorage class
- Add SQLite schema for opportunities
- Add API endpoints for CRUD operations
- Add RBAC checks for all endpoints

Closes #123
```

#### 4.4.2. [COMMITS.FIX.RG] Bug Fix Commit
```bash
fix(pipeline): Resolve rate limit null assertion

Replace non-null assertion with proper null check
in RBACManager.getUserRole() method.

Fixes #456
```

#### 4.4.3. [COMMITS.DOCS.RG] Documentation Commit
```bash
docs: Add metadata-documentation mapping guide

- Map code metadata tags to doc headers
- Add cross-reference examples
- Update ORCA integration docs with metadata

Related: [`METADATA-DOCUMENTATION-MAPPING.md`](../api/METADATA-DOCUMENTATION-MAPPING.md)
```

#### 4.4.4. [COMMITS.REFACTOR.RG] Refactoring Commit
```bash
refactor(pipeline): Optimize RBAC filtering

Replace filter().map() pattern with single-pass
for...of loop for better performance.

Performance: 2x faster on large datasets
```

### 4.5. [COMMITS.RULES.RG] Commit Rules
- **Subject**: 50 characters or less, imperative mood
- **Body**: Wrap at 72 characters, explain what and why
- **Footer**: Reference issues/PRs (`Closes #123`, `Fixes #456`)
- **No merge commits**: Use rebase instead
- **One logical change per commit**

---

## 5. [CONTRIBUTING.CODE_STYLE.RG] Code Style

### 5.1. [STYLE.TYPESCRIPT.RG] TypeScript Conventions

#### 5.1.1. [STYLE.TYPES.RG] Type Definitions
- Use `interface` for object shapes
- Use `type` for unions, intersections, aliases
- Prefer explicit types over `any`
- Use `unknown` instead of `any` when type is unknown

#### 5.1.2. [STYLE.NAMING.RG] Naming Conventions
- **Classes**: `PascalCase` (e.g., `OrcaArbitrageStorage`)
- **Functions**: `camelCase` (e.g., `getOpportunity`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_RATE_LIMIT`)
- **Types/Interfaces**: `PascalCase` (e.g., `ArbitrageStatus`)
- **Files**: `kebab-case.ts` (e.g., `arbitrage-storage.ts`)

#### 5.1.3. [STYLE.IMPORTS.RG] Import Organization
```typescript
// 1. External dependencies
import { Database } from "bun:sqlite";
import { Hono } from "hono";

// 2. Internal modules (absolute paths)
import type { ArbitrageStatus } from "../types";
import { DATABASE_PATHS } from "../../pipeline/constants";

// 3. Relative imports
import { getCurrentUser } from "./utils";
```

### 5.2. [STYLE.BUN.RG] Bun-Native Patterns

#### 5.2.1. [STYLE.BUN_APIS.RG] Preferred Bun APIs
- `Bun.serve()` - HTTP/WebSocket server
- `Bun.file()` / `Bun.write()` - File I/O
- `Bun.nanoseconds()` - High-resolution timing
- `Bun.CryptoHasher` - Hashing
- `Bun.Glob` - File matching
- `Bun.SQL` / `sql` - Database operations (preferred for new code)
- `bun:sqlite` - Database operations (legacy, use Bun.SQL for new code)
- `bun:redis` - Redis operations

#### 5.2.2. [STYLE.DATABASE.RG] Database Operations

**For New Code: Use Bun.SQL**

All new database operations should use `Bun.SQL` (Bun 1.3+):

```typescript
import { sql } from "bun";
import { Database } from "bun:sqlite";

// Type-safe queries with tagged templates
interface User {
  id: string;
  username: string;
  email: string | null;
}

const db = new Database("./data/users.db");
const user = await sql<User>`SELECT * FROM users WHERE id = ${userId}`.get(db);
```

**Benefits:**
- ✅ Automatic type inference
- ✅ SQL syntax highlighting in IDEs
- ✅ Automatic query plan caching
- ✅ Multi-database support (SQLite, MySQL, MariaDB)
- ✅ Better developer experience

**For Existing Code:**
- Keep `bun:sqlite` for now (gradual migration)
- See `docs/BUN-1.3-SQLITE-REVIEW.md` for migration guide
- See `docs/BUN-1.3-SQLITE-MIGRATION-EXAMPLES.md` for examples

**When to Use Each:**
- ✅ **Bun.SQL**: New code, high-traffic queries, better type safety needed
- ⚠️ **bun:sqlite**: Complex transaction patterns, legacy code, performance-critical paths already optimized

#### 5.2.3. [STYLE.AVOID.RG] Avoid Node.js APIs
- ❌ `fs.readFileSync()` → ✅ `Bun.file().text()`
- ❌ `crypto.createHash()` → ✅ `Bun.CryptoHasher`
- ❌ `setTimeout()` → ✅ `Bun.sleep()` (for async)
- ❌ `process.hrtime()` → ✅ `Bun.nanoseconds()`

### 5.3. [STYLE.ERRORS.RG] Error Handling

#### 5.3.1. [STYLE.ERROR_CODES.RG] Error Codes
- Format: `NX-xxx` (e.g., `NX-404`, `NX-500`)
- Defined in `src/errors/index.ts`
- Include in error messages

#### 5.3.2. [STYLE.ERROR_TYPES.RG] Error Types
```typescript
// Use Result type for operations that can fail
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Use custom error classes
class ForbiddenError extends Error {
  code = "NX-403";
  constructor(message: string) {
    super(message);
  }
}
```

### 5.4. [STYLE.COMMENTS.RG] Comments & Documentation

#### 5.4.1. [STYLE.JSDOC.RG] JSDoc Comments
```typescript
/**
 * Stores an ORCA arbitrage opportunity
 * 
 * @param opportunity - The opportunity to store
 * @returns The stored opportunity ID
 * @throws {ForbiddenError} If user lacks permission
 */
storeOpportunity(opportunity: OrcaArbitrageOpportunity): string {
```

#### 5.4.2. [STYLE.METADATA.RG] Metadata Tags
Include metadata tags in file headers:
```typescript
/**
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-XXX@v}]
 * [PROPERTIES:{...}][CLASS:ClassName][#REF:...]]
 */
```

### 5.5. [STYLE.PERFORMANCE.RG] Performance Guidelines
- Use `Set` for O(1) lookups instead of array `includes()`
- Prefer single-pass loops over `filter().map()`
- Use `db.transaction()` for batch operations
- Cache frequently accessed data
- Use `Bun.nanoseconds()` for timing measurements

---

## 6. [CONTRIBUTING.PULL_REQUESTS.RG] Pull Request Process

### 6.1. [PR.PREPARATION.RG] Before Creating PR

#### 6.1.1. [PR.CHECKLIST.RG] Pre-PR Checklist
- [ ] Code follows style guide
- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles (`bun run typecheck`)
- [ ] Linter passes (`bun run lint`)
- [ ] Documentation updated
- [ ] Commits follow convention
- [ ] Branch is up to date with `main`

#### 6.1.2. [PR.REBASE.RG] Rebase Before PR
```bash
# Update main
git checkout main
git pull origin main

# Rebase feature branch
git checkout feature/my-feature
git rebase main

# Resolve conflicts if any
git rebase --continue

# Force push (safe after rebase)
git push origin feature/my-feature --force-with-lease
```

### 6.2. [PR.CREATION.RG] Creating PR

#### 6.2.1. [PR.TITLE.RG] PR Title Format
```text
<type>[optional scope]: <description>
```

**Examples**:
- `feat(orca): Add arbitrage opportunity storage`
- `fix(pipeline): Resolve rate limit null assertion`
- `docs: Add metadata-documentation mapping guide`

#### 6.2.2. [PR.DESCRIPTION.RG] PR Description Template
```markdown
## Summary
Brief description of changes

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] All tests pass
- [ ] Manual testing completed
- [ ] TypeScript compiles

## Related Issues
Closes #123
Related #456

## Metadata
**Domain**: [ORCA|PIPELINE|RBAC|API]
**Component**: [component name]
**Reference**: `#REF:...`
```

### 6.3. [PR.REVIEW.RG] Review Process
- PRs require at least one approval
- Address review comments promptly
- Update PR description if scope changes
- Keep PR focused (one feature per PR)

### 6.4. [PR.MERGE.RG] Merging PR
- Use "Squash and merge" for feature branches
- Use "Rebase and merge" for small fixes
- Delete branch after merge
- Update related documentation

---

## 7. [CONTRIBUTING.TESTING.RG] Testing Guidelines

### 7.1. [TESTING.TYPES.RG] Test Types
- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test component interactions
- **Performance Tests**: Benchmark critical paths

### 7.2. [TESTING.ORGANIZATION.RG] Test Organization
- Co-located: `src/**/*.test.ts` (unit tests)
- Dedicated: `test/**/*.test.ts` (integration tests)
- Naming: `*.test.ts` or `*.spec.ts`

### 7.3. [TESTING.EXAMPLES.RG] Test Examples
```typescript
import { describe, test, expect } from "bun:test";
import { OrcaArbitrageStorage } from "./storage";

describe("OrcaArbitrageStorage", () => {
  test("should store opportunity", () => {
    const storage = new OrcaArbitrageStorage();
    const id = storage.storeOpportunity(mockOpportunity);
    expect(id).toBeDefined();
  });
});
```

### 7.4. [TESTING.RULES.RG] Testing Rules
- Write tests for new features
- Maintain >80% code coverage
- Use descriptive test names
- Test edge cases and error conditions
- Keep tests fast (<5s per test)

---

## 8. [CONTRIBUTING.DOCUMENTATION.RG] Documentation Standards

### 8.1. [DOCS.STYLE.RG] Documentation Style
- Follow hierarchical numbering (`1.x.x.x.x`)
- Use ripgrep-friendly headers (`[DOMAIN.CATEGORY.KEYWORD.RG]`)
- Include metadata tags where applicable
- Add code references (`#REF:...`)

### 8.2. [DOCS.TYPES.RG] Documentation Types
- **README.md**: Project overview and quickstart
- **CLAUDE.md**: AI assistant guidance
- **CONTRIBUTING.md**: This file
- **Feature Docs**: Feature-specific guides
- **API Docs**: Endpoint documentation

### 8.3. [DOCS.UPDATES.RG] When to Update Docs
- New features require documentation
- API changes require endpoint docs
- Breaking changes require migration guides
- Bug fixes may require doc updates

---

## 9. [CONTRIBUTING.ISSUES.RG] Issue Reporting

### 9.1. [ISSUES.BUG.RG] Bug Reports
Use the bug report template (`.github/ISSUE_TEMPLATE/bug_report.yml`):
- Component affected
- Error code (if applicable)
- Steps to reproduce
- Expected vs actual behavior
- Bun version and OS

### 9.2. [ISSUES.FEATURE.RG] Feature Requests
Use the feature request template (`.github/ISSUE_TEMPLATE/feature_request.yml`):
- Category
- Problem statement
- Proposed solution
- Alternatives considered
- Priority level

### 9.3. [ISSUES.VENUE.RG] Venue Integration Requests
Use the venue integration template (`.github/ISSUE_TEMPLATE/venue_integration.yml`):
- Venue name and type
- API documentation link
- Authentication method
- Rate limits
- Use case

---

## 10. [CONTRIBUTING.CODE_REVIEW.RG] Code Review Guidelines

### 10.1. [REVIEW.FOCUS.RG] Review Focus Areas
- **Correctness**: Does it work as intended?
- **Performance**: Are there optimization opportunities?
- **Style**: Does it follow conventions?
- **Tests**: Are tests adequate?
- **Documentation**: Is it documented?

### 10.2. [REVIEW.COMMENTS.RG] Review Comments
- Be constructive and respectful
- Explain reasoning for suggestions
- Offer alternatives when possible
- Approve when satisfied

### 10.3. [REVIEW.RESPONSE.RG] Responding to Reviews
- Address all comments
- Ask for clarification if needed
- Update PR description if scope changes
- Thank reviewers for their time

---

## 11. [CONTRIBUTING.QUESTIONS.RG] Getting Help

### 11.1. [HELP.RESOURCES.RG] Resources
- **Documentation**: Check `README.md` and `CLAUDE.md`
- **Issues**: Search existing issues
- **Discussions**: GitHub Discussions (if enabled)

### 11.2. [HELP.CONTACT.RG] Contact
- Open an issue for bugs/features
- Use Discussions for questions
- Check existing documentation first

---

## 12. Status

**Status**: ✅ Contributing guide established

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0
