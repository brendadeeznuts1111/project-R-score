# /diagnose - Project Health & Painpoint Detection

Comprehensive project health analysis with Bun-native diagnostics, feature flags, and multiple visualizations.

## Quick Reference

### 🏥 Health Commands
| Command | Speed | Description |
|---------|-------|-------------|
| `/diagnose health` | ~2s | Overall project health |
| `/diagnose health --quick` | ~0.5s | Fast (git + basic stats) |
| `/diagnose health --deep` | ~10s | Full (+ benchmarks + deps) |

### 🔥 Painpoint Analysis
| Command | Output | Description |
|---------|--------|-------------|
| `/diagnose painpoints` | List | Find worst issues |
| `/diagnose painpoints --top=5` | Top 5 | Critical issues only |
| `/diagnose grade` | Matrix | Grading with scores |
| `/diagnose benchmark` | Metrics | Performance benchmarking |

### 🥟 Bun-Native Diagnostics
| Command | APIs Used | Description |
|---------|-----------|-------------|
| `/diagnose bun` | `Bun.version`, `Bun.revision` | Runtime health |
| `/diagnose deps` | `Bun.file`, `fetch` | Dependency analysis |
| `/diagnose security` | `Bun.spawn` | Security audit |

### 🎛️ Feature Flags
| Flag | Category | Description |
|------|----------|-------------|
| `--stringwidth` | Analysis | Emoji alignment validation |
| `--dce` | Analysis | Dead Code Elimination |
| `--performance` | Analysis | Performance benchmarks |
| `--git` | Analysis | Git health analysis |
| `--bun-apis` | Bun | Check Bun API patterns |
| `--bun-compat` | Bun | Node.js compatibility |
| `--all` | Meta | Enable all features |

### 📊 Output Formats
| Flag | Format | Best For |
|------|--------|----------|
| `--table` | `Bun.inspect.table()` | Terminal (default) |
| `--json` | JSON | Pipelines, CI |
| `--markdown` | GFM | Documentation |
| `--chart` | Unicode bars | Visual scans |

### ⚡ Quick Combos
```bash
/diagnose health --quick --table    # Fast terminal view
/diagnose painpoints --top=3 --json # CI integration
/diagnose bun --bun-apis --bun-compat  # Full Bun audit
```

## Commands

| Command | Description | Bun APIs Used |
|---------|-------------|---------------|
| `health` | Overall project health analysis | `Bun.file`, `Bun.Glob` |
| `painpoints` | Find worst issues across projects | `Bun.spawn`, `Bun.$` |
| `grade` | Grading matrix with nanodecimal precision | `Bun.inspect.table` |
| `benchmark` | Performance benchmarking | `Bun.nanoseconds` |
| `bun` | Bun runtime diagnostics | `Bun.version`, `Bun.revision` |
| `deps` | Dependency health analysis | `Bun.file`, `fetch` |
| `security` | Security audit | `npm audit`, `Bun.spawn` |

## Feature Flags

```bash
# Analysis features
--stringwidth    # StringWidth validation (emoji alignment)
--dce            # Dead Code Elimination testing
--performance    # Performance benchmarks
--git            # Git health analysis
--code           # Code quality (complexity, symbols)
--deps           # Dependency analysis
--security       # Security vulnerabilities
--all            # Enable all features

# Bun-specific
--bun-apis       # Check Bun API usage patterns
--bun-compat     # Node.js compatibility check
--bun-perf       # Bun performance opportunities
```

## Output Formats

```bash
--box            # Unicode box tables (default)
--table          # Bun.inspect.table() output
--json           # Machine-readable JSON
--markdown       # GitHub-flavored markdown
--html           # Interactive dashboard
--chart          # Bar charts with Unicode blocks
```

## Sorting & Filtering

```bash
--sort-score       # By score (default)
--sort-complexity  # By cyclomatic complexity
--sort-size        # By file/bundle size
--sort-name        # Alphabetical
--filter-critical  # Only critical issues
--filter-failing   # Only failing projects
--filter-bun       # Only Bun-related issues
```

## Workflow Examples

### Daily Quick Check

```bash
/diagnose health --quick --table
```

Output using `Bun.inspect.table()`:
```
┌───┬────────────────────┬───────┬────────┬──────────┐
│   │ Project            │ Score │ Grade  │ Status   │
├───┼────────────────────┼───────┼────────┼──────────┤
│ 0 │ trader-analyzer    │ 9.2   │ A      │ ✅ Clean │
│ 1 │ enterprise-dash    │ 7.8   │ B      │ ⚠️ 3 mod │
│ 2 │ legacy-parser      │ 4.1   │ D      │ 🔴 Crit  │
└───┴────────────────────┴───────┴────────┴──────────┘
```

### Weekly Code Review

```bash
/diagnose health --code --deps --sort-complexity
```

### CI/CD Integration

```bash
# Generate JSON report
/diagnose health --all --json > report.json

# Fail on critical issues
/diagnose health --filter-critical --exit-code
```

### Find Top Painpoints

```bash
/diagnose painpoints --top=5 --critical-only
```

Output:
```
🔥 Critical Painpoints (5)

1. legacy-parser.ts
   Complexity: 47 (threshold: 10)
   Action: Extract helper functions

2. data-transformer.ts
   Circular dependency detected
   Action: Use dependency injection

3. api-routes.ts
   No error handling in 12 endpoints
   Action: Add try-catch or error middleware
```

### Bun Runtime Diagnostics

```bash
/diagnose bun
```

Output:
```
🥟 Bun Runtime Diagnostics

Version:     1.3.6
Revision:    abc1234
Platform:    darwin-arm64
Memory:      256 MB (heap: 128 MB)

API Usage:
  ✅ Bun.serve()      - 3 files
  ✅ Bun.file()       - 12 files
  ✅ Bun.spawn()      - 5 files
  ⚠️  Bun.write()     - 0 files (consider using)
  ❌ child_process    - 2 files (migrate to Bun.spawn)

Performance Opportunities:
  • Replace fs.readFile → Bun.file().text()
  • Replace JSON.parse(fs...) → Bun.file().json()
  • Replace node-fetch → native fetch()
```

### Security Audit

```bash
/diagnose security
```

Output:
```
🔒 Security Audit

Dependencies:
  ✅ No known vulnerabilities
  ⚠️  3 outdated packages (non-critical)

Code Patterns:
  ✅ No hardcoded secrets detected
  ⚠️  2 files using eval() - review required
  ✅ All cookies use HttpOnly + Secure

Supply Chain:
  ✅ All packages > 7 days old
  ✅ No typosquatting detected
```

## Scoring System

**Overall = (Git × 25%) + (Code × 35%) + (Performance × 25%) + (Deps × 15%)**

| Grade | Score | Status | Action |
|-------|-------|--------|--------|
| A+ | 9.5-10.0 | Excellent | Maintain |
| A | 9.0-9.5 | Great | Minor polish |
| B | 7.0-9.0 | Good | Address warnings |
| C | 5.0-7.0 | Needs work | Prioritize fixes |
| D | 4.0-5.0 | Poor | Immediate action |
| F | < 4.0 | Critical | Stop and fix |

## Painpoint Severity

| Level | Score | Examples | Auto-fix |
|-------|-------|----------|----------|
| Critical | 8-10 | Complexity > 50, vulnerabilities | No |
| High | 6-7 | Complexity > 20, > 50 commits behind | Partial |
| Medium | 4-5 | Complexity > 10, outdated deps | Yes |
| Low | 1-3 | Style violations, minor warnings | Yes |

## Bun-Native Integrations

### Using Core Logger

```typescript
import { log, LogLevel } from "@dev-hq/core";

log.info("Diagnosis started", { project: name });
log.warn("High complexity detected", { file, complexity });
log.error("Critical issue found", { issue });
```

### Using Feature Registry

```typescript
import { FeatureRegistry } from "@dev-hq/core";

const registry = FeatureRegistry.getInstance();

// Check if deep analysis is enabled
if (registry.isEnabled("FEAT_DEEP_ANALYSIS")) {
  await runDeepAnalysis();
}
```

### Using Router Analysis

```typescript
import { analyzePattern } from "@dev-hq/core";

// Analyze URLPattern usage in codebase
const analysis = analyzePattern("/api/users/:id(\\d+)");
// { hasRegExpGroups: true, paramCount: 1, ... }
```

## Configuration

### .diagnose.json

```json
{
  "thresholds": {
    "maxComplexity": 10,
    "minCoverage": 80,
    "maxFileSize": 500,
    "maxDependencies": 50
  },
  "ignore": [
    "node_modules",
    "dist",
    "*.test.ts",
    "*.spec.ts"
  ],
  "features": {
    "stringwidth": true,
    "dce": false,
    "bunApis": true
  },
  "output": {
    "format": "table",
    "colors": true
  }
}
```

### bunfig.toml Integration

```toml
[diagnose]
# Enable Bun-specific diagnostics
bunApis = true
bunCompat = true

# Thresholds
maxComplexity = 10
minTestCoverage = 80
```

## Implementation

### Run Painpoints Scanner
```bash
bun scripts/diagnose/painpoints.ts [path]        # Scan specific path
bun scripts/diagnose/painpoints.ts .             # Scan current directory
bun scripts/diagnose/painpoints.ts ~/Projects    # Scan Projects folder
```

### Auto-Fix Common Issues

When painpoints are detected, apply these fixes:

| Issue | Auto-Fix Command |
|-------|------------------|
| Missing engines | Add `"engines": {"bun": ">=1.0.0"}` to package.json |
| Missing .gitignore | Create standard .gitignore for Bun projects |
| Missing lockfile | Run `bun install` |
| Legacy bun.lockb | Run `bun install --save-text-lockfile` |
| Dual lockfiles | Run `rm bun.lockb && bun install` |

### Lockfile Diagnostics (Enhanced)

The painpoints scanner detects these Bun lockfile states:

| State | Severity | Detection |
|-------|----------|-----------|
| Missing entirely | High | No bun.lock/bun.lockb/package-lock/yarn.lock |
| Binary-only (deprecated) | Medium | bun.lockb without bun.lock |
| Dual formats | Low | Both bun.lock and bun.lockb present |
| Text-only (ideal) | None | Only bun.lock present |

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `/pm` | Dependency health, outdated packages |
| `/analyze` | Code complexity, symbol extraction |
| `/projects` | Multi-project health dashboard |
| `/matrix` | Multi-project lockfile health matrix |

### Combined Workflow

```bash
# 1. Quick lockfile health across projects
/matrix ~/Projects

# 2. Deep dive on problem project
/diagnose painpoints ~/Projects/legacy-app

# 3. Fix issues
bun install --save-text-lockfile  # Migrate lockfile
# Add engines to package.json
```

## Related Commands

```bash
/analyze scan          # Deep code analysis
/pm outdated           # Outdated dependencies
/pm audit              # Security audit
/projects matrix       # Multi-project dashboard
```
