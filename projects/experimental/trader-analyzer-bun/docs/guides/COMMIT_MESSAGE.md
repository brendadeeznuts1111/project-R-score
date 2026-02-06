# Commit Message Format Guide

## Standard Format

```text
<type>[optional scope]: <subject>

[optional body]

[optional footer]
```

## Commit Types

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

## Scopes

### Domain-Level Scopes (Preferred)
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

### Component-Level Scopes (When Needed)
- `orca-arbitrage` - ORCA arbitrage storage
- `orca-sharp-books` - Sharp books registry
- `pipeline-ingestion` - Pipeline ingestion stage
- `pipeline-serving` - Pipeline serving stage
- `rbac-manager` - RBAC manager
- `api-routes` - API routes
- `cache-redis` - Redis cache
- `cli-dashboard` - Dashboard CLI

### Technical Scopes (For Bun/Dependencies)
- `bun` - Bun runtime features
- `bun-sqlite` - Bun SQLite integration
- `bun-redis` - Bun Redis integration
- `deps` - Dependencies
- `config` - Configuration

## Enhanced Tag Format with Bun Function Tracking

### Core Tag Structure

```text
[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]
```

### META Properties

| Property | Format | When to Use | Example |
|----------|--------|-------------|---------|
| `priority` | `low\|medium\|high\|critical` | Always | `priority=high` |
| `status` | `planned\|in-progress\|review\|done` | For plans | `status=done` |
| **`bun-function`** | `string` | **Single Bun API used** | `bun-function=spawn` |
| **`bun-functions`** | `comma-separated` | **Multiple Bun APIs** | `bun-functions=spawn,sleep,which` |
| `bun-feature` | `string` | Feature category | `bun-feature=binary-data` |
| `performance` | `number` | % improvement | `performance=85` |

### Guidelines: When to Use `bun-function` vs `bun-functions`

**Use `bun-function`** when a commit touches exactly ONE Bun API:
```text
[hyper-bun][utils][feat][META:priority=high,bun-function=HTMLRewriter][dashboard][#REF:html-rewriter.ts]
feat: add interactive HTML dashboard
```

**Use `bun-functions`** when a commit touches MULTIPLE Bun APIs:
```text
[hyper-bun][utils][feat][META:priority=high,bun-functions=spawn,which,openInEditor][cli-integration][#REF:editor.ts]
feat: integrate IDE opening with tool detection

Changes use Bun.spawn for shell execution, Bun.which for editor detection,
and Bun.openInEditor for IDE integration.
```

**Omit entirely** when commit doesn't touch Bun APIs (pure docs, tests, config):
```text
[hyper-bun][docs][docs][META:priority=low][cli-guide][#REF:README.md]
docs: update CLI usage examples

No Bun APIs changed - usage patterns only.
```

### Tag Components

1. **`[hyper-bun]`** - Hyper-Bun namespace identifier
2. **`[<scope>]`** - Component scope (utils, cache, api, etc.)
3. **`[<type>]`** - Commit type (feat, fix, perf, refactor, etc.)
4. **`[META:<properties>]`** - Metadata properties (priority, bun-function, etc.)
5. **`[<class>]`** - Class or feature name
6. **`[#REF:<reference>]`** - Reference to file, API, or documentation

### Examples

#### Single Bun Function
```text
[hyper-bun][utils][feat][META:priority=high,bun-function=HTMLRewriter][dashboard][#REF:html-rewriter.ts]
feat: add HTML rewriter for dashboard

Integrates Bun.HTMLRewriter for server-side HTML transformation.
```

#### Multiple Bun Functions
```text
[hyper-bun][utils][feat][META:priority=high,bun-functions=spawn,which,openInEditor][cli-integration][#REF:editor.ts]
feat: add CLI editor integration

Uses Bun.spawn, Bun.which, and Bun.openInEditor for seamless CLI workflow.
Performance improvement of ~40% by using Bun.shell instead of Bun.spawn.
```

#### Performance Focused
```text
[hyper-bun][cache][perf][META:priority=critical,bun-function=nanoseconds,performance=85][binary-storage][#REF:bun-binary-data]
perf: optimize binary storage with Bun.nanoseconds

85% performance improvement using Bun.nanoseconds for high-precision timing.
```

#### Feature Category
```text
[hyper-bun][binary][feat][META:priority=medium,bun-feature=DataView,bun-functions=serialize,deserialize,compress][binary-converter][#REF:bun-jsc]
feat: add binary data converter with Bun.jsc

Implements DataView serialization/deserialization with compression support.
```

#### Standard Commit (No Tag)
```text
feat(orca): Add arbitrage opportunity storage

- Implement OrcaArbitrageStorage class
- Add SQLite schema for opportunities
- Add API endpoints for CRUD operations

Closes #123
```

## Bun-Specific Commit Template

### Single Function Template
```bash
[hyper-bun][<scope>][feat][META:priority=<level>,bun-function=<api>][<class>][#REF:<file>]
<type>(<scope>): <subject>

<description>
```

### Multiple Functions Template
```bash
[hyper-bun][<scope>][feat][META:priority=<level>,bun-functions=<api1,api2>][<class>][#REF:<file>]
<type>(<scope>): <subject>

<description>

Performance: <metrics if applicable>
Coverage: <test coverage if applicable>
BREAKING CHANGE: <if applicable>
```

## Final Examples

### ✅ Full Example (Multiple Bun APIs)
```text
[hyper-bun][utils][feat][META:priority=high,bun-functions=spawn,which,sleep,HTMLRewriter][complete-suite][#REF:Bun.native+v6.0]
feat: final production-ready tag manager suite

Integrates all 15 Bun native APIs:
- Error.prepareStackTrace for debugging
- HTMLRewriter for dashboards
- Binary data handling
- Type-safe Bun.env
- Performance tracking

Performance: <5ms per scan
Validation: bun run tag:pipeline
```

### ✅ Simple Example (Single API)
```text
[hyper-bun][cache][perf][META:priority=critical,bun-function=nanoseconds][performance][#REF:benchmark.ts]
perf: optimize scan performance with Bun.nanoseconds

Replace Date.now() with Bun.nanoseconds() for microsecond precision.
Result: 40% faster scan times.

BREAKING CHANGE: Requires Bun 1.1.0+
```

### ✅ Docs Example (No Bun APIs)
```text
[hyper-bun][docs][docs][META:priority=low][style-guide][#REF:STYLE.md]
docs: document tag format specification

Document core format [DOMAIN][SCOPE][TYPE][META][CLASS][#REF] and
optional META properties for Bun function tracking.

No code changes - documentation only.
```

## Commit Rules

- **Subject**: 50 characters or less, imperative mood
- **Body**: Wrap at 72 characters, explain what and why
- **Footer**: Reference issues (`Closes #123`, `Fixes #456`)
- **One logical change per commit**
- **Use tags for Hyper-Bun features**: Include `[hyper-bun]` tag with META properties
- **Track Bun functions**: Use `bun-function` (single) or `bun-functions` (multiple) in META when Bun APIs are used
- **Omit Bun tracking**: Don't include `bun-function`/`bun-functions` for pure docs, tests, or config changes
- **Document performance**: Use `performance=<number>` in META for performance improvements (%)

## Git Hook Enhancement

### Option 1: Auto-Detect Bun Functions

Create `.git/hooks/prepare-commit-msg`:

```bash
#!/bin/sh
# Auto-detect Bun functions from changed files

CHANGED_FILES=$(git diff --cached --name-only)
BUN_FUNCTIONS=$(grep -h "Bun\." $CHANGED_FILES | sed 's/Bun\.//g' | awk -F'(' '{print $1}' | sort -u | tr '\n' ',' | sed 's/,$//')

if [ -n "$BUN_FUNCTIONS" ]; then
  echo "[hyper-bun][auto][feat][META:priority=medium,bun-functions=${BUN_FUNCTIONS}][auto-detected][#REF:auto] " > $1
fi
```

### Option 2: Validate Bun Function Tracking

Create `.git/hooks/commit-msg`:

```bash
#!/bin/sh
# Validate Bun function tracking in commit messages

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Run validation (non-blocking - advisory only)
echo "$COMMIT_MSG" | bun run examples/demos/tag-manager-pro.ts validate-bun-functions || true

# Always allow commit to proceed
exit 0
```

Make hooks executable:
```bash
chmod +x .git/hooks/prepare-commit-msg
chmod +x .git/hooks/commit-msg
```

## Validation

### Validate Bun Function Usage

Use the tag manager CLI to validate commit messages:

```bash
# Validate Bun function usage in commit (reads from stdin)
echo "commit message" | bun run examples/demos/tag-manager-pro.ts validate-bun-functions

# Or pipe git commit message
git log -1 --format=%B | bun run examples/demos/tag-manager-pro.ts validate-bun-functions
```

### Validation Logic

The validation script checks:
- If commit has `[hyper-bun]` tag but missing `bun-function` or `bun-functions` in META
- Warns (non-blocking) when Bun-related commits don't track Bun functions
- Skips validation for `docs` type commits (documentation doesn't need Bun tracking)
- Suggests adding appropriate META properties

**Note**: Validation is advisory - warnings don't block commits. Use for code quality and tracking purposes.

### Git Hook Integration

Add to `.git/hooks/prepare-commit-msg` or `.git/hooks/commit-msg`:

```bash
#!/bin/sh
# Validate Bun function tracking in commit messages

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Run validation (non-blocking)
echo "$COMMIT_MSG" | bun run examples/demos/tag-manager-pro.ts validate-bun-functions || true

# Continue with commit
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/prepare-commit-msg
```

## Benefits of Enhanced Tag Format

1. **Audit Trail**: Know exactly which Bun APIs were modified
2. **Performance Tracking**: Identify which functions drive optimization
3. **Knowledge Sharing**: Team can see Bun feature usage patterns
4. **Refactoring Safety**: Safe to refactor when you know what depends on what
5. **Documentation**: Auto-generate API usage reports
6. **Code Search**: Search commits by Bun function (`bun-function=spawn`)
7. **Changelog Integration**: Automatic categorization in changelog by Bun function
8. **Optional & Flexible**: META properties are optional - use only when relevant
9. **Clean Format**: No new tag components needed - everything in META section

## Examples by Type

### Feature Commit
```bash
[hyper-bun][api][feat][META:priority=high,bun-function=serve][websocket-server][#REF:server.ts]
feat(api): add WebSocket server with Bun.serve

Implements real-time WebSocket server using Bun.serve() with upgrade support.
```

### Performance Commit
```bash
[hyper-bun][cache][perf][META:priority=critical,bun-function=nanoseconds,performance=90][timing-optimization][#REF:cache.ts]
perf(cache): optimize cache timing with Bun.nanoseconds

90% faster cache operations using Bun.nanoseconds for precise timing.
```

### Bug Fix Commit
```bash
[hyper-bun][utils][fix][META:priority=high,bun-function=spawn][command-execution][#REF:exec.ts]
fix(utils): handle Bun.spawn errors correctly

Properly catch and handle Bun.spawn errors with error event listeners.
```

### Refactoring Commit
```bash
[hyper-bun][cli][refactor][META:priority=medium,bun-functions=shell,which][command-runner][#REF:runner.ts]
refactor(cli): use Bun.shell instead of Bun.spawn

Simplifies command execution using Bun.shell for better performance.
```

## Changelog Integration

Commits with Bun function tracking are automatically categorized in the changelog:

- Commits with `bun-function` or `bun-functions` appear in changelog with category colors
- Performance commits with `performance` property are highlighted
- Feature commits with `bun-feature` are grouped by feature category
- Categories use vibrant colors matching NEXUS tag system

See `bun run changelog` for formatted changelog output.

## Status

**✅ SPECIFICATION COMPLETE**

- **Core format**: `[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]`
- **Bun tracking**: Optional via `META:bun-function` or `META:bun-functions`
- **Validation**: Script included for advisory checking
- **Git hooks**: Integration documented for auto-detection
- **CI/CD**: Ready for GitHub Actions workflow integration

**Decision**: ✅ **Use META properties**, not new `[BUN:FUNCTION]` component. Keeps format clean and optional.
